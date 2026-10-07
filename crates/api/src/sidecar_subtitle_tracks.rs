//! Adds the subtitle files that sit beside a local media file as its subtitle tracks.

use std::path::Path;

use easyimmerse_core::media_file::MediaFile;
use easyimmerse_core::sidecar_subtitles::{
    SidecarSubtitle, find_sidecar_subtitles, select_sidecar_tracks,
};
use easyimmerse_core::subtitle_track::{
    AddSubtitleTrackRequest, SubtitleSelection, SubtitleTrackId,
};
use easyimmerse_core::text_source::TextSource;

use crate::auth::error_body::ApiFailure;
use crate::auth::token_kind::TokenKind;
use crate::routes::subtitles::store_subtitle_track;
use crate::state::AppState;

/// Adds every sidecar subtitles file of the media file at `path` as a track, skipping files
/// that cannot be read or parsed, then gives the new tracks the roles their languages suggest
/// without replacing a role already taken.
pub async fn add_sidecar_subtitle_tracks(
    state: &AppState,
    token: TokenKind,
    media_file: &MediaFile,
    path: &str,
) -> Result<(), ApiFailure> {
    let media_path = Path::new(path);
    let mut added = Vec::new();
    for sidecar in list_sidecars(media_path).await {
        let request = sidecar_request(folder_of(media_path), &sidecar);
        if let Some(track_id) = add_sidecar(state, token, media_file, request).await {
            added.push((track_id, sidecar.language));
        }
    }
    if added.is_empty() {
        return Ok(());
    }
    select_added_tracks(state, media_file, added).await
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

async fn select_added_tracks(
    state: &AppState,
    media_file: &MediaFile,
    added: Vec<(SubtitleTrackId, Option<String>)>,
) -> Result<(), ApiFailure> {
    let project_id = media_file.project_id.clone();
    let media_id = media_file.id.clone();
    state
        .with_storage(move |storage| {
            let settings = storage.get_project(&project_id)?.settings;
            let suggested = select_sidecar_tracks(
                &added,
                &settings.target_language,
                &settings.translation_language,
            );
            let existing = storage.get_subtitle_selection(&media_id)?;
            storage.set_subtitle_selection(&media_id, &fill_unset_roles(existing, suggested))
        })
        .await
}

fn fill_unset_roles(
    existing: SubtitleSelection,
    suggested: SubtitleSelection,
) -> SubtitleSelection {
    SubtitleSelection {
        target_track_id: existing.target_track_id.or(suggested.target_track_id),
        translation_track_id: existing
            .translation_track_id
            .or(suggested.translation_track_id),
    }
}
