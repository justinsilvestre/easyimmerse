use std::io::{self, Read};

use thiserror::Error;

use super::archive_compression::{Compression, decompress, detect_compression, is_bzip2};
use super::source::SourceFile;

#[derive(Debug, Error)]
pub enum ArchiveError {
    #[error("{0:?} is compressed with bzip2, which is not supported yet")]
    UnsupportedBzip2(String),
    #[error("could not decompress {name:?}: {source}")]
    Decompress { name: String, source: io::Error },
    #[error("could not unpack the tar archive {name:?}: {source}")]
    Tar { name: String, source: io::Error },
}

const TAR_HEADER_SIZE: usize = 512;
const TAR_MAGIC_OFFSET: usize = 257;
const TAR_MAGIC: &[u8] = b"ustar";

/// Unpacks a tar archive, which may be compressed with gzip, xz, or zstd, into its member files.
/// Returns `None` for a file that is not a tar archive, including a lone compressed file such as a dictzip.
/// Directories, links, and other special members are left out.
pub fn unpack_tar_archive(file: &SourceFile) -> Result<Option<Vec<SourceFile>>, ArchiveError> {
    if is_bzip2(&file.bytes) {
        return Err(ArchiveError::UnsupportedBzip2(file.name.clone()));
    }
    let compression = detect_compression(&file.bytes);
    let decompress_error = |source| ArchiveError::Decompress {
        name: file.name.clone(),
        source,
    };
    let header = read_tar_header(compression, &file.bytes).map_err(decompress_error)?;
    if !is_tar_header(&header) {
        return Ok(None);
    }
    let reader = decompress(compression, &file.bytes).map_err(decompress_error)?;
    read_tar_members(reader)
        .map(Some)
        .map_err(|source| ArchiveError::Tar {
            name: file.name.clone(),
            source,
        })
}

fn read_tar_header(compression: Compression, bytes: &[u8]) -> io::Result<Vec<u8>> {
    let mut header = Vec::with_capacity(TAR_HEADER_SIZE);
    decompress(compression, bytes)?
        .take(TAR_HEADER_SIZE as u64)
        .read_to_end(&mut header)?;
    Ok(header)
}

fn is_tar_header(header: &[u8]) -> bool {
    header.len() == TAR_HEADER_SIZE && header[TAR_MAGIC_OFFSET..].starts_with(TAR_MAGIC)
}

fn read_tar_members(reader: impl Read) -> io::Result<Vec<SourceFile>> {
    let mut archive = tar::Archive::new(reader);
    let mut members = Vec::new();
    for entry in archive.entries()? {
        let mut entry = entry?;
        if entry.header().entry_type().is_file() {
            let name = member_name(&entry.path_bytes());
            let mut bytes = Vec::new();
            entry.read_to_end(&mut bytes)?;
            members.push(SourceFile { name, bytes });
        }
    }
    Ok(members)
}

fn member_name(path: &[u8]) -> String {
    let name = String::from_utf8_lossy(path);
    name.trim_start_matches("./")
        .trim_start_matches('/')
        .to_string()
}

#[cfg(test)]
mod tests {
    use std::io::Write;

    use flate2::Compression as GzipLevel;
    use flate2::write::GzEncoder;
    use lzma_rust2::{XzOptions, XzWriter};
    use ruzstd::encoding::{CompressionLevel, compress_to_vec};

    use super::*;

    fn tar_bytes() -> Vec<u8> {
        let mut builder = tar::Builder::new(Vec::new());
        let mut header = tar::Header::new_ustar();
        header.set_entry_type(tar::EntryType::Directory);
        header.set_size(0);
        builder
            .append_data(&mut header, "./dict/", io::empty())
            .unwrap();
        let mut header = tar::Header::new_ustar();
        header.set_size(5);
        builder
            .append_data(&mut header, "./dict/words.txt", &b"hello"[..])
            .unwrap();
        builder.into_inner().unwrap()
    }

    fn gzip(bytes: &[u8]) -> Vec<u8> {
        let mut encoder = GzEncoder::new(Vec::new(), GzipLevel::default());
        encoder.write_all(bytes).unwrap();
        encoder.finish().unwrap()
    }

    fn xz(bytes: &[u8]) -> Vec<u8> {
        let mut writer = XzWriter::new(Vec::new(), XzOptions::with_preset(1)).unwrap();
        writer.write_all(bytes).unwrap();
        writer.finish().unwrap()
    }

    fn unpack(name: &str, bytes: Vec<u8>) -> Option<Vec<SourceFile>> {
        let file = SourceFile {
            name: name.to_string(),
            bytes,
        };
        unpack_tar_archive(&file).unwrap()
    }

    fn words_file() -> Vec<SourceFile> {
        vec![SourceFile {
            name: "dict/words.txt".to_string(),
            bytes: b"hello".to_vec(),
        }]
    }

    #[test]
    fn unpacks_the_files_of_a_tar_archive() {
        assert_eq!(unpack("dict.tar", tar_bytes()), Some(words_file()));
    }

    #[test]
    fn unpacks_a_gzip_compressed_tar_archive() {
        assert_eq!(unpack("dict.tgz", gzip(&tar_bytes())), Some(words_file()));
    }

    #[test]
    fn unpacks_an_xz_compressed_tar_archive() {
        assert_eq!(unpack("dict.tar.xz", xz(&tar_bytes())), Some(words_file()));
    }

    #[test]
    fn unpacks_a_zstd_compressed_tar_archive() {
        let bytes = compress_to_vec(&tar_bytes()[..], CompressionLevel::Fastest);
        assert_eq!(unpack("dict.tar.zst", bytes), Some(words_file()));
    }

    #[test]
    fn unpacks_a_tar_archive_split_across_zstd_frames() {
        let tar = tar_bytes();
        let (first, second) = tar.split_at(700);
        let mut bytes = compress_to_vec(first, CompressionLevel::Fastest);
        bytes.extend(compress_to_vec(second, CompressionLevel::Fastest));
        assert_eq!(unpack("dict.tar.zst", bytes), Some(words_file()));
    }

    #[test]
    fn leaves_a_lone_gzip_file_packed() {
        assert_eq!(unpack("dict.dict.dz", gzip(b"definitions")), None);
    }

    #[test]
    fn leaves_a_plain_file_alone() {
        assert_eq!(unpack("words.csv", b"cat,neko".to_vec()), None);
    }

    #[test]
    fn rejects_a_bzip2_archive() {
        let file = SourceFile {
            name: "dict.tar.bz2".to_string(),
            bytes: b"BZh91AY&SY rest of the stream".to_vec(),
        };
        assert!(matches!(
            unpack_tar_archive(&file),
            Err(ArchiveError::UnsupportedBzip2(_))
        ));
    }

    #[test]
    fn rejects_a_corrupt_xz_file() {
        let file = SourceFile {
            name: "dict.tar.xz".to_string(),
            bytes: b"\xfd7zXZ\x00 truncated".to_vec(),
        };
        assert!(matches!(
            unpack_tar_archive(&file),
            Err(ArchiveError::Decompress { .. })
        ));
    }
}
