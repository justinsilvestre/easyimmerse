use std::io::{self, Read};

use thiserror::Error;

use super::archive_compression::{Compression, decompress, detect_compression};
use super::source::SourceFile;

#[derive(Debug, Error)]
pub enum ArchiveError {
    #[error("could not decompress {name:?}: {source}")]
    Decompress { name: String, source: io::Error },
    #[error("could not unpack the tar archive {name:?}: {source}")]
    Tar { name: String, source: io::Error },
}

const TAR_HEADER_SIZE: usize = 512;
const TAR_MAGIC_OFFSET: usize = 257;
const TAR_MAGIC: &[u8] = b"ustar";
const BZIP2_EXTENSIONS: [&str; 2] = [".bz2", ".bz"];

/// Unpacks the files that a file holds: the members of a tar archive, which may be compressed with gzip, bzip2, xz, or zstd,
/// or the contents of a lone bzip2-compressed file, named without its `.bz2` extension.
/// Returns `None` for any other file, including a lone gzip file such as a dictzip, which its format reads itself.
/// Directories, links, and other special members of a tar archive are left out.
pub fn unpack_archive(file: &SourceFile) -> Result<Option<Vec<SourceFile>>, ArchiveError> {
    let compression = detect_compression(&file.bytes);
    let decompress_error = |source| ArchiveError::Decompress {
        name: file.name.clone(),
        source,
    };
    let mut reader = decompress(compression, &file.bytes).map_err(decompress_error)?;
    let header = read_tar_header(&mut reader).map_err(decompress_error)?;
    if is_tar_header(&header) {
        let tar_error = |source| ArchiveError::Tar {
            name: file.name.clone(),
            source,
        };
        return read_tar_members(header.as_slice().chain(reader))
            .map(Some)
            .map_err(tar_error);
    }
    if !matches!(compression, Compression::Bzip2) {
        return Ok(None);
    }
    let bytes = read_rest(header, reader).map_err(decompress_error)?;
    let name = strip_bzip2_extension(&file.name).to_string();
    Ok(Some(vec![SourceFile { name, bytes }]))
}

fn read_tar_header(reader: &mut impl Read) -> io::Result<Vec<u8>> {
    let mut header = Vec::with_capacity(TAR_HEADER_SIZE);
    reader
        .take(TAR_HEADER_SIZE as u64)
        .read_to_end(&mut header)?;
    Ok(header)
}

fn read_rest(mut start: Vec<u8>, mut reader: impl Read) -> io::Result<Vec<u8>> {
    reader.read_to_end(&mut start)?;
    Ok(start)
}

fn strip_bzip2_extension(name: &str) -> &str {
    BZIP2_EXTENSIONS
        .iter()
        .find_map(|extension| name.strip_suffix(extension))
        .unwrap_or(name)
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
    use crate::test_support::read_fixture_bytes;

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
        unpack_archive(&file).unwrap()
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
    fn unpacks_a_bzip2_compressed_tar_archive() {
        let bytes = read_fixture_bytes("sample-stardict.tar.bz2");
        let members = unpack("sample-stardict.tar.bz2", bytes).unwrap();
        assert!(
            members
                .iter()
                .any(|member| member.name == "sample-stardict/sample.ifo")
        );
    }

    /// `cat,neko` and a line break, compressed with bzip2.
    const BZIP2_WORDS: &[u8] = b"BZh91AY&SY\x0d\x17\x4f\x60\x00\x00\x01\xd1\x80\x00\x10\x00\x04\x2a\x09\x84\x00\x20\x00\x22\x01\xa6\xd4\x20\xc9\x88\x62\xc1\xf0\x78\xbb\x92\x29\xc2\x84\x80\x68\xba\x7b\x00";

    #[test]
    fn decompresses_a_lone_bzip2_file_under_its_name_without_the_extension() {
        let expected = vec![SourceFile {
            name: "words.csv".to_string(),
            bytes: b"cat,neko\n".to_vec(),
        }];
        assert_eq!(
            unpack("words.csv.bz2", BZIP2_WORDS.to_vec()),
            Some(expected)
        );
    }

    /// `cat,` and `neko` with a line break, compressed with bzip2 as two streams, as parallel compressors write them.
    const BZIP2_WORDS_IN_TWO_STREAMS: &[u8] = b"BZh91AY&SY\xb6\x2f\x96\xbd\x00\x00\x01\x11\x80\x00\x04\x28\x00\x04\x00\x20\x00\x21\x9a\x68\x33\x4d\x17\x3c\x5d\xc9\x14\xe1\x42\x42\xd8\xbe\x5a\xf4BZh91AY&SY\x67\x5f\x9c\x1e\x00\x00\x01\xc1\x00\x00\x10\x02\x09\xa0\x00\x30\xcd\x00\xc1\xa0\x6c\x71\x77\x24\x53\x85\x09\x06\x75\xf9\xc1\xe0";

    #[test]
    fn decompresses_every_stream_of_a_bzip2_file() {
        let files = unpack("words.csv.bz2", BZIP2_WORDS_IN_TWO_STREAMS.to_vec()).unwrap();
        assert_eq!(files[0].bytes, b"cat,neko\n");
    }

    #[test]
    fn leaves_a_text_file_that_starts_like_bzip2_alone() {
        assert_eq!(
            unpack("notes.txt", b"BZh9 is a bzip2 header".to_vec()),
            None
        );
    }

    #[test]
    fn rejects_a_corrupt_bzip2_file() {
        let file = SourceFile {
            name: "dict.tar.bz2".to_string(),
            bytes: b"BZh91AY&SY rest of the stream".to_vec(),
        };
        assert!(matches!(
            unpack_archive(&file),
            Err(ArchiveError::Decompress { .. })
        ));
    }

    #[test]
    fn rejects_a_corrupt_xz_file() {
        let file = SourceFile {
            name: "dict.tar.xz".to_string(),
            bytes: b"\xfd7zXZ\x00 truncated".to_vec(),
        };
        assert!(matches!(
            unpack_archive(&file),
            Err(ArchiveError::Decompress { .. })
        ));
    }
}
