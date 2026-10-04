use easyimmerse_core::project::{Project, ProjectId, ProjectSettings, ProjectSummary};
use rusqlite::{Connection, OptionalExtension, Row, params};

use crate::error::StorageError;
use crate::stored_values::{now_ms, random_id, read_unsigned, to_stored_integer};

/// Lists every project with its media and flashcard counts, most recently opened first.
pub fn list_projects(conn: &Connection) -> Result<Vec<ProjectSummary>, StorageError> {
    let mut statement = conn.prepare(
        "SELECT p.id, p.name, \
             json_extract(p.settings_json, '$.target_language'), \
             json_extract(p.settings_json, '$.translation_language'), \
             p.created_at_ms, p.last_opened_at_ms, \
             (SELECT COUNT(*) FROM media_files m WHERE m.project_id = p.id), \
             (SELECT COUNT(*) FROM flashcards f WHERE f.project_id = p.id) \
         FROM projects p ORDER BY p.last_opened_at_ms DESC, p.rowid",
    )?;
    let projects = statement
        .query_map([], read_summary)?
        .collect::<Result<_, _>>()?;
    Ok(projects)
}

pub fn get_project(conn: &Connection, id: &ProjectId) -> Result<Project, StorageError> {
    let row = conn
        .query_row(
            "SELECT id, name, settings_json, created_at_ms, last_opened_at_ms \
             FROM projects WHERE id = ?1",
            params![id.0],
            read_project_row,
        )
        .optional()?
        .ok_or_else(|| StorageError::ProjectNotFound(id.0.clone()))?;
    row.into_project()
}

/// Creates a project that counts as opened at the moment it was created.
pub fn create_project(
    conn: &Connection,
    name: &str,
    settings: &ProjectSettings,
) -> Result<Project, StorageError> {
    let now = now_ms();
    let project = Project {
        id: ProjectId(random_id()),
        name: name.to_string(),
        settings: settings.clone(),
        created_at_ms: now,
        last_opened_at_ms: now,
    };
    insert_project(conn, &project)?;
    Ok(project)
}

pub fn insert_project(conn: &Connection, project: &Project) -> Result<(), StorageError> {
    conn.execute(
        "INSERT INTO projects (id, name, settings_json, created_at_ms, last_opened_at_ms) \
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            project.id.0,
            project.name,
            serde_json::to_string(&project.settings)?,
            to_stored_integer(project.created_at_ms),
            to_stored_integer(project.last_opened_at_ms),
        ],
    )?;
    Ok(())
}

pub fn update_project(
    conn: &Connection,
    id: &ProjectId,
    name: &str,
    settings: &ProjectSettings,
) -> Result<Project, StorageError> {
    let updated = conn.execute(
        "UPDATE projects SET name = ?2, settings_json = ?3 WHERE id = ?1",
        params![id.0, name, serde_json::to_string(settings)?],
    )?;
    ensure_one_row_changed(updated, id)?;
    get_project(conn, id)
}

/// Deletes a project together with everything that belongs to it.
pub fn delete_project(conn: &Connection, id: &ProjectId) -> Result<(), StorageError> {
    let deleted = conn.execute("DELETE FROM projects WHERE id = ?1", params![id.0])?;
    ensure_one_row_changed(deleted, id)
}

pub fn mark_project_opened(conn: &Connection, id: &ProjectId) -> Result<(), StorageError> {
    let updated = conn.execute(
        "UPDATE projects SET last_opened_at_ms = ?2 WHERE id = ?1",
        params![id.0, to_stored_integer(now_ms())],
    )?;
    ensure_one_row_changed(updated, id)
}

pub fn ensure_project_exists(conn: &Connection, id: &ProjectId) -> Result<(), StorageError> {
    let exists: bool = conn.query_row(
        "SELECT EXISTS (SELECT 1 FROM projects WHERE id = ?1)",
        params![id.0],
        |row| row.get(0),
    )?;
    ensure_one_row_changed(usize::from(exists), id)
}

pub fn count_projects(conn: &Connection) -> Result<i64, StorageError> {
    Ok(conn.query_row("SELECT COUNT(*) FROM projects", [], |row| row.get(0))?)
}

fn ensure_one_row_changed(changed: usize, id: &ProjectId) -> Result<(), StorageError> {
    if changed == 0 {
        Err(StorageError::ProjectNotFound(id.0.clone()))
    } else {
        Ok(())
    }
}

fn read_summary(row: &Row) -> rusqlite::Result<ProjectSummary> {
    Ok(ProjectSummary {
        id: ProjectId(row.get(0)?),
        name: row.get(1)?,
        target_language: row.get(2)?,
        translation_language: row.get(3)?,
        created_at_ms: read_unsigned(row, 4)?,
        last_opened_at_ms: read_unsigned(row, 5)?,
        media_count: read_unsigned(row, 6)?,
        flashcard_count: read_unsigned(row, 7)?,
    })
}

/// One project row with its settings still unparsed, so that the row callback stays within
/// rusqlite's error type.
struct ProjectRow {
    id: String,
    name: String,
    settings_json: String,
    created_at_ms: u64,
    last_opened_at_ms: u64,
}

impl ProjectRow {
    fn into_project(self) -> Result<Project, StorageError> {
        Ok(Project {
            id: ProjectId(self.id),
            name: self.name,
            settings: serde_json::from_str(&self.settings_json)?,
            created_at_ms: self.created_at_ms,
            last_opened_at_ms: self.last_opened_at_ms,
        })
    }
}

fn read_project_row(row: &Row) -> rusqlite::Result<ProjectRow> {
    Ok(ProjectRow {
        id: row.get(0)?,
        name: row.get(1)?,
        settings_json: row.get(2)?,
        created_at_ms: read_unsigned(row, 3)?,
        last_opened_at_ms: read_unsigned(row, 4)?,
    })
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::flashcard::FlashcardFieldKey;
    use easyimmerse_core::media_file::MediaFileSource;

    use super::*;
    use crate::Storage;

    fn seeded_storage() -> Storage {
        let storage = Storage::open_in_memory().unwrap();
        storage.seed_placeholder_projects().unwrap();
        storage
    }

    fn settings() -> ProjectSettings {
        ProjectSettings {
            target_language: "fr".to_string(),
            translation_language: "en".to_string(),
            flashcard_fields: vec![FlashcardFieldKey::Word],
            default_tags: vec!["french".to_string()],
            tags_media_name: false,
            fills_audio_with_tts: true,
        }
    }

    fn spanish() -> ProjectId {
        ProjectId("placeholder-1".to_string())
    }

    #[test]
    fn lists_nothing_from_an_empty_database() {
        let storage = Storage::open_in_memory().unwrap();
        assert_eq!(storage.list_projects().unwrap(), vec![]);
    }

    #[test]
    fn lists_the_most_recently_opened_project_first() {
        let projects = seeded_storage().list_projects().unwrap();
        assert_eq!(projects[0].name, "Spanish practice");
    }

    #[test]
    fn lists_the_languages_from_the_settings() {
        let projects = seeded_storage().list_projects().unwrap();
        assert_eq!(
            (
                projects[1].target_language.as_str(),
                projects[1].translation_language.as_str()
            ),
            ("ja", "en")
        );
    }

    #[test]
    fn counts_the_media_files_of_a_project() {
        let storage = seeded_storage();
        let source = MediaFileSource::Path {
            path: "/a.mp4".to_string(),
        };
        storage.add_media_file(&spanish(), "a", &source).unwrap();
        assert_eq!(storage.list_projects().unwrap()[0].media_count, 1);
    }

    #[test]
    fn gets_a_created_project() {
        let storage = seeded_storage();
        let created = storage.create_project("French", &settings()).unwrap();
        assert_eq!(storage.get_project(&created.id).unwrap(), created);
    }

    #[test]
    fn creates_a_project_as_just_opened() {
        let created = seeded_storage()
            .create_project("French", &settings())
            .unwrap();
        assert_eq!(created.last_opened_at_ms, created.created_at_ms);
    }

    #[test]
    fn lists_a_new_project_first() {
        let storage = seeded_storage();
        storage.create_project("French", &settings()).unwrap();
        assert_eq!(storage.list_projects().unwrap()[0].name, "French");
    }

    #[test]
    fn updates_the_settings_of_a_project() {
        let storage = seeded_storage();
        let updated = storage
            .update_project(&spanish(), "Renamed", &settings())
            .unwrap();
        assert_eq!(storage.get_project(&spanish()).unwrap(), updated);
    }

    #[test]
    fn updating_an_unknown_project_fails() {
        let result =
            seeded_storage().update_project(&ProjectId("missing".to_string()), "x", &settings());
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    #[test]
    fn reports_an_unknown_project_as_not_found() {
        let result = seeded_storage().get_project(&ProjectId("missing".to_string()));
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    #[test]
    fn marking_a_project_opened_lists_it_first() {
        let storage = seeded_storage();
        storage
            .mark_project_opened(&ProjectId("placeholder-2".to_string()))
            .unwrap();
        assert_eq!(storage.list_projects().unwrap()[0].name, "Japanese drama");
    }

    #[test]
    fn deletes_a_project() {
        let storage = seeded_storage();
        storage.delete_project(&spanish()).unwrap();
        assert_eq!(storage.list_projects().unwrap().len(), 1);
    }

    #[test]
    fn deleting_an_unknown_project_fails() {
        let result = seeded_storage().delete_project(&ProjectId("missing".to_string()));
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }
}
