//! The servers this server keeps a copy of an owner's data on, and what each remote is known to hold.

use easyimmerse_core::account::AccountRole;
use rusqlite::{Connection, ErrorCode, OptionalExtension, Row, TransactionBehavior, params};

use super::tables::SyncTable;
use crate::error::StorageError;
use crate::new_row::generate_id;
use crate::owners::OwnerId;
use crate::stored_integer::{read_optional_unsigned, read_unsigned, to_stored_integer};

/// Whether a remote is an account server reached over the internet, or a server on the local network.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RemoteKind {
    Account,
    Lan,
}

impl RemoteKind {
    fn as_str(self) -> &'static str {
        match self {
            RemoteKind::Account => "account",
            RemoteKind::Lan => "lan",
        }
    }

    fn parse(text: &str) -> Option<Self> {
        match text {
            "account" => Some(RemoteKind::Account),
            "lan" => Some(RemoteKind::Lan),
            _ => None,
        }
    }
}

impl From<RemoteKind> for easyimmerse_core::sync::RemoteKind {
    fn from(kind: RemoteKind) -> Self {
        match kind {
            RemoteKind::Account => easyimmerse_core::sync::RemoteKind::Account,
            RemoteKind::Lan => easyimmerse_core::sync::RemoteKind::Lan,
        }
    }
}

/// A remote to link an owner to, with the account this server logged in to there.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NewRemote {
    pub owner_id: OwnerId,
    pub kind: RemoteKind,
    pub server_url: String,
    pub session_token: String,
    pub account_id: String,
    pub account_email: String,
    pub account_role: AccountRole,
    pub linked_at_ms: u64,
}

/// A linked remote and how far this server has synced with it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoredRemote {
    pub id: String,
    pub owner_id: OwnerId,
    pub kind: RemoteKind,
    pub server_url: String,
    /// None once the remote has logged this server out.
    pub session_token: Option<String>,
    pub account_id: String,
    pub account_email: String,
    pub account_role: AccountRole,
    pub linked_at_ms: u64,
    /// The remote's change sequence up to which this server has pulled.
    pub pulled_cursor: u64,
    /// This server's change sequence up to which the remote holds every change.
    pub pushed_through_seq: u64,
    pub last_synced_at_ms: Option<u64>,
}

const REMOTE_COLUMNS: &str = "id, owner_id, kind, server_url, session_token, account_id, \
     account_email, account_role, linked_at_ms, pulled_cursor, pushed_through_seq, last_synced_at_ms";

/// Records a link to a remote and returns it with its new id.
pub fn create_remote(conn: &Connection, remote: &NewRemote) -> Result<StoredRemote, StorageError> {
    let id = generate_id();
    let inserted = conn.execute(
        "INSERT INTO sync_remotes (id, owner_id, kind, server_url, session_token, account_id, \
         account_email, account_role, linked_at_ms) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            id,
            remote.owner_id.0,
            remote.kind.as_str(),
            remote.server_url,
            remote.session_token,
            remote.account_id,
            remote.account_email,
            remote.account_role.as_str(),
            to_stored_integer(remote.linked_at_ms),
        ],
    );
    match inserted {
        Err(rusqlite::Error::SqliteFailure(failure, _))
            if failure.code == ErrorCode::ConstraintViolation =>
        {
            return Err(StorageError::AlreadyLinked);
        }
        other => other?,
    };
    find_remote(conn, "id = ?1", params![id])?.ok_or(StorageError::RemoteNotLinked)
}

/// Links the owner to a remote in one transaction, as when the person logs in to it again.
/// A logged-out link to the same account on the same server keeps its row, and with it how far syncing had come,
/// and takes the new session. A link to another account or server replaces it, and syncing starts over.
/// A link whose session is still live is refused.
pub fn link_remote(
    conn: &mut Connection,
    remote: &NewRemote,
) -> Result<StoredRemote, StorageError> {
    let transaction = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let linked = match get_remote(&transaction, &remote.owner_id, remote.kind)? {
        Some(existing) if existing.session_token.is_some() => Err(StorageError::AlreadyLinked),
        Some(existing)
            if existing.server_url == remote.server_url
                && existing.account_id == remote.account_id =>
        {
            restore_session(&transaction, &existing.id, remote)
        }
        Some(existing) => {
            delete_remote(&transaction, &existing.id)?;
            create_remote(&transaction, remote)
        }
        None => create_remote(&transaction, remote),
    }?;
    transaction.commit()?;
    Ok(linked)
}

fn restore_session(
    conn: &Connection,
    remote_id: &str,
    remote: &NewRemote,
) -> Result<StoredRemote, StorageError> {
    update_remote(
        conn,
        "session_token = ?2, account_email = ?3, account_role = ?4",
        params![
            remote_id,
            remote.session_token,
            remote.account_email,
            remote.account_role.as_str()
        ],
    )?;
    find_remote(conn, "id = ?1", params![remote_id])?.ok_or(StorageError::RemoteNotLinked)
}

/// Forgets the session token after the remote logged this server out; the link stays, logged out.
pub fn forget_session_token(conn: &Connection, remote_id: &str) -> Result<(), StorageError> {
    update_remote(conn, "session_token = NULL", params![remote_id])
}

/// Records the remote's change sequence up to which this server has pulled.
pub fn set_pulled_cursor(
    conn: &Connection,
    remote_id: &str,
    cursor: u64,
) -> Result<(), StorageError> {
    update_remote(
        conn,
        "pulled_cursor = ?2",
        params![remote_id, to_stored_integer(cursor)],
    )
}

/// The owner's remote of the kind, when it has one.
pub fn get_remote(
    conn: &Connection,
    owner: &OwnerId,
    kind: RemoteKind,
) -> Result<Option<StoredRemote>, StorageError> {
    find_remote(
        conn,
        "owner_id = ?1 AND kind = ?2",
        params![owner.0, kind.as_str()],
    )
}

/// Records that the remote holds every change of this server up to `seq`.
pub fn set_pushed_through(
    conn: &Connection,
    remote_id: &str,
    seq: u64,
) -> Result<(), StorageError> {
    update_remote(
        conn,
        "pushed_through_seq = ?2",
        params![remote_id, to_stored_integer(seq)],
    )
}

/// Records when a round of syncing with the remote last finished.
pub fn set_last_synced(conn: &Connection, remote_id: &str, at_ms: u64) -> Result<(), StorageError> {
    update_remote(
        conn,
        "last_synced_at_ms = ?2",
        params![remote_id, to_stored_integer(at_ms)],
    )
}

/// Forgets the remote together with what it was known to hold.
pub fn delete_remote(conn: &Connection, remote_id: &str) -> Result<(), StorageError> {
    match conn.execute("DELETE FROM sync_remotes WHERE id = ?1", params![remote_id])? {
        0 => Err(StorageError::RemoteNotLinked),
        _ => Ok(()),
    }
}

/// Records the modification time the remote has for a row, after a push or a pull agreed on it.
pub fn record_base(
    conn: &Connection,
    remote_id: &str,
    table: SyncTable,
    key: &str,
    updated_at_ms: u64,
) -> Result<(), StorageError> {
    conn.execute(
        "INSERT INTO sync_bases (remote_id, table_name, row_key, updated_at_ms) \
         VALUES (?1, ?2, ?3, ?4) ON CONFLICT (remote_id, table_name, row_key) \
         DO UPDATE SET updated_at_ms = excluded.updated_at_ms",
        params![
            remote_id,
            table.as_str(),
            key,
            to_stored_integer(updated_at_ms)
        ],
    )?;
    Ok(())
}

fn find_remote(
    conn: &Connection,
    condition: &str,
    values: impl rusqlite::Params,
) -> Result<Option<StoredRemote>, StorageError> {
    let sql = format!("SELECT {REMOTE_COLUMNS} FROM sync_remotes WHERE {condition}");
    Ok(conn.query_row(&sql, values, read_remote).optional()?)
}

fn update_remote(
    conn: &Connection,
    assignment: &str,
    values: impl rusqlite::Params,
) -> Result<(), StorageError> {
    let sql = format!("UPDATE sync_remotes SET {assignment} WHERE id = ?1");
    match conn.execute(&sql, values)? {
        0 => Err(StorageError::RemoteNotLinked),
        _ => Ok(()),
    }
}

fn read_remote(row: &Row) -> rusqlite::Result<StoredRemote> {
    Ok(StoredRemote {
        id: row.get(0)?,
        owner_id: OwnerId(row.get(1)?),
        kind: parse_column(row, 2, RemoteKind::parse)?,
        server_url: row.get(3)?,
        session_token: row.get(4)?,
        account_id: row.get(5)?,
        account_email: row.get(6)?,
        account_role: parse_column(row, 7, |text| text.parse().ok())?,
        linked_at_ms: read_unsigned(row, 8)?,
        pulled_cursor: read_unsigned(row, 9)?,
        pushed_through_seq: read_unsigned(row, 10)?,
        last_synced_at_ms: read_optional_unsigned(row, 11)?,
    })
}

fn parse_column<T>(
    row: &Row,
    index: usize,
    parse: impl FnOnce(&str) -> Option<T>,
) -> rusqlite::Result<T> {
    let text: String = row.get(index)?;
    parse(&text).ok_or_else(|| {
        rusqlite::Error::FromSqlConversionFailure(
            index,
            rusqlite::types::Type::Text,
            format!("unknown value {text:?}").into(),
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Storage;
    use crate::sync::sync_test_support::{launch_remote, storage_with_remote};

    #[test]
    fn finds_the_remote_of_the_owner_and_kind() {
        let (storage, remote) = storage_with_remote();
        let found = storage
            .get_sync_remote(&OwnerId::launch(), RemoteKind::Account)
            .unwrap();
        assert_eq!(found, Some(remote));
    }

    #[test]
    fn finds_no_remote_of_another_kind() {
        let (storage, _) = storage_with_remote();
        let found = storage
            .get_sync_remote(&OwnerId::launch(), RemoteKind::Lan)
            .unwrap();
        assert_eq!(found, None);
    }

    #[test]
    fn refuses_a_second_remote_of_the_same_kind() {
        let (storage, _) = storage_with_remote();
        assert!(storage.create_sync_remote(&launch_remote()).is_err());
    }

    #[test]
    fn records_how_far_the_remote_holds_this_servers_changes() {
        let (storage, remote) = storage_with_remote();
        storage.set_sync_pushed_through(&remote.id, 7).unwrap();
        let found = storage
            .get_sync_remote(&OwnerId::launch(), RemoteKind::Account)
            .unwrap();
        assert_eq!(found.unwrap().pushed_through_seq, 7);
    }

    #[test]
    fn records_when_syncing_last_finished() {
        let (storage, remote) = storage_with_remote();
        storage.set_sync_last_synced(&remote.id, 1_000).unwrap();
        let found = storage
            .get_sync_remote(&OwnerId::launch(), RemoteKind::Account)
            .unwrap();
        assert_eq!(found.unwrap().last_synced_at_ms, Some(1_000));
    }

    #[test]
    fn forgets_a_deleted_remote() {
        let (storage, remote) = storage_with_remote();
        storage.delete_sync_remote(&remote.id).unwrap();
        let found = storage
            .get_sync_remote(&OwnerId::launch(), RemoteKind::Account)
            .unwrap();
        assert_eq!(found, None);
    }

    fn account_remote(storage: &Storage) -> StoredRemote {
        storage
            .get_sync_remote(&OwnerId::launch(), RemoteKind::Account)
            .unwrap()
            .unwrap()
    }

    #[test]
    fn forgetting_the_session_token_logs_the_link_out() {
        let (storage, remote) = storage_with_remote();
        storage.forget_sync_session_token(&remote.id).unwrap();
        assert_eq!(account_remote(&storage).session_token, None);
    }

    #[test]
    fn refuses_to_link_over_a_live_link() {
        let (storage, _) = storage_with_remote();
        let result = storage.link_sync_remote(&launch_remote());
        assert!(matches!(result, Err(StorageError::AlreadyLinked)));
    }

    #[test]
    fn relinking_the_same_account_keeps_how_far_syncing_came() {
        let (storage, remote) = storage_with_remote();
        storage.set_sync_pushed_through(&remote.id, 7).unwrap();
        storage.forget_sync_session_token(&remote.id).unwrap();
        let relinked = storage.link_sync_remote(&launch_remote()).unwrap();
        assert_eq!(relinked.pushed_through_seq, 7);
    }

    #[test]
    fn relinking_the_same_account_takes_the_new_session() {
        let (storage, remote) = storage_with_remote();
        storage.forget_sync_session_token(&remote.id).unwrap();
        let new_session = NewRemote {
            session_token: "new token".to_string(),
            ..launch_remote()
        };
        storage.link_sync_remote(&new_session).unwrap();
        assert_eq!(
            account_remote(&storage).session_token.as_deref(),
            Some("new token")
        );
    }

    #[test]
    fn linking_another_account_starts_over() {
        let (storage, remote) = storage_with_remote();
        storage.set_sync_pushed_through(&remote.id, 7).unwrap();
        storage.forget_sync_session_token(&remote.id).unwrap();
        let other_account = NewRemote {
            account_id: "other account".to_string(),
            ..launch_remote()
        };
        let linked = storage.link_sync_remote(&other_account).unwrap();
        assert_eq!(linked.pushed_through_seq, 0);
    }

    #[test]
    fn reports_deleting_an_unknown_remote() {
        let storage = Storage::open_in_memory().unwrap();
        let result = storage.delete_sync_remote("missing");
        assert!(matches!(result, Err(StorageError::RemoteNotLinked)));
    }
}
