//! What holds for the whole library, kept in one row. Server-local; does not sync.

use easyimmerse_core::library::LibrarySettings;
use rusqlite::{Connection, params};

use crate::error::StorageError;

pub fn get_library_settings(conn: &Connection) -> Result<LibrarySettings, StorageError> {
    Ok(LibrarySettings {
        language: library_language(conn)?,
    })
}

/// Replaces the library's settings, refusing while the library has any item,
/// since the items' texts and words are in the language they were made for.
pub fn set_library_settings(
    conn: &Connection,
    settings: &LibrarySettings,
) -> Result<LibrarySettings, StorageError> {
    let has_items: bool =
        conn.query_row("SELECT EXISTS (SELECT 1 FROM library_items)", [], |row| {
            row.get(0)
        })?;
    if has_items {
        return Err(StorageError::LibraryHasItems);
    }
    conn.execute(
        "UPDATE library_settings SET language = ?1 WHERE id = 1",
        params![settings.language],
    )?;
    get_library_settings(conn)
}

pub fn library_language(conn: &Connection) -> Result<Option<String>, StorageError> {
    Ok(conn.query_row(
        "SELECT language FROM library_settings WHERE id = 1",
        [],
        |row| row.get(0),
    )?)
}

/// An empty database whose library is for learners of German.
#[cfg(test)]
pub(crate) fn german_library_storage() -> crate::Storage {
    let storage = crate::Storage::open_in_memory().unwrap();
    storage.set_library_settings(&german()).unwrap();
    storage
}

#[cfg(test)]
fn german() -> LibrarySettings {
    LibrarySettings {
        language: Some("de".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Storage;
    use easyimmerse_core::library::{LibraryItemDraft, LibraryItemKind};

    fn draft() -> LibraryItemDraft {
        LibraryItemDraft {
            title: "Film".to_string(),
            description: String::new(),
            translation_language: "en".to_string(),
            kind: LibraryItemKind::Video,
            difficulty: None,
            tags: Vec::new(),
        }
    }

    #[test]
    fn a_new_library_has_no_language() {
        let storage = Storage::open_in_memory().unwrap();
        assert_eq!(storage.get_library_settings().unwrap().language, None);
    }

    #[test]
    fn sets_the_language_of_an_empty_library() {
        let storage = german_library_storage();
        assert_eq!(storage.get_library_settings().unwrap(), german());
    }

    #[test]
    fn refuses_a_new_language_while_the_library_has_items() {
        let storage = german_library_storage();
        storage.create_library_item(&draft()).unwrap();
        assert!(matches!(
            storage.set_library_settings(&LibrarySettings::default()),
            Err(StorageError::LibraryHasItems)
        ));
    }

    #[test]
    fn refuses_an_item_while_the_language_is_unset() {
        let storage = Storage::open_in_memory().unwrap();
        assert!(matches!(
            storage.create_library_item(&draft()),
            Err(StorageError::LibraryLanguageUnset)
        ));
    }
}
