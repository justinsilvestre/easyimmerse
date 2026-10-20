use easyimmerse_core::account::AccountUser;
use rusqlite::{Connection, OptionalExtension, params};

use crate::error::StorageError;
use crate::new_row::now_ms;
use crate::stored_integer::{read_unsigned, to_stored_integer};
use crate::users::{USER_COLUMNS, read_user};

/// A session that has not expired, with its user.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LiveSession {
    pub user: AccountUser,
    pub expires_at_ms: u64,
}

/// Records a session of the user under the hash of its token.
pub fn create_session(
    conn: &Connection,
    token_hash: &str,
    user_id: &str,
    expires_at_ms: u64,
) -> Result<(), StorageError> {
    conn.execute(
        "INSERT INTO sessions (token_hash, user_id, created_at_ms, expires_at_ms) \
         VALUES (?1, ?2, ?3, ?4)",
        params![
            token_hash,
            user_id,
            to_stored_integer(now_ms()),
            to_stored_integer(expires_at_ms)
        ],
    )?;
    Ok(())
}

/// Finds the session stored under the token hash, whether or not it has expired.
pub fn find_session(
    conn: &Connection,
    token_hash: &str,
) -> Result<Option<LiveSession>, StorageError> {
    let found = conn
        .query_row(
            &format!(
                "SELECT {USER_COLUMNS}, s.expires_at_ms FROM sessions s \
                 JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?1"
            ),
            params![token_hash],
            |row| {
                Ok(LiveSession {
                    user: read_user(row)?,
                    expires_at_ms: read_unsigned(row, 4)?,
                })
            },
        )
        .optional()?;
    Ok(found)
}

pub fn extend_session(
    conn: &Connection,
    token_hash: &str,
    expires_at_ms: u64,
) -> Result<(), StorageError> {
    conn.execute(
        "UPDATE sessions SET expires_at_ms = ?2 WHERE token_hash = ?1",
        params![token_hash, to_stored_integer(expires_at_ms)],
    )?;
    Ok(())
}

pub fn delete_session(conn: &Connection, token_hash: &str) -> Result<(), StorageError> {
    conn.execute(
        "DELETE FROM sessions WHERE token_hash = ?1",
        params![token_hash],
    )?;
    Ok(())
}

/// Deletes every session that expired at or before `now_ms` and returns how many there were.
pub fn delete_expired_sessions(conn: &Connection, now_ms: u64) -> Result<usize, StorageError> {
    let deleted = conn.execute(
        "DELETE FROM sessions WHERE expires_at_ms <= ?1",
        params![to_stored_integer(now_ms)],
    )?;
    Ok(deleted)
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::account::{AccountRole, AccountUser};

    use crate::Storage;

    fn storage_with_session(expires_at_ms: u64) -> (Storage, AccountUser) {
        let storage = Storage::open_in_memory().unwrap();
        let user = storage
            .create_user("reader@example.com", "hash", AccountRole::LibraryUser)
            .unwrap();
        storage
            .create_session("token-hash", &user.id, expires_at_ms)
            .unwrap();
        (storage, user)
    }

    fn live_user(storage: &Storage, token_hash: &str, now_ms: u64) -> Option<AccountUser> {
        storage
            .find_live_session(token_hash, now_ms)
            .unwrap()
            .map(|session| session.user)
    }

    #[test]
    fn finds_the_user_of_a_live_session() {
        let (storage, user) = storage_with_session(2_000);
        assert_eq!(live_user(&storage, "token-hash", 1_000), Some(user));
    }

    #[test]
    fn an_extended_session_outlives_its_first_expiry() {
        let (storage, user) = storage_with_session(2_000);
        storage.extend_session("token-hash", 5_000).unwrap();
        assert_eq!(live_user(&storage, "token-hash", 3_000), Some(user));
    }

    #[test]
    fn finds_no_user_for_an_unknown_token_hash() {
        let (storage, _) = storage_with_session(2_000);
        assert_eq!(live_user(&storage, "other", 1_000), None);
    }

    #[test]
    fn treats_an_expired_session_as_absent() {
        let (storage, _) = storage_with_session(2_000);
        assert_eq!(live_user(&storage, "token-hash", 2_000), None);
    }

    #[test]
    fn deletes_an_expired_session_when_it_is_seen() {
        let (storage, _) = storage_with_session(2_000);
        live_user(&storage, "token-hash", 3_000);
        assert_eq!(storage.delete_expired_sessions(3_000).unwrap(), 0);
    }

    #[test]
    fn deletes_a_session() {
        let (storage, _) = storage_with_session(2_000);
        storage.delete_session("token-hash").unwrap();
        assert_eq!(live_user(&storage, "token-hash", 1_000), None);
    }

    #[test]
    fn deletes_only_expired_sessions() {
        let (storage, user) = storage_with_session(2_000);
        storage.create_session("later", &user.id, 5_000).unwrap();
        assert_eq!(storage.delete_expired_sessions(3_000).unwrap(), 1);
    }

    #[test]
    fn deleting_a_user_deletes_their_sessions() {
        let (storage, user) = storage_with_session(2_000);
        storage.delete_user(&user.id).unwrap();
        assert_eq!(storage.delete_expired_sessions(u64::MAX).unwrap(), 0);
    }
}
