use easyimmerse_core::project::{ProjectId, ProjectSummary};
use rusqlite::{Connection, params};

use crate::error::StorageError;

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
    use crate::Storage;

    fn seeded_storage() -> Storage {
        let storage = Storage::open_in_memory().unwrap();
        storage.seed_placeholder_projects().unwrap();
        storage
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
}
