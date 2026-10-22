use easyimmerse_core::account::AccountUser;
use rusqlite::{Connection, OptionalExtension, params};

use crate::error::StorageError;
use crate::new_row::generate_id;
use crate::stored_integer::{read_unsigned, to_stored_integer};
use crate::users::{USER_COLUMN_COUNT, USER_COLUMNS, read_user};

/// A session that has not expired, with its user.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LiveSession {
    pub id: String,
    pub user: AccountUser,
    pub last_used_at_ms: u64,
    pub expires_at_ms: u64,
}

/// A session to record under the hash of its token.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NewSession<'a> {
    pub token_hash: &'a str,
    pub user_id: &'a str,
    /// The User-Agent header of the request that started the session, or an empty string.
    pub user_agent: &'a str,
    pub created_at_ms: u64,
    pub expires_at_ms: u64,
}

/// A session as its user sees it among their devices.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoredSession {
    pub id: String,
    pub user_agent: String,
    pub created_at_ms: u64,
    pub last_used_at_ms: u64,
}

/// Records a session, last used when it was created, and returns its new id.
pub fn create_session(conn: &Connection, session: &NewSession) -> Result<String, StorageError> {
    let id = generate_id();
    conn.execute(
        "INSERT INTO sessions \
         (token_hash, id, user_id, user_agent, created_at_ms, last_used_at_ms, expires_at_ms) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?6)",
        params![
            session.token_hash,
            id,
            session.user_id,
            session.user_agent,
            to_stored_integer(session.created_at_ms),
            to_stored_integer(session.expires_at_ms)
        ],
    )?;
    Ok(id)
}

/// Finds the session stored under the token hash, whether or not it has expired.
pub fn find_session(
    conn: &Connection,
    token_hash: &str,
) -> Result<Option<LiveSession>, StorageError> {
    let found = conn
        .query_row(
            &format!(
                "SELECT {USER_COLUMNS}, s.id, s.last_used_at_ms, s.expires_at_ms FROM sessions s \
                 JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?1"
            ),
            params![token_hash],
            |row| {
                Ok(LiveSession {
                    user: read_user(row)?,
                    id: row.get(USER_COLUMN_COUNT)?,
                    last_used_at_ms: read_unsigned(row, USER_COLUMN_COUNT + 1)?,
                    expires_at_ms: read_unsigned(row, USER_COLUMN_COUNT + 2)?,
                })
            },
        )
        .optional()?;
    Ok(found)
}

/// Records when the session was last used, and moves its expiry when `expires_at_ms` is given.
pub fn refresh_session(
    conn: &Connection,
    token_hash: &str,
    last_used_at_ms: u64,
    expires_at_ms: Option<u64>,
) -> Result<(), StorageError> {
    conn.execute(
        "UPDATE sessions SET last_used_at_ms = ?2, expires_at_ms = COALESCE(?3, expires_at_ms) \
         WHERE token_hash = ?1",
        params![
            token_hash,
            to_stored_integer(last_used_at_ms),
            expires_at_ms.map(to_stored_integer)
        ],
    )?;
    Ok(())
}

/// Lists the sessions of the user, most recently used first.
pub fn list_sessions(conn: &Connection, user_id: &str) -> Result<Vec<StoredSession>, StorageError> {
    let mut statement = conn.prepare(
        "SELECT id, user_agent, created_at_ms, last_used_at_ms FROM sessions \
         WHERE user_id = ?1 ORDER BY last_used_at_ms DESC, created_at_ms DESC, rowid DESC",
    )?;
    let sessions = statement
        .query_map(params![user_id], |row| {
            Ok(StoredSession {
                id: row.get(0)?,
                user_agent: row.get(1)?,
                created_at_ms: read_unsigned(row, 2)?,
                last_used_at_ms: read_unsigned(row, 3)?,
            })
        })?
        .collect::<Result<_, _>>()?;
    Ok(sessions)
}

pub fn delete_session(conn: &Connection, token_hash: &str) -> Result<(), StorageError> {
    conn.execute(
        "DELETE FROM sessions WHERE token_hash = ?1",
        params![token_hash],
    )?;
    Ok(())
}

/// Deletes the session with the id, unless it belongs to another user or does not exist.
pub fn delete_session_by_id(
    conn: &Connection,
    user_id: &str,
    id: &str,
) -> Result<(), StorageError> {
    let deleted = conn.execute(
        "DELETE FROM sessions WHERE id = ?1 AND user_id = ?2",
        params![id, user_id],
    )?;
    if deleted == 0 {
        return Err(StorageError::SessionNotFound(id.to_string()));
    }
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

    use super::NewSession;
    use crate::{Storage, StorageError};

    fn new_session<'a>(token_hash: &'a str, user_id: &'a str, at_ms: u64) -> NewSession<'a> {
        NewSession {
            token_hash,
            user_id,
            user_agent: "Firefox",
            created_at_ms: at_ms,
            expires_at_ms: at_ms + 1_000,
        }
    }

    fn storage_with_user() -> (Storage, AccountUser) {
        let storage = Storage::open_in_memory().unwrap();
        let user = storage
            .create_user("reader@example.com", "hash", AccountRole::LibraryUser)
            .unwrap();
        (storage, user)
    }

    /// A user with the session `token-hash`, created at 1000 and expiring at 2000.
    fn storage_with_session() -> (Storage, AccountUser) {
        let (storage, user) = storage_with_user();
        storage
            .create_session(&new_session("token-hash", &user.id, 1_000))
            .unwrap();
        (storage, user)
    }

    fn live_user(storage: &Storage, token_hash: &str, now_ms: u64) -> Option<AccountUser> {
        storage
            .find_live_session(token_hash, now_ms)
            .unwrap()
            .map(|session| session.user)
    }

    fn listed_ids(storage: &Storage, user: &AccountUser) -> Vec<String> {
        storage
            .list_sessions(&user.id)
            .unwrap()
            .into_iter()
            .map(|session| session.id)
            .collect()
    }

    #[test]
    fn finds_the_user_of_a_live_session() {
        let (storage, user) = storage_with_session();
        assert_eq!(live_user(&storage, "token-hash", 1_500), Some(user));
    }

    #[test]
    fn finds_the_id_that_creating_the_session_returned() {
        let (storage, user) = storage_with_user();
        let id = storage
            .create_session(&new_session("token-hash", &user.id, 1_000))
            .unwrap();
        let found = storage.find_live_session("token-hash", 1_500).unwrap();
        assert_eq!(found.map(|session| session.id), Some(id));
    }

    #[test]
    fn a_new_session_was_last_used_when_it_was_created() {
        let (storage, _) = storage_with_session();
        let found = storage.find_live_session("token-hash", 1_500).unwrap();
        assert_eq!(found.map(|session| session.last_used_at_ms), Some(1_000));
    }

    #[test]
    fn an_extended_session_outlives_its_first_expiry() {
        let (storage, user) = storage_with_session();
        storage
            .refresh_session("token-hash", 1_500, Some(5_000))
            .unwrap();
        assert_eq!(live_user(&storage, "token-hash", 3_000), Some(user));
    }

    #[test]
    fn a_refresh_records_the_time_of_use() {
        let (storage, _) = storage_with_session();
        storage.refresh_session("token-hash", 1_500, None).unwrap();
        let found = storage.find_live_session("token-hash", 1_600).unwrap();
        assert_eq!(found.map(|session| session.last_used_at_ms), Some(1_500));
    }

    #[test]
    fn a_refresh_without_an_expiry_keeps_the_expiry() {
        let (storage, _) = storage_with_session();
        storage.refresh_session("token-hash", 1_500, None).unwrap();
        let found = storage.find_live_session("token-hash", 1_600).unwrap();
        assert_eq!(found.map(|session| session.expires_at_ms), Some(2_000));
    }

    #[test]
    fn finds_no_user_for_an_unknown_token_hash() {
        let (storage, _) = storage_with_session();
        assert_eq!(live_user(&storage, "other", 1_500), None);
    }

    #[test]
    fn treats_an_expired_session_as_absent() {
        let (storage, _) = storage_with_session();
        assert_eq!(live_user(&storage, "token-hash", 2_000), None);
    }

    #[test]
    fn deletes_an_expired_session_when_it_is_seen() {
        let (storage, _) = storage_with_session();
        live_user(&storage, "token-hash", 3_000);
        assert_eq!(storage.delete_expired_sessions(3_000).unwrap(), 0);
    }

    #[test]
    fn deletes_a_session() {
        let (storage, _) = storage_with_session();
        storage.delete_session("token-hash").unwrap();
        assert_eq!(live_user(&storage, "token-hash", 1_500), None);
    }

    #[test]
    fn deletes_only_expired_sessions() {
        let (storage, user) = storage_with_session();
        storage
            .create_session(&new_session("later", &user.id, 4_000))
            .unwrap();
        assert_eq!(storage.delete_expired_sessions(3_000).unwrap(), 1);
    }

    #[test]
    fn deleting_a_user_deletes_their_sessions() {
        let (storage, user) = storage_with_session();
        storage.delete_user(&user.id).unwrap();
        assert_eq!(storage.delete_expired_sessions(u64::MAX).unwrap(), 0);
    }

    #[test]
    fn lists_the_sessions_most_recently_used_first() {
        let (storage, user) = storage_with_user();
        let older = storage
            .create_session(&new_session("older", &user.id, 1_000))
            .unwrap();
        let newer = storage
            .create_session(&new_session("newer", &user.id, 1_100))
            .unwrap();
        storage.refresh_session("older", 1_200, None).unwrap();
        assert_eq!(listed_ids(&storage, &user), [older, newer]);
    }

    #[test]
    fn lists_the_user_agent_of_a_session() {
        let (storage, user) = storage_with_session();
        let sessions = storage.list_sessions(&user.id).unwrap();
        assert_eq!(sessions[0].user_agent, "Firefox");
    }

    #[test]
    fn lists_only_the_sessions_of_the_user() {
        let (storage, user) = storage_with_session();
        let other = storage
            .create_user("other@example.com", "hash", AccountRole::LibraryUser)
            .unwrap();
        storage
            .create_session(&new_session("other-hash", &other.id, 1_000))
            .unwrap();
        assert_eq!(listed_ids(&storage, &user).len(), 1);
    }

    #[test]
    fn deletes_a_session_by_its_id() {
        let (storage, user) = storage_with_user();
        let id = storage
            .create_session(&new_session("token-hash", &user.id, 1_000))
            .unwrap();
        storage.delete_session_by_id(&user.id, &id).unwrap();
        assert_eq!(live_user(&storage, "token-hash", 1_500), None);
    }

    #[test]
    fn does_not_delete_the_session_of_another_user_by_its_id() {
        let (storage, user) = storage_with_session();
        let other = storage
            .create_user("other@example.com", "hash", AccountRole::LibraryUser)
            .unwrap();
        let id = listed_ids(&storage, &user).remove(0);
        let result = storage.delete_session_by_id(&other.id, &id);
        assert!(matches!(result, Err(StorageError::SessionNotFound(_))));
    }
}
