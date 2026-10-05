use axum::Json;
use axum::extract::{Query, State};
use easyimmerse_core::lookup::{
    DictionaryStylesheet, KanjiResult, LookupResult, build_kanji_results, build_lookup_results,
    candidate_headwords, is_kanji, lookup_candidates, separated_verb_candidates,
};
use easyimmerse_storage::{Storage, StorageError};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::{IntoParams, ToSchema};

use crate::auth::error_body::{ApiError, ApiFailure};
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
    let (text, language) = (query.text.as_str(), query.language.as_str());
    let mut candidates = lookup_candidates(text, language);
    if let (Some(context), Some(offset)) = (&query.context, query.offset) {
        candidates.extend(separated_verb_candidates(context, offset, language));
    }
    let found_entries = storage.find_dictionary_entries(&candidate_headwords(&candidates))?;
    let mut terms: Vec<String> = found_entries
        .iter()
        .map(|found| found.entry.term.clone())
        .collect();
    terms.sort();
    terms.dedup();
    let term_meta = storage.find_term_meta(&terms)?;
    let results = build_lookup_results(&candidates, found_entries, &term_meta);
    // Stylesheets come with each lookup rather than from a route of their own, so that entries never show unstyled first.
    Ok(LookupResponse {
        stylesheets: storage.find_dictionary_stylesheets(&defining_dictionary_ids(&results))?,
        results,
        kanji: look_up_kanji(storage, text)?,
    })
}

fn defining_dictionary_ids(results: &[LookupResult]) -> Vec<String> {
    let mut ids: Vec<String> = results
        .iter()
        .flat_map(|result| &result.definitions)
        .map(|definitions| definitions.dictionary_id.clone())
        .collect();
    ids.sort();
    ids.dedup();
    ids
}

fn look_up_kanji(storage: &Storage, text: &str) -> Result<Vec<KanjiResult>, StorageError> {
    let Some(first) = text.chars().next().filter(|character| is_kanji(*character)) else {
        return Ok(Vec::new());
    };
    let characters = vec![first.to_string()];
    let found_kanji = storage.find_kanji(&characters)?;
    let kanji_meta = storage.find_kanji_meta(&characters)?;
    Ok(build_kanji_results(found_kanji, &kanji_meta))
}
