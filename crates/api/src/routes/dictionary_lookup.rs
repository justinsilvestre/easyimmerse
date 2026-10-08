use axum::Json;
use axum::extract::{Query, State};
use easyimmerse_core::lookup::{DictionaryStylesheet, KanjiResult, LookupResult};
use easyimmerse_storage::{Storage, StorageError};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::{IntoParams, ToSchema};

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::lookup_rows::{LookupRows, PositionLookup, defining_dictionary_ids};
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema, IntoParams)]
#[into_params(parameter_in = Query)]
#[ts(export)]
pub struct LookupQuery {
    /// The text from the looked-up character onwards. Lookup reads at most 20 characters of it.
    pub text: String,
    /// The language of the text, as a BCP 47 tag, which decides how inflections are undone.
    pub language: String,
    /// The text around the looked-up character, such as its subtitle cue or paragraph.
    /// In German, it lets lookup find a particle verb whose parts stand apart, as in „Ich rufe dich morgen an".
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub context: Option<String>,
    /// The position of the looked-up character in `context`, counted in characters (Unicode scalar values).
    /// A JavaScript string index counts UTF-16 code units instead, and differs after any emoji or other character
    /// outside the Basic Multilingual Plane, so a web client converts it with `[...context.slice(0, index)].length`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub offset: Option<usize>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct LookupResponse {
    /// The terms that the text may begin with, best first.
    pub results: Vec<LookupResult>,
    /// The kanji dictionary entries for the first character, when it is a kanji.
    pub kanji: Vec<KanjiResult>,
    /// The stylesheets of the dictionaries whose definitions appear in `results`, each once.
    pub stylesheets: Vec<DictionaryStylesheet>,
}

#[utoipa::path(
    get,
    path = "/dictionaries/lookup",
    tag = "dictionaries",
    operation_id = "lookupText",
    security(("bearer_token" = [])),
    params(LookupQuery),
    responses(
        (status = 200, description = "The entries of every dictionary for the beginning of the text", body = LookupResponse),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn lookup_text(
    State(state): State<AppState>,
    Query(query): Query<LookupQuery>,
) -> Result<Json<LookupResponse>, ApiFailure> {
    let response = state
        .with_storage(move |storage| look_up(storage, &query))
        .await?;
    Ok(Json(response))
}

fn look_up(storage: &Storage, query: &LookupQuery) -> Result<LookupResponse, StorageError> {
    let context = query.context.as_deref().zip(query.offset);
    let lookup = PositionLookup::new(&query.text, &query.language, context);
    let rows = LookupRows::find(storage, &[&lookup])?;
    let results = rows.results(&lookup);
    // Stylesheets come with each lookup rather than from a route of their own, so that entries never show unstyled first.
    Ok(LookupResponse {
        stylesheets: storage.find_dictionary_stylesheets(&defining_dictionary_ids(&results))?,
        kanji: rows.kanji(&lookup),
        results,
    })
}
