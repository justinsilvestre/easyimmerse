use axum::Json;
use axum::extract::State;
use easyimmerse_core::lookup::{DictionaryStylesheet, KanjiResult, LookupResult, lookup_positions};
use easyimmerse_storage::{Storage, StorageError};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure, bad_request};
use crate::lookup_pool::LookupPool;
use crate::lookup_rows::{LookupRows, PositionLookup, defining_dictionary_ids};
use crate::state::AppState;

const MAX_TEXTS: usize = 100;
const MAX_TEXT_CHARACTERS: usize = 2_000;

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

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BatchLookupResponse {
    /// The lookups in each requested text, in the order requested.
    pub texts: Vec<TextLookups>,
    /// Every distinct term result of the lookups, each once.
    pub results: Vec<LookupResult>,
    /// Every distinct kanji result of the lookups, each once.
    pub kanji: Vec<KanjiResult>,
    /// The stylesheets of the dictionaries whose definitions appear in `results`, each once.
    pub stylesheets: Vec<DictionaryStylesheet>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TextLookups {
    /// The positions where lookup found something, in the order they appear in the text.
    /// A position that lookup tried but found nothing at is left out.
    pub positions: Vec<PositionLookups>,
}

/// What a single lookup at one position of a text would return,
/// with each result given as its index in the batch response's lists.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PositionLookups {
    /// The position of the looked-up character in the text, counted in characters (Unicode scalar values).
    pub offset: u32,
    /// Indices into the response's `results`, best first.
    pub results: Vec<u32>,
    /// Indices into the response's `kanji`.
    pub kanji: Vec<u32>,
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
        .map(|text| position_lookups(text, &request.language))
        .collect();
    let all_lookups: Vec<&PositionLookup> = (lookups_by_text.iter().flatten())
        .map(|(_, lookup)| lookup)
        .collect();
    let rows = LookupRows::find(storage, &all_lookups)?;
    let mut pools = Pools::new();
    let texts = (lookups_by_text.iter())
        .map(|lookups| pools.text_lookups(&rows, lookups))
        .collect();
    Ok(BatchLookupResponse {
        texts,
        stylesheets: storage
            .find_dictionary_stylesheets(&defining_dictionary_ids(pools.results.items()))?,
        results: pools.results.into_items(),
        kanji: pools.kanji.into_items(),
    })
}

/// Prepares a lookup at every position of the text where a word may start, paired with that position.
fn position_lookups(text: &str, language: &str) -> Vec<(usize, PositionLookup)> {
    let starts: Vec<usize> = text.char_indices().map(|(start, _)| start).collect();
    (lookup_positions(text).into_iter())
        .map(|offset| {
            let rest = &text[starts[offset]..];
            (
                offset,
                PositionLookup::new(rest, language, Some((text, offset))),
            )
        })
        .collect()
}

type ResultKey = (String, Option<String>, String);
type KanjiKey = (String, String);

struct Pools {
    results: LookupPool<LookupResult, ResultKey>,
    kanji: LookupPool<KanjiResult, KanjiKey>,
}

impl Pools {
    fn new() -> Self {
        Self {
            results: LookupPool::new(|result| {
                let LookupResult {
                    matched_text,
                    term,
                    reading,
                    ..
                } = result;
                (matched_text.clone(), reading.clone(), term.clone())
            }),
            kanji: LookupPool::new(|kanji| {
                (kanji.dictionary_id.clone(), kanji.entry.character.clone())
            }),
        }
    }

    fn text_lookups(
        &mut self,
        rows: &LookupRows,
        lookups: &[(usize, PositionLookup)],
    ) -> TextLookups {
        let positions = (lookups.iter())
            .map(|(offset, lookup)| PositionLookups {
                // The batch route's limits keep offsets far below `u32::MAX`.
                offset: *offset as u32,
                results: (rows.results(lookup).into_iter())
                    .map(|result| self.results.index_of(result))
                    .collect(),
                kanji: (rows.kanji(lookup).into_iter())
                    .map(|kanji| self.kanji.index_of(kanji))
                    .collect(),
            })
            .filter(|position| !position.results.is_empty() || !position.kanji.is_empty())
            .collect();
        TextLookups { positions }
    }
}
