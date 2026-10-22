//! Syncing an owner's data with other servers: the registry of changes that the triggers of `0010_sync.sql` keep,
//! the codec that reads and writes synced rows, the application of rows a device pushes, the inbox of rows pulled from a remote,
//! and the remotes a server is linked to with what each is known to hold.

pub mod apply_pushed;
pub mod changes;
pub mod codec;
mod conflict_descriptions;
pub mod conflicts;
pub mod dictionary_rows;
pub mod inbox;
mod pulled_rows;
pub mod push_answers;
pub mod remote_copies;
pub mod remotes;
pub mod tables;

#[cfg(test)]
mod dictionary_rows_tests;
#[cfg(test)]
mod inbox_tests;
#[cfg(test)]
mod push_answers_tests;
#[cfg(test)]
mod sync_test_support;
#[cfg(test)]
mod tests;
