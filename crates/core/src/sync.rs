//! The rows that servers exchange to keep copies of an owner's data in step.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::account::AccountRole;
use crate::media_file::MediaFileId;

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

/// The answer to an uploaded dictionary: when the server's registry recorded it.
/// The uploader takes this time as its own, so that its next push leaves the dictionary's row out.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct DictionaryStored {
    pub updated_at_ms: u64,
}

/// Whether linking a device creates a new account on the remote or logs in to an existing one.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum SignInMode {
    Login,
    Signup,
}

/// Whether a remote is an account server reached over the internet, or a server on the local network.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum RemoteKind {
    Account,
    Lan,
}

/// How a built-in server keeps a copy of its data on a remote.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SyncStatus {
    /// The account link of the device's own data. None when the device is not linked, and always for an account.
    pub link: Option<SyncLink>,
    /// Raised each time rows pulled from the remote change this server's data. Zero for an account.
    pub pulled_revision: u64,
    /// The last change sequence this server gave out. Zero for an account.
    pub local_change_seq: u64,
}

/// A link to a remote, and how far syncing with it has come.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SyncLink {
    pub kind: RemoteKind,
    pub server_url: String,
    pub account_email: String,
    pub account_role: AccountRole,
    pub linked_at_ms: u64,
    /// When the latest successful round began. Every change made on this device before then is on the remote.
    pub last_synced_at_ms: Option<u64>,
    /// This server's change sequence up to which the remote holds every change.
    pub pushed_through_seq: u64,
    pub state: SyncLinkState,
    /// The media file being uploaded, while one is.
    pub transfer: Option<MediaTransfer>,
    /// The 20 most recent conflicts, newest first.
    pub conflicts: Vec<SyncConflict>,
    /// How many conflicts there are since they were last dismissed.
    pub conflict_count: u64,
}

/// What syncing with a remote is doing.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "kind", rename_all = "snake_case")]
#[ts(export)]
pub enum SyncLinkState {
    Idle,
    Syncing,
    /// The remote could not be reached since this time.
    Unreachable {
        since_ms: u64,
    },
    /// The remote ended this device's session, so the person must log in again.
    LoggedOut,
    /// The remote refused a request or answered in a way this server does not understand.
    Failed {
        code: String,
        message: String,
    },
}

/// The progress of a media file being uploaded to a remote.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct MediaTransfer {
    pub media_file_id: MediaFileId,
    pub name: String,
    pub sent_bytes: u64,
    pub total_bytes: u64,
}

/// Which of two changes made at once was kept.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum ConflictKept {
    /// The change made on this device.
    ThisDevice,
    /// The change made on another device.
    OtherDevice,
    /// The row was deleted on another device, so the change made on this device was dropped.
    Deletion,
}

/// A row that this device and another changed at once.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SyncConflict {
    pub id: String,
    /// Names the row for the person, such as "a flashcard in Spanish practice".
    pub description: String,
    pub kept: ConflictKept,
    pub detected_at_ms: u64,
}

/// Logs a built-in server in to a remote, or creates an account there, to keep a copy of the device's data on it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct LinkRemoteRequest {
    /// The remote's address, such as `https://cloud.example.com`.
    pub server_url: String,
    pub mode: SignInMode,
    pub email: String,
    pub password: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_link_state_names_its_kind_beside_its_fields() {
        let state = SyncLinkState::Unreachable { since_ms: 5 };
        assert_eq!(
            serde_json::to_value(state).unwrap(),
            serde_json::json!({ "kind": "unreachable", "since_ms": 5 })
        );
    }

    #[test]
    fn a_link_state_without_fields_is_only_its_kind() {
        assert_eq!(
            serde_json::to_value(SyncLinkState::LoggedOut).unwrap(),
            serde_json::json!({ "kind": "logged_out" })
        );
    }
}
