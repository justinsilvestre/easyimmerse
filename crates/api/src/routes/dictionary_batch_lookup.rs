use axum::Json;
use axum::extract::State;
use easyimmerse_storage::{Storage, StorageError};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure, bad_request};
use crate::lookup::{BatchLookupResponse, BatchPools, LookupRows, PositionLookup};
use crate::state::AppState;

/// The most texts one batch lookup may hold.
pub const MAX_TEXTS: usize = 100;
/// The most characters one text of a batch lookup may hold.
pub const MAX_TEXT_CHARACTERS: usize = 2_000;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BatchLookupRequest {
    /// The language of the texts, as a BCP 47 tag, which decides how inflections are undone.
    pub language: String,
    /// The texts to look up at every position, such as subtitle cues or paragraphs without their markup.
    /// At most 100 texts, of at most 2,000 characters each.
    pub texts: Vec<String>,
}

#[utoipa::path(
    post,
    path = "/dictionaries/lookup/batch",
    tag = "dictionaries",
    operation_id = "lookupTexts",
    security(("bearer_token" = [])),
    request_body = BatchLookupRequest,
    responses(
        (status = 200, description = "The entries of every dictionary at every position of each text where a word may start", body = BatchLookupResponse),
        (status = 400, description = "Too many texts, or a text too long", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn lookup_texts(
    State(state): State<AppState>,
    Json(request): Json<BatchLookupRequest>,
) -> Result<Json<BatchLookupResponse>, ApiFailure> {
    check_limits(&request)?;
    let response = state
        .with_storage(move |storage| look_up_all(storage, &request))
        .await?;
    Ok(Json(response))
}

fn check_limits(request: &BatchLookupRequest) -> Result<(), ApiFailure> {
    if request.texts.len() > MAX_TEXTS {
        return Err(bad_request(format!(
            "a batch holds at most {MAX_TEXTS} texts"
        )));
    }
    if (request.texts.iter()).any(|text| text.chars().count() > MAX_TEXT_CHARACTERS) {
        return Err(bad_request(format!(
            "a text holds at most {MAX_TEXT_CHARACTERS} characters"
        )));
    }
    Ok(())
}

fn look_up_all(
    storage: &Storage,
    request: &BatchLookupRequest,
) -> Result<BatchLookupResponse, StorageError> {
    let lookups_by_text: Vec<Vec<(usize, PositionLookup)>> = (request.texts.iter())
        .map(|text| PositionLookup::at_every_position(text, &request.language))
        .collect();
    let all_lookups: Vec<&PositionLookup> = (lookups_by_text.iter().flatten())
        .map(|(_, lookup)| lookup)
        .collect();
    let rows = LookupRows::find(storage, &all_lookups)?;
    let mut pools = BatchPools::default();
    let texts = (lookups_by_text.iter())
        .map(|lookups| pools.text_lookups(&rows, lookups))
        .collect();
    let stylesheets = storage.find_dictionary_stylesheets(&pools.defining_dictionary_ids())?;
    Ok(pools.into_response(texts, stylesheets))
}
