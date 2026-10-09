//! Deleting the subtitle files a media-source plugin fetched for a media file once no track
//! refers to them.

use std::path::Path;

/// The prefix of the directories that subtitles fetched after the import are written into,
/// inside the directory the media file was fetched into.
pub(crate) const SUBTITLES_DIR_PREFIX: &str = "subtitles-";

/// Deletes the subtitle file at `path` when it lies inside `item_dir`, the directory the
/// media file at `media_path` was fetched into, then removes the file's subtitles directory
/// once it is empty. A file anywhere else, or the media file itself, is left untouched.
pub(crate) async fn remove_fetched_subtitle_file(item_dir: &Path, media_path: &Path, path: &str) {
    let Ok(file) = Path::new(path).canonicalize() else {
        return;
    };
    let is_fetched = file.starts_with(item_dir) && file != item_dir;
    if !is_fetched || media_path.canonicalize().is_ok_and(|media| media == file) {
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
