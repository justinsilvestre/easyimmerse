//! Whole dictionaries moving between servers: the content tables use local integer keys, so a dictionary
//! travels as one dump and is imported under its own id, while its row in the registry syncs like any other.

use easyimmerse_core::dictionary::{DictionaryError, DictionarySink};
use rusqlite::{Connection, TransactionBehavior, params};

use super::changes::change_of;
use super::codec::stamp;
use super::inbox::PulledRow;
use super::pulled_rows::Puller;
use super::remotes::{StoredRemote, record_base};
use super::tables::SyncTable;
use crate::dictionaries::{DictionaryId, import_into};
use crate::error::StorageError;
use crate::owners::OwnerId;
use crate::stored_integer::read_unsigned;

/// Imports a dictionary of the owner under the given id, as a device uploads it, and returns the time its registry entry took.
pub fn store_dictionary(
    conn: &mut Connection,
    owner: &OwnerId,
    id: &DictionaryId,
    imported_at: u64,
    read: impl FnOnce(&mut dyn DictionarySink) -> Result<(), DictionaryError>,
) -> Result<u64, StorageError> {
    let transaction = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    import_into(&transaction, owner, imported_at, id.clone(), read)?;
    let change = change_of(&transaction, owner, SyncTable::Dictionaries, &id.0)?
        .ok_or_else(|| StorageError::DictionaryNotFound(id.0.clone()))?;
    transaction.commit()?;
    Ok(change.updated_at_ms)
}

/// Imports a dictionary pulled from the remote under its id, gives it the remote's modification time,
/// and settles its inbox row, all in one transaction.
pub fn store_pulled_dictionary(
    conn: &mut Connection,
    remote: &StoredRemote,
    row: &PulledRow,
    imported_at: u64,
    read: impl FnOnce(&mut dyn DictionarySink) -> Result<(), DictionaryError>,
) -> Result<(), StorageError> {
    let transaction = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let id = DictionaryId(row.key.clone());
    import_into(&transaction, &remote.owner_id, imported_at, id, read)?;
    stamp(
        &transaction,
        &remote.owner_id,
        SyncTable::Dictionaries,
        &row.key,
        row.updated_at_ms,
    )?;
    Puller::new(&remote.owner_id, &remote.id, 0).settle(&transaction, row)?;
    transaction.commit()?;
    Ok(())
}

/// Settles the inbox row of a pulled dictionary that this server will not import, such as one whose title it already has.
pub fn settle_pulled_dictionary(
    conn: &Connection,
    remote: &StoredRemote,
    row: &PulledRow,
) -> Result<(), StorageError> {
    Puller::new(&remote.owner_id, &remote.id, 0).settle(conn, row)
}

/// The owner's dictionaries that the remote is not known to hold, oldest first, each with its modification time here.
pub fn dictionaries_to_upload(
    conn: &Connection,
    owner: &OwnerId,
    remote_id: &str,
) -> Result<Vec<(DictionaryId, u64)>, StorageError> {
    let mut statement = conn.prepare(
        "SELECT d.id, s.updated_at_ms FROM dictionaries d \
         JOIN sync_rows s ON s.table_name = 'dictionaries' AND s.row_key = d.id AND s.owner_id = d.owner_id \
         WHERE d.owner_id = ?1 AND NOT EXISTS (SELECT 1 FROM sync_bases b \
             WHERE b.remote_id = ?2 AND b.table_name = 'dictionaries' AND b.row_key = d.id) \
         ORDER BY d.number",
    )?;
    let rows = statement
        .query_map(params![owner.0, remote_id], |row| {
            Ok((DictionaryId(row.get(0)?), read_unsigned(row, 1)?))
        })?
        .collect::<Result<_, _>>()?;
    Ok(rows)
}

/// Records that the remote stored an uploaded dictionary at its own time, which this server takes too,
/// so that the push leaves the dictionary's row out as already there.
pub fn record_uploaded_dictionary(
    conn: &mut Connection,
    owner: &OwnerId,
    remote_id: &str,
    id: &DictionaryId,
    remote_updated_at_ms: u64,
) -> Result<(), StorageError> {
    let transaction = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    stamp(
        &transaction,
        owner,
        SyncTable::Dictionaries,
        &id.0,
        remote_updated_at_ms,
    )?;
    record_base(
        &transaction,
        remote_id,
        SyncTable::Dictionaries,
        &id.0,
        remote_updated_at_ms,
    )?;
    transaction.commit()?;
    Ok(())
}
