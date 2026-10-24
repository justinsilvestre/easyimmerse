//! The text of library items: reading it, replacing it from subtitle files, and setting the words of its segments.

use axum::extract::{Path, State};
use axum::{Extension, Json};
use easyimmerse_core::library::{
    ApplyLibraryEntry, LibraryCover, LibraryItem, LibraryItemId, LibraryItemKind, LibrarySegment,
    LibrarySubtitles, LibraryText, LibraryWord, validate_words,
};

use crate::auth::error_body::{ApiError, ApiFailure, bad_request, not_found};
use crate::auth::library_manager::LibraryManager;
use crate::auth::principal::Principal;
use crate::library_proposals::propose_words;
use crate::library_segments::text_of_subtitles;
use crate::routes::library_support::{load_editable_item, load_visible_item};
use crate::routes::subtitles::parse_subtitle_text;
use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/library/items/{item_id}/text",
    tag = "library",
    operation_id = "getLibraryText",
    security(("bearer_token" = [])),
    params(("item_id" = String, Path, description = "The library item id")),
    responses(
        (status = 200, description = "The item's segments in order, with its chapter titles", body = LibraryText),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No such item, or one that is not published and the principal does not manage the library", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_library_text(
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
    Path(item_id): Path<LibraryItemId>,
) -> Result<Json<LibraryText>, ApiFailure> {
    load_visible_item(&state, &principal, &item_id).await?;
    let text = state
        .with_storage(move |storage| storage.get_library_text(&item_id))
        .await?;
    Ok(Json(text))
}

/// Replaces the segments of a video or audio item with the cues of the subtitles, without words.
/// Each cue of the translation subtitles is joined to the target cue it overlaps most.
/// An automatic cover goes, to be rendered again from the new first cue when the item is published.
#[utoipa::path(
    put,
    path = "/library/items/{item_id}/subtitles",
    tag = "library",
    operation_id = "putLibrarySubtitles",
    security(("bearer_token" = [])),
    params(("item_id" = String, Path, description = "The library item id")),
    request_body = LibrarySubtitles,
    responses(
        (status = 200, description = "The item's new text", body = LibraryText),
        (status = 400, description = "Subtitles that could not be parsed, or a document item, which takes no subtitles", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the principal does not manage the library", body = ApiError),
        (status = 404, description = "No such item", body = ApiError),
        (status = 409, description = "`item_published` or `item_processing`: the item is published or being published", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn put_library_subtitles(
    _: LibraryManager,
    State(state): State<AppState>,
    Path(item_id): Path<LibraryItemId>,
    Json(subtitles): Json<LibrarySubtitles>,
) -> Result<Json<LibraryText>, ApiFailure> {
    let item = load_editable_item(&state, &item_id).await?;
    if item.kind == LibraryItemKind::Document {
        return Err(bad_request(
            "a document item takes its text from its file, not from subtitles",
        ));
    }
    let target = parse_subtitle_text(&subtitles.target_text, subtitles.format)?;
    let translation = match &subtitles.translation_text {
        Some(text) => parse_subtitle_text(text, subtitles.format)?.cues,
        None => Vec::new(),
    };
    let text = text_of_subtitles(&target.cues, &translation);
    Ok(Json(store_library_text(&state, &item, text).await?))
}

/// Replaces the segments of a video or audio item. An automatic cover goes, to be rendered again from the new first cue when the item is published.
pub async fn store_library_text(
    state: &AppState,
    item: &LibraryItem,
    text: LibraryText,
) -> Result<LibraryText, ApiFailure> {
    // The automatic cover of a video is taken at its first cue, which the new subtitles may move.
    let drops_cover = item.cover == LibraryCover::Automatic;
    let item_id = item.id.clone();
    state
        .with_storage(move |storage| {
            if drops_cover {
                storage.set_library_cover(&item_id, None)?;
            }
            storage.replace_library_segments(&item_id, &text)
        })
        .await
}

/// Divides the segments that have no words yet into words, by the longest match at each place in the manager's own dictionaries.
/// Each word takes the first entry of its best result.
#[utoipa::path(
    post,
    path = "/library/items/{item_id}/proposed-words",
    tag = "library",
    operation_id = "proposeLibraryWords",
    security(("bearer_token" = [])),
    params(("item_id" = String, Path, description = "The library item id")),
    responses(
        (status = 200, description = "The item's text with the proposed words", body = LibraryText),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the principal does not manage the library", body = ApiError),
        (status = 404, description = "No such item", body = ApiError),
        (status = 409, description = "`item_published` or `item_processing`: the item is published or being published", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn propose_library_words(
    _: LibraryManager,
    State(state): State<AppState>,
    Extension(principal): Extension<Principal>,
    Path(item_id): Path<LibraryItemId>,
) -> Result<Json<LibraryText>, ApiFailure> {
    load_editable_item(&state, &item_id).await?;
    Ok(Json(propose_words(&state, &principal, item_id).await?))
}

/// Replaces the words of one segment. Words lie on character boundaries of the segment's text, in order, without overlapping.
#[utoipa::path(
    put,
    path = "/library/items/{item_id}/segments/{segment_index}/words",
    tag = "library",
    operation_id = "putLibraryWords",
    security(("bearer_token" = [])),
    params(
        ("item_id" = String, Path, description = "The library item id"),
        ("segment_index" = u32, Path, description = "The index of the segment"),
    ),
    request_body = Vec<LibraryWord>,
    responses(
        (status = 200, description = "The segment with its new words", body = LibrarySegment),
        (status = 400, description = "Words outside the text, off a character boundary, overlapping or out of order", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the principal does not manage the library", body = ApiError),
        (status = 404, description = "No such item, or no such segment of it", body = ApiError),
        (status = 409, description = "`item_published` or `item_processing`: the item is published or being published", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn put_library_words(
    _: LibraryManager,
    State(state): State<AppState>,
    Path((item_id, segment_index)): Path<(LibraryItemId, u32)>,
    Json(words): Json<Vec<LibraryWord>>,
) -> Result<Json<LibrarySegment>, ApiFailure> {
    load_editable_item(&state, &item_id).await?;
    let id = item_id.clone();
    let text = state
        .with_storage(move |storage| storage.get_library_text(&id))
        .await?;
    let segment = (text.segments.iter())
        .find(|segment| segment.index == segment_index)
        .ok_or_else(|| not_found(format!("the item has no segment {segment_index}")))?;
    validate_words(&segment.text, &words)?;
    let segment = state
        .with_storage(move |storage| storage.set_segment_words(&item_id, segment_index, &words))
        .await?;
    Ok(Json(segment))
}

/// Gives the entry to every word of the item whose text in its segment is `word_text`, and returns the item's text.
#[utoipa::path(
    post,
    path = "/library/items/{item_id}/apply-entry",
    tag = "library",
    operation_id = "applyLibraryEntry",
    security(("bearer_token" = [])),
    params(("item_id" = String, Path, description = "The library item id")),
    request_body = ApplyLibraryEntry,
    responses(
        (status = 200, description = "The item's text with the entry applied", body = LibraryText),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "`forbidden`: the principal does not manage the library", body = ApiError),
        (status = 404, description = "No such item", body = ApiError),
        (status = 409, description = "`item_published` or `item_processing`: the item is published or being published", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn apply_library_entry(
    _: LibraryManager,
    State(state): State<AppState>,
    Path(item_id): Path<LibraryItemId>,
    Json(request): Json<ApplyLibraryEntry>,
) -> Result<Json<LibraryText>, ApiFailure> {
    load_editable_item(&state, &item_id).await?;
    let text = state
        .with_storage(move |storage| {
            storage.apply_library_entry(&item_id, &request.word_text, &request.entry)
        })
        .await?;
    Ok(Json(text))
}
