//! The clips and screenshots of a published library item's cues, kept under `cues/` by segment index,
//! and the lock that keeps them in step with the item's file, segments and track choice.

use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};

use axum::http::StatusCode;
use easyimmerse_core::library::{LibraryItem, LibraryItemId, LibrarySegment};
use tokio::sync::OwnedRwLockWriteGuard;

use crate::auth::error_body::{ApiFailure, internal};
use crate::library_paths::LibraryItemPaths;
use crate::routes::library_support::{
    item_paths, load_editable_item, load_published_item, source_path,
};
use crate::routes::media_clip::render_clip_at;
use crate::routes::media_frame::render_frame_at;
use crate::state::AppState;

/// Numbers the partly written files of renders that run at once, so that none writes over another's.
static RENDER_COUNTER: AtomicU64 = AtomicU64::new(0);

/// A change to the file, segments or track choice of an item, which holds the library's cue lock until it is dropped.
pub struct CueChange {
    /// The item as it stood once the lock was taken.
    pub item: LibraryItem,
    _guard: OwnedRwLockWriteGuard<()>,
}

/// Takes the cue lock for writing, refuses an item that is being published,
/// and removes the item's rendered clips and screenshots, which the change would put out of step with its cues.
pub async fn begin_cue_change(
    state: &AppState,
    item_id: &LibraryItemId,
) -> Result<CueChange, ApiFailure> {
    let guard = Arc::clone(&state.library_cues).write_owned().await;
    let item = load_editable_item(state, item_id).await?;
    // A server without an uploads directory keeps no rendered files to remove.
    if let Ok(paths) = item_paths(state, item_id) {
        remove_cues(&paths).await?;
    }
    Ok(CueChange {
        item,
        _guard: guard,
    })
}

/// Removes every clip and screenshot rendered for the item's cues.
pub async fn remove_cues(paths: &LibraryItemPaths) -> Result<(), ApiFailure> {
    match tokio::fs::remove_dir_all(paths.cues_dir()).await {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(internal(format!(
            "the clips and screenshots of the item could not be removed: {error}"
        ))),
    }
}

/// The clip of the published item's cue that runs exactly from `start_ms` to `end_ms`,
/// from the one rendered before or else rendered now and kept.
pub async fn preprocessed_clip(
    state: &AppState,
    item_id: &LibraryItemId,
    start_ms: u64,
    end_ms: u64,
) -> Result<Vec<u8>, ApiFailure> {
    let _guard = state.library_cues.read().await;
    let is_window = |segment: &LibrarySegment| {
        segment.start_ms == Some(start_ms) && segment.end_ms == Some(end_ms)
    };
    let cue = find_cue(state, item_id, is_window).await?;
    let path = cue.paths.clip(cue.index);
    if let Ok(bytes) = tokio::fs::read(&path).await {
        return Ok(bytes);
    }
    let source = source_path(&cue.paths, &cue.item)?;
    let selection = track_selection_json(state, item_id).await?;
    let clip = render_clip_at(state, &source, selection.as_deref(), start_ms, end_ms).await?;
    keep_rendered(&path, &clip).await;
    Ok(clip)
}

/// The screenshot of the published item's cue whose screenshot time is `at_ms`,
/// from the one rendered before or else rendered now and kept.
pub async fn preprocessed_frame(
    state: &AppState,
    item_id: &LibraryItemId,
    at_ms: u64,
) -> Result<Vec<u8>, ApiFailure> {
    let _guard = state.library_cues.read().await;
    let is_moment = |segment: &LibrarySegment| segment.screenshot_at_ms == Some(at_ms);
    let cue = find_cue(state, item_id, is_moment).await?;
    let path = cue.paths.screenshot(cue.index);
    if let Ok(bytes) = tokio::fs::read(&path).await {
        return Ok(bytes);
    }
    let source = source_path(&cue.paths, &cue.item)?;
    let selection = track_selection_json(state, item_id).await?;
    let frame = render_frame_at(state, &source, selection.as_deref(), at_ms).await?;
    keep_rendered(&path, &frame).await;
    Ok(frame)
}

/// A cue of a published item, with the item and where its files are kept.
struct FoundCue {
    item: LibraryItem,
    paths: LibraryItemPaths,
    index: u32,
}

async fn find_cue(
    state: &AppState,
    item_id: &LibraryItemId,
    matches: impl Fn(&LibrarySegment) -> bool,
) -> Result<FoundCue, ApiFailure> {
    let item = load_published_item(state, item_id).await?;
    let id = item_id.clone();
    let text = state
        .with_storage(move |storage| storage.get_library_text(&id))
        .await?;
    let index = (text.segments.iter())
        .find(|segment| matches(segment))
        .map(|segment| segment.index)
        .ok_or_else(not_preprocessed)?;
    Ok(FoundCue {
        item,
        paths: item_paths(state, item_id)?,
        index,
    })
}

async fn track_selection_json(
    state: &AppState,
    item_id: &LibraryItemId,
) -> Result<Option<String>, ApiFailure> {
    let id = item_id.clone();
    state
        .with_storage(move |storage| storage.get_library_track_selection_json(&id))
        .await
}

/// Keeps a clip or screenshot rendered on request for the next request, writing it in full before it takes its place.
/// One that cannot be kept is rendered again next time.
async fn keep_rendered(path: &Path, bytes: &[u8]) {
    let part = part_path(path);
    let kept = write_then_rename(path, &part, bytes).await;
    if let Err(error) = kept {
        let _ = tokio::fs::remove_file(&part).await;
        tracing::warn!("{} could not be kept: {error}", path.display());
    }
}

async fn write_then_rename(path: &Path, part: &Path, bytes: &[u8]) -> std::io::Result<()> {
    if let Some(dir) = path.parent() {
        tokio::fs::create_dir_all(dir).await?;
    }
    tokio::fs::write(part, bytes).await?;
    tokio::fs::rename(part, path).await
}

fn part_path(path: &Path) -> PathBuf {
    let number = RENDER_COUNTER.fetch_add(1, Ordering::Relaxed);
    let mut name = path.file_name().unwrap_or_default().to_os_string();
    name.push(format!(".{number}.part"));
    path.with_file_name(name)
}

fn not_preprocessed() -> ApiFailure {
    ApiFailure::new(
        StatusCode::NOT_FOUND,
        "not_preprocessed",
        "the library has no cue at that time",
    )
}
