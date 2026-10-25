//! Publishing a library item: a background task that probes the item's file, renders the clip of every cue,
//! the screenshot of every cue of a video, and the cover, and then marks the item published, or failed with the reason.

use std::path::Path;

use easyimmerse_core::library::{
    LibraryItem, LibraryItemId, LibraryItemKind, LibraryItemStatus, LibrarySegment, LibraryText,
};
use easyimmerse_storage::{OwnerId, Storage, StorageError};

use crate::auth::error_body::{ApiFailure, internal};
use crate::auth::principal::Principal;
use crate::library_covers::refresh_cover;
use crate::library_cues::remove_cues;
use crate::library_paths::LibraryItemPaths;
use crate::library_segments::with_screenshot_times;
use crate::routes::library_support::{
    item_paths, item_processing, load_item, require_publishable, source_path,
};
use crate::routes::media_clip::render_clip_at;
use crate::routes::media_frame::render_frame_at;
use crate::routes::media_support::{conversion_unavailable, locate_ffmpeg, probe_media};
use crate::state::AppState;

/// Marks the item as being published and starts the task that publishes it, returning the item as it now stands.
/// Learners play the tracks the principal chose in their own media file of the item, as `keep_managers_tracks` describes.
/// A video or audio item needs ffmpeg, which is checked before the task starts.
/// Answers 409 when the item is already published or being published, so that two publishes never run at once.
pub async fn start_library_publish(
    state: &AppState,
    principal: &Principal,
    item: LibraryItem,
) -> Result<LibraryItem, ApiFailure> {
    let paths = item_paths(state, &item.id)?;
    let source = source_path(&paths, &item)?;
    if item.kind != LibraryItemKind::Document {
        state.probes.as_ref().ok_or_else(conversion_unavailable)?;
        locate_ffmpeg(state)?;
    }
    let (id, owner) = (item.id.clone(), principal.owner_id());
    // A change to the item's file, segments or tracks that is under way finishes before the publish reads them.
    let guard = state.library_cues.write().await;
    let begun = state
        .with_storage(move |storage| {
            let begun = storage.begin_library_publish(&id)?;
            if begun.is_some() {
                keep_managers_tracks(storage, &owner, &id)?;
            }
            Ok(begun)
        })
        .await?;
    drop(guard);
    let Some(processing) = begun else {
        require_publishable(&load_item(state, &item.id).await?)?;
        return Err(item_processing());
    };
    // The file may have been replaced while the publish waited for the lock.
    let source = source_path(&paths, &processing).unwrap_or(source);
    let (task_state, item) = (state.clone(), processing.clone());
    tokio::spawn(async move {
        let outcome = run_publish(task_state.clone(), item.clone(), paths, source).await;
        record_outcome(&task_state, &item, outcome).await;
    });
    Ok(processing)
}

/// Records the track choice of the owner's media file of the item as the tracks learners play,
/// and gives it to every media file of the item, so that learners who added the item before play them too.
/// An owner without such a media file leaves the choice recorded before.
fn keep_managers_tracks(
    storage: &Storage,
    owner: &OwnerId,
    item_id: &LibraryItemId,
) -> Result<(), StorageError> {
    let Some(media_file) = storage.find_owners_library_media_file(owner, item_id)? else {
        return Ok(());
    };
    let selection = media_file.track_selection_json.as_deref();
    storage.set_library_track_selection_json(item_id, selection)?;
    storage.set_library_media_track_selection_json(item_id, selection)
}

/// Runs the publish in a task of its own, so that a panic inside it still ends in a recorded failure.
async fn run_publish(
    state: AppState,
    item: LibraryItem,
    paths: LibraryItemPaths,
    source: String,
) -> Result<(), ApiFailure> {
    let task = tokio::spawn(async move { publish(&state, &item, &paths, &source).await });
    task.await
        .unwrap_or_else(|error| Err(internal(format!("the publish stopped: {error}"))))
}

async fn record_outcome(state: &AppState, item: &LibraryItem, outcome: Result<(), ApiFailure>) {
    let status = match outcome {
        Ok(()) => LibraryItemStatus::Published,
        Err(failure) => LibraryItemStatus::Failed {
            message: failure.error.message,
        },
    };
    let id = item.id.clone();
    let recorded = state
        .with_storage(move |storage| storage.set_library_status(&id, &status))
        .await;
    if let Err(failure) = recorded {
        tracing::warn!(
            "the publish of library item {} could not be recorded: {}",
            item.id.0,
            failure.error.message
        );
    }
}

async fn publish(
    state: &AppState,
    item: &LibraryItem,
    paths: &LibraryItemPaths,
    source: &str,
) -> Result<(), ApiFailure> {
    if item.kind == LibraryItemKind::Document {
        return Ok(());
    }
    let duration_ms = probe_media(state, source).await?.duration_ms;
    let id = item.id.clone();
    let (text, selection) = state
        .with_storage(move |storage| {
            storage.set_library_duration(&id, duration_ms)?;
            Ok((
                storage.get_library_text(&id)?,
                storage.get_library_track_selection_json(&id)?,
            ))
        })
        .await?;
    let source = TrackedSource {
        path: source,
        selection: selection.as_deref(),
    };
    remove_cues(paths).await?;
    create_dir(&paths.cues_dir()).await?;
    render_clips(state, paths, &source, &text.segments).await?;
    if item.kind == LibraryItemKind::Video {
        render_screenshots(state, item, paths, &source, text).await?;
    }
    Ok(())
}

/// The item's file, with the tracks its learners play as the JSON of a `TrackSelection`.
struct TrackedSource<'a> {
    path: &'a str,
    selection: Option<&'a str>,
}

async fn render_clips(
    state: &AppState,
    paths: &LibraryItemPaths,
    source: &TrackedSource<'_>,
    segments: &[LibrarySegment],
) -> Result<(), ApiFailure> {
    for segment in segments {
        if let (Some(start_ms), Some(end_ms)) = (segment.start_ms, segment.end_ms) {
            let clip =
                render_clip_at(state, source.path, source.selection, start_ms, end_ms).await?;
            write_file(&paths.clip(segment.index), &clip).await?;
        }
    }
    Ok(())
}

/// Renders the screenshot of every cue at its midpoint and records those times, then renders the cover.
async fn render_screenshots(
    state: &AppState,
    item: &LibraryItem,
    paths: &LibraryItemPaths,
    source: &TrackedSource<'_>,
    text: LibraryText,
) -> Result<(), ApiFailure> {
    let segments = with_screenshot_times(text.segments);
    let times: Vec<(u32, u64)> = (segments.iter())
        .filter_map(|segment| Some((segment.index, segment.screenshot_at_ms?)))
        .collect();
    for &(index, at_ms) in &times {
        let frame = render_frame_at(state, source.path, source.selection, at_ms).await?;
        write_file(&paths.screenshot(index), &frame).await?;
    }
    let id = item.id.clone();
    state
        .with_storage(move |storage| storage.set_screenshot_times(&id, &times))
        .await?;
    refresh_cover(state, item).await?;
    Ok(())
}

async fn create_dir(dir: &Path) -> Result<(), ApiFailure> {
    tokio::fs::create_dir_all(dir)
        .await
        .map_err(|error| internal(format!("the library directory could not be made: {error}")))
}

async fn write_file(path: &Path, bytes: &[u8]) -> Result<(), ApiFailure> {
    tokio::fs::write(path, bytes)
        .await
        .map_err(|error| internal(format!("{} could not be written: {error}", path.display())))
}
