use std::collections::BTreeMap;
use std::path::Path;

use easyimmerse_core::dictionary::{
    Definition, DictionaryError, DictionaryFormatKind, DictionaryMedia, DictionaryMetadata,
    DictionarySink, DictionarySource, Frequency, FrequencyMode, KanjiEntry, KanjiMeta,
    StructuredContent, TagDefinition, TermEntry, TermMeta, TermMetaData,
};

use super::importer::import_with;
use super::{DictionaryCounts, DictionaryId};
use crate::{Storage, StorageError};

type Reader = Box<dyn FnOnce(&mut dyn DictionarySink) -> Result<(), DictionaryError>>;

fn import(storage: &Storage, read: Reader) -> Result<DictionaryId, StorageError> {
    storage.with_connection(|conn| import_with(conn, 1_000, read))
}

fn metadata(title: &str, format: DictionaryFormatKind) -> DictionaryMetadata {
    DictionaryMetadata::new(title, format)
}

fn entry(term: &str, reading: Option<&str>, definition: &str) -> TermEntry {
    let mut entry = TermEntry::new(term, vec![Definition::text(definition)]);
    entry.reading = reading.map(String::from);
    entry
}

fn tag(name: &str) -> TagDefinition {
    TagDefinition {
        name: name.to_string(),
        category: "partOfSpeech".to_string(),
        order: 1,
        notes: format!("{name} notes"),
        score: 0,
    }
}

fn full_entry() -> TermEntry {
    let mut entry = entry("食べる", Some("たべる"), "to eat");
    entry.alternates = vec!["喰べる".to_string()];
    entry.word_classes = vec!["v1".to_string(), "vt".to_string()];
    entry.score = 7;
    entry.sequence = Some(1_358_280);
    entry.term_tags = vec!["P".to_string()];
    entry.definition_tags = vec!["v1".to_string()];
    entry.definitions.push(Definition::Structured {
        content: StructuredContent::Text("to consume".to_string()),
    });
    entry
}

fn frequency(term: &str, value: f64) -> TermMeta {
    TermMeta {
        term: term.to_string(),
        reading: None,
        data: TermMetaData::Frequency(Frequency {
            value: Some(value),
            display: None,
        }),
    }
}

fn kanji(character: &str) -> KanjiEntry {
    KanjiEntry {
        character: character.to_string(),
        onyomi: vec!["ビョウ".to_string()],
        kunyomi: vec!["ねこ".to_string()],
        tags: vec!["jouyou".to_string()],
        meanings: vec!["cat".to_string()],
        stats: BTreeMap::from([("strokes".to_string(), "11".to_string())]),
    }
}

/// A Yomitan dictionary with one item of every kind.
fn japanese_dictionary() -> Reader {
    Box::new(|sink| {
        sink.begin(metadata("Japanese", DictionaryFormatKind::Yomitan))?;
        sink.tag(tag("P"))?;
        sink.tag(tag("jouyou"))?;
        sink.tag(tag("strokes"))?;
        sink.term_entry(full_entry())?;
        sink.term_entry(entry("猫", Some("ねこ"), "cat"))?;
        sink.term_meta(frequency("猫", 120.0))?;
        sink.kanji_entry(kanji("猫"))?;
        sink.kanji_meta(KanjiMeta {
            character: "猫".to_string(),
            frequency: Frequency {
                value: Some(1_702.0),
                display: None,
            },
        })?;
        sink.media(DictionaryMedia {
            path: "img/cat.png".to_string(),
            media_type: "image/png".to_string(),
            bytes: vec![137, 80, 78, 71],
        })?;
        Ok(())
    })
}

fn english_dictionary() -> Reader {
    Box::new(|sink| {
        sink.begin(metadata("English", DictionaryFormatKind::Stardict))?;
        let mut cat = entry("Cat", None, "a small feline");
        cat.alternates = vec!["kitty".to_string()];
        sink.term_entry(cat)?;
        sink.term_entry(entry("猫", None, "cat, in Japanese"))?;
        Ok(())
    })
}

fn storage_with(readers: Vec<Reader>) -> (Storage, Vec<DictionaryId>) {
    let storage = Storage::open_in_memory().unwrap();
    let ids = readers
        .into_iter()
        .map(|read| import(&storage, read).unwrap())
        .collect();
    (storage, ids)
}

fn found_terms(storage: &Storage, headword: &str) -> Vec<String> {
    storage
        .find_dictionary_entries(&[headword.to_string()])
        .unwrap()
        .into_iter()
        .map(|found| found.entry.term)
        .collect()
}

fn fixture_source() -> DictionarySource {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/sample-yomitan.zip");
    DictionarySource::single("sample-yomitan.zip", std::fs::read(path).unwrap()).unwrap()
}

#[test]
fn generates_a_32_character_hex_id() {
    assert_eq!(DictionaryId::generate().0.len(), 32);
}

#[test]
fn generates_distinct_ids() {
    assert_ne!(DictionaryId::generate(), DictionaryId::generate());
}

#[test]
fn imports_the_yomitan_fixture_with_its_title() {
    let storage = Storage::open_in_memory().unwrap();
    let id = storage.import_dictionary(&mut fixture_source()).unwrap();
    assert_eq!(
        storage.get_dictionary(&id).unwrap().metadata.title,
        "Sample Dictionary"
    );
}

#[test]
fn finds_an_entry_of_the_yomitan_fixture() {
    let storage = Storage::open_in_memory().unwrap();
    storage.import_dictionary(&mut fixture_source()).unwrap();
    let found = storage
        .find_dictionary_entries(&["猫".to_string()])
        .unwrap();
    assert_eq!(found[0].entry.definitions, vec![Definition::text("cat")]);
}

#[test]
fn rejects_files_that_no_format_recognizes() {
    let storage = Storage::open_in_memory().unwrap();
    let mut source = DictionarySource::single("notes.pdf", b"hello".to_vec()).unwrap();
    assert!(matches!(
        storage.import_dictionary(&mut source),
        Err(StorageError::Dictionary(
            DictionaryError::UnrecognizedFormat
        ))
    ));
}

#[test]
fn stores_nothing_when_the_format_fails_midway() {
    let storage = Storage::open_in_memory().unwrap();
    let _ = import(
        &storage,
        Box::new(|sink| {
            sink.begin(metadata("Broken", DictionaryFormatKind::Csv))?;
            sink.term_entry(entry("猫", None, "cat"))?;
            Err(DictionaryError::MissingFile("rest.csv".to_string()))
        }),
    );
    assert!(storage.list_dictionaries().unwrap().is_empty());
}

#[test]
fn refuses_content_sent_before_the_metadata() {
    let storage = Storage::open_in_memory().unwrap();
    let result = import(
        &storage,
        Box::new(|sink| Ok(sink.term_entry(entry("猫", None, "cat"))?)),
    );
    assert!(matches!(result, Err(StorageError::ImportOutOfOrder)));
}

#[test]
fn round_trips_every_field_of_an_entry() {
    let (storage, _) = storage_with(vec![japanese_dictionary()]);
    let found = storage
        .find_dictionary_entries(&["食べる".to_string()])
        .unwrap();
    assert_eq!(found[0].entry, full_entry());
}

#[test]
fn round_trips_the_metadata() {
    let storage = Storage::open_in_memory().unwrap();
    let mut stored = metadata("Frequencies", DictionaryFormatKind::Yomitan);
    stored.frequency_mode = Some(FrequencyMode::OccurrenceBased);
    stored.attribution = Some("© Example".to_string());
    let expected = stored.clone();
    let id = import(&storage, Box::new(move |sink| Ok(sink.begin(stored)?))).unwrap();
    assert_eq!(storage.get_dictionary(&id).unwrap().metadata, expected);
}

#[test]
fn records_the_import_time() {
    let (storage, ids) = storage_with(vec![japanese_dictionary()]);
    assert_eq!(storage.get_dictionary(&ids[0]).unwrap().imported_at, 1_000);
}

#[test]
fn counts_each_kind_of_row() {
    let (storage, ids) = storage_with(vec![japanese_dictionary()]);
    assert_eq!(
        storage.get_dictionary(&ids[0]).unwrap().counts,
        DictionaryCounts {
            entries: 2,
            term_meta: 1,
            tags: 3,
            kanji: 1,
            kanji_meta: 1,
            media: 1,
        }
    );
}

#[test]
fn lists_dictionaries_in_import_order() {
    let (storage, ids) = storage_with(vec![japanese_dictionary(), english_dictionary()]);
    let listed: Vec<DictionaryId> = storage
        .list_dictionaries()
        .unwrap()
        .into_iter()
        .map(|dictionary| dictionary.id)
        .collect();
    assert_eq!(listed, ids);
}

#[test]
fn finds_an_entry_by_its_reading() {
    let (storage, _) = storage_with(vec![japanese_dictionary()]);
    assert_eq!(found_terms(&storage, "たべる"), vec!["食べる"]);
}

#[test]
fn finds_an_entry_by_an_alternate() {
    let (storage, _) = storage_with(vec![english_dictionary()]);
    assert_eq!(found_terms(&storage, "kitty"), vec!["Cat"]);
}

#[test]
fn finds_an_entry_ignoring_ascii_case() {
    let (storage, _) = storage_with(vec![english_dictionary()]);
    assert_eq!(found_terms(&storage, "cAT"), vec!["Cat"]);
}

#[test]
fn reports_the_stored_headword_that_matched() {
    let (storage, _) = storage_with(vec![english_dictionary()]);
    let found = storage
        .find_dictionary_entries(&["cat".to_string()])
        .unwrap();
    assert_eq!(found[0].headword, "Cat");
}

#[test]
fn finds_entries_of_every_dictionary_in_import_order() {
    let (storage, _) = storage_with(vec![japanese_dictionary(), english_dictionary()]);
    let found = storage
        .find_dictionary_entries(&["猫".to_string()])
        .unwrap();
    let titles: Vec<&str> = found
        .iter()
        .map(|found| found.dictionary.title.as_str())
        .collect();
    assert_eq!(titles, vec!["Japanese", "English"]);
}

#[test]
fn finds_entries_for_several_headwords_at_once() {
    let (storage, _) = storage_with(vec![japanese_dictionary(), english_dictionary()]);
    let headwords = vec!["猫".to_string(), "kitty".to_string(), "犬".to_string()];
    assert_eq!(
        storage.find_dictionary_entries(&headwords).unwrap().len(),
        3
    );
}

#[test]
fn ranks_a_later_import_after_an_earlier_one() {
    let (storage, _) = storage_with(vec![japanese_dictionary(), english_dictionary()]);
    let found = storage
        .find_dictionary_entries(&["猫".to_string()])
        .unwrap();
    assert!(found[0].dictionary.rank < found[1].dictionary.rank);
}

#[test]
fn attaches_the_definitions_of_the_tags_an_entry_uses() {
    let (storage, _) = storage_with(vec![japanese_dictionary()]);
    let found = storage
        .find_dictionary_entries(&["食べる".to_string()])
        .unwrap();
    assert_eq!(found[0].tags, vec![tag("P")]);
}

#[test]
fn finds_the_term_meta_of_a_term() {
    let (storage, _) = storage_with(vec![japanese_dictionary()]);
    let found = storage.find_term_meta(&["猫".to_string()]).unwrap();
    assert_eq!(found[0].meta, frequency("猫", 120.0));
}

#[test]
fn finds_a_kanji_entry() {
    let (storage, _) = storage_with(vec![japanese_dictionary()]);
    let found = storage.find_kanji(&["猫".to_string()]).unwrap();
    assert_eq!(found[0].entry, kanji("猫"));
}

#[test]
fn attaches_the_tags_that_name_kanji_stats() {
    let (storage, _) = storage_with(vec![japanese_dictionary()]);
    let found = storage.find_kanji(&["猫".to_string()]).unwrap();
    assert_eq!(found[0].tags, vec![tag("jouyou"), tag("strokes")]);
}

#[test]
fn finds_the_frequency_of_a_kanji() {
    let (storage, _) = storage_with(vec![japanese_dictionary()]);
    let found = storage.find_kanji_meta(&["猫".to_string()]).unwrap();
    assert_eq!(found[0].meta.frequency.value, Some(1_702.0));
}

#[test]
fn returns_a_stored_media_file() {
    let (storage, ids) = storage_with(vec![japanese_dictionary()]);
    let media = storage
        .get_dictionary_media(&ids[0], "img/cat.png")
        .unwrap();
    assert_eq!(media.bytes, vec![137, 80, 78, 71]);
}

#[test]
fn reports_a_missing_media_file() {
    let (storage, ids) = storage_with(vec![japanese_dictionary()]);
    assert!(matches!(
        storage.get_dictionary_media(&ids[0], "img/dog.png"),
        Err(StorageError::DictionaryMediaNotFound { .. })
    ));
}

#[test]
fn deleting_a_dictionary_removes_its_entries() {
    let (storage, ids) = storage_with(vec![japanese_dictionary(), english_dictionary()]);
    storage.delete_dictionary(&ids[0]).unwrap();
    assert_eq!(found_terms(&storage, "猫"), vec!["猫"]);
}

#[test]
fn deleting_a_dictionary_removes_its_term_meta() {
    let (storage, ids) = storage_with(vec![japanese_dictionary()]);
    storage.delete_dictionary(&ids[0]).unwrap();
    assert!(
        storage
            .find_term_meta(&["猫".to_string()])
            .unwrap()
            .is_empty()
    );
}

#[test]
fn deleting_a_dictionary_removes_its_media() {
    let (storage, ids) = storage_with(vec![japanese_dictionary()]);
    storage.delete_dictionary(&ids[0]).unwrap();
    assert!(
        storage
            .get_dictionary_media(&ids[0], "img/cat.png")
            .is_err()
    );
}

#[test]
fn deleting_a_dictionary_removes_its_headwords() {
    let (storage, ids) = storage_with(vec![japanese_dictionary()]);
    storage.delete_dictionary(&ids[0]).unwrap();
    let remaining: i64 = storage
        .with_connection(|conn| {
            Ok(
                conn.query_row("SELECT COUNT(*) FROM dictionary_headwords", [], |row| {
                    row.get(0)
                })?,
            )
        })
        .unwrap();
    assert_eq!(remaining, 0);
}

#[test]
fn deleting_an_unknown_dictionary_fails() {
    let storage = Storage::open_in_memory().unwrap();
    assert!(matches!(
        storage.delete_dictionary(&DictionaryId("missing".to_string())),
        Err(StorageError::DictionaryNotFound(_))
    ));
}
