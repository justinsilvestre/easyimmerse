use axum::Json;
use axum::extract::{Path, Query, State};
use easyimmerse_core::dictionary::TermEntry;
use easyimmerse_storage::DictionaryId;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::{IntoParams, ToSchema};

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::routes::dictionaries::{DictionarySummary, summarize};
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema, IntoParams)]
#[into_params(parameter_in = Query)]
#[ts(export)]
pub struct LookupQuery {
    /// The exact term or reading to find.
    pub term: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct LookupResponse {
    pub entries: Vec<TermEntry>,
}

/// The entries one dictionary has for a term.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct DictionaryLookupResult {
    pub dictionary: DictionarySummary,
    pub entries: Vec<TermEntry>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct LookupAllResponse {
    /// One result per dictionary that has the term, in import order.
    pub results: Vec<DictionaryLookupResult>,
}

#[utoipa::path(
    get,
    path = "/dictionaries/{id}/lookup",
    tag = "dictionaries",
    operation_id = "lookupTerm",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The dictionary id"), LookupQuery),
    responses(
        (status = 200, description = "The entries matching the term exactly", body = LookupResponse),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No dictionary has the id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn lookup_term(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Query(query): Query<LookupQuery>,
) -> Result<Json<LookupResponse>, ApiFailure> {
    let entries = state
        .with_storage(move |storage| storage.lookup_term(&DictionaryId(id), &query.term))
        .await?;
    Ok(Json(LookupResponse { entries }))
}

#[utoipa::path(
    get,
    path = "/dictionaries/lookup",
    tag = "dictionaries",
    operation_id = "lookupTermEverywhere",
    security(("bearer_token" = [])),
    params(LookupQuery),
    responses(
        (status = 200, description = "The matching entries of every dictionary that has the term", body = LookupAllResponse),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn lookup_term_everywhere(
    State(state): State<AppState>,
    Query(query): Query<LookupQuery>,
) -> Result<Json<LookupAllResponse>, ApiFailure> {
    let matches = state
        .with_storage(move |storage| storage.lookup_term_everywhere(&query.term))
        .await?;
    let results = matches
        .into_iter()
        .map(|(dictionary, entries)| DictionaryLookupResult {
            dictionary: summarize(dictionary),
            entries,
        })
        .collect();
    Ok(Json(LookupAllResponse { results }))
}
