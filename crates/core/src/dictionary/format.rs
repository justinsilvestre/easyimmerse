use std::io::Cursor;

use zip::ZipArchive;

use super::Dictionary;
use super::error::DictionaryError;

/// A dictionary file format packaged as a zip archive.
///
/// Each supported format implements this trait and is listed in `registered_formats`, which
/// `parse_dictionary` consults in order. New formats such as StarDict are added the same way.
pub trait DictionaryFormat {
    fn name(&self) -> &'static str;

    /// Reports whether the archive looks like this format, without parsing it fully.
    fn matches(&self, archive: &mut ZipArchive<Cursor<&[u8]>>) -> bool;

    fn parse(&self, archive: &mut ZipArchive<Cursor<&[u8]>>)
    -> Result<Dictionary, DictionaryError>;
}
