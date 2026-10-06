use super::error::DictionaryError;
use super::metadata::DictionaryFormatKind;
use super::sink::DictionarySink;
use super::source::DictionarySource;

/// A dictionary file format.
///
/// Each supported format implements this trait and is listed in `registered_formats`,
/// which `import_dictionary` consults in order.
pub trait DictionaryFormat {
    fn kind(&self) -> DictionaryFormatKind;

    /// Reports whether the source looks like this format, judging by file names and headers only.
    fn matches(&self, source: &DictionarySource) -> bool;

    /// Reads the whole dictionary into the sink, starting with a call to `begin`.
    fn import(
        &self,
        source: &mut DictionarySource,
        sink: &mut dyn DictionarySink,
    ) -> Result<(), DictionaryError>;
}
