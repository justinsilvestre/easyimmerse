use easyimmerse_core::flashcard::FlashcardFieldKey;
use easyimmerse_core::project::{Project, ProjectId, ProjectSettings};
use rusqlite::{Connection, OptionalExtension, Row, params};

use crate::error::StorageError;
use crate::new_row::{generate_id, now_ms};
use crate::owners::OwnerId;
use crate::preferences::set_preference;
use crate::stored_integer::{read_json, read_unsigned, to_stored_integer};

/// The project columns followed by the counts, as every project query selects them.
/// Cards the user set aside from the review, as the database's clock finds them, are not counted.
const PROJECT_COLUMNS: &str = "p.id, p.name, p.target_language, p.translation_language, \
     p.flashcard_fields_json, p.default_tags_json, p.tags_media_name, p.fills_audio_with_tts, \
     p.flashcard_front_fields_json, p.lists_anki_deletions, p.created_at_ms, p.last_opened_at_ms, \
     p.uses_anki_connect, \
     (SELECT COUNT(*) FROM media_files m WHERE m.project_id = p.id), \
     (SELECT COUNT(*) FROM flashcards f WHERE f.project_id = p.id), \
     (SELECT COUNT(*) FROM flashcards f WHERE f.project_id = p.id \
      AND NOT EXISTS (SELECT 1 FROM review_cards r WHERE r.flashcard_id = f.id) \
      AND NOT EXISTS (SELECT 1 FROM review_holds h WHERE h.flashcard_id = f.id \
      AND (h.until_ms IS NULL OR h.until_ms > CAST(unixepoch('subsec') * 1000 AS INTEGER))))";

/// The preference under which seeding records the ids it gave the placeholder projects, as a JSON array.
pub const PLACEHOLDER_PROJECTS_PREFERENCE: &str = "placeholder_projects";

/// Lists the owner's projects, most recently opened first.
pub fn list_projects(conn: &Connection, owner: &OwnerId) -> Result<Vec<Project>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT {PROJECT_COLUMNS} FROM projects p WHERE p.owner_id = ?1 \
         ORDER BY p.last_opened_at_ms DESC, p.created_at_ms DESC, p.rowid DESC"
    ))?;
    let projects = statement
        .query_map(params![owner.0], read_project)?
        .collect::<Result<_, _>>()?;
    Ok(projects)
}

pub fn get_project(conn: &Connection, id: &ProjectId) -> Result<Project, StorageError> {
    conn.query_row(
        &format!("SELECT {PROJECT_COLUMNS} FROM projects p WHERE p.id = ?1"),
        params![id.0],
        read_project,
    )
    .optional()?
    .ok_or_else(|| StorageError::ProjectNotFound(id.0.clone()))
}

/// Creates a project of the owner with the settings and returns it with its new id and times.
pub fn create_project(
    conn: &Connection,
    owner: &OwnerId,
    settings: &ProjectSettings,
) -> Result<Project, StorageError> {
    let id = ProjectId(generate_id());
    insert_project(conn, owner, &id, settings, now_ms())?;
    get_project(conn, &id)
}

/// The owner of the project.
pub fn project_owner(conn: &Connection, id: &ProjectId) -> Result<OwnerId, StorageError> {
    conn.query_row(
        "SELECT owner_id FROM projects WHERE id = ?1",
        params![id.0],
        |row| row.get(0).map(OwnerId),
    )
    .optional()?
    .ok_or_else(|| StorageError::ProjectNotFound(id.0.clone()))
}

/// Replaces a project's settings and returns the project as it now stands.
pub fn update_project(
    conn: &Connection,
    id: &ProjectId,
    settings: &ProjectSettings,
) -> Result<Project, StorageError> {
    let updated = conn.execute(
        "UPDATE projects SET name = ?2, target_language = ?3, translation_language = ?4, \
         flashcard_fields_json = ?5, default_tags_json = ?6, tags_media_name = ?7, \
         fills_audio_with_tts = ?8, flashcard_front_fields_json = ?9, lists_anki_deletions = ?10 \
         WHERE id = ?1",
        rusqlite::params_from_iter(settings_params(id, settings)?),
    )?;
    if updated == 0 {
        return Err(StorageError::ProjectNotFound(id.0.clone()));
    }
    get_project(conn, id)
}

/// Records that the project was opened just now.
pub fn mark_project_opened(conn: &Connection, id: &ProjectId) -> Result<(), StorageError> {
    let updated = conn.execute(
        "UPDATE projects SET last_opened_at_ms = ?2 WHERE id = ?1",
        params![id.0, to_stored_integer(now_ms())],
    )?;
    if updated == 0 {
        return Err(StorageError::ProjectNotFound(id.0.clone()));
    }
    Ok(())
}

/// Turns AnkiConnect on or off for the project.
pub fn set_uses_anki_connect(
    conn: &Connection,
    id: &ProjectId,
    uses_anki_connect: bool,
) -> Result<(), StorageError> {
    let updated = conn.execute(
        "UPDATE projects SET uses_anki_connect = ?2 WHERE id = ?1",
        params![id.0, uses_anki_connect],
    )?;
    if updated == 0 {
        return Err(StorageError::ProjectNotFound(id.0.clone()));
    }
    Ok(())
}

/// Deletes a project together with everything that belongs to it.
pub fn delete_project(conn: &Connection, id: &ProjectId) -> Result<(), StorageError> {
    let deleted = conn.execute("DELETE FROM projects WHERE id = ?1", params![id.0])?;
    if deleted == 0 {
        return Err(StorageError::ProjectNotFound(id.0.clone()));
    }
    Ok(())
}

pub fn ensure_project_exists(conn: &Connection, id: &ProjectId) -> Result<(), StorageError> {
    let exists: bool = conn.query_row(
        "SELECT EXISTS (SELECT 1 FROM projects WHERE id = ?1)",
        params![id.0],
        |row| row.get(0),
    )?;
    if exists {
        Ok(())
    } else {
        Err(StorageError::ProjectNotFound(id.0.clone()))
    }
}

/// Gives the owner two example projects under the ids, in one transaction, when it has no project,
/// so that a new installation has something to show. Does nothing otherwise.
/// The ids are recorded under `PLACEHOLDER_PROJECTS_PREFERENCE`, so that the sample content finds the projects.
pub fn seed_placeholder_projects(
    conn: &mut Connection,
    owner: &OwnerId,
    ids: &[ProjectId; 2],
) -> Result<(), StorageError> {
    let transaction = conn.transaction()?;
    if count_projects(&transaction, owner)? > 0 {
        return Ok(());
    }
    for (id, (settings, created_at_ms)) in ids.iter().zip(placeholder_projects()) {
        insert_project(&transaction, owner, id, &settings, created_at_ms)?;
    }
    let recorded = serde_json::to_string(&ids.each_ref().map(|id| &id.0))?;
    set_preference(
        &transaction,
        owner,
        PLACEHOLDER_PROJECTS_PREFERENCE,
        &recorded,
    )?;
    Ok(transaction.commit()?)
}

/// The placeholder projects: "Spanish practice" created on 2026-01-01 and "Japanese drama" on 2026-01-02.
fn placeholder_projects() -> [(ProjectSettings, u64); 2] {
    [
        (
            placeholder_settings("Spanish practice", "es"),
            1_767_225_600_000,
        ),
        (
            placeholder_settings("Japanese drama", "ja"),
            1_767_312_000_000,
        ),
    ]
}

fn placeholder_settings(name: &str, target_language: &str) -> ProjectSettings {
    ProjectSettings {
        name: name.to_string(),
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
        default_tags: vec![],
        tags_media_name: true,
        fills_audio_with_tts: false,
        flashcard_front_fields: vec![
            FlashcardFieldKey::AudioContext,
            FlashcardFieldKey::Screenshot,
        ],
        lists_anki_deletions: true,
    }
}

fn insert_project(
    conn: &Connection,
    owner: &OwnerId,
    id: &ProjectId,
    settings: &ProjectSettings,
    created_at_ms: u64,
) -> Result<(), StorageError> {
    let mut values = settings_params(id, settings)?;
    values.push(Box::new(to_stored_integer(created_at_ms)));
    values.push(Box::new(owner.0.clone()));
    conn.execute(
        "INSERT INTO projects (id, name, target_language, translation_language, \
         flashcard_fields_json, default_tags_json, tags_media_name, fills_audio_with_tts, \
         flashcard_front_fields_json, lists_anki_deletions, created_at_ms, last_opened_at_ms, \
         owner_id) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11, ?12)",
        rusqlite::params_from_iter(values),
    )?;
    Ok(())
}

/// The id followed by the settings columns, as both the insert and the update bind them.
fn settings_params(
    id: &ProjectId,
    settings: &ProjectSettings,
) -> Result<Vec<Box<dyn rusqlite::ToSql>>, StorageError> {
    Ok(vec![
        Box::new(id.0.clone()),
        Box::new(settings.name.clone()),
        Box::new(settings.target_language.clone()),
        Box::new(settings.translation_language.clone()),
        Box::new(serde_json::to_string(&settings.flashcard_fields)?),
        Box::new(serde_json::to_string(&settings.default_tags)?),
        Box::new(settings.tags_media_name),
        Box::new(settings.fills_audio_with_tts),
        Box::new(serde_json::to_string(&settings.flashcard_front_fields)?),
        Box::new(settings.lists_anki_deletions),
    ])
}

fn count_projects(conn: &Connection, owner: &OwnerId) -> Result<i64, StorageError> {
    Ok(conn.query_row(
        "SELECT COUNT(*) FROM projects WHERE owner_id = ?1",
        params![owner.0],
        |row| row.get(0),
    )?)
}

fn read_project(row: &Row) -> rusqlite::Result<Project> {
    Ok(Project {
        id: ProjectId(row.get(0)?),
        settings: ProjectSettings {
            name: row.get(1)?,
            target_language: row.get(2)?,
            translation_language: row.get(3)?,
            flashcard_fields: read_json(row, 4)?,
            default_tags: read_json(row, 5)?,
            tags_media_name: row.get(6)?,
            fills_audio_with_tts: row.get(7)?,
            flashcard_front_fields: read_json(row, 8)?,
            lists_anki_deletions: row.get(9)?,
        },
        created_at_ms: read_unsigned(row, 10)?,
        last_opened_at_ms: read_unsigned(row, 11)?,
        uses_anki_connect: row.get(12)?,
        media_count: read_unsigned(row, 13)?,
        flashcard_count: read_unsigned(row, 14)?,
        unreviewed_count: read_unsigned(row, 15)?,
    })
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::media_file::MediaFileSource;

    use super::*;
    use crate::Storage;

    fn seeded_storage() -> Storage {
        let storage = Storage::open_in_memory().unwrap();
        crate::review_test_support::seed_known_placeholder_projects(&storage);
        storage
    }

    fn settings(name: &str) -> ProjectSettings {
        placeholder_settings(name, "de")
    }

    #[test]
    fn lists_nothing_from_an_empty_database() {
        let storage = Storage::open_in_memory().unwrap();
        assert_eq!(
            storage.list_projects(&crate::OwnerId::launch()).unwrap(),
            vec![]
        );
    }

    #[test]
    fn seeds_two_placeholder_projects() {
        assert_eq!(
            seeded_storage()
                .list_projects(&crate::OwnerId::launch())
                .unwrap()
                .len(),
            2
        );
    }

    #[test]
    fn lists_the_most_recently_opened_project_first() {
        let projects = seeded_storage()
            .list_projects(&crate::OwnerId::launch())
            .unwrap();
        assert_eq!(projects[0].settings.name, "Japanese drama");
    }

    #[test]
    fn seeds_only_once() {
        let storage = seeded_storage();
        crate::review_test_support::seed_known_placeholder_projects(&storage);
        assert_eq!(
            storage
                .list_projects(&crate::OwnerId::launch())
                .unwrap()
                .len(),
            2
        );
    }

    #[test]
    fn lists_only_the_projects_of_the_owner() {
        let storage = Storage::open_in_memory().unwrap();
        let account = crate::review_test_support::account_owner(&storage);
        storage
            .create_project(&account, &settings("German"))
            .unwrap();
        assert_eq!(storage.list_projects(&OwnerId::launch()).unwrap(), vec![]);
    }

    #[test]
    fn seeds_the_placeholder_projects_of_an_owner_that_has_none() {
        let storage = seeded_storage();
        let account = crate::review_test_support::account_owner(&storage);
        storage.seed_placeholder_projects(&account).unwrap();
        assert_eq!(storage.list_projects(&account).unwrap().len(), 2);
    }

    #[test]
    fn gives_placeholder_projects_new_ids() {
        let storage = Storage::open_in_memory().unwrap();
        storage
            .seed_placeholder_projects(&OwnerId::launch())
            .unwrap();
        let projects = storage.list_projects(&OwnerId::launch()).unwrap();
        assert!(projects.iter().all(|project| project.id.0.len() == 32));
    }

    #[test]
    fn records_the_ids_of_the_placeholder_projects() {
        let recorded = seeded_storage()
            .get_preference(&OwnerId::launch(), PLACEHOLDER_PROJECTS_PREFERENCE)
            .unwrap();
        assert_eq!(
            recorded.as_deref(),
            Some(r#"["placeholder-1","placeholder-2"]"#)
        );
    }

    #[test]
    fn a_created_project_keeps_its_settings() {
        let storage = Storage::open_in_memory().unwrap();
        let created = storage
            .create_project(&crate::OwnerId::launch(), &settings("German"))
            .unwrap();
        assert_eq!(created.settings, settings("German"));
    }

    #[test]
    fn a_created_project_is_listed() {
        let storage = Storage::open_in_memory().unwrap();
        let created = storage
            .create_project(&crate::OwnerId::launch(), &settings("German"))
            .unwrap();
        assert_eq!(
            storage.list_projects(&crate::OwnerId::launch()).unwrap(),
            vec![created]
        );
    }

    #[test]
    fn a_new_project_counts_as_opened_when_created() {
        let storage = Storage::open_in_memory().unwrap();
        let created = storage
            .create_project(&crate::OwnerId::launch(), &settings("German"))
            .unwrap();
        assert_eq!(created.last_opened_at_ms, created.created_at_ms);
    }

    #[test]
    fn updating_replaces_the_settings() {
        let storage = Storage::open_in_memory().unwrap();
        let created = storage
            .create_project(&crate::OwnerId::launch(), &settings("German"))
            .unwrap();
        let updated = storage
            .update_project(&created.id, &settings("Deutsch"))
            .unwrap();
        assert_eq!(updated.settings.name, "Deutsch");
    }

    #[test]
    fn updating_an_unknown_project_fails() {
        let result = Storage::open_in_memory()
            .unwrap()
            .update_project(&ProjectId("missing".to_string()), &settings("x"));
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    #[test]
    fn marking_a_project_opened_moves_it_to_the_front() {
        let storage = seeded_storage();
        storage
            .mark_project_opened(&ProjectId("placeholder-1".to_string()))
            .unwrap();
        let projects = storage.list_projects(&crate::OwnerId::launch()).unwrap();
        assert_eq!(projects[0].settings.name, "Spanish practice");
    }

    #[test]
    fn marking_an_unknown_project_opened_fails() {
        let result = seeded_storage().mark_project_opened(&ProjectId("missing".to_string()));
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    #[test]
    fn counts_the_media_files_of_the_project() {
        let storage = seeded_storage();
        let id = ProjectId("placeholder-1".to_string());
        storage
            .add_media_file(
                &id,
                "a.mp4",
                &MediaFileSource::Path {
                    path: "/a.mp4".to_string(),
                },
            )
            .unwrap();
        assert_eq!(storage.get_project(&id).unwrap().media_count, 1);
    }

    #[test]
    fn getting_an_unknown_project_fails() {
        let result = seeded_storage().get_project(&ProjectId("missing".to_string()));
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    #[test]
    fn seeds_placeholder_projects_with_the_audio_and_the_screenshot_on_the_front() {
        let project = seeded_storage()
            .get_project(&ProjectId("placeholder-1".to_string()))
            .unwrap();
        assert_eq!(
            project.settings.flashcard_front_fields,
            vec![
                FlashcardFieldKey::AudioContext,
                FlashcardFieldKey::Screenshot
            ]
        );
    }

    #[test]
    fn a_created_project_does_not_use_anki_connect() {
        let storage = Storage::open_in_memory().unwrap();
        let created = storage
            .create_project(&crate::OwnerId::launch(), &settings("German"))
            .unwrap();
        assert!(!created.uses_anki_connect);
    }

    #[test]
    fn keeps_anki_connect_turned_on() {
        let storage = seeded_storage();
        let id = ProjectId("placeholder-1".to_string());
        storage.set_uses_anki_connect(&id, true).unwrap();
        assert!(storage.get_project(&id).unwrap().uses_anki_connect);
    }

    #[test]
    fn turns_anki_connect_off() {
        let storage = seeded_storage();
        let id = ProjectId("placeholder-1".to_string());
        storage.set_uses_anki_connect(&id, true).unwrap();
        storage.set_uses_anki_connect(&id, false).unwrap();
        assert!(!storage.get_project(&id).unwrap().uses_anki_connect);
    }

    #[test]
    fn updating_the_settings_keeps_anki_connect_turned_on() {
        let storage = seeded_storage();
        let id = ProjectId("placeholder-1".to_string());
        storage.set_uses_anki_connect(&id, true).unwrap();
        let updated = storage.update_project(&id, &settings("Deutsch")).unwrap();
        assert!(updated.uses_anki_connect);
    }

    #[test]
    fn turning_anki_connect_on_for_an_unknown_project_fails() {
        let result =
            seeded_storage().set_uses_anki_connect(&ProjectId("missing".to_string()), true);
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    #[test]
    fn deleting_an_unknown_project_fails() {
        let result = seeded_storage().delete_project(&ProjectId("missing".to_string()));
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    mod review_counts {
        use easyimmerse_core::review::ReviewRating;

        use crate::new_row::now_ms;
        use crate::review_test_support::{make_flashcards, project, rate, seeded_storage};

        #[test]
        fn counts_the_flashcards_never_answered() {
            let storage = seeded_storage();
            let ids = make_flashcards(&storage, 3);
            rate(&storage, &ids[0], ReviewRating::Good, now_ms());
            let listed = storage.list_projects(&crate::OwnerId::launch()).unwrap();
            let project = listed.iter().find(|listed| listed.id == project()).unwrap();
            assert_eq!(project.unreviewed_count, 2);
        }
    }
}
