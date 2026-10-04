//! The Yomitan dictionary format: an `index.json` with the metadata, and banks of rows in JSON files
//! named `<kind>_N.json`, together with optional `styles.css` and media files.

mod bank;
mod bank_import;
mod error;
mod frequency;
mod glossary;
mod glossary_text;
mod index;
mod kanji_bank;
mod media;
mod row_fields;
mod row_layout;
mod tag_bank;
mod term_bank;
mod term_meta_bank;
#[cfg(test)]
mod test_source;

pub use error::YomitanError;

use super::error::DictionaryError;
use super::format::DictionaryFormat;
use super::metadata::DictionaryFormatKind;
use super::sink::DictionarySink;
use super::source::DictionarySource;
use bank::json_error;
use bank_import::import_banks;
use index::Index;
use media::import_media;
use row_layout::RowLayout;

pub struct YomitanFormat;

const INDEX: &str = "index.json";
const STYLESHEET: &str = "styles.css";

impl DictionaryFormat for YomitanFormat {
    fn kind(&self) -> DictionaryFormatKind {
        DictionaryFormatKind::Yomitan
    }

    fn matches(&self, source: &DictionarySource) -> bool {
        source.find(|name| name == INDEX).is_some()
    }

    fn import(
        &self,
        source: &mut DictionarySource,
        sink: &mut dyn DictionarySink,
    ) -> Result<(), DictionaryError> {
        let layout = import_index(source, sink)?;
        import_banks(source, sink, layout)?;
        import_media(source, sink)
    }
}

/// Sends the metadata to the sink, followed by any tag definitions in the index.
fn import_index(
    source: &mut DictionarySource,
    sink: &mut dyn DictionarySink,
) -> Result<RowLayout, DictionaryError> {
    let mut index = read_index(source)?;
    let layout = index.row_layout()?;
    let tags = index.take_tags();
    sink.begin(index.into_metadata(read_stylesheet(source)?))?;
    for tag in tags {
        sink.tag(tag)?;
    }
    Ok(layout)
}

fn read_index(source: &mut DictionarySource) -> Result<Index, DictionaryError> {
    let name = source
        .find(|name| name == INDEX)
        .ok_or_else(|| DictionaryError::MissingFile(INDEX.into()))?
        .to_string();
    serde_json::from_slice(&source.read(&name)?).map_err(|error| json_error(&name, error))
}

fn read_stylesheet(source: &mut DictionarySource) -> Result<Option<String>, DictionaryError> {
    let Some(name) = source.find(|name| name == STYLESHEET).map(String::from) else {
        return Ok(None);
    };
    Ok(Some(
        String::from_utf8_lossy(&source.read(&name)?).into_owned(),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::{Definition, Dictionary, TermEntry, parse_dictionary};
    use crate::test_support::read_fixture_bytes;
    use test_source::source_of;

    fn fixture_source() -> DictionarySource {
        DictionarySource::single(
            "sample-yomitan.zip",
            read_fixture_bytes("sample-yomitan.zip"),
        )
        .unwrap()
    }

    fn fixture() -> Dictionary {
        parse_dictionary(&mut fixture_source()).unwrap()
    }

    fn fixture_entry(term: &str) -> TermEntry {
        fixture()
            .entries
            .into_iter()
            .find(|entry| entry.term == term)
            .unwrap()
    }

    #[test]
    fn matches_the_yomitan_fixture() {
        assert!(YomitanFormat.matches(&fixture_source()));
    }

    #[test]
    fn does_not_match_files_without_an_index() {
        assert!(!YomitanFormat.matches(&source_of(&[("term_bank_1.json", "[]")])));
    }

    #[test]
    fn reads_the_title_of_the_fixture() {
        assert_eq!(fixture().metadata.title, "Sample Dictionary");
    }

    #[test]
    fn reads_the_stylesheet_of_the_fixture() {
        let stylesheet = fixture().metadata.stylesheet.unwrap();
        assert!(stylesheet.contains("list-style-type"));
    }

    #[test]
    fn reads_every_term_entry_of_the_fixture() {
        assert_eq!(fixture().entries.len(), 5);
    }

    #[test]
    fn reads_the_word_classes_of_a_verb() {
        assert_eq!(fixture_entry("食べる").word_classes, vec!["v1"]);
    }

    #[test]
    fn reads_structured_content_from_the_fixture() {
        assert!(matches!(
            fixture_entry("本").definitions[0],
            Definition::Structured { .. }
        ));
    }

    #[test]
    fn reads_every_glossary_item_of_the_fixture() {
        assert_eq!(fixture_entry("本").definitions.len(), 3);
    }

    #[test]
    fn reads_a_form_of_item_from_the_fixture() {
        assert_eq!(
            fixture_entry("食べた").definitions,
            vec![Definition::FormOf {
                base: "食べる".into(),
                inflections: vec!["past".into()],
            }]
        );
    }

    #[test]
    fn reads_the_tags_of_the_fixture() {
        assert_eq!(fixture().tags.len(), 3);
    }

    #[test]
    fn reads_the_term_meta_of_the_fixture() {
        assert_eq!(fixture().term_meta.len(), 5);
    }

    #[test]
    fn reads_the_kanji_of_the_fixture() {
        assert_eq!(fixture().kanji_entries[0].character, "猫");
    }

    #[test]
    fn reads_the_kanji_meta_of_the_fixture() {
        assert_eq!(fixture().kanji_meta.len(), 1);
    }

    #[test]
    fn reads_a_dictionary_of_format_1() {
        let mut source = source_of(&[
            ("index.json", r#"{"title": "Old", "version": 1}"#),
            ("term_bank_1.json", r#"[["猫", "ねこ", "n", "", 0, "cat"]]"#),
        ]);
        let dictionary = parse_dictionary(&mut source).unwrap();
        assert_eq!(
            dictionary.entries[0].definitions,
            vec![Definition::text("cat")]
        );
    }

    #[test]
    fn rejects_a_term_row_without_a_term() {
        let mut source = source_of(&[
            ("index.json", r#"{"title": "Broken", "format": 3}"#),
            ("term_bank_1.json", "[[1]]"),
        ]);
        assert!(matches!(
            parse_dictionary(&mut source),
            Err(DictionaryError::Yomitan(YomitanError::MalformedRow {
                row: 0,
                ..
            }))
        ));
    }

    #[test]
    fn rejects_an_index_that_is_not_json() {
        let mut source = source_of(&[("index.json", "{")]);
        assert!(matches!(
            parse_dictionary(&mut source),
            Err(DictionaryError::Yomitan(YomitanError::Json { .. }))
        ));
    }
}
