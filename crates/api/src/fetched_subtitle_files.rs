//! Removing subtitle tracks from a media file.
//! The app deletes a track's file only when it downloaded the file itself, into its own media
//! directory, and no media file or subtitle track still refers to it. Files the user chose
//! are never deleted.
//! Concretely, the media file must have been imported through a plugin, and the track's
//! file must lie in the directory the app created for that import.

use std::path::{Path, PathBuf};

use easyimmerse_core::media_file::MediaFile;
use easyimmerse_core::subtitle_track::SubtitleTrackId;
use easyimmerse_core::text_source::TextSource;
use easyimmerse_storage::{Storage, StorageError};

use crate::auth::error_body::ApiFailure;
use crate::state::AppState;

/// The prefix of the directories that subtitles fetched after the import are written into,
/// inside the directory the media file was fetched into.
pub(crate) const SUBTITLES_DIR_PREFIX: &str = "subtitles-";

/// Removes the tracks `ids` from the media file, then deletes the files among them that the
/// app downloaded for it and that nothing refers to any more, leaving every other file alone.
pub(crate) async fn remove_subtitle_tracks(
    state: &AppState,
    media_file: &MediaFile,
    ids: &[SubtitleTrackId],
) -> Result<(), ApiFailure> {
    let ids = ids.to_vec();
    let item_dir = state.fetched_item_dir(media_file);
    let dir = item_dir.clone();
    let deletable = state
        .with_storage(move |storage| {
            let mut sources = Vec::new();
            for id in &ids {
                sources.push(storage.get_subtitle_track(id)?.source);
                storage.remove_subtitle_track(id)?;
            }
            match &dir {
                Some(dir) => list_deletable_files(storage, dir, sources),
                None => Ok(Vec::new()),
            }
        })
        .await?;
    if let Some(item_dir) = item_dir {
        for file in deletable {
            remove_fetched_subtitle_file(&item_dir, &file).await;
        }
    }
    Ok(())
}

/// The files among `sources` that lie inside `item_dir` and that no media file or subtitle
/// track names any more. Stored paths are canonical, so they are compared as they are.
fn list_deletable_files(
    storage: &Storage,
    item_dir: &Path,
    sources: Vec<TextSource>,
) -> Result<Vec<PathBuf>, StorageError> {
    let mut deletable = Vec::new();
    for source in sources {
        let TextSource::Path { path } = source else {
            continue;
        };
        let file = PathBuf::from(&path);
        let is_fetched = file.starts_with(item_dir) && file != item_dir;
        if is_fetched && !deletable.contains(&file) && !storage.is_path_referenced(&path)? {
            deletable.push(file);
        }
    }
    Ok(deletable)
}

/// Deletes the subtitle file, then removes its subtitles directory once it is empty.
async fn remove_fetched_subtitle_file(item_dir: &Path, file: &Path) {
    if let Err(error) = tokio::fs::remove_file(file).await {
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
