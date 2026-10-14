//! Renders the audio clips and screenshots that Anki notes refer to, for an exported deck package.

use easyimmerse_anki::{AnkiMediaRef, AnkiNote, PackageMedia};
use easyimmerse_core::media_file::{MediaFile, MediaFileId};

use crate::auth::error_body::ApiFailure;
use crate::auth::token_kind::TokenKind;
use crate::routes::media_clip::render_clip;
use crate::routes::media_frame::render_frame;
use crate::state::AppState;

/// The media files of a package, and the ones that could not be rendered.
#[derive(Debug, Default)]
pub struct RenderedMedia {
    pub files: Vec<PackageMedia>,
    pub skipped: Vec<SkippedMedia>,
}

/// A media file left out of a package, with the reason, such as a media file that the browser holds,
/// a file that is gone, or a server without ffmpeg.
#[derive(Debug)]
pub struct SkippedMedia {
    pub file_name: String,
    pub reason: String,
}

/// Renders every media file the notes refer to. A media file that cannot be rendered is recorded as skipped,
/// so that the rest of the package can still be exported.
pub async fn render_media(state: &AppState, token: TokenKind, notes: &[AnkiNote]) -> RenderedMedia {
    let mut rendered = RenderedMedia::default();
    for media_ref in notes.iter().flat_map(|note| &note.media) {
        let file_name = media_ref.file_name().to_owned();
        match render_one(state, token, media_ref).await {
            Ok(bytes) => rendered.files.push(PackageMedia { file_name, bytes }),
            Err(failure) => rendered.skipped.push(SkippedMedia {
                file_name,
                reason: failure.error.message,
            }),
        }
    }
    rendered
}

/// Drops from the notes the references to the media that was skipped, so that no card names a file the package lacks.
pub fn without_skipped_media(notes: Vec<AnkiNote>, skipped: &[SkippedMedia]) -> Vec<AnkiNote> {
    notes
        .into_iter()
        .map(|note| {
            skipped
                .iter()
                .fold(note, |note, item| note.without_media(&item.file_name))
        })
        .collect()
}

async fn render_one(
    state: &AppState,
    token: TokenKind,
    media_ref: &AnkiMediaRef,
) -> Result<Vec<u8>, ApiFailure> {
    match media_ref {
        AnkiMediaRef::Audio {
            media_file_id,
            start_ms,
            end_ms,
            ..
        } => {
            let media_file = load_media_file(state, media_file_id).await?;
            render_clip(state, token, &media_file, *start_ms, *end_ms).await
        }
        AnkiMediaRef::Screenshot {
            media_file_id,
            at_ms,
            ..
        } => {
            let media_file = load_media_file(state, media_file_id).await?;
            render_frame(state, token, &media_file, *at_ms).await
        }
    }
}

async fn load_media_file(state: &AppState, id: &MediaFileId) -> Result<MediaFile, ApiFailure> {
    let id = id.clone();
    state
        .with_storage(move |storage| storage.get_media_file(&id))
        .await
}
