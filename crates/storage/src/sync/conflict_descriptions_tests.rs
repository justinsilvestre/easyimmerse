//! Naming synced rows, and what they belong to, for a conflict notice.

use easyimmerse_core::media_file::{MediaFile, MediaFileSource};

use super::conflict_descriptions::{RowNames, describe_row};
use super::tables::SyncTable;
use crate::Storage;
use crate::review_test_support::{launch, make_flashcard, project, seeded_storage};

fn describe(storage: &Storage, table: SyncTable, key: &str) -> RowNames {
    storage
        .write(|conn| describe_row(conn, &launch(), table, key, None))
        .unwrap()
}

fn project_name(storage: &Storage) -> String {
    storage.get_project(&project()).unwrap().settings.name
}

fn add_document(storage: &Storage) -> MediaFile {
    storage
        .add_media_file(
            &project(),
            "Der Prozess.epub",
            &MediaFileSource::Path {
                path: "/books/Der Prozess.epub".to_string(),
            },
        )
        .unwrap()
}

#[test]
fn names_a_flashcard_by_its_word() {
    let storage = seeded_storage();
    let flashcard = make_flashcard(&storage, &project(), "fressen");
    assert_eq!(
        describe(&storage, SyncTable::Flashcards, &flashcard.0).description,
        "the flashcard \u{201c}fressen\u{201d}"
    );
}

#[test]
fn names_the_project_of_a_flashcard() {
    let storage = seeded_storage();
    let flashcard = make_flashcard(&storage, &project(), "Haus");
    assert_eq!(
        describe(&storage, SyncTable::Flashcards, &flashcard.0).project_name,
        Some(project_name(&storage))
    );
}

#[test]
fn names_the_project_of_its_settings() {
    let storage = seeded_storage();
    assert_eq!(
        describe(&storage, SyncTable::Projects, &project().0).project_name,
        Some(project_name(&storage))
    );
}

#[test]
fn names_a_preference_in_plain_words() {
    let storage = seeded_storage();
    assert_eq!(
        describe(&storage, SyncTable::Preferences, "showTranslations").description,
        "whether translations are shown"
    );
}

#[test]
fn names_the_document_of_a_reading_position() {
    let storage = seeded_storage();
    let key = format!("readingLocation:{}", add_document(&storage).id.0);
    assert_eq!(
        describe(&storage, SyncTable::Preferences, &key)
            .media_file_name
            .as_deref(),
        Some("Der Prozess.epub")
    );
}

#[test]
fn names_the_project_of_a_reading_position() {
    let storage = seeded_storage();
    let key = format!("readingLocation:{}", add_document(&storage).id.0);
    assert_eq!(
        describe(&storage, SyncTable::Preferences, &key).project_name,
        Some(project_name(&storage))
    );
}

#[test]
fn names_a_media_file_by_its_name() {
    let storage = seeded_storage();
    let media_file = add_document(&storage);
    assert_eq!(
        describe(&storage, SyncTable::MediaFiles, &media_file.id.0)
            .media_file_name
            .as_deref(),
        Some("Der Prozess.epub")
    );
}

#[test]
fn names_the_reading_position_of_a_document_not_here_without_its_name() {
    let storage = seeded_storage();
    assert_eq!(
        describe(&storage, SyncTable::Preferences, "readingLocation:missing").description,
        "the reading position in a document"
    );
}

#[test]
fn names_a_row_of_an_unknown_project_without_it() {
    let storage = seeded_storage();
    assert_eq!(
        describe(&storage, SyncTable::Flashcards, "missing"),
        RowNames {
            description: "a flashcard".to_string(),
            project_name: None,
            media_file_name: None,
        }
    );
}
