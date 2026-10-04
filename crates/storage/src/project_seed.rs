use easyimmerse_core::flashcard::FlashcardFieldKey;
use easyimmerse_core::project::{Project, ProjectId, ProjectSettings};
use rusqlite::Connection;

use crate::error::StorageError;
use crate::projects::{count_projects, insert_project};

/// 2026-01-01T00:00:00Z.
const FIRST_DAY_MS: u64 = 1_767_225_600_000;
const DAY_MS: u64 = 24 * 60 * 60 * 1000;

/// Each project's id, name, target language, and the days after the first on which it was
/// created and last opened.
const PLACEHOLDER_PROJECTS: [(&str, &str, &str, u64, u64); 2] = [
    ("placeholder-1", "Spanish practice", "es", 0, 2),
    ("placeholder-2", "Japanese drama", "ja", 1, 1),
];

/// Inserts two example projects when the table is empty, so that the screens have something
/// to show. Does nothing otherwise.
pub fn seed_placeholder_projects(conn: &Connection) -> Result<(), StorageError> {
    if count_projects(conn)? > 0 {
        return Ok(());
    }
    for (id, name, target_language, created_day, opened_day) in PLACEHOLDER_PROJECTS {
        insert_project(
            conn,
            &Project {
                id: ProjectId(id.to_string()),
                name: name.to_string(),
                settings: intermediate_settings(target_language),
                created_at_ms: FIRST_DAY_MS + created_day * DAY_MS,
                last_opened_at_ms: FIRST_DAY_MS + opened_day * DAY_MS,
            },
        )?;
    }
    Ok(())
}

fn intermediate_settings(target_language: &str) -> ProjectSettings {
    ProjectSettings {
        target_language: target_language.to_string(),
        translation_language: "en".to_string(),
        flashcard_fields: vec![
            FlashcardFieldKey::Word,
            FlashcardFieldKey::L1Definition,
            FlashcardFieldKey::TextContext,
            FlashcardFieldKey::TextContextTranslation,
            FlashcardFieldKey::AudioContext,
            FlashcardFieldKey::Screenshot,
            FlashcardFieldKey::Tags,
        ],
        default_tags: Vec::new(),
        tags_media_name: true,
        fills_audio_with_tts: false,
    }
}

#[cfg(test)]
mod tests {
    use crate::Storage;

    fn seeded_storage() -> Storage {
        let storage = Storage::open_in_memory().unwrap();
        storage.seed_placeholder_projects().unwrap();
        storage
    }

    #[test]
    fn seeds_two_placeholder_projects() {
        assert_eq!(seeded_storage().list_projects().unwrap().len(), 2);
    }

    #[test]
    fn seeds_only_once() {
        let storage = seeded_storage();
        storage.seed_placeholder_projects().unwrap();
        assert_eq!(storage.list_projects().unwrap().len(), 2);
    }

    #[test]
    fn opened_the_spanish_project_more_recently() {
        let projects = seeded_storage().list_projects().unwrap();
        assert!(projects[0].last_opened_at_ms > projects[1].last_opened_at_ms);
    }
}
