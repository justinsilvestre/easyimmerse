use rusqlite::Connection;

use crate::error::StorageError;
use crate::{Storage, open_file_connection};

/// The connection a long import writes through.
/// Other requests keep running while an import writes through it.
pub enum ImportConnection<'a> {
    /// A connection of the import's own, for a database file.
    Own(Connection),
    /// The storage's only connection, for an in-memory database.
    Shared(&'a Storage),
}

impl<'a> ImportConnection<'a> {
    pub fn open(storage: &'a Storage) -> Result<Self, StorageError> {
        match &storage.path {
            Some(path) => Ok(Self::Own(open_file_connection(path)?)),
            None => Ok(Self::Shared(storage)),
        }
    }

    pub fn with<T>(
        &mut self,
        operation: impl FnOnce(&mut Connection) -> Result<T, StorageError>,
    ) -> Result<T, StorageError> {
        match self {
            Self::Own(conn) => operation(conn),
            Self::Shared(storage) => storage.with_connection(operation),
        }
    }
}
