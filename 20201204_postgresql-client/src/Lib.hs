{-# LANGUAGE BlockArguments            #-}
{-# LANGUAGE ExistentialQuantification #-}
{-# LANGUAGE FlexibleContexts          #-}
{-# LANGUAGE OverloadedStrings         #-}
{-# LANGUAGE RankNTypes                #-}

module Lib
  ( sendPgMessage
  , pgInit
  , PgContext(..)
  , defaultPgContext
  , repl
  )
where

import           Control.Exception          (Exception (..), throwIO)
import           Control.Monad              (unless, void, when)
import           Control.Monad.IO.Class     (MonadIO, liftIO)
import           Control.Monad.State.Lazy   (MonadState, StateT, gets, lift,
                                             modify)
import           Control.Monad.Trans.Maybe  (MaybeT (MaybeT), runMaybeT)
import qualified Data.ByteString            as BS
import qualified Data.ByteString.Conversion as BSC
import           Data.Functor               (($>), (<$))
import qualified Data.Text                  as T
import           Data.Word                  (Word32, Word8)
import qualified Network.Simple.TCP         as TCP

import qualified PgMessage                  as PM
import           System.IO                  (hFlush, stdout)
import           Utils                      (fromBigEndian, w2c)

data PgContext = PgContext
  { _user                :: String
  , _database            :: String
  , _password            :: String
  , _salt                :: Word32
  , _applicationName     :: String
  , _lastSentMessage     :: Maybe PM.PgMessageF
  , _lastReceivedMessage :: Maybe PM.PgMessageB
  }

defaultPgContext :: PgContext
defaultPgContext = PgContext
  { _user = "postgres"
  , _password = "postgres"
  , _database = "postgres"
  , _salt = 0
  , _applicationName = "psql"
  , _lastSentMessage = Nothing
  , _lastReceivedMessage = Nothing
  }

sendPgMessage :: MonadIO m => TCP.Socket -> PM.PgMessageF -> m ()
sendPgMessage s p = TCP.send s $ PM.encodeMessage p

recv :: MonadIO m => TCP.Socket -> Int -> MaybeT m BS.ByteString
recv s n = do
  x <- TCP.recv s n
  MaybeT $ pure x

setLastSentMessage :: MonadState PgContext m => PM.PgMessageF -> m ()
setLastSentMessage = setLastSentMessage' . Just

setLastSentMessage' :: MonadState PgContext m => Maybe PM.PgMessageF -> m ()
setLastSentMessage' msg = modify (\c -> c { _lastSentMessage = msg })

setLastReceivedMessage :: MonadState PgContext m => PM.PgMessageB -> m ()
setLastReceivedMessage = setLastReceivedMessage' . Just

setLastReceivedMessage' :: MonadState PgContext m => Maybe PM.PgMessageB -> m ()
setLastReceivedMessage' msg = modify (\c -> c { _lastReceivedMessage = msg })

recvPgMessage :: MonadIO m => TCP.Socket -> MaybeT m PM.PgMessageB
recvPgMessage s = do
  code <- recv s 1
  len <- recv s 4
  let len' = fromIntegral (fromBigEndian $ BS.unpack len :: Word32)
  rest <- recv s $ len' - 4
  let bs = BS.concat [code, len, rest]
  MaybeT . pure $ PM.decodeMessage bs

sendStartupMessage :: MonadIO m => TCP.Socket -> StateT PgContext m ()
sendStartupMessage s = do
  u <- gets _user
  d <- gets _database
  a <- gets _applicationName
  let msg = PM.StartupMessageF PM.protocolVersionNumber
          [ ("user", u)
          , ("database", d)
          , ("application_name", a)
          , ("client_encoding", "UTF8")
          ]
  setLastSentMessage msg
  lift $ sendPgMessage s msg

sendPasswordMessage :: MonadIO m => TCP.Socket -> Bool -> StateT PgContext m ()
sendPasswordMessage s e = do
  u <- gets _user
  p <- gets _password
  salt <- gets _salt
  let msg = PM.PasswordMessageF u p e salt
  setLastSentMessage msg
  lift $ sendPgMessage s msg


data PgIOException
  = UnsupportedAuthMethod -- TODO: Specify exact auth method.
  | AuthenticationFailed
  | MessageReceiveFailed
  | UnexpectedMessage PM.PgMessageB
  deriving (Show, Eq)

instance Exception PgIOException where
  displayException UnsupportedAuthMethod = "Unsupported authentication method."
  displayException AuthenticationFailed  = "Authentication failed."
  displayException MessageReceiveFailed  = "Failed to receive a message from PostgreSQL backend."
  displayException (UnexpectedMessage m) = "Unexpected message: " ++ show m ++ "."

authenticate :: MonadIO m => TCP.Socket -> MaybeT (StateT PgContext m) ()
authenticate s = do
  authReq <- recvPgMessage s
  setLastReceivedMessage authReq
  case authReq of
    --PM.AuthenticationCleartextPasswordB -> sendPasswordMessage s False
    PM.AuthenticationMd5PasswordB salt -> lift $ do
      modify (\c -> c { _salt = salt })
      sendPasswordMessage s True
    _ -> liftIO $ throwIO UnsupportedAuthMethod
  authRes <- recvPgMessage s
  setLastReceivedMessage authRes
  case authRes of
    PM.AuthenticationOkB -> pure ()
    _                    -> liftIO $ throwIO AuthenticationFailed

waitToSendQuery :: MonadIO m => TCP.Socket -> StateT PgContext m ()
waitToSendQuery s = do
  let loop =
        do
          msg <- runMaybeT $ recvPgMessage s
          setLastReceivedMessage' msg
          isReady <- case msg of
            Just (PM.ParameterStatusB p v) -> do
              liftIO $ putStrLn $ "Parameter status: " ++ p ++ " = " ++ v
              pure False
            Just (PM.BackendKeyDataB p _) -> do
              liftIO $ putStrLn $ "Backend process ID: " ++ show p
              pure False
            Just (PM.ReadyForQueryB _) -> do
              pure True
            Just _ -> pure False
            Nothing -> do
              pure False
          unless isReady loop
  _ <- runMaybeT loop
  pure ()

pgInit :: MonadIO m => TCP.Socket -> StateT PgContext m ()
pgInit s = do
  sendStartupMessage s
  _ <- runMaybeT $ authenticate s
  waitToSendQuery s

sendQueryMessage :: MonadIO m => TCP.Socket -> String -> StateT PgContext m ()
sendQueryMessage s q = do
  let msg = PM.QueryF q
  setLastSentMessage msg
  lift $ sendPgMessage s msg

processQuery :: MonadIO m => TCP.Socket -> String -> StateT PgContext m ()
processQuery s q = do
  sendQueryMessage s q
  desc <- runMaybeT $ recvPgMessage s
  setLastReceivedMessage' desc
  case desc of
    Just (PM.RowDescriptionB ds) -> do
      liftIO $ putStrLn "\n============================================================\n"
      let loop = do
              r <- recvPgMessage s
              prev <- gets _lastReceivedMessage
              setLastReceivedMessage r
              isComplete <- case r of
                    PM.DataRowB fs -> do
                      case prev of
                        Just (PM.DataRowB _) ->
                          liftIO $ putStrLn "\n------------------------------------------------------------\n"
                        _ -> pure ()
                      lift $ processRow ds fs
                      pure False
                    PM.CommandCompleteB tag -> do
                      liftIO $ putStrLn "\n============================================================\n"
                      liftIO $ putStrLn $ "Command completed: " ++ tag
                      liftIO $ hFlush stdout
                      pure True
                    _ -> pure False -- TODO.
              unless isComplete loop
      void . runMaybeT $ loop
    Just (PM.ErrorResponseB msg) ->
      liftIO $ putStrLn $ "Error: " ++ msg
    Just m -> liftIO $ throwIO $ UnexpectedMessage m
    Nothing -> liftIO $ throwIO MessageReceiveFailed
  waitToSendQuery s

processRow :: MonadIO m => [PM.ColumnDescription] -> [String] -> StateT PgContext m ()
processRow ds fs = do
  let offset = maximum (map (length . PM._name) ds) + 10
  mapM_ (processColumn offset) $ zip ds fs

  where processColumn :: MonadIO m => Int -> (PM.ColumnDescription, String) -> StateT PgContext m ()
        processColumn offset (d,f) = do
          let n = PM._name d
          liftIO $ putStrLn $ n ++ ":" ++ replicate (offset - length n) ' ' ++ f
          pure ()

repl :: MonadIO m => TCP.Socket -> StateT PgContext m ()
repl s = do
  liftIO $ putStr "# " >> hFlush stdout
  query <- liftIO getLine
  quit <- case T.strip $ T.pack query of
    ":q" -> pure True
    ""   -> pure False
    _    -> do processQuery s query
               pure False
  if quit then pure () else repl s
