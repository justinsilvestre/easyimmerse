//! The rows that servers exchange to keep copies of an owner's data in step.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use ts_rs::TS;
use utoipa::ToSchema;

/// A table whose rows sync between servers. Each name is the table's name in the server's database.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum SyncTable {
    Projects,
    MediaFiles,
    SubtitleTracks,
    Alignments,
    Flashcards,
    ReviewLog,
    ReviewHolds,
    ReviewDayAllowances,
    AnkiPendingDeletions,
    Dictionaries,
    Preferences,
    ReviewParameters,
}

/// A synced row as it stands after its latest change, or its tombstone when it was deleted.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SyncRow {
    pub table: SyncTable,
    /// The row's id, or for a table with a composite key, its parts joined by `:`.
    pub key: String,
    /// When the row last changed on any server, in milliseconds since the Unix epoch.
    /// Of two changes made to a row at once, the later is kept.
    pub updated_at_ms: u64,
    pub is_deleted: bool,
    /// The row's synced columns by name. None for a deleted row.
    #[ts(type = "Record<string, unknown> | null")]
    #[schema(value_type = Option<Object>)]
    pub data: Option<Map<String, Value>>,
}

/// One page of an owner's changes on a server, in the order they were made.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SyncChangesPage {
    pub rows: Vec<SyncRow>,
    /// The `since` to ask for the next page with.
    pub next_cursor: u64,
    pub has_more: bool,
}

/// A row that a device sends to a server, with the modification time the server had for it when the device last heard of it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct PushedRow {
    pub row: SyncRow,
    /// None when the device has never had the server's version of the row.
    pub base_updated_at_ms: Option<u64>,
}

/// The rows a device sends to a server in one request.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SyncPushBatch {
    pub rows: Vec<PushedRow>,
}

/// What the server did with each pushed row, in the order the rows were sent.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SyncPushOutcomes {
    pub outcomes: Vec<PushOutcome>,
}

/// What the server did with one pushed row.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct PushOutcome {
    pub table: SyncTable,
    pub key: String,
    pub kind: PushOutcomeKind,
    /// The modification time the server now has for the row: the pushed time, or the server's time when that was in the future.
    /// None when the row was rejected, or when the server kept a version of its own, which `current` carries.
    pub remote_updated_at_ms: Option<u64>,
    /// The server's row when it kept its own version, or the tombstone of the deleted parent.
    pub current: Option<SyncRow>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum PushOutcomeKind {
    /// The server had no change of its own since the device's base, and now holds the pushed row.
    Applied,
    /// The server had a change of its own, older than the pushed one, which the pushed row replaced.
    AppliedOverConcurrent,
    /// The server already held the pushed row.
    Unchanged,
    /// The server had a newer change of its own and kept it.
    Superseded,
    /// A parent of the row was deleted on the server, so the row was dropped.
    ParentDeleted,
    /// The row cannot be stored: its table or key is not the owner's to sync, or its data lacks a column.
    Rejected,
}
