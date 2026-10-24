//! The subtitle tracks of a library item's media file in a library manager's project, which make the item's text while it is prepared.

use easyimmerse_core::library::{LibraryItem, LibraryItemKind};
use easyimmerse_core::media_file::{MediaFile, MediaFileId, MediaFileSource};
use easyimmerse_core::subtitle_track::SubtitleTrackId;
use easyimmerse_core::timed_text::{Cue, parse_timed_text};

use crate::auth::error_body::{ApiFailure, forbidden};
use crate::auth::principal::Principal;
use crate::library_segments::{text_of_subtitles, with_words_kept};
use crate::routes::library_support::load_editable_item;
use crate::routes::library_text::store_library_text;
use crate::routes::subtitles::read_text;
use crate::state::AppState;

/// The library item a media file comes from, once the principal may change its tracks, or None for a media file from anywhere else.
/// Only a library manager may change the subtitles or the track choice of a library media file,
/// and only while its item is neither published nor being published.
pub async fn editable_library_item_of(
    state: &AppState,
    principal: &Principal,
    media_file: &MediaFile,
) -> Result<Option<LibraryItem>, ApiFailure> {
    let MediaFileSource::Library { item_id } = &media_file.source else {
        return Ok(None);
    };
    if !principal.can_manage_library() {
        return Err(forbidden(
            "only a library manager may change the tracks of a library item",
        ));
    }
    load_editable_item(state, item_id).await.map(Some)
}

/// Replaces the segments of a video or audio item with the cues of the tracks its media file shows.
/// A segment whose text and times stay keeps its words. A document item keeps the text of its file.
pub async fn follow_shown_tracks(
    state: &AppState,
    principal: &Principal,
    media_id: MediaFileId,
    item: &LibraryItem,
) -> Result<(), ApiFailure> {
    if item.kind == LibraryItemKind::Document {
        return Ok(());
    }
    let selection = state
        .with_storage(move |storage| storage.get_subtitle_selection(&media_id))
        .await?;
    let target = cues_of(state, principal, selection.target_track_id).await?;
    let translation = cues_of(state, principal, selection.translation_track_id).await?;
    let item_id = item.id.clone();
    let old = state
        .with_storage(move |storage| storage.get_library_text(&item_id))
        .await?;
    let text = with_words_kept(text_of_subtitles(&target, &translation), &old.segments);
    store_library_text(state, item, text).await?;
    Ok(())
}

async fn cues_of(
    state: &AppState,
    principal: &Principal,
    track_id: Option<SubtitleTrackId>,
) -> Result<Vec<Cue>, ApiFailure> {
    let Some(track_id) = track_id else {
        return Ok(Vec::new());
    };
    let stored = state
        .with_storage(move |storage| storage.get_subtitle_track(&track_id))
        .await?;
    let text = read_text(state, principal, &stored.source).await?;
    Ok(parse_timed_text(&text, Some(stored.track.format))?.cues)
}
