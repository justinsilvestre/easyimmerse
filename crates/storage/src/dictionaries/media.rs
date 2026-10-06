use easyimmerse_core::dictionary::{DictionaryFormatKind, DictionaryMedia, media_key};
use rusqlite::{Connection, OptionalExtension, params};

use super::DictionaryId;
use super::columns::get_enum;
use crate::error::StorageError;

/// Returns a file stored with a dictionary, by any path its definitions may use for it.
pub fn get_media(
    conn: &Connection,
    id: &DictionaryId,
    path: &str,
) -> Result<DictionaryMedia, StorageError> {
    let not_found = || StorageError::DictionaryMediaNotFound {
        dictionary_id: id.0.clone(),
        path: path.to_string(),
    };
    let (number, format) = find_dictionary(conn, id)?.ok_or_else(not_found)?;
    conn.query_row(
        "SELECT media_type, bytes FROM dictionary_media WHERE dictionary_number = ?1 AND path = ?2",
        params![number, media_key(format, path)],
        |row| {
            Ok(DictionaryMedia {
                path: path.to_string(),
                media_type: row.get(0)?,
                bytes: row.get(1)?,
            })
        },
    )
    .optional()?
    .ok_or_else(not_found)
}

fn find_dictionary(
    conn: &Connection,
    id: &DictionaryId,
) -> Result<Option<(i64, DictionaryFormatKind)>, StorageError> {
    Ok(conn
        .query_row(
            "SELECT number, format FROM dictionaries WHERE id = ?1",
            [&id.0],
            |row| Ok((row.get(0)?, get_enum(row, 1)?)),
        )
        .optional()?)
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use easyimmerse_core::dictionary::{DictionarySource, SourceFile};

    use super::*;
    use crate::Storage;

    fn mdict_fixture_file(name: &str) -> SourceFile {
        let path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../fixtures/sample-mdict")
            .join(name);
        SourceFile {
            name: name.to_string(),
            bytes: std::fs::read(path).unwrap(),
        }
    }

    /// Imports the MDict fixture, whose resource file stores the image `\cat.png`.
    fn storage_with_mdict_fixture() -> (Storage, DictionaryId) {
        let storage = Storage::open_in_memory().unwrap();
        let files = vec![
            mdict_fixture_file("sample.mdx"),
            mdict_fixture_file("sample.mdd"),
        ];
        let id = storage
            .import_dictionary(&mut DictionarySource::new(files).unwrap())
            .unwrap();
        (storage, id)
    }

    fn finds(path: &str) -> bool {
        let (storage, id) = storage_with_mdict_fixture();
        storage.get_dictionary_media(&id, path).is_ok()
    }

    #[test]
    fn finds_an_mdict_resource_by_its_bare_name() {
        assert!(finds("cat.png"));
    }

    #[test]
    fn finds_an_mdict_resource_after_a_slash() {
        assert!(finds("/cat.png"));
    }

    #[test]
    fn finds_an_mdict_resource_after_a_backslash() {
        assert!(finds(r"\cat.png"));
    }

    #[test]
    fn finds_an_mdict_resource_through_the_sound_scheme() {
        assert!(finds("sound://cat.png"));
    }

    #[test]
    fn finds_an_mdict_resource_in_another_case() {
        assert!(finds("Cat.PNG"));
    }

    #[test]
    fn finds_no_mdict_resource_under_another_name() {
        assert!(!finds("dog.png"));
    }
}
