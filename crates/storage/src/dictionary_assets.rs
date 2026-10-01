use rusqlite::{Connection, OptionalExtension, params};

use crate::dictionaries::{DictionaryId, ensure_dictionary_exists};
use crate::error::StorageError;

/// A file stored with a dictionary, such as an image that its glossaries show.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoredDictionaryAsset {
    pub media_type: String,
    pub bytes: Vec<u8>,
}

/// Returns the asset at a path inside the dictionary's archive.
/// Fails with `DictionaryNotFound` or `DictionaryAssetNotFound`.
pub fn get_dictionary_asset(
    conn: &Connection,
    id: &DictionaryId,
    path: &str,
) -> Result<StoredDictionaryAsset, StorageError> {
    ensure_dictionary_exists(conn, id)?;
    conn.query_row(
        "SELECT media_type, bytes FROM dictionary_assets WHERE dictionary_id = ?1 AND path = ?2",
        params![id.0, path],
        |row| {
            Ok(StoredDictionaryAsset {
                media_type: row.get(0)?,
                bytes: row.get(1)?,
            })
        },
    )
    .optional()?
    .ok_or_else(|| StorageError::DictionaryAssetNotFound(path.to_string()))
}

/// Returns the dictionary's stylesheet, or `None` when its archive had none.
pub fn get_dictionary_stylesheet(
    conn: &Connection,
    id: &DictionaryId,
) -> Result<Option<String>, StorageError> {
    ensure_dictionary_exists(conn, id)?;
    let stylesheet = conn.query_row(
        "SELECT stylesheet FROM dictionaries WHERE id = ?1",
        params![id.0],
        |row| row.get(0),
    )?;
    Ok(stylesheet)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Storage;
    use crate::test_support::{count_rows, parse_dictionary_fixture};

    fn storage_with(name: &str) -> (Storage, DictionaryId) {
        let storage = Storage::open_in_memory().unwrap();
        let id = storage
            .insert_dictionary(&parse_dictionary_fixture(name))
            .unwrap();
        (storage, id)
    }

    fn structured() -> (Storage, DictionaryId) {
        storage_with("sample-yomitan-structured.zip")
    }

    #[test]
    fn returns_the_bytes_of_an_image() {
        let (storage, id) = structured();
        let asset = storage.get_dictionary_asset(&id, "img/cat.svg").unwrap();
        assert!(asset.bytes.starts_with(b"<svg"));
    }

    #[test]
    fn returns_the_media_type_of_an_image() {
        let (storage, id) = structured();
        let asset = storage.get_dictionary_asset(&id, "img/cat.svg").unwrap();
        assert_eq!(asset.media_type, "image/svg+xml");
    }

    #[test]
    fn fails_for_a_path_the_archive_lacks() {
        let (storage, id) = structured();
        assert!(matches!(
            storage.get_dictionary_asset(&id, "img/dog.svg"),
            Err(StorageError::DictionaryAssetNotFound(_))
        ));
    }

    #[test]
    fn fails_for_an_asset_of_an_unknown_dictionary() {
        let (storage, _) = structured();
        assert!(matches!(
            storage.get_dictionary_asset(&DictionaryId("missing".into()), "img/cat.svg"),
            Err(StorageError::DictionaryNotFound(_))
        ));
    }

    #[test]
    fn returns_the_stylesheet() {
        let (storage, id) = structured();
        let stylesheet = storage.get_dictionary_stylesheet(&id).unwrap().unwrap();
        assert!(stylesheet.contains("part-of-speech-info"));
    }

    #[test]
    fn returns_no_stylesheet_when_the_archive_had_none() {
        let (storage, id) = storage_with("sample-yomitan.zip");
        assert_eq!(storage.get_dictionary_stylesheet(&id).unwrap(), None);
    }

    #[test]
    fn deleting_a_dictionary_deletes_its_assets() {
        let (storage, id) = structured();
        storage.delete_dictionary(&id).unwrap();
        assert_eq!(count_rows(&storage, "dictionary_assets"), 0);
    }
}
