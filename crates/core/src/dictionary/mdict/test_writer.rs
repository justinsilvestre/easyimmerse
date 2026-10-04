//! Writes small MDict files for tests, following the same format description as the reader.

use std::io::Write;

use flate2::Compression;
use flate2::write::ZlibEncoder;

use super::block::{BlockSize, LZO, NO_COMPRESSION, ZLIB};
use super::header::FormatVersion;
use super::key_info_cipher::encrypt_key_info;
use super::text_encoding::TextEncoding;

/// The contents and layout choices of a test file. Override fields with struct update syntax.
#[derive(Debug, Clone)]
pub struct TestFile {
    pub version: FormatVersion,
    pub encoding: String,
    /// Keys and their records. Entry records are encoded and NUL-terminated; resource records are stored as UTF-8 bytes.
    pub entries: Vec<(String, String)>,
    /// Writes an `.mdd` resource file, whose keys are UTF-16LE.
    pub resources: bool,
    pub attributes: String,
    pub compression: u8,
    pub keys_per_block: usize,
    pub record_block_size: usize,
    pub encrypt_key_info: bool,
    pub corrupt_key_summary: bool,
}

impl TestFile {
    pub fn new(entries: &[(&str, &str)]) -> Self {
        Self {
            version: FormatVersion::V2,
            encoding: "UTF-8".into(),
            entries: entries
                .iter()
                .map(|(key, record)| (key.to_string(), record.to_string()))
                .collect(),
            resources: false,
            attributes: r#"Format="Html""#.into(),
            compression: ZLIB,
            keys_per_block: 100,
            record_block_size: 1 << 16,
            encrypt_key_info: false,
            corrupt_key_summary: false,
        }
    }

    pub fn write(&self) -> Vec<u8> {
        let encoding = self.key_encoding();
        let mut records = Vec::new();
        let mut keys = Vec::new();
        for (key, record) in &self.entries {
            keys.push((records.len() as u64, encoding.encode(key)));
            records.extend(self.encode_record(record, encoding));
        }
        let mut file = encode_header(&self.header_element());
        file.extend(self.key_section(&keys, encoding));
        file.extend(self.record_section(&records));
        file
    }

    fn key_encoding(&self) -> TextEncoding {
        if self.resources {
            TextEncoding::UTF_16LE
        } else {
            TextEncoding::from_label(&self.encoding).expect("test encoding should be known")
        }
    }

    fn encode_record(&self, record: &str, encoding: TextEncoding) -> Vec<u8> {
        if self.resources {
            return record.as_bytes().to_vec();
        }
        let mut bytes = encoding.encode(record);
        bytes.extend(vec![0; encoding.unit_width()]);
        bytes
    }

    fn header_element(&self) -> String {
        let (element, version) = match (self.resources, self.version) {
            (true, _) => ("Library_Data", "2.0"),
            (false, FormatVersion::V1) => ("Dictionary", "1.2"),
            (false, FormatVersion::V2) => ("Dictionary", "2.0"),
        };
        let encrypted = if self.encrypt_key_info { "2" } else { "No" };
        format!(
            r#"<{element} GeneratedByEngineVersion="{version}" Encoding="{}" Encrypted="{encrypted}" {}/>"#,
            self.encoding, self.attributes
        )
    }

    fn key_section(&self, keys: &[(u64, Vec<u8>)], encoding: TextEncoding) -> Vec<u8> {
        let width = self.version.number_width();
        let mut info = Vec::new();
        let mut blocks = Vec::new();
        let chunks: Vec<_> = keys.chunks(self.keys_per_block).collect();
        for chunk in &chunks {
            let mut decoded = Vec::new();
            for (offset, key) in *chunk {
                decoded.extend(number(*offset, width));
                decoded.extend(key);
                decoded.extend(vec![0; encoding.unit_width()]);
            }
            let stored = encode_block(&decoded, self.compression);
            let size = BlockSize {
                stored: stored.len() as u64,
                decompressed: decoded.len() as u64,
            };
            let first_and_last = (chunk[0].1.as_slice(), chunk[chunk.len() - 1].1.as_slice());
            info.extend(encode_key_info_item(
                self.version,
                encoding,
                chunk.len(),
                first_and_last,
                size,
            ));
            blocks.extend(stored);
        }
        let stored_info = self.store_key_info(&info);
        let mut summary_fields = vec![chunks.len() as u64, keys.len() as u64];
        if self.version == FormatVersion::V2 {
            summary_fields.push(info.len() as u64);
        }
        summary_fields.extend([stored_info.len() as u64, blocks.len() as u64]);
        let mut section = self.summary(&summary_fields);
        section.extend(stored_info);
        section.extend(blocks);
        section
    }

    fn store_key_info(&self, info: &[u8]) -> Vec<u8> {
        match self.version {
            FormatVersion::V1 => info.to_vec(),
            FormatVersion::V2 if self.encrypt_key_info => {
                encrypt_key_info(&encode_block(info, ZLIB))
            }
            FormatVersion::V2 => encode_block(info, ZLIB),
        }
    }

    /// Writes the key summary, which version 2.0 follows with a checksum.
    fn summary(&self, fields: &[u64]) -> Vec<u8> {
        let mut bytes: Vec<u8> = fields
            .iter()
            .flat_map(|&field| number(field, self.version.number_width()))
            .collect();
        if self.version == FormatVersion::V2 {
            let checksum = adler2::adler32_slice(&bytes) ^ u32::from(self.corrupt_key_summary);
            bytes.extend(checksum.to_be_bytes());
        }
        bytes
    }

    fn record_section(&self, records: &[u8]) -> Vec<u8> {
        let width = self.version.number_width();
        let mut index = Vec::new();
        let mut blocks = Vec::new();
        let chunks: Vec<_> = records.chunks(self.record_block_size).collect();
        for chunk in &chunks {
            let stored = encode_block(chunk, self.compression);
            index.extend(number(stored.len() as u64, width));
            index.extend(number(chunk.len() as u64, width));
            blocks.extend(stored);
        }
        let fields = [chunks.len(), self.entries.len(), index.len(), blocks.len()];
        let mut section: Vec<u8> = fields
            .iter()
            .flat_map(|&field| number(field as u64, width))
            .collect();
        section.extend(index);
        section.extend(blocks);
        section
    }
}

pub fn encode_header(element: &str) -> Vec<u8> {
    let text = TextEncoding::UTF_16LE.encode(&format!("{element}\r\n\0"));
    let mut bytes = (text.len() as u32).to_be_bytes().to_vec();
    bytes.extend(&text);
    bytes.extend(adler2::adler32_slice(&text).to_le_bytes());
    bytes
}

pub fn encode_block(data: &[u8], method: u8) -> Vec<u8> {
    let mut block = vec![method, 0, 0, 0];
    block.extend(adler2::adler32_slice(data).to_be_bytes());
    match method {
        NO_COMPRESSION => block.extend(data),
        LZO => block.extend(lzokay::compress::compress(data).expect("LZO should compress")),
        ZLIB => block.extend(zlib(data)),
        _ => panic!("unknown test compression method {method}"),
    }
    block
}

fn zlib(data: &[u8]) -> Vec<u8> {
    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(data).expect("zlib should compress");
    encoder.finish().expect("zlib should finish")
}

pub fn encode_key_info_item(
    version: FormatVersion,
    encoding: TextEncoding,
    entry_count: usize,
    (first, last): (&[u8], &[u8]),
    size: BlockSize,
) -> Vec<u8> {
    let width = version.number_width();
    let mut item = number(entry_count as u64, width);
    for key in [first, last] {
        let units = (key.len() / encoding.unit_width()) as u64;
        match version {
            FormatVersion::V1 => item.extend(number(units, 1)),
            FormatVersion::V2 => item.extend(number(units, 2)),
        }
        item.extend(key);
        if version == FormatVersion::V2 {
            item.extend(vec![0; encoding.unit_width()]);
        }
    }
    item.extend(number(size.stored, width));
    item.extend(number(size.decompressed, width));
    item
}

fn number(value: u64, width: usize) -> Vec<u8> {
    value.to_be_bytes()[8 - width..].to_vec()
}
