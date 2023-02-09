{-# LANGUAGE BlockArguments #-}

module Main where

import           Control.Monad.State.Lazy (runStateT)
import qualified Network.Simple.TCP       as TCP

import           Lib

main :: IO ()
main =
  TCP.connect "localhost" "5432" $ \(connectionSocket, _) -> do
    putStrLn "Connected to localhost:5432"
    let context = defaultPgContext
          { _user = "accounting"
          , _password = "accounting"
          , _database = "accounting"
          }
    let main' = do
          pgInit connectionSocket
          repl connectionSocket
    _ <- runStateT main' context
    pure ()
