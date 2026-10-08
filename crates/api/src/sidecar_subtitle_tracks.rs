//! Adds the subtitle files that sit beside a local media file as its subtitle tracks.

use std::path::Path;

use easyimmerse_core::found_subtitle_tracks::FoundTrack;
use easyimmerse_core::media_file::MediaFile;
use easyimmerse_core::sidecar_subtitles::{SidecarSubtitle, find_sidecar_subtitles};
use easyimmerse_core::subtitle_track::{AddSubtitleTrackRequest, SubtitleTrackId};
use easyimmerse_core::text_source::TextSource;

use crate::auth::token_kind::TokenKind;
use crate::routes::subtitles::store_subtitle_track;
use crate::state::AppState;

/// Adds every sidecar subtitles file of the media file at `path` as a track, skipping files
/// that cannot be read or parsed, and returns the added tracks with their language tags.
pub async fn add_sidecar_subtitle_tracks(
    state: &AppState,
    token: TokenKind,
    media_file: &MediaFile,
    path: &str,
) -> Vec<FoundTrack> {
    let media_path = Path::new(path);
    let mut added = Vec::new();
    for sidecar in list_sidecars(media_path).await {
        let request = sidecar_request(folder_of(media_path), &sidecar);
        if let Some(track_id) = add_sidecar(state, token, media_file, request).await {
            added.push((track_id, sidecar.language));
        }
    }
    added
}

async fn list_sidecars(media_path: &Path) -> Vec<SidecarSubtitle> {
    let Some(media_file_name) = media_path.file_name().and_then(|name| name.to_str()) else {
        return Vec::new();
    };
    match list_file_names(folder_of(media_path)).await {
        Ok(names) => find_sidecar_subtitles(media_file_name, &names),
        Err(error) => {
            tracing::warn!("could not list the folder of {media_path:?}: {error}");
            Vec::new()
        }
    }
}

fn folder_of(media_path: &Path) -> &Path {
    match media_path.parent() {
        Some(parent) if !parent.as_os_str().is_empty() => parent,
        _ => Path::new("."),
    }
}

/// Lists the UTF-8 names in the folder in alphabetical order, so tracks are added in a
/// stable order.
async fn list_file_names(folder: &Path) -> std::io::Result<Vec<String>> {
    let mut entries = tokio::fs::read_dir(folder).await?;
    let mut names = Vec::new();
    while let Some(entry) = entries.next_entry().await? {
        if let Ok(name) = entry.file_name().into_string() {
            names.push(name);
        }
    }
    names.sort();
    Ok(names)
}

fn sidecar_request(folder: &Path, sidecar: &SidecarSubtitle) -> AddSubtitleTrackRequest {
    AddSubtitleTrackRequest {
        name: sidecar.file_name.clone(),
        source: TextSource::Path {
            path: folder
                .join(&sidecar.file_name)
                .to_string_lossy()
                .into_owned(),
        },
        format: Some(sidecar.format),
        role: None,
    }
}

async fn add_sidecar(
    state: &AppState,
    token: TokenKind,
    media_file: &MediaFile,
    request: AddSubtitleTrackRequest,
) -> Option<SubtitleTrackId> {
    let name = request.name.clone();
    match store_subtitle_track(state, token, media_file.id.clone(), request).await {
        Ok(track) => Some(track.id),
        Err(failure) => {
            tracing::warn!(
                "skipped the subtitles file {name:?}: {}",
                failure.error.message
            );
            None
        }
    }
}
