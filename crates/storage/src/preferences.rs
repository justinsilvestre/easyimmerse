use rusqlite::{Connection, OptionalExtension, params};

use crate::error::StorageError;
use crate::owners::OwnerId;

/// The preferences that follow a person to every device, named in full.
const SYNCED_KEYS: [&str; 2] = ["showTranslations", "showReviewIntervals"];

/// The prefixes of the preferences that follow a person to every device, each followed by a media file id.
const SYNCED_PREFIXES: [&str; 2] = ["readingLocation:", "playbackPosition:"];

/// Whether a preference follows the person to every device, rather than staying with the device that set it.
/// The triggers that record changes to synced preferences match the same keys.
pub fn is_synced_preference(key: &str) -> bool {
    SYNCED_KEYS.contains(&key) || SYNCED_PREFIXES.iter().any(|prefix| key.starts_with(prefix))
}

pub fn get_preference(
    conn: &Connection,
    owner: &OwnerId,
    key: &str,
) -> Result<Option<String>, StorageError> {
    let value = conn
        .query_row(
            "SELECT value FROM preferences WHERE owner_id = ?1 AND key = ?2",
            params![owner.0, key],
            |row| row.get(0),
        )
        .optional()?;
    Ok(value)
}

/// Stores a preference of the owner, replacing any earlier value under the same key.
pub fn set_preference(
    conn: &Connection,
    owner: &OwnerId,
    key: &str,
    value: &str,
) -> Result<(), StorageError> {
    conn.execute(
        "INSERT INTO preferences (owner_id, key, value) VALUES (?1, ?2, ?3)
         ON CONFLICT (owner_id, key) DO UPDATE SET value = excluded.value",
        params![owner.0, key, value],
    )?;
    Ok(())
}

#[cfg(test)]
pub(crate) mod tests {
    use super::is_synced_preference;
    use crate::Storage;
    use crate::owners::OwnerId;

    fn launch() -> OwnerId {
        OwnerId::launch()
    }

    #[test]
    fn returns_none_for_an_unknown_key() {
        let storage = Storage::open_in_memory().unwrap();
        assert_eq!(storage.get_preference(&launch(), "theme").unwrap(), None);
    }

    #[test]
    fn returns_a_stored_value() {
        let storage = Storage::open_in_memory().unwrap();
        storage.set_preference(&launch(), "theme", "dark").unwrap();
        assert_eq!(
            storage.get_preference(&launch(), "theme").unwrap(),
            Some("dark".to_string())
        );
    }

    #[test]
    fn replaces_an_earlier_value() {
        let storage = Storage::open_in_memory().unwrap();
        storage.set_preference(&launch(), "theme", "dark").unwrap();
        storage.set_preference(&launch(), "theme", "light").unwrap();
        assert_eq!(
            storage.get_preference(&launch(), "theme").unwrap(),
            Some("light".to_string())
        );
    }

    #[test]
    fn hides_the_preference_of_another_owner() {
        let storage = Storage::open_in_memory().unwrap();
        let account = crate::review_test_support::account_owner(&storage);
        storage.set_preference(&account, "theme", "dark").unwrap();
        assert_eq!(storage.get_preference(&launch(), "theme").unwrap(), None);
    }

    /// Every preference key the apps and the server store, with whether it follows the person to every device.
    pub(crate) const CLASSIFIED_KEYS: [(&str, bool); 14] = [
        ("showTranslations", true),
        ("showReviewIntervals", true),
        ("readingLocation:0123abcd", true),
        ("playbackPosition:0123abcd", true),
        ("theme", false),
        ("textScale", false),
        ("readerPreferences", false),
        ("subtitleAppearance", false),
        ("losslessAudio", false),
        ("conversionNoticeDismissed", false),
        ("conversionCacheBudgetBytes", false),
        ("sample_content_seeded", false),
        ("sample_book_seeded:toshishun", false),
        ("placeholder_projects", false),
    ];

    #[test]
    fn classifies_every_known_key_as_the_table_says() {
        let misclassified: Vec<&str> = CLASSIFIED_KEYS
            .iter()
            .filter(|(key, is_synced)| is_synced_preference(key) != *is_synced)
            .map(|(key, _)| *key)
            .collect();
        assert_eq!(misclassified, Vec::<&str>::new());
    }
}
