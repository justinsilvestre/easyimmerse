//! Looking a term up across the enabled dictionaries of a language.

use axum::Json;
use axum::extract::{Query, State};
use easyimmerse_core::dictionary::TermEntry;
use easyimmerse_storage::FoundEntry;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::{IntoParams, ToSchema};

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema, IntoParams)]
#[into_params(parameter_in = Query)]
#[ts(export)]
pub struct LookupQuery {
    /// The BCP 47 code of the language of the term.
    pub language: String,
    /// The exact term or reading to find.
    pub term: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct LookupResponse {
    /// How many enabled dictionaries the language has, whether or not they matched.
    pub dictionary_count: u64,
    pub entries: Vec<LookupEntry>,
}

/// An entry found for a term, with the dictionary it came from.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct LookupEntry {
    pub dictionary_id: String,
    pub dictionary_title: String,
    pub entry: TermEntry,
}

/// Finds the entries whose term or reading equals the term exactly, in every enabled
/// dictionary of the language, in the dictionaries' order. When nothing matches a term with
/// uppercase letters, its lowercase form is tried.
#[utoipa::path(
    get,
    path = "/lookup",
    tag = "dictionaries",
    operation_id = "lookupTerm",
    security(("bearer_token" = [])),
    params(LookupQuery),
    responses(
        (status = 200, description = "The matching entries", body = LookupResponse),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn lookup_term(
    State(state): State<AppState>,
    Query(query): Query<LookupQuery>,
) -> Result<Json<LookupResponse>, ApiFailure> {
    let lookup = state
        .with_storage(move |storage| storage.lookup_term(&query.language, &query.term))
        .await?;
    Ok(Json(LookupResponse {
        dictionary_count: lookup.dictionary_count,
        entries: lookup.entries.into_iter().map(to_lookup_entry).collect(),
    }))
}

fn to_lookup_entry(found: FoundEntry) -> LookupEntry {
    LookupEntry {
        dictionary_id: found.dictionary_id.0,
        dictionary_title: found.dictionary_title,
        entry: found.entry,
    }
}
