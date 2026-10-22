//! Pulling the remote's changes into the inbox, then applying them.

use easyimmerse_core::sync::SyncRow;
use easyimmerse_storage::{AppliedInbox, PulledRow, StoredRemote};

use super::SyncEngine;
use super::remote_client::RemoteClient;
use super::round::RoundError;
use crate::now_ms::now_ms;

const PAGE_ROWS: u32 = 500;

/// Pulls every change after the link's cursor, page by page, then applies what waits in the inbox.
pub fn pull(
    engine: &SyncEngine,
    client: &RemoteClient,
    remote: &StoredRemote,
) -> Result<AppliedInbox, RoundError> {
    let mut cursor = remote.pulled_cursor;
    loop {
        let page = client.changes_since(cursor, PAGE_ROWS)?;
        let rows: Vec<PulledRow> = page.rows.into_iter().map(pulled_row_of).collect();
        engine
            .storage
            .receive_sync_page(&remote.id, &rows, page.next_cursor)?;
        cursor = page.next_cursor;
        if !page.has_more {
            break;
        }
    }
    let applied = engine.storage.apply_sync_inbox(remote, now_ms())?;
    log_dropped_rows(&applied);
    if applied.applied_count > 0 {
        engine.note_pulled_rows();
    }
    Ok(applied)
}

pub fn pulled_row_of(row: SyncRow) -> PulledRow {
    PulledRow {
        table: row.table.into(),
        key: row.key,
        updated_at_ms: row.updated_at_ms,
        is_deleted: row.is_deleted,
        data: row.data,
    }
}

pub fn log_dropped_rows(applied: &AppliedInbox) {
    for dropped in &applied.dropped_rows {
        tracing::warn!("a synced row was dropped: {dropped}");
    }
}
