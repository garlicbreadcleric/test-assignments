module Utils where

import           Data.Bits                (shiftL, shiftR, (.|.))
import qualified Data.ByteString.Internal as BS (c2w, w2c)
import qualified Data.Char                as C
import           Data.Word                (Word32, Word16, Word8)

class ToOctets x where
  toBigEndian :: x -> [Word8]
  toBigEndian = reverse . toLittleEndian
  toLittleEndian :: x -> [Word8]
  toLittleEndian = reverse . toBigEndian

  fromBigEndian :: [Word8] -> x
  fromBigEndian = fromLittleEndian . reverse
  fromLittleEndian :: [Word8] -> x
  fromLittleEndian = fromBigEndian . reverse

  {-# MINIMAL (toBigEndian | toLittleEndian), (fromBigEndian | fromLittleEndian) #-}

instance ToOctets Word32 where
  toBigEndian w = [ fromIntegral (w `shiftR` 24)
                  , fromIntegral (w `shiftR` 16)
                  , fromIntegral (w `shiftR` 8)
                  , fromIntegral w
                  ]
  fromLittleEndian []     = 0
  fromLittleEndian (x:xs) = fromIntegral x .|. fromLittleEndian xs `shiftL` 8

instance ToOctets Word16 where
  toBigEndian w = [ fromIntegral (w `shiftR` 8)
                  , fromIntegral w
                  ]
  fromLittleEndian []     = 0
  fromLittleEndian (x:xs) = fromIntegral x .|. fromLittleEndian xs `shiftL` 8

instance ToOctets Bool where
  toLittleEndian True = [1]
  toLittleEndian False = [0]

  fromLittleEndian [] = False
  fromLittleEndian xs = 0 `notElem` xs

w2c :: Word8 -> Char
w2c = BS.w2c

c2w :: Char -> Word8
c2w = BS.c2w
