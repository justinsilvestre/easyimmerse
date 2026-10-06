//! The connections through which `Storage` reaches its database.

use std::path::Path;
use std::sync::Mutex;
use std::time::Duration;

use rusqlite::Connection;

use crate::error::StorageError;
use crate::migrations;

/// How long a connection waits for SQLite's own file locks before it reports the database as busy.
const BUSY_TIMEOUT: Duration = Duration::from_secs(5);

/// One connection for writes and, for a database file, another for reads.
///
/// Writes run one at a time on the writer. A database file is kept in write-ahead-log mode,
/// in which reads see the last committed state and never wait for a write in progress,
/// so a lookup can run on the reader while an import holds the writer for many seconds.
/// An in-memory database cannot be opened twice, so it reads through its writer.
pub struct Connections {
    writer: Mutex<Connection>,
    reader: Option<Mutex<Connection>>,
}

impl Connections {
    /// Opens or creates the database file and brings its schema up to date.
    pub fn open(path: &Path) -> Result<Self, StorageError> {
        let writer = Connection::open(path)?;
        writer.pragma_update(None, "journal_mode", "WAL")?;
        let writer = prepare_writer(writer)?;
        let reader = Connection::open(path)?;
        reader.busy_timeout(BUSY_TIMEOUT)?;
        reader.pragma_update(None, "query_only", "ON")?;
        Ok(Self {
            writer: Mutex::new(writer),
            reader: Some(Mutex::new(reader)),
        })
    }

    /// Opens an empty database that lives only as long as this value.
    pub fn open_in_memory() -> Result<Self, StorageError> {
        Ok(Self {
            writer: Mutex::new(prepare_writer(Connection::open_in_memory()?)?),
            reader: None,
        })
    }

    /// Runs an operation that may write, after any write already running.
    pub fn write<T>(
        &self,
        operation: impl FnOnce(&mut Connection) -> Result<T, StorageError>,
    ) -> Result<T, StorageError> {
        let mut conn = self.writer.lock().map_err(|_| StorageError::LockPoisoned)?;
        operation(&mut conn)
    }

    /// Runs an operation that only reads, without waiting for a write in progress.
    pub fn read<T>(
        &self,
        operation: impl FnOnce(&Connection) -> Result<T, StorageError>,
    ) -> Result<T, StorageError> {
        let Some(reader) = &self.reader else {
            return self.write(|conn| operation(conn));
        };
        let conn = reader.lock().map_err(|_| StorageError::LockPoisoned)?;
        operation(&conn)
    }
}

fn prepare_writer(mut conn: Connection) -> Result<Connection, StorageError> {
    conn.busy_timeout(BUSY_TIMEOUT)?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    migrations::MIGRATIONS.to_latest(&mut conn)?;
    Ok(conn)
}
