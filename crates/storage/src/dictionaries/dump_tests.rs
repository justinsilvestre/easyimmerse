use std::path::Path;

use easyimmerse_core::dictionary::{DictionaryError, DictionarySource, SinkError};

use super::DictionaryId;
use super::dump::dump_dictionary;
use super::importer::import_into;
use crate::{OwnerId, Storage, StorageError};

fn fixture_source() -> DictionarySource {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/sample-yomitan.zip");
    DictionarySource::single("sample-yomitan.zip", std::fs::read(path).unwrap()).unwrap()
}

fn owner() -> OwnerId {
    OwnerId::launch()
}

/// The fixture imported into one database, and dumped from there into a second under the same id.
fn copied() -> (Storage, Storage, DictionaryId) {
    let original = Storage::open_in_memory().unwrap();
    let id = original
        .import_dictionary(&owner(), &mut fixture_source())
        .unwrap();
    let copy = Storage::open_in_memory().unwrap();
    copy.write(|conn| {
        let transaction = conn.transaction()?;
        original.read(|source| {
            import_into(&transaction, &owner(), 1_000, id.clone(), |sink| {
                dump_dictionary(source, &owner(), &id, sink)
                    .map_err(|error| DictionaryError::Sink(SinkError(Box::new(error))))
            })
        })?;
        transaction.commit()?;
        Ok(())
    })
    .unwrap();
    (original, copy, id)
}

fn headwords() -> Vec<String> {
    ["猫", "犬", "食べる", "本", "食べた", "たべる"]
        .map(String::from)
        .to_vec()
}

#[test]
fn a_copied_dictionary_keeps_its_counts() {
    let (original, copy, id) = copied();
    assert_eq!(
        copy.get_dictionary(&id).unwrap().counts,
        original.get_dictionary(&id).unwrap().counts
    );
}

#[test]
fn a_copied_dictionary_finds_the_same_entries() {
    let (original, copy, _) = copied();
    assert_eq!(
        copy.find_dictionary_entries(&owner(), &headwords())
            .unwrap(),
        original
            .find_dictionary_entries(&owner(), &headwords())
            .unwrap()
    );
}

#[test]
fn a_copied_dictionary_finds_the_same_term_meta() {
    let (original, copy, _) = copied();
    assert_eq!(
        copy.find_term_meta(&owner(), &headwords()).unwrap(),
        original.find_term_meta(&owner(), &headwords()).unwrap()
    );
}

#[test]
fn a_copied_dictionary_finds_the_same_kanji() {
    let (original, copy, _) = copied();
    let characters = vec!["猫".to_string()];
    assert_eq!(
        copy.find_kanji(&owner(), &characters).unwrap(),
        original.find_kanji(&owner(), &characters).unwrap()
    );
}

#[test]
fn a_copied_dictionary_finds_the_same_kanji_frequencies() {
    let (original, copy, _) = copied();
    let characters = vec!["猫".to_string()];
    assert_eq!(
        copy.find_kanji_meta(&owner(), &characters).unwrap(),
        original.find_kanji_meta(&owner(), &characters).unwrap()
    );
}

#[test]
fn a_copied_dictionary_keeps_its_media() {
    let (original, copy, id) = copied();
    assert_eq!(
        copy.get_dictionary_media(&id, "images/cat.png").unwrap(),
        original
            .get_dictionary_media(&id, "images/cat.png")
            .unwrap()
    );
}

#[test]
fn a_copied_dictionary_keeps_its_metadata() {
    let (original, copy, id) = copied();
    assert_eq!(
        copy.get_dictionary(&id).unwrap().metadata,
        original.get_dictionary(&id).unwrap().metadata
    );
}

#[test]
fn another_owners_dictionary_is_not_dumped() {
    let storage = Storage::open_in_memory().unwrap();
    let id = storage
        .import_dictionary(&owner(), &mut fixture_source())
        .unwrap();
    let other = OwnerId("someone".to_string());
    let mut collector = easyimmerse_core::dictionary::DumpLineCollector::default();
    let dumped = storage.read(|conn| dump_dictionary(conn, &other, &id, &mut collector));
    assert!(matches!(dumped, Err(StorageError::DictionaryNotFound(_))));
}

#[test]
fn a_given_id_that_is_stored_already_is_refused() {
    let storage = Storage::open_in_memory().unwrap();
    let id = storage
        .import_dictionary(&owner(), &mut fixture_source())
        .unwrap();
    let again = storage.write(|conn| {
        let transaction = conn.transaction()?;
        import_into(&transaction, &owner(), 1_000, id.clone(), |_| Ok(()))
    });
    assert!(matches!(again, Err(StorageError::DictionaryExists(_))));
}
