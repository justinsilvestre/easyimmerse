use rusqlite::{Connection, OptionalExtension, params};

use crate::error::StorageError;

pub fn get_preference(conn: &Connection, key: &str) -> Result<Option<String>, StorageError> {
    let value = conn
        .query_row(
            "SELECT value FROM preferences WHERE key = ?1",
            params![key],
            |row| row.get(0),
        )
        .optional()?;
    Ok(value)
}

/// Stores a preference, replacing any earlier value under the same key.
pub fn set_preference(conn: &Connection, key: &str, value: &str) -> Result<(), StorageError> {
    conn.execute(
        "INSERT INTO preferences (key, value) VALUES (?1, ?2)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::Storage;

    #[test]
    fn returns_none_for_an_unknown_key() {
        let storage = Storage::open_in_memory().unwrap();
        assert_eq!(storage.get_preference("theme").unwrap(), None);
    }

    #[test]
    fn returns_a_stored_value() {
        let storage = Storage::open_in_memory().unwrap();
        storage.set_preference("theme", "dark").unwrap();
        assert_eq!(
            storage.get_preference("theme").unwrap(),
            Some("dark".to_string())
        );
    }

    #[test]
    fn replaces_an_earlier_value() {
        let storage = Storage::open_in_memory().unwrap();
        storage.set_preference("theme", "dark").unwrap();
        storage.set_preference("theme", "light").unwrap();
        assert_eq!(
            storage.get_preference("theme").unwrap(),
            Some("light".to_string())
        );
    }
}
