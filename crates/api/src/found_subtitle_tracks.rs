//! Adds the subtitle tracks found with a local media file, inside it and beside it, and gives
//! them the roles their languages suggest.

use easyimmerse_core::found_subtitle_tracks::{FoundTrack, select_found_tracks};
use easyimmerse_core::media_file::MediaFile;

use crate::auth::error_body::ApiFailure;
use crate::auth::token_kind::TokenKind;
use crate::embedded_subtitle_tracks::add_embedded_subtitle_tracks;
use crate::sidecar_subtitle_tracks::add_sidecar_subtitle_tracks;
use crate::state::AppState;

/// Adds the text subtitle tracks inside the media file at `path`, then the subtitle files
/// beside it, then gives the new tracks the roles their languages suggest without replacing a
/// role already taken. A failure only skips the tracks or roles it concerns, so it is logged
/// rather than returned.
pub async fn add_found_subtitle_tracks(
    state: &AppState,
    token: TokenKind,
    media_file: &MediaFile,
    path: &str,
) {
    let embedded = add_embedded_subtitle_tracks(state, token, media_file, path)
        .await
        .unwrap_or_else(|failure| {
            tracing::warn!(
                "could not add the subtitles inside {path:?}: {}",
                failure.error.message
            );
            Vec::new()
        });
    let sidecar = add_sidecar_subtitle_tracks(state, token, media_file, path).await;
    if embedded.is_empty() && sidecar.is_empty() {
        return;
    }
    if let Err(failure) = select_found_track_roles(state, media_file, sidecar, embedded).await {
        tracing::warn!(
            "could not choose the subtitle tracks of {path:?}: {}",
            failure.error.message
        );
    }
}

async fn select_found_track_roles(
    state: &AppState,
    media_file: &MediaFile,
    sidecar: Vec<FoundTrack>,
    embedded: Vec<FoundTrack>,
) -> Result<(), ApiFailure> {
    let project_id = media_file.project_id.clone();
    let media_id = media_file.id.clone();
    state
        .with_storage(move |storage| {
            let settings = storage.get_project(&project_id)?.settings;
            let suggested = select_found_tracks(
                &sidecar,
                &embedded,
                &settings.target_language,
                &settings.translation_language,
            );
            let existing = storage.get_subtitle_selection(&media_id)?;
            storage.set_subtitle_selection(&media_id, &existing.with_unset_roles_from(suggested))
        })
        .await
}
