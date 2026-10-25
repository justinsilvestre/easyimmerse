//! The tracks of a library item's media file in a library manager's project: its subtitle tracks, which make the item's text,
//! and the choice of audio and video tracks, which learners play.

use easyimmerse_core::library::{LibraryItem, LibraryItemKind, LibraryItemStatus};
use easyimmerse_core::media_file::{MediaFile, MediaFileId, MediaFileSource};
use easyimmerse_core::subtitle_track::SubtitleTrackId;
use easyimmerse_core::timed_text::{Cue, parse_timed_text};

use crate::auth::error_body::{ApiFailure, forbidden};
use crate::auth::principal::Principal;
use crate::library_cues::begin_cue_change;
use crate::library_segments::{text_of_subtitles, with_words_kept};
use crate::routes::library_support::load_editable_item;
use crate::routes::library_text::store_library_text;
use crate::routes::subtitles::read_text;
use crate::state::AppState;

/// The library item a media file comes from, once the principal may change its tracks, or None for a media file from anywhere else.
/// Only a library manager may change the subtitles or the track choice of a library media file,
/// and only while its item is not being published.
pub async fn editable_library_item_of(
    state: &AppState,
    principal: &Principal,
    media_file: &MediaFile,
) -> Result<Option<LibraryItem>, ApiFailure> {
    let MediaFileSource::Library { item_id } = &media_file.source else {
        return Ok(None);
    };
    require_library_manager(principal)?;
    load_editable_item(state, item_id).await.map(Some)
}

fn require_library_manager(principal: &Principal) -> Result<(), ApiFailure> {
    if principal.can_manage_library() {
        Ok(())
    } else {
        Err(forbidden(
            "only a library manager may change the tracks of a library item",
        ))
    }
}

/// Saves the track choice of a media file, given as the JSON of a `TrackSelection`, or clears it with None.
/// For a library media file, which only a library manager may change, the item's clips and screenshots are rendered again from the new tracks,
/// and when the item is published, its learners play them at once.
pub async fn save_track_selection(
    state: &AppState,
    principal: &Principal,
    media_file: &MediaFile,
    selection_json: Option<String>,
) -> Result<(), ApiFailure> {
    let media_id = media_file.id.clone();
    let MediaFileSource::Library { item_id } = &media_file.source else {
        return state
            .with_storage(move |storage| {
                storage.set_track_selection_json(&media_id, selection_json.as_deref())
            })
            .await;
    };
    require_library_manager(principal)?;
    let change = begin_cue_change(state, item_id).await?;
    let is_published = change.item.status == LibraryItemStatus::Published;
    let item_id = item_id.clone();
    state
        .with_storage(move |storage| {
            let selection = selection_json.as_deref();
            storage.set_track_selection_json(&media_id, selection)?;
            if is_published {
                storage.set_library_track_selection_json(&item_id, selection)?;
                storage.set_library_media_track_selection_json(&item_id, selection)?;
            }
            Ok(())
        })
        .await?;
    drop(change);
    Ok(())
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
