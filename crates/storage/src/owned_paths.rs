//! Whether the rows that a request path names belong to an owner.

use rusqlite::{Connection, params};

use crate::error::StorageError;
use crate::owners::OwnerId;

/// The ids that a request path names. Each is checked only when present.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct OwnedPath {
    pub project_id: Option<String>,
    pub media_file_id: Option<String>,
    pub flashcard_id: Option<String>,
    pub subtitle_track_id: Option<String>,
    pub alignment_id: Option<String>,
    pub review_answer_id: Option<String>,
    pub dictionary_id: Option<String>,
}

/// How to check one kind of id: the query that tells whether the owner has the row, and the error when it does not.
struct OwnershipCheck {
    id_of: fn(&OwnedPath) -> Option<&String>,
    sql: &'static str,
    not_found: fn(String) -> StorageError,
}

const CHECKS: [OwnershipCheck; 7] = [
    OwnershipCheck {
        id_of: |path| path.project_id.as_ref(),
        sql: "SELECT EXISTS (SELECT 1 FROM projects WHERE id = ?1 AND owner_id = ?2)",
        not_found: StorageError::ProjectNotFound,
    },
    OwnershipCheck {
        id_of: |path| path.media_file_id.as_ref(),
        sql: "SELECT EXISTS (SELECT 1 FROM media_files m JOIN projects p ON p.id = m.project_id \
              WHERE m.id = ?1 AND p.owner_id = ?2)",
        not_found: StorageError::MediaFileNotFound,
    },
    OwnershipCheck {
        id_of: |path| path.flashcard_id.as_ref(),
        sql: "SELECT EXISTS (SELECT 1 FROM flashcards f JOIN projects p ON p.id = f.project_id \
              WHERE f.id = ?1 AND p.owner_id = ?2)",
        not_found: StorageError::FlashcardNotFound,
    },
    OwnershipCheck {
        id_of: |path| path.subtitle_track_id.as_ref(),
        sql: "SELECT EXISTS (SELECT 1 FROM subtitle_tracks t JOIN media_files m ON m.id = t.media_file_id \
              JOIN projects p ON p.id = m.project_id WHERE t.id = ?1 AND p.owner_id = ?2)",
        not_found: StorageError::SubtitleTrackNotFound,
    },
    OwnershipCheck {
        id_of: |path| path.alignment_id.as_ref(),
        sql: "SELECT EXISTS (SELECT 1 FROM alignments a JOIN media_files m ON m.id = a.media_file_id \
              JOIN projects p ON p.id = m.project_id WHERE a.id = ?1 AND p.owner_id = ?2)",
        not_found: StorageError::AlignmentNotFound,
    },
    OwnershipCheck {
        id_of: |path| path.review_answer_id.as_ref(),
        sql: "SELECT EXISTS (SELECT 1 FROM review_log l JOIN projects p ON p.id = l.project_id \
              WHERE l.id = ?1 AND p.owner_id = ?2)",
        not_found: StorageError::ReviewAnswerNotFound,
    },
    OwnershipCheck {
        id_of: |path| path.dictionary_id.as_ref(),
        sql: "SELECT EXISTS (SELECT 1 FROM dictionaries WHERE id = ?1 AND owner_id = ?2)",
        not_found: StorageError::DictionaryNotFound,
    },
];

/// Checks that every row the path names exists and belongs to the owner.
/// A missing row and a row of another owner give the same not-found error, so that a caller learns nothing of other owners.
pub fn check_owned_path(
    conn: &Connection,
    owner: &OwnerId,
    path: &OwnedPath,
) -> Result<(), StorageError> {
    for check in &CHECKS {
        let Some(id) = (check.id_of)(path) else {
            continue;
        };
        let is_owned: bool = conn.query_row(check.sql, params![id, owner.0], |row| row.get(0))?;
        if !is_owned {
            return Err((check.not_found)(id.clone()));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Storage;
    use crate::review_test_support::{
        account_owner, launch, make_flashcard, project, seeded_storage,
    };

    fn check(storage: &Storage, owner: &OwnerId, path: &OwnedPath) -> Result<(), StorageError> {
        storage.check_owned_path(owner, path)
    }

    fn project_path() -> OwnedPath {
        OwnedPath {
            project_id: Some(project().0),
            ..OwnedPath::default()
        }
    }

    #[test]
    fn accepts_a_project_of_the_owner() {
        let storage = seeded_storage();
        assert!(check(&storage, &launch(), &project_path()).is_ok());
    }

    #[test]
    fn refuses_a_project_of_another_owner_as_not_found() {
        let storage = seeded_storage();
        let other = account_owner(&storage);
        assert!(matches!(
            check(&storage, &other, &project_path()),
            Err(StorageError::ProjectNotFound(_))
        ));
    }

    #[test]
    fn refuses_a_missing_flashcard_as_not_found() {
        let storage = seeded_storage();
        let path = OwnedPath {
            flashcard_id: Some("missing".to_string()),
            ..project_path()
        };
        assert!(matches!(
            check(&storage, &launch(), &path),
            Err(StorageError::FlashcardNotFound(_))
        ));
    }

    #[test]
    fn refuses_a_flashcard_of_another_owner_named_beside_the_owners_project() {
        let storage = seeded_storage();
        let other = account_owner(&storage);
        let flashcard = make_flashcard(&storage, &project(), "Haus");
        let path = OwnedPath {
            flashcard_id: Some(flashcard.0),
            ..OwnedPath::default()
        };
        assert!(matches!(
            check(&storage, &other, &path),
            Err(StorageError::FlashcardNotFound(_))
        ));
    }

    #[test]
    fn refuses_a_missing_dictionary_as_not_found() {
        let storage = seeded_storage();
        let path = OwnedPath {
            dictionary_id: Some("missing".to_string()),
            ..OwnedPath::default()
        };
        assert!(matches!(
            check(&storage, &launch(), &path),
            Err(StorageError::DictionaryNotFound(_))
        ));
    }
}
