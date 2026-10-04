//! The MDict format: an `.mdx` file of entries, optional `.mdd` files of resources, and an optional `.css` file.
//!
//! Versions 1.2 and 2.0 are supported. The reader follows the format description published with
//! writemdict (MIT licence) and streams each file, holding only its keys and one record block in memory.

mod block;
mod byte_cursor;
mod entry_conversion;
mod error;
mod header;
mod header_attributes;
mod key_info;
mod key_info_cipher;
mod key_section;
mod mdict_file;
mod media;
mod metadata;
mod record_section;
mod record_text;
mod redirects;
mod stylesheet;
#[cfg(test)]
mod test_writer;
mod text_encoding;

pub use error::MdictError;

use super::error::DictionaryError;
use super::format::DictionaryFormat;
use super::metadata::DictionaryFormatKind;
use super::sink::DictionarySink;
use super::source::DictionarySource;
use entry_conversion::EntryConversion;
use mdict_file::{FileKind, MdictFile};
use redirects::{RedirectCollector, Redirects};

pub struct MdictFormat;

impl DictionaryFormat for MdictFormat {
    fn kind(&self) -> DictionaryFormatKind {
        DictionaryFormatKind::Mdict
    }

    fn matches(&self, source: &DictionarySource) -> bool {
        find_mdx(source).is_some()
    }

    /// Reads the `.mdx` twice: first to gather redirects, then to stream entries with their redirects attached.
    fn import(
        &self,
        source: &mut DictionarySource,
        sink: &mut dyn DictionarySink,
    ) -> Result<(), DictionaryError> {
        let mdx_name = find_mdx(source)
            .ok_or(DictionaryError::UnrecognizedFormat)?
            .to_string();
        let (header, redirects) = collect_redirects(source, &mdx_name)?;
        let stylesheet = metadata::read_stylesheet(source, &mdx_name)?;
        sink.begin(metadata::build_metadata(&header, &mdx_name, stylesheet))?;
        stream_entries(source, &mdx_name, &redirects, sink)?;
        media::import_media(source, sink)
    }
}

fn find_mdx(source: &DictionarySource) -> Option<&str> {
    source.find(|name| name.to_ascii_lowercase().ends_with(".mdx"))
}

fn collect_redirects(
    source: &mut DictionarySource,
    mdx_name: &str,
) -> Result<(header::Header, Redirects), DictionaryError> {
    let file = MdictFile::open(source.open(mdx_name)?, FileKind::Entries)?;
    let header = file.header.clone();
    let mut collector = RedirectCollector::new(file.encoding);
    file.for_each_record(|group, record| {
        collector.visit(group, record);
        Ok::<(), MdictError>(())
    })?;
    Ok((header, collector.finish()))
}

fn stream_entries(
    source: &mut DictionarySource,
    mdx_name: &str,
    redirects: &Redirects,
    sink: &mut dyn DictionarySink,
) -> Result<(), DictionaryError> {
    let file = MdictFile::open(source.open(mdx_name)?, FileKind::Entries)?;
    let conversion = EntryConversion::new(&file.header, file.encoding, redirects);
    file.for_each_record(|group, record| {
        if let Some(entry) = conversion.convert(group, record) {
            sink.term_entry(entry)?;
        }
        Ok::<(), DictionaryError>(())
    })
}
