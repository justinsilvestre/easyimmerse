//! Removing subtitle tracks together with the files a media-source plugin fetched for them.
//! A file is deleted only when the media file was imported through a plugin, the file lies
//! in the directory the plugin fetched the media file into, and no media file or subtitle
//! track still refers to it.

use std::path::{Path, PathBuf};

use easyimmerse_core::media_file::{MediaFile, MediaFileSource};
use easyimmerse_core::subtitle_track::SubtitleTrackId;
use easyimmerse_core::text_source::TextSource;

use crate::auth::error_body::ApiFailure;
use crate::referenced_paths::{canonicalize_paths, list_referenced_paths};
use crate::state::AppState;

/// The prefix of the directories that subtitles fetched after the import are written into,
/// inside the directory the media file was fetched into.
pub(crate) const SUBTITLES_DIR_PREFIX: &str = "subtitles-";

/// Removes the tracks `ids` from the media file, then deletes the files among them that the
/// plugin fetched for it and that nothing refers to any more, leaving every other file alone.
pub(crate) async fn remove_subtitle_tracks(
    state: &AppState,
    media_file: &MediaFile,
    ids: &[SubtitleTrackId],
) -> Result<(), ApiFailure> {
    let ids = ids.to_vec();
    let (sources, referenced) = state
        .with_storage(move |storage| {
            let mut sources = Vec::new();
            for id in &ids {
                sources.push(storage.get_subtitle_track(id)?.source);
                storage.remove_subtitle_track(id)?;
            }
            Ok((sources, list_referenced_paths(storage)?))
        })
        .await?;
    if media_file.origin.is_some() {
        remove_fetched_files(state, media_file, sources, &canonicalize_paths(&referenced)).await;
    }
    Ok(())
}

async fn remove_fetched_files(
    state: &AppState,
    media_file: &MediaFile,
    sources: Vec<TextSource>,
    referenced: &[PathBuf],
) {
    let MediaFileSource::Path { path: media_path } = &media_file.source else {
        return;
    };
    let Some(item_dir) = state.fetched_item_dir(media_path) else {
        return;
    };
    for source in sources {
        if let TextSource::Path { path } = source {
            remove_fetched_subtitle_file(&item_dir, &path, referenced).await;
        }
    }
}

/// Deletes the subtitle file at `path` when it lies inside `item_dir`, the directory the
/// media file was fetched into, and is not among the `referenced` files, then removes the
/// file's subtitles directory once it is empty. A file anywhere else is left untouched.
async fn remove_fetched_subtitle_file(item_dir: &Path, path: &str, referenced: &[PathBuf]) {
    let Ok(file) = Path::new(path).canonicalize() else {
        return;
    };
    let is_fetched = file.starts_with(item_dir) && file != item_dir;
    if !is_fetched || referenced.contains(&file) {
        return;
    }
    if let Err(error) = tokio::fs::remove_file(&file).await {
        tracing::warn!("could not remove {}: {error}", file.display());
        return;
    }
    if let Some(dir) = file.parent().filter(|dir| is_subtitles_dir(item_dir, dir)) {
        // Removing a directory fails while it still holds files, which leaves it in place.
        let _ = tokio::fs::remove_dir(dir).await;
    }
}

fn is_subtitles_dir(item_dir: &Path, dir: &Path) -> bool {
    dir.parent() == Some(item_dir)
        && dir
            .file_name()
            .is_some_and(|name| name.to_string_lossy().starts_with(SUBTITLES_DIR_PREFIX))
}
