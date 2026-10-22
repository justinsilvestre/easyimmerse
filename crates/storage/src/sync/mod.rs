//! Syncing an owner's data with other servers: the registry of changes that the triggers of `0010_sync.sql` keep,
//! the codec that reads and writes synced rows, the application of rows a device pushes, and the remotes a server is linked to.

pub mod apply_pushed;
pub mod changes;
pub mod codec;
pub mod remotes;
pub mod tables;

#[cfg(test)]
mod sync_test_support;
#[cfg(test)]
mod tests;
