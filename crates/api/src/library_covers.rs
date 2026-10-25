//! The cover pictures of library items: keeping one among the item's files, rendering one from a frame of a video,
//! and taking one from an EPUB file.

use std::path::PathBuf;

use easyimmerse_core::document::{DocumentFormat, detect_document_format, epub_cover};
use easyimmerse_core::library::{LibraryCover, LibraryItem, LibraryItemKind, LibraryText};

use crate::auth::error_body::{ApiFailure, internal};
use crate::library_paths::LibraryItemPaths;
use crate::routes::library_support::{item_paths, source_path};
use crate::routes::media_frame::render_frame_at;
use crate::state::AppState;

/// Puts the cover the item's choice calls for in place, as far as it can be made now, and returns the item as it then stands.
/// A video's frame is rendered when its file is uploaded and the time is known; until then the item has no cover picture.
/// An uploaded picture is left as it is.
pub async fn refresh_cover(
    state: &AppState,
    item: &LibraryItem,
) -> Result<LibraryItem, ApiFailure> {
    let picture = match (item.cover, item.kind) {
        (LibraryCover::Uploaded, _) => return Ok(item.clone()),
        (_, LibraryItemKind::Video) => video_cover(state, item).await?,
        (_, LibraryItemKind::Document) => document_cover(state, item).await?,
        (_, LibraryItemKind::Audio) => None,
    };
    match picture {
        Some((bytes, media_type)) => store_cover(state, item, &bytes, media_type).await,
        None => remove_cover(state, item).await,
    }
}

async fn video_cover(
    state: &AppState,
    item: &LibraryItem,
) -> Result<Option<(Vec<u8>, &'static str)>, ApiFailure> {
    let paths = item_paths(state, &item.id)?;
    let Ok(source) = source_path(&paths, item) else {
        return Ok(None);
    };
    let id = item.id.clone();
    let text = state
        .with_storage(move |storage| storage.get_library_text(&id))
        .await?;
    let Some(at_ms) = cover_time(item.cover, &text) else {
        return Ok(None);
    };
    let frame = render_frame_at(state, &source, None, at_ms).await?;
    Ok(Some((frame, "image/jpeg")))
}

/// The cover of an EPUB file, or None for an item with no file, a plain text file, or a book without a cover.
async fn document_cover(
    state: &AppState,
    item: &LibraryItem,
) -> Result<Option<(Vec<u8>, &'static str)>, ApiFailure> {
    let paths = item_paths(state, &item.id)?;
    let Ok(source) = source_path(&paths, item) else {
        return Ok(None);
    };
    let bytes = tokio::fs::read(&source)
        .await
        .map_err(|error| internal(format!("the item's file could not be read: {error}")))?;
    Ok(book_cover(&bytes))
}

/// The cover picture of a book's bytes and its type, when they are an EPUB file with one.
pub fn book_cover(bytes: &[u8]) -> Option<(Vec<u8>, &'static str)> {
    if detect_document_format(bytes) != DocumentFormat::Epub {
        return None;
    }
    let picture = epub_cover(bytes).ok()??;
    Some((picture.bytes, picture.media_type))
}

/// The time of the frame a video's cover is rendered from: the chosen one, or for the automatic cover the first cue's midpoint,
/// where its screenshot is taken. None for an uploaded cover, or for a video without timed cues.
pub fn cover_time(cover: LibraryCover, text: &LibraryText) -> Option<u64> {
    match cover {
        LibraryCover::Frame { at_ms } => Some(at_ms),
        LibraryCover::Automatic => text
            .segments
            .iter()
            .find_map(|segment| segment.start_ms.zip(segment.end_ms))
            .map(midpoint),
        LibraryCover::Uploaded => None,
    }
}

/// The middle of a cue's time window, where its screenshot is taken.
pub fn midpoint((start_ms, end_ms): (u64, u64)) -> u64 {
    start_ms + end_ms.saturating_sub(start_ms) / 2
}

/// Keeps the picture as the item's cover, in place of any earlier one, and records its type.
pub async fn store_cover(
    state: &AppState,
    item: &LibraryItem,
    bytes: &[u8],
    media_type: &'static str,
) -> Result<LibraryItem, ApiFailure> {
    let paths = item_paths(state, &item.id)?;
    let path = paths
        .cover(media_type)
        .ok_or_else(|| internal(format!("covers of type {media_type} are not kept")))?;
    remove_cover_files(&paths).await;
    write_cover(&paths, &path, bytes).await?;
    let id = item.id.clone();
    state
        .with_storage(move |storage| storage.set_library_cover(&id, Some(media_type)))
        .await
}

/// Removes the item's cover picture and records that it has none.
pub async fn remove_cover(state: &AppState, item: &LibraryItem) -> Result<LibraryItem, ApiFailure> {
    remove_cover_files(&item_paths(state, &item.id)?).await;
    let id = item.id.clone();
    state
        .with_storage(move |storage| storage.set_library_cover(&id, None))
        .await
}

/// The item's cover picture, if one is kept.
pub async fn find_cover_file(paths: &LibraryItemPaths) -> Option<PathBuf> {
    for path in paths.covers() {
        if tokio::fs::try_exists(&path).await.unwrap_or(false) {
            return Some(path);
        }
    }
    None
}

async fn remove_cover_files(paths: &LibraryItemPaths) {
    for path in paths.covers() {
        let _ = tokio::fs::remove_file(path).await;
    }
}

async fn write_cover(
    paths: &LibraryItemPaths,
    path: &PathBuf,
    bytes: &[u8],
) -> Result<(), ApiFailure> {
    tokio::fs::create_dir_all(&paths.dir)
        .await
        .map_err(|error| internal(format!("the library directory could not be made: {error}")))?;
    tokio::fs::write(path, bytes)
        .await
        .map_err(|error| internal(format!("the cover could not be written: {error}")))
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::library::LibrarySegment;

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
    fn takes_the_cover_at_the_chosen_frame() {
        let text = text(vec![segment(0, Some((0, 1_000)))]);
        assert_eq!(
            cover_time(LibraryCover::Frame { at_ms: 3_000 }, &text),
            Some(3_000)
        );
    }

    #[test]
    fn takes_the_automatic_cover_at_the_middle_of_the_first_timed_cue() {
        let text = text(vec![segment(0, None), segment(1, Some((2_000, 3_000)))]);
        assert_eq!(cover_time(LibraryCover::Automatic, &text), Some(2_500));
    }

    #[test]
    fn renders_no_frame_for_an_uploaded_cover() {
        let text = text(vec![segment(0, Some((0, 1_000)))]);
        assert_eq!(cover_time(LibraryCover::Uploaded, &text), None);
    }

    #[test]
    fn takes_no_cover_from_plain_text() {
        assert_eq!(book_cover(b"Der Hund schlaeft."), None);
    }
}
