//! The StarDict dictionary format: an `.ifo` file with the metadata, an `.idx` index of headwords,
//! a `.dict` file (often dictzip-compressed as `.dict.dz`) with the entries, an optional `.syn` file of synonyms,
//! and an optional `res/` directory of media.

mod byte_cursor;
mod conversion;
mod dict_data;
mod dictzip;
mod dictzip_chunks;
mod entries;
mod error;
mod fields;
mod files;
mod headword_groups;
mod idx;
mod ifo;
mod ifo_metadata;
mod media;
mod resource_list;
mod syn;

pub use error::StardictError;

use super::{
    DictionaryError, DictionaryFormat, DictionaryFormatKind, DictionaryMetadata, DictionarySink,
    DictionarySource,
};
use byte_cursor::decode_text;
use entries::import_entries;
use files::{StardictFiles, is_ifo_name};
use ifo::Ifo;
use media::import_media;

/// Reads the first StarDict dictionary in a source. Tree dictionaries and WordNet dictionaries are rejected.
pub struct StardictFormat;

impl DictionaryFormat for StardictFormat {
    fn kind(&self) -> DictionaryFormatKind {
        DictionaryFormatKind::Stardict
    }

    fn matches(&self, source: &DictionarySource) -> bool {
        source.find(is_ifo_name).is_some()
    }

    fn import(
        &self,
        source: &mut DictionarySource,
        sink: &mut dyn DictionarySink,
    ) -> Result<(), DictionaryError> {
        let files = StardictFiles::locate(source)?;
        let ifo = Ifo::parse(&source.read(&files.ifo)?)?;
        sink.begin(read_metadata(source, &files, &ifo)?)?;
        import_entries(source, &files, &ifo, sink)?;
        import_media(source, &files.resource_prefix, sink)
    }
}

fn read_metadata(
    source: &mut DictionarySource,
    files: &StardictFiles,
    ifo: &Ifo,
) -> Result<DictionaryMetadata, DictionaryError> {
    let mut metadata = ifo.metadata(files.base_name());
    if let Some(name) = &files.stylesheet {
        metadata.stylesheet = Some(decode_text(&source.read(name)?));
    }
    Ok(metadata)
}

#[cfg(test)]
mod tests;
