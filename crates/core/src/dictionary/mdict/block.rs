use std::io::Read;

use flate2::read::ZlibDecoder;

use super::byte_cursor::ByteCursor;
use super::error::MdictError;

/// The stored and decompressed sizes of one block, as a section's block index lists them.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BlockSize {
    pub stored: u64,
    pub decompressed: u64,
}

/// Bounds the allocation for one block, so that a corrupt size cannot exhaust memory.
/// Real dictionaries use blocks of tens of kilobytes.
const MAX_BLOCK_SIZE: u64 = 64 * 1024 * 1024;

pub const NO_COMPRESSION: u8 = 0;
pub const LZO: u8 = 1;
pub const ZLIB: u8 = 2;

/// Decodes a block: a compression method byte, three reserved bytes,
/// a big-endian Adler-32 checksum of the decompressed data, and the payload.
pub fn decode_block(block: &[u8], decompressed_size: u64) -> Result<Vec<u8>, MdictError> {
    if decompressed_size > MAX_BLOCK_SIZE {
        return Err(MdictError::BlockTooLarge(decompressed_size));
    }
    let mut cursor = ByteCursor::new(block, "block");
    let method = cursor.take(4)?[0] & 0x0f;
    let checksum = cursor.read_number(4)?;
    let data = decompress(method, cursor.remaining(), decompressed_size)?;
    check_size(&data, decompressed_size)?;
    if u64::from(adler2::adler32_slice(&data)) != checksum {
        return Err(MdictError::Checksum("block"));
    }
    Ok(data)
}

fn decompress(method: u8, payload: &[u8], size: u64) -> Result<Vec<u8>, MdictError> {
    match method {
        NO_COMPRESSION => Ok(payload.to_vec()),
        LZO => decompress_lzo(payload, size),
        ZLIB => decompress_zlib(payload, size),
        other => Err(MdictError::UnknownCompression(other)),
    }
}

fn decompress_lzo(payload: &[u8], size: u64) -> Result<Vec<u8>, MdictError> {
    let mut data = vec![0; size as usize];
    let written = lzokay::decompress::decompress(payload, &mut data)
        .map_err(|error| MdictError::Decompression(error.to_string()))?;
    data.truncate(written);
    Ok(data)
}

fn decompress_zlib(payload: &[u8], size: u64) -> Result<Vec<u8>, MdictError> {
    let mut data = Vec::new();
    ZlibDecoder::new(payload)
        .take(size + 1)
        .read_to_end(&mut data)
        .map_err(|error| MdictError::Decompression(error.to_string()))?;
    Ok(data)
}

fn check_size(data: &[u8], expected: u64) -> Result<(), MdictError> {
    let actual = data.len() as u64;
    if actual == expected {
        Ok(())
    } else {
        Err(MdictError::BlockSize { expected, actual })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::mdict::test_writer::encode_block;

    const TEXT: &[u8] = b"a definition, a definition, a definition";

    fn round_trip(method: u8) -> Vec<u8> {
        decode_block(&encode_block(TEXT, method), TEXT.len() as u64).unwrap()
    }

    #[test]
    fn decodes_an_uncompressed_block() {
        assert_eq!(round_trip(NO_COMPRESSION), TEXT);
    }

    #[test]
    fn decodes_an_lzo_block() {
        assert_eq!(round_trip(LZO), TEXT);
    }

    #[test]
    fn decodes_a_zlib_block() {
        assert_eq!(round_trip(ZLIB), TEXT);
    }

    #[test]
    fn rejects_a_block_whose_checksum_differs() {
        let mut block = encode_block(TEXT, NO_COMPRESSION);
        block[4] ^= 0xff;
        assert!(matches!(
            decode_block(&block, TEXT.len() as u64),
            Err(MdictError::Checksum("block"))
        ));
    }

    #[test]
    fn rejects_an_unknown_compression_method() {
        let mut block = encode_block(TEXT, NO_COMPRESSION);
        block[0] = 7;
        assert!(matches!(
            decode_block(&block, TEXT.len() as u64),
            Err(MdictError::UnknownCompression(7))
        ));
    }

    #[test]
    fn rejects_a_block_of_the_wrong_size() {
        let block = encode_block(TEXT, ZLIB);
        assert!(matches!(
            decode_block(&block, 3),
            Err(MdictError::BlockSize { .. })
        ));
    }
}
