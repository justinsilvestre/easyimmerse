//! Publishing a library item: a background task that probes the item's file, renders the clip of every cue,
//! the screenshot of every cue of a video, and the cover, and then marks the item published, or failed with the reason.

use std::path::Path;

use easyimmerse_core::library::{
    LibraryItem, LibraryItemId, LibraryItemKind, LibraryItemStatus, LibrarySegment, LibraryText,
};

use crate::auth::error_body::{ApiFailure, internal};
use crate::library_paths::LibraryItemPaths;
use crate::routes::library_support::{
    item_paths, item_processing, load_item, require_editable, source_path,
};
use crate::routes::media_clip::render_clip_at;
use crate::routes::media_frame::render_frame_at;
use crate::routes::media_support::{conversion_unavailable, locate_ffmpeg, probe_media};
use crate::state::AppState;

/// Marks the item as being published and starts the task that publishes it, returning the item as it now stands.
/// A video or audio item needs ffmpeg, which is checked before the task starts.
/// Answers 409 when the item is already published or being published, so that two publishes never run at once.
pub async fn start_library_publish(
    state: &AppState,
    item: LibraryItem,
) -> Result<LibraryItem, ApiFailure> {
    let paths = item_paths(state, &item.id)?;
    let source = source_path(&paths, &item)?;
    if item.kind != LibraryItemKind::Document {
        state.probes.as_ref().ok_or_else(conversion_unavailable)?;
        locate_ffmpeg(state)?;
    }
    let id = item.id.clone();
    let begun = state
        .with_storage(move |storage| storage.begin_library_publish(&id))
        .await?;
    let Some(processing) = begun else {
        require_editable(&load_item(state, &item.id).await?)?;
        return Err(item_processing());
    };
    let task_state = state.clone();
    tokio::spawn(async move {
        let outcome = run_publish(task_state.clone(), item.clone(), paths, source).await;
        record_outcome(&task_state, &item, outcome).await;
    });
    Ok(processing)
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
    let text = state
        .with_storage(move |storage| {
            storage.set_library_duration(&id, duration_ms)?;
            storage.get_library_text(&id)
        })
        .await?;
    create_dir(&paths.cues_dir()).await?;
    render_clips(state, paths, source, &text.segments).await?;
    if item.kind == LibraryItemKind::Video {
        render_screenshots(state, item, paths, source, text).await?;
    }
    Ok(())
}

async fn render_clips(
    state: &AppState,
    paths: &LibraryItemPaths,
    source: &str,
    segments: &[LibrarySegment],
) -> Result<(), ApiFailure> {
    for segment in segments {
        if let (Some(start_ms), Some(end_ms)) = (segment.start_ms, segment.end_ms) {
            let clip = render_clip_at(state, source, None, start_ms, end_ms).await?;
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
    source: &str,
    text: LibraryText,
) -> Result<(), ApiFailure> {
    let segments = with_screenshot_times(text.segments);
    let times: Vec<(u32, u64)> = (segments.iter())
        .filter_map(|segment| Some((segment.index, segment.screenshot_at_ms?)))
        .collect();
    for &(index, at_ms) in &times {
        let frame = render_frame_at(state, source, None, at_ms).await?;
        write_file(&paths.screenshot(index), &frame).await?;
    }
    let id = item.id.clone();
    state
        .with_storage(move |storage| storage.set_screenshot_times(&id, &times))
        .await?;
    let text = LibraryText {
        segments,
        chapter_titles: text.chapter_titles,
    };
    match cover_time(item.cover_at_ms, &text) {
        Some(at_ms) => render_cover(state, &item.id, source, at_ms).await,
        None => Ok(()),
    }
}

/// Renders the cover of a video item from the frame at `at_ms`, and records that the item has one.
pub async fn render_cover(
    state: &AppState,
    item_id: &LibraryItemId,
    source: &str,
    at_ms: u64,
) -> Result<(), ApiFailure> {
    let paths = item_paths(state, item_id)?;
    let cover = render_frame_at(state, source, None, at_ms).await?;
    create_dir(&paths.dir).await?;
    write_file(&paths.cover(), &cover).await?;
    let id = item_id.clone();
    state
        .with_storage(move |storage| storage.set_library_cover(&id))
        .await?;
    Ok(())
}

/// The time of the cover: the one the manager chose, else the first cue's screenshot time.
pub fn cover_time(cover_at_ms: Option<u64>, text: &LibraryText) -> Option<u64> {
    cover_at_ms.or_else(|| {
        text.segments
            .iter()
            .find_map(|segment| segment.screenshot_at_ms)
    })
}

/// Gives every cue with a time window its screenshot time, the midpoint of the window.
fn with_screenshot_times(segments: Vec<LibrarySegment>) -> Vec<LibrarySegment> {
    segments
        .into_iter()
        .map(|segment| LibrarySegment {
            screenshot_at_ms: segment.start_ms.zip(segment.end_ms).map(midpoint),
            ..segment
        })
        .collect()
}

fn midpoint((start_ms, end_ms): (u64, u64)) -> u64 {
    start_ms + end_ms.saturating_sub(start_ms) / 2
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

#[cfg(test)]
mod tests {
    use super::*;

    fn segment(index: u32, window: Option<(u64, u64)>) -> LibrarySegment {
        LibrarySegment {
            index,
            chapter_index: None,
            start_ms: window.map(|(start, _)| start),
            end_ms: window.map(|(_, end)| end),
            screenshot_at_ms: None,
            text: "Hallo.".to_string(),
            translation: None,
            words: Vec::new(),
        }
    }

    fn text(segments: Vec<LibrarySegment>) -> LibraryText {
        LibraryText {
            segments,
            chapter_titles: Vec::new(),
        }
    }

    #[test]
    fn takes_the_screenshot_at_the_midpoint_of_the_cue() {
        let segments = with_screenshot_times(vec![segment(0, Some((1_000, 2_001)))]);
        assert_eq!(segments[0].screenshot_at_ms, Some(1_500));
    }

    #[test]
    fn takes_no_screenshot_of_a_segment_without_times() {
        let segments = with_screenshot_times(vec![segment(0, None)]);
        assert_eq!(segments[0].screenshot_at_ms, None);
    }

    #[test]
    fn takes_the_cover_at_the_chosen_time() {
        let text = text(with_screenshot_times(vec![segment(0, Some((0, 1_000)))]));
        assert_eq!(cover_time(Some(3_000), &text), Some(3_000));
    }

    #[test]
    fn takes_the_cover_at_the_first_screenshot_without_a_chosen_time() {
        let segments = vec![segment(0, None), segment(1, Some((2_000, 3_000)))];
        let text = text(with_screenshot_times(segments));
        assert_eq!(cover_time(None, &text), Some(2_500));
    }
}
