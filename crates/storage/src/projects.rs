use easyimmerse_core::media_file::MediaFile;
use easyimmerse_core::project::{Project, ProjectId, ProjectSettings, ProjectSummary};
use rusqlite::{Connection, OptionalExtension, params};

use crate::error::{StorageError, require_changed_row};
use crate::ids::generate_id;
use crate::media_files::list_media_files;

const PLACEHOLDER_PROJECTS: [(&str, &str, &str, &str); 2] = [
    (
        "placeholder-1",
        "Spanish practice",
        "es",
        "2026-01-01T00:00:00Z",
    ),
    (
        "placeholder-2",
        "Japanese drama",
        "ja",
        "2026-01-02T00:00:00Z",
    ),
];

/// Lists every project, most recently opened first.
pub fn list_projects(conn: &Connection) -> Result<Vec<ProjectSummary>, StorageError> {
    let mut statement = conn.prepare(
        "SELECT id, name, target_language, translation_language, created_at, last_opened_at
         FROM projects ORDER BY last_opened_at DESC, created_at DESC",
    )?;
    let projects = statement
        .query_map([], |row| {
            Ok(ProjectSummary {
                id: ProjectId(row.get(0)?),
                name: row.get(1)?,
                target_language: row.get(2)?,
                translation_language: row.get(3)?,
                created_at: row.get(4)?,
                last_opened_at: row.get(5)?,
            })
        })?
        .collect::<Result<_, _>>()?;
    Ok(projects)
}

/// Creates a project that has not been opened yet, so its `last_opened_at` equals `now`.
pub fn create_project(
    conn: &Connection,
    settings: &ProjectSettings,
    now: &str,
) -> Result<Project, StorageError> {
    let id = ProjectId(generate_id());
    conn.execute(
        "INSERT INTO projects (id, name, target_language, translation_language,
             flashcard_settings_json, created_at, last_opened_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        params![
            id.0,
            settings.name,
            settings.target_language,
            settings.translation_language,
            serde_json::to_string(&settings.flashcard_settings)?,
            now
        ],
    )?;
    get_project(conn, &id)
}

/// Loads a project with its media files and their subtitle tracks.
pub fn get_project(conn: &Connection, id: &ProjectId) -> Result<Project, StorageError> {
    let row = conn
        .query_row(
            "SELECT name, target_language, translation_language, flashcard_settings_json,
                 created_at, last_opened_at
             FROM projects WHERE id = ?1",
            params![id.0],
            read_project_row,
        )
        .optional()?
        .ok_or_else(|| StorageError::ProjectNotFound(id.0.clone()))?;
    let media = list_media_files(conn, id)?;
    row.into_project(id.clone(), media)
}

pub fn update_project_settings(
    conn: &Connection,
    id: &ProjectId,
    settings: &ProjectSettings,
) -> Result<Project, StorageError> {
    let changed = conn.execute(
        "UPDATE projects SET name = ?2, target_language = ?3, translation_language = ?4,
             flashcard_settings_json = ?5
         WHERE id = ?1",
        params![
            id.0,
            settings.name,
            settings.target_language,
            settings.translation_language,
            serde_json::to_string(&settings.flashcard_settings)?
        ],
    )?;
    require_changed_row(changed, StorageError::ProjectNotFound(id.0.clone()))?;
    get_project(conn, id)
}

pub fn mark_project_opened(
    conn: &Connection,
    id: &ProjectId,
    now: &str,
) -> Result<Project, StorageError> {
    let changed = conn.execute(
        "UPDATE projects SET last_opened_at = ?2 WHERE id = ?1",
        params![id.0, now],
    )?;
    require_changed_row(changed, StorageError::ProjectNotFound(id.0.clone()))?;
    get_project(conn, id)
}

/// Deletes a project together with its media files, subtitle tracks, and flashcards.
pub fn delete_project(conn: &Connection, id: &ProjectId) -> Result<(), StorageError> {
    let changed = conn.execute("DELETE FROM projects WHERE id = ?1", params![id.0])?;
    require_changed_row(changed, StorageError::ProjectNotFound(id.0.clone()))
}

pub fn ensure_project_exists(conn: &Connection, id: &ProjectId) -> Result<(), StorageError> {
    conn.query_row(
        "SELECT 1 FROM projects WHERE id = ?1",
        params![id.0],
        |_| Ok(()),
    )
    .optional()?
    .ok_or_else(|| StorageError::ProjectNotFound(id.0.clone()))
}

/// One project row with its flashcard settings still unparsed, so that the row callback
/// stays within rusqlite's error type.
struct ProjectRow {
    name: String,
    target_language: String,
    translation_language: String,
    flashcard_settings_json: String,
    created_at: String,
    last_opened_at: String,
}

impl ProjectRow {
    fn into_project(self, id: ProjectId, media: Vec<MediaFile>) -> Result<Project, StorageError> {
        Ok(Project {
            id,
            settings: ProjectSettings {
                name: self.name,
                target_language: self.target_language,
                translation_language: self.translation_language,
                flashcard_settings: serde_json::from_str(&self.flashcard_settings_json)?,
            },
            media,
            created_at: self.created_at,
            last_opened_at: self.last_opened_at,
        })
    }
}

fn read_project_row(row: &rusqlite::Row) -> rusqlite::Result<ProjectRow> {
    Ok(ProjectRow {
        name: row.get(0)?,
        target_language: row.get(1)?,
        translation_language: row.get(2)?,
        flashcard_settings_json: row.get(3)?,
        created_at: row.get(4)?,
        last_opened_at: row.get(5)?,
    })
}

/// Inserts two example projects when the table is empty, so that the placeholder screens
/// have something to show. Does nothing otherwise.
pub fn seed_placeholder_projects(conn: &Connection) -> Result<(), StorageError> {
    if count_projects(conn)? > 0 {
        return Ok(());
    }
    for (id, name, language, created_at) in PLACEHOLDER_PROJECTS {
        conn.execute(
            "INSERT INTO projects (id, name, target_language, created_at, last_opened_at)
             VALUES (?1, ?2, ?3, ?4, ?4)",
            params![id, name, language, created_at],
        )?;
    }
    Ok(())
}

fn count_projects(conn: &Connection) -> Result<i64, StorageError> {
    Ok(conn.query_row("SELECT COUNT(*) FROM projects", [], |row| row.get(0))?)
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::flashcard::{FlashcardPreset, FlashcardSettings};
    use easyimmerse_core::project::{ProjectId, ProjectSettings};

    use crate::test_support::{NOW as CREATED_AT, settings as krimi_settings};
    use crate::{Storage, StorageError};

    const OPENED_AT: &str = "2026-10-01T11:00:00.000Z";

    fn seeded_storage() -> Storage {
        let storage = Storage::open_in_memory().unwrap();
        storage.seed_placeholder_projects().unwrap();
        storage
    }

    fn settings(name: &str) -> ProjectSettings {
        ProjectSettings {
            name: name.to_string(),
            ..krimi_settings()
        }
    }

    fn missing() -> ProjectId {
        ProjectId("missing".to_string())
    }

    #[test]
    fn lists_nothing_from_an_empty_database() {
        let storage = Storage::open_in_memory().unwrap();
        assert_eq!(storage.list_projects().unwrap(), vec![]);
    }

    #[test]
    fn seeds_two_placeholder_projects() {
        assert_eq!(seeded_storage().list_projects().unwrap().len(), 2);
    }

    #[test]
    fn lists_the_most_recently_opened_project_first() {
        let projects = seeded_storage().list_projects().unwrap();
        assert_eq!(projects[0].name, "Japanese drama");
    }

    #[test]
    fn seeds_only_once() {
        let storage = seeded_storage();
        storage.seed_placeholder_projects().unwrap();
        assert_eq!(storage.list_projects().unwrap().len(), 2);
    }

    #[test]
    fn seeds_projects_with_the_default_flashcard_settings() {
        let storage = seeded_storage();
        let project = storage
            .get_project(&ProjectId("placeholder-1".to_string()))
            .unwrap();
        assert_eq!(
            project.settings.flashcard_settings,
            FlashcardSettings::for_preset(FlashcardPreset::Intermediate)
        );
    }

    #[test]
    fn creates_a_project_with_the_given_settings() {
        let storage = Storage::open_in_memory().unwrap();
        let project = storage
            .create_project(&settings("Krimi"), CREATED_AT)
            .unwrap();
        assert_eq!(project.settings, settings("Krimi"));
    }

    #[test]
    fn a_new_project_was_last_opened_when_it_was_created() {
        let storage = Storage::open_in_memory().unwrap();
        let project = storage
            .create_project(&settings("Krimi"), CREATED_AT)
            .unwrap();
        assert_eq!(project.last_opened_at, CREATED_AT);
    }

    #[test]
    fn gets_a_created_project() {
        let storage = Storage::open_in_memory().unwrap();
        let created = storage
            .create_project(&settings("Krimi"), CREATED_AT)
            .unwrap();
        assert_eq!(storage.get_project(&created.id).unwrap(), created);
    }

    #[test]
    fn getting_an_unknown_project_fails() {
        let storage = Storage::open_in_memory().unwrap();
        assert!(matches!(
            storage.get_project(&missing()),
            Err(StorageError::ProjectNotFound(_))
        ));
    }

    #[test]
    fn updates_the_settings_of_a_project() {
        let storage = Storage::open_in_memory().unwrap();
        let created = storage
            .create_project(&settings("Krimi"), CREATED_AT)
            .unwrap();
        let updated = storage
            .update_project_settings(&created.id, &settings("Tatort"))
            .unwrap();
        assert_eq!(updated.settings.name, "Tatort");
    }

    #[test]
    fn updating_an_unknown_project_fails() {
        let storage = Storage::open_in_memory().unwrap();
        assert!(matches!(
            storage.update_project_settings(&missing(), &settings("Tatort")),
            Err(StorageError::ProjectNotFound(_))
        ));
    }

    #[test]
    fn marking_a_project_opened_records_the_time() {
        let storage = Storage::open_in_memory().unwrap();
        let created = storage
            .create_project(&settings("Krimi"), CREATED_AT)
            .unwrap();
        let opened = storage.mark_project_opened(&created.id, OPENED_AT).unwrap();
        assert_eq!(opened.last_opened_at, OPENED_AT);
    }

    #[test]
    fn marking_an_unknown_project_opened_fails() {
        let storage = Storage::open_in_memory().unwrap();
        assert!(matches!(
            storage.mark_project_opened(&missing(), OPENED_AT),
            Err(StorageError::ProjectNotFound(_))
        ));
    }

    #[test]
    fn deletes_a_project() {
        let storage = Storage::open_in_memory().unwrap();
        let created = storage
            .create_project(&settings("Krimi"), CREATED_AT)
            .unwrap();
        storage.delete_project(&created.id).unwrap();
        assert!(storage.list_projects().unwrap().is_empty());
    }

    #[test]
    fn deleting_an_unknown_project_fails() {
        let storage = Storage::open_in_memory().unwrap();
        assert!(matches!(
            storage.delete_project(&missing()),
            Err(StorageError::ProjectNotFound(_))
        ));
    }
}
