use std::io::{self, Read};

use flate2::read::MultiGzDecoder;
use lzma_rust2::XzReader;
use ruzstd::decoding::{FrameDecoder, StreamingDecoder};

/// The compression of a file, recognized by its first bytes.
#[derive(Clone, Copy)]
pub enum Compression {
    None,
    Gzip,
    Xz,
    Zstd,
}

const GZIP_SIGNATURE: &[u8] = b"\x1f\x8b";
const XZ_SIGNATURE: &[u8] = b"\xfd7zXZ\x00";
const ZSTD_SIGNATURE: &[u8] = b"\x28\xb5\x2f\xfd";
const BZIP2_SIGNATURE: &[u8] = b"BZh";
/// The magic numbers that follow a bzip2 header: the start of a block, or the end of an empty stream.
const BZIP2_BLOCK_SIGNATURES: [&[u8]; 2] =
    [b"\x31\x41\x59\x26\x53\x59", b"\x17\x72\x45\x38\x50\x90"];

/// Reports whether the bytes begin a bzip2 stream, checking the block magic number after the header
/// so that a text file starting with `BZh` is not mistaken for one.
pub fn is_bzip2(bytes: &[u8]) -> bool {
    bytes.starts_with(BZIP2_SIGNATURE)
        && bytes
            .get(3)
            .is_some_and(|level| (b'1'..=b'9').contains(level))
        && BZIP2_BLOCK_SIGNATURES
            .iter()
            .any(|signature| bytes[4..].starts_with(signature))
}

pub fn detect_compression(bytes: &[u8]) -> Compression {
    if bytes.starts_with(GZIP_SIGNATURE) {
        Compression::Gzip
    } else if bytes.starts_with(XZ_SIGNATURE) {
        Compression::Xz
    } else if bytes.starts_with(ZSTD_SIGNATURE) {
        Compression::Zstd
    } else {
        Compression::None
    }
}

/// Returns a reader of the decompressed bytes.
pub fn decompress(compression: Compression, bytes: &[u8]) -> io::Result<Box<dyn Read + '_>> {
    Ok(match compression {
        Compression::None => Box::new(bytes),
        Compression::Gzip => Box::new(MultiGzDecoder::new(bytes)),
        Compression::Xz => Box::new(XzReader::new(bytes, true)),
        Compression::Zstd => Box::new(ZstdFrames::new(bytes)?),
    })
}

/// Reads every frame of a zstd stream in turn, since a compressor may split its output into several frames.
struct ZstdFrames<'a> {
    decoder: StreamingDecoder<&'a [u8], FrameDecoder>,
}

impl<'a> ZstdFrames<'a> {
    fn new(bytes: &'a [u8]) -> io::Result<Self> {
        let decoder = StreamingDecoder::new(bytes).map_err(io::Error::other)?;
        Ok(Self { decoder })
    }
}

impl Read for ZstdFrames<'_> {
    fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
        loop {
            let count = self.decoder.read(buffer)?;
            let remaining: &[u8] = self.decoder.get_ref();
            if count > 0 || buffer.is_empty() || remaining.is_empty() {
                return Ok(count);
            }
            *self = Self::new(remaining)?;
        }
    }
}
