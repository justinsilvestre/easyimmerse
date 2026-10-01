use std::io::{Cursor, Read};

use serde::Deserialize;
use serde::de::DeserializeOwned;
use zip::ZipArchive;
use zip::result::ZipError;

use super::dictionary_asset::media_type_for_path;
use super::error::DictionaryError;
use super::format::DictionaryFormat;
use super::yomitan_term_bank::read_term_banks;
use super::{Dictionary, DictionaryAsset};

/// The Yomitan dictionary format, version 3.
/// Its archive holds an `index.json` with the metadata and an optional `styles.css`.
/// The entries live in term banks: files named `term_bank_N.json`, each a JSON array of entry rows.
/// Media files, such as images, are referred to by path from glossary items.
pub struct YomitanFormat;

pub(super) type Archive<'a> = ZipArchive<Cursor<&'a [u8]>>;

const INDEX_NAME: &str = "index.json";
const STYLESHEET_NAME: &str = "styles.css";

impl DictionaryFormat for YomitanFormat {
    fn name(&self) -> &'static str {
        "yomitan"
    }

    fn matches(&self, archive: &mut Archive) -> bool {
        archive.index_for_name(INDEX_NAME).is_some()
    }

    fn parse(&self, archive: &mut Archive) -> Result<Dictionary, DictionaryError> {
        let index: Index = read_json(archive, INDEX_NAME)?;
        check_version(&index)?;
        Ok(Dictionary {
            title: index.title,
            revision: index.revision,
            source_language: index.source_language,
            target_language: index.target_language,
            entries: read_term_banks(archive)?,
            stylesheet: read_stylesheet(archive)?,
            assets: read_assets(archive)?,
        })
    }
}

#[derive(Deserialize)]
struct Index {
    title: String,
    revision: Option<String>,
    format: Option<u32>,
    /// Older dictionaries state the format version under this key instead of `format`.
    version: Option<u32>,
    #[serde(rename = "sourceLanguage")]
    source_language: Option<String>,
    #[serde(rename = "targetLanguage")]
    target_language: Option<String>,
}

const SUPPORTED_VERSION: u32 = 3;

fn check_version(index: &Index) -> Result<(), DictionaryError> {
    match index.format.or(index.version) {
        Some(SUPPORTED_VERSION) => Ok(()),
        other => Err(DictionaryError::UnsupportedVersion(other.unwrap_or(1))),
    }
}

fn read_stylesheet(archive: &mut Archive) -> Result<Option<String>, DictionaryError> {
    if archive.index_for_name(STYLESHEET_NAME).is_none() {
        return Ok(None);
    }
    let bytes = read_bytes(archive, STYLESHEET_NAME)?;
    Ok(Some(String::from_utf8_lossy(&bytes).into_owned()))
}

/// Reads every file that is not part of the dictionary's data, such as images.
fn read_assets(archive: &mut Archive) -> Result<Vec<DictionaryAsset>, DictionaryError> {
    let names: Vec<String> = archive
        .file_names()
        .filter(|name| is_asset(name))
        .map(String::from)
        .collect();
    names
        .into_iter()
        .map(|path| {
            Ok(DictionaryAsset {
                bytes: read_bytes(archive, &path)?,
                media_type: media_type_for_path(&path).to_string(),
                path,
            })
        })
        .collect()
}

/// Reports whether an archive entry is a media file.
/// Directories, the index, the stylesheet, and the term, kanji, tag, and meta banks are not.
fn is_asset(name: &str) -> bool {
    let is_bank = !name.contains('/') && name.contains("_bank_") && name.ends_with(".json");
    !(name.ends_with('/') || name == INDEX_NAME || name == STYLESHEET_NAME || is_bank)
}

/// Reads and parses a JSON entry of the archive.
pub(super) fn read_json<T: DeserializeOwned>(
    archive: &mut Archive,
    name: &str,
) -> Result<T, DictionaryError> {
    // Parsing the decompressed bytes is much faster than parsing from the decompressing reader.
    let bytes = read_bytes(archive, name)?;
    serde_json::from_slice(&bytes).map_err(|source| DictionaryError::Json {
        name: name.to_string(),
        source,
    })
}

fn read_bytes(archive: &mut Archive, name: &str) -> Result<Vec<u8>, DictionaryError> {
    let mut file = archive.by_name(name)?;
    let mut bytes = Vec::with_capacity(usize::try_from(file.size()).unwrap_or(0));
    file.read_to_end(&mut bytes).map_err(ZipError::from)?;
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::{DetailedGlossary, Glossary, TermEntry};
    use crate::test_support::read_fixture_bytes;

    fn parse_fixture(name: &str) -> Dictionary {
        let bytes = read_fixture_bytes(name);
        let mut archive = ZipArchive::new(Cursor::new(bytes.as_slice())).expect("a zip archive");
        YomitanFormat
            .parse(&mut archive)
            .expect("fixture should parse")
    }

    fn sample() -> Dictionary {
        parse_fixture("sample-yomitan.zip")
    }

    fn structured() -> Dictionary {
        parse_fixture("sample-yomitan-structured.zip")
    }

    #[test]
    fn matches_the_yomitan_fixture() {
        let bytes = read_fixture_bytes("sample-yomitan.zip");
        let mut archive = ZipArchive::new(Cursor::new(bytes.as_slice())).unwrap();
        assert!(YomitanFormat.matches(&mut archive));
    }

    #[test]
    fn reads_the_title_of_the_yomitan_fixture() {
        assert_eq!(sample().title, "Sample Dictionary");
    }

    #[test]
    fn reads_the_revision_of_the_yomitan_fixture() {
        assert_eq!(sample().revision, Some("2026-09-30".into()));
    }

    #[test]
    fn leaves_the_source_language_empty_when_the_index_omits_it() {
        assert_eq!(sample().source_language, None);
    }

    #[test]
    fn reads_the_source_language_from_the_index() {
        assert_eq!(
            parse_fixture("sample-yomitan-en.zip").source_language,
            Some("en".into())
        );
    }

    #[test]
    fn reads_the_target_language_from_the_index() {
        assert_eq!(
            parse_fixture("sample-yomitan-en.zip").target_language,
            Some("de".into())
        );
    }

    #[test]
    fn reads_the_first_entry_of_the_yomitan_fixture() {
        assert_eq!(
            sample().entries[0].to_term_entry(),
            TermEntry {
                term: "猫".into(),
                reading: Some("ねこ".into()),
                definitions: vec![Glossary::Text("cat".into())],
                tags: vec!["n".into()],
            }
        );
    }

    #[test]
    fn reads_every_entry_of_the_structured_fixture() {
        assert_eq!(structured().entries.len(), 3);
    }

    #[test]
    fn keeps_a_structured_content_item() {
        let entry = structured().entries[0].to_term_entry();
        assert!(matches!(
            entry.definitions[0],
            Glossary::Detailed(DetailedGlossary::StructuredContent { .. })
        ));
    }

    #[test]
    fn keeps_every_kind_of_glossary_item() {
        assert_eq!(structured().entries[1].to_term_entry().definitions.len(), 3);
    }

    #[test]
    fn reads_the_stylesheet() {
        assert!(
            structured()
                .stylesheet
                .unwrap()
                .contains("part-of-speech-info")
        );
    }

    #[test]
    fn has_no_stylesheet_when_the_archive_has_none() {
        assert_eq!(sample().stylesheet, None);
    }

    #[test]
    fn reads_only_the_image_as_an_asset() {
        let paths: Vec<String> = structured().assets.into_iter().map(|a| a.path).collect();
        assert_eq!(paths, vec!["img/cat.svg"]);
    }

    #[test]
    fn gives_the_image_its_media_type() {
        assert_eq!(structured().assets[0].media_type, "image/svg+xml");
    }

    #[test]
    fn skips_directory_entries() {
        assert!(!is_asset("jitendex/graphics/"));
    }
}
