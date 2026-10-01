use std::path::Path;

use easyimmerse_core::dictionary::{Dictionary, parse_dictionary};
use easyimmerse_core::flashcard::{FlashcardPreset, FlashcardSettings};
use easyimmerse_core::project::{ProjectId, ProjectSettings};

use crate::Storage;

pub const NOW: &str = "2026-10-01T10:00:00.000Z";

pub fn settings() -> ProjectSettings {
    ProjectSettings {
        name: "Krimi".to_string(),
        target_language: "de".to_string(),
        translation_language: "en".to_string(),
        flashcard_settings: FlashcardSettings::for_preset(FlashcardPreset::Beginner),
    }
}

pub fn storage_with_project() -> (Storage, ProjectId) {
    let storage = Storage::open_in_memory().unwrap();
    let project = storage.create_project(&settings(), NOW).unwrap();
    (storage, project.id)
}

/// Counts the rows of a table directly, to check what a cascading delete removed.
pub fn count_rows(storage: &Storage, table: &str) -> i64 {
    storage
        .with_connection(|conn| {
            Ok(
                conn.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| {
                    row.get(0)
                })?,
            )
        })
        .unwrap()
}

pub fn parse_dictionary_fixture(name: &str) -> Dictionary {
    let path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures")
        .join(name);
    parse_dictionary(&std::fs::read(path).unwrap()).unwrap()
}
