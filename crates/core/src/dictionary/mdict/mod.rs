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
#[cfg(test)]
mod import_tests;
mod key_comparison;
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
use key_comparison::KeyComparison;
use mdict_file::{FileKind, MdictFile};
use redirects::RedirectCollector;

pub struct MdictFormat;

impl DictionaryFormat for MdictFormat {
    fn kind(&self) -> DictionaryFormatKind {
        DictionaryFormatKind::Mdict
    }

    fn matches(&self, source: &DictionarySource) -> bool {
        find_mdx(source).is_some()
    }

    fn import(
        &self,
        source: &mut DictionarySource,
        sink: &mut dyn DictionarySink,
    ) -> Result<(), DictionaryError> {
        let mdx_name = find_mdx(source)
            .ok_or(DictionaryError::UnrecognizedFormat)?
            .to_string();
        let stylesheet = metadata::read_stylesheet(source, &mdx_name)?;
        import_entries(source, &mdx_name, stylesheet, sink)?;
        media::import_media(source, sink)
    }
}

fn find_mdx(source: &DictionarySource) -> Option<&str> {
    source.find(|name| name.to_ascii_lowercase().ends_with(".mdx"))
}

/// Reads the `.mdx` in one pass, decompressing each record block once.
/// Entries are sent as they are read; the keys that redirect to them follow once every record is known,
/// since a redirect may come before or after its target.
fn import_entries(
    source: &mut DictionarySource,
    mdx_name: &str,
    stylesheet: Option<String>,
    sink: &mut dyn DictionarySink,
) -> Result<(), DictionaryError> {
    let file = MdictFile::open(source.open(mdx_name)?, FileKind::Entries)?;
    sink.begin(metadata::build_metadata(&file.header, mdx_name, stylesheet))?;
    let conversion = EntryConversion::new(&file.header, file.encoding);
    let comparison = KeyComparison::from_header(&file.header);
    let mut redirects = RedirectCollector::new(file.encoding, comparison);
    file.for_each_record(|group, record| {
        if redirects.visit_record(group, record) {
            return Ok(());
        }
        if let Some(entry) = conversion.convert(group, record) {
            redirects.visit_entry(group);
            sink.term_entry(entry)?;
        }
        Ok::<(), DictionaryError>(())
    })?;
    for (term, sources) in redirects.finish() {
        sink.term_alternates(term, conversion.spellings(&sources))?;
    }
    Ok(())
}
