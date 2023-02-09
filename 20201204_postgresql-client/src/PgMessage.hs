{-# LANGUAGE BlockArguments            #-}
{-# LANGUAGE DuplicateRecordFields     #-}
{-# LANGUAGE ExistentialQuantification #-}

module PgMessage where

import qualified Crypto.Hash.MD5            as MD5
import qualified Data.ByteString            as BS
import qualified Data.ByteString.Conversion as BSC
import qualified Data.HexString             as HS
import           Data.Int                   (Int16, Int32, Int64)
import qualified Data.Text                  as T
import           Data.Word                  (Word16, Word32, Word8)

import           Data.Maybe                 (fromJust, fromMaybe)
import           GHC.IO.Unsafe              (unsafePerformIO)
import           Utils                      (c2w, fromBigEndian, toBigEndian,
                                             w2c)

protocolVersionNumber :: Word32
protocolVersionNumber = 196608  -- '00 03 00 00'

nullTerminator :: BS.ByteString
nullTerminator = BSC.toByteString' "\0"

class EncodableMessage m where
  encodeMessage :: m -> BS.ByteString

class DecodableMessage m where
  decodeMessage :: BS.ByteString -> Maybe m -- TODO: Maybe change signature to include some error context.

type KeyValue = (String, String)

-- | Source: https://www.postgresql.org/docs/9.6/protocol-message-formats.html
data PgMessageF
  = StartupMessageF
    { _versionNumber :: Word32
    , _parameters    :: [KeyValue]
    }
  | PasswordMessageF
    { _user     :: String
    , _password :: String
    , _encrypt  :: Bool
    , _salt     :: Word32
    }
  | QueryF { _query :: String }
  deriving (Show, Eq)

-- | Response to AuthenricationMdPasswordB
-- SQL: concat('md5', md5(concat(md5(concat(password, username)), random-salt)))
-- Note that md5 function returns its result as a hex string.
-- Source: https://www.postgresql.org/docs/9.6/protocol-flow.html
encryptCredentialsMd5 :: String -> String -> Word32 -> BS.ByteString
encryptCredentialsMd5 user pass salt =
  BS.concat
    [ BSC.toByteString' "md5"
    , md5 $ BS.concat [inner, BS.pack $ toBigEndian salt]
    ]
  where inner = md5 $ BS.concat $ map BSC.toByteString' [pass, user]

md5 :: BS.ByteString -> BS.ByteString
md5 bs = BSC.toByteString' $ HS.toText $ HS.fromBytes $ MD5.hash bs

-- TODO: remove repetitive messageLength & messageLength' definitions.
instance EncodableMessage PgMessageF where
  encodeMessage StartupMessageF { _parameters = ps, _versionNumber = vn } =
    BS.concat [messageLength', versionNumber', parameters', nullTerminator] where
      versionNumber' = BS.pack $ toBigEndian vn
      parameters' = BS.concat $ map (\(k, v) -> BSC.toByteString' (k ++ "\0" ++ v ++ "\0")) ps
      messageLength = BS.length versionNumber'
                    + BS.length parameters'
                    + 4                         -- +4 bytes for message length itself.
                    + 1                         -- +1 byte for null terminator at the end.
      messageLength' = BS.pack $ toBigEndian (fromIntegral messageLength :: Word32)
  encodeMessage PasswordMessageF { _user = user, _password = pass, _salt = salt, _encrypt = e } =
    BS.concat [code, messageLength', pass', nullTerminator] where
      code = BS.pack [c2w 'p']
      pass' = if e then encryptCredentialsMd5 user pass salt else BSC.toByteString' pass
      messageLength = BS.length pass'
                    + 4               -- +4 bytes for message length itself.
                    + 1               -- +1 byte for null terminator at the end.
      messageLength' = BS.pack $ toBigEndian (fromIntegral messageLength :: Word32)
  encodeMessage QueryF { _query = query } =
    BS.concat [code, messageLength', query', nullTerminator] where
      code = BS.pack [c2w 'Q']
      query' = BSC.toByteString' query
      messageLength = BS.length query'
                    + 4                 -- +4 bytes for message length itself.
                    + 1                 -- +1 byte for null terminator at the end.
      messageLength' = BS.pack $ toBigEndian (fromIntegral messageLength :: Word32)

data PgTransactionStatus
  = Idle                    -- Not in a transaction block.
  | TransactionBlock
  | FailedTransactionBlock  -- Queries will be rejected until block is ended.
  deriving (Show, Eq)

-- | Source: https://www.postgresql.org/docs/9.6/protocol-message-formats.html
data PgMessageB
  = AuthenticationOkB
  | AuthenticationMd5PasswordB { _salt :: Word32 }
  | ParameterStatusB { _parameter :: String, _value :: String }
  | BackendKeyDataB { _processId :: Word32, _secretKey :: Word32 }
  | ReadyForQueryB { _transactionStatus :: PgTransactionStatus }
  | RowDescriptionB { _columns :: [ColumnDescription] }
  | DataRowB { _fields :: [String] }
  | CommandCompleteB { _tag :: String }
  | ErrorResponseB { _message :: String } -- TODO: There are actually multiple error fields, including severity, message, hint etc.
  deriving (Show, Eq)

data ColumnDescription = ColumnDescription
  { _name         :: String
  , _tableId      :: Word32
  , _columnId     :: Word16
  , _columnTypeId :: Word32
  , _dataTypeSize :: Word16
  , _typeModifier :: Word32
  , _format       :: ColumnFormat
  }
  deriving (Show, Eq)

data ColumnFormat = Text | Binary deriving (Show, Eq)

-- TODO: Check that message has correct length (maybe re-check first byte too?).
decodeAuthenticationB :: BS.ByteString -> Maybe PgMessageB
decodeAuthenticationB bs =
  let
    bs' = BS.unpack bs
    subcode = fromBigEndian $ take 4 . drop 5 $ bs' :: Word32
  in case subcode of
    0 -> Just AuthenticationOkB
    2 -> Nothing  -- TODO
    3 -> Nothing  -- TODO
    5 -> Just AuthenticationMd5PasswordB { _salt = salt }
      where salt = fromBigEndian $ take 4 . drop 9 $ bs'
    6 -> Nothing  -- TODO
    7 -> Nothing  -- TODO
    9 -> Nothing  -- TODO
    8 -> Nothing  -- TODO
    _ -> Nothing

decodeParameterStatusB :: BS.ByteString -> Maybe PgMessageB
decodeParameterStatusB bs = do
  let bs' = BS.drop 5 bs
  let p = BS.takeWhile (/= 0) bs'
  let v = BS.takeWhile (/= 0) $ BS.drop (BS.length p + 1) bs'
  p' <- BSC.fromByteString p
  v' <- BSC.fromByteString v
  pure ParameterStatusB { _parameter = p', _value = v' }

decodeBackendKeyDataB :: BS.ByteString -> Maybe PgMessageB
decodeBackendKeyDataB bs = do
  let processId = fromBigEndian $ BS.unpack $ BS.take 4 $ BS.drop 5 bs :: Word32
  let secretKey = fromBigEndian $ BS.unpack $ BS.take 4 $ BS.drop 9 bs :: Word32
  pure BackendKeyDataB { _processId = processId, _secretKey = secretKey }

decodeReadyForQueryB :: BS.ByteString -> Maybe PgMessageB
decodeReadyForQueryB bs =
  let ts = case w2c (BS.last bs) of
        'I' -> Idle
        'T' -> TransactionBlock
        _   -> FailedTransactionBlock
  in pure ReadyForQueryB { _transactionStatus = ts }

decodeRowDescriptionB :: BS.ByteString -> Maybe PgMessageB
decodeRowDescriptionB bs =
  let count = fromBigEndian $ BS.unpack $ BS.take 2 $ BS.drop 5 bs :: Word16
      bs' = BS.drop 7 bs
      columns = decode count bs'

      decode i s = if i > 0
        then do
          let n = BS.takeWhile (/= 0) s
          n' <- BSC.fromByteString n
          let s'   = BS.drop (BS.length n + 1) s
          let tId  = fromBigEndian $ BS.unpack $ BS.take 4 s'
          let cId  = fromBigEndian $ BS.unpack $ BS.take 2 $ BS.drop 4 s'
          let ctId = fromBigEndian $ BS.unpack $ BS.take 4 $ BS.drop 6 s'
          let dts  = fromBigEndian $ BS.unpack $ BS.take 2 $ BS.drop 10 s'
          let tm   = fromBigEndian $ BS.unpack $ BS.take 4 $ BS.drop 12 s'
          let f    = fromBigEndian $ BS.unpack $ BS.take 2 $ BS.drop 16 s' :: Word16
          let f'   = case f of 1 -> Binary
                               _ -> Text
          let c = ColumnDescription n' tId cId ctId dts tm f'
          cs <- decode (i - 1) (BS.drop 18 s')
          pure $ c:cs
        else pure []
  in RowDescriptionB <$> columns

decodeDataRowB :: BS.ByteString -> Maybe PgMessageB
decodeDataRowB bs =
  let count = fromBigEndian $ BS.unpack $ BS.take 2 $ BS.drop 5 bs :: Word16
      bs' = BS.drop 7 bs
      fields = decode count bs'

      decode :: Word16 -> BS.ByteString -> [String]
      decode i s = if i > 0 then do
        let l = fromBigEndian $ BS.unpack $ BS.take 4 s :: Word32
        let l' = fromIntegral l :: Int
        let v = BSC.fromByteString $ BS.take l' $ BS.drop 4 s
        let v' = fromMaybe "*" v
        v':decode (i - 1) (BS.drop (l' + 4) s)
      else pure []
  in Just $ DataRowB fields

decodeCommandCompleteB :: BS.ByteString -> Maybe PgMessageB
decodeCommandCompleteB bs =
  let tag = BSC.fromByteString $ BS.takeWhile (/= 0) $ BS.drop 5 bs
  in CommandCompleteB <$> tag

decodeErrorResponseB :: BS.ByteString -> Maybe PgMessageB
decodeErrorResponseB bs =
  let bs' = BS.drop 5 bs
      loop :: BS.ByteString -> [(Char, String)]
      loop s = if BS.length s <= 1
        then []
        else case v' of
          Just v'' -> (k, v'') : t
          _        -> t
          where k = w2c $ BS.head s
                v = BS.takeWhile (/= 0) $ BS.drop 1 s
                v' = BSC.fromByteString v :: Maybe String
                t = loop (BS.drop (BS.length v + 2) s)
  in ErrorResponseB <$> lookup 'M' (loop bs')

instance DecodableMessage PgMessageB where
  decodeMessage bs = case w2c $ BS.head bs of
    'R' -> decodeAuthenticationB bs
    'S' -> decodeParameterStatusB bs
    'K' -> decodeBackendKeyDataB bs
    'Z' -> decodeReadyForQueryB bs
    'T' -> decodeRowDescriptionB bs
    'D' -> decodeDataRowB bs
    'C' -> decodeCommandCompleteB bs
    'E' -> decodeErrorResponseB bs
    _   -> Nothing
