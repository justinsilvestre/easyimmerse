//! Dictionaries: importing, listing, enabling, ordering, and deleting them.

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use easyimmerse_core::dictionary::{Dictionary, DictionaryFileFormat, parse_dictionary};
use easyimmerse_storage::{DictionaryId, DictionaryLanguages, StoredDictionary};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::{IntoParams, ToSchema};

use crate::auth::error_body::{ApiError, ApiFailure, internal};
use crate::auth::token_kind::TokenKind;
use crate::local_path::resolve_local_path;
use crate::state::AppState;

pub const LANGUAGE_REQUIRED: &str = "language_required";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct DictionarySummary {
    pub id: String,
    pub title: String,
    pub entry_count: u64,
    pub format: DictionaryFileFormat,
    /// The BCP 47 code of the language of the terms.
    pub source_language: String,
    /// The BCP 47 code of the language of the definitions.
    pub target_language: String,
    pub is_enabled: bool,
}

/// Languages that override those the dictionary file states.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema, IntoParams)]
#[into_params(parameter_in = Query)]
#[ts(export)]
pub struct ImportDictionaryQuery {
    pub source_language: Option<String>,
    pub target_language: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ImportLocalDictionaryRequest {
    pub path: String,
    /// Overrides the language of the terms that the file states.
    pub source_language: Option<String>,
    /// Overrides the language of the definitions that the file states.
    pub target_language: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ListDictionariesResponse {
    pub dictionaries: Vec<DictionarySummary>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct UpdateDictionaryRequest {
    pub is_enabled: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum MoveDirection {
    Up,
    Down,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct MoveDictionaryRequest {
    pub direction: MoveDirection,
}

#[utoipa::path(
    post,
    path = "/dictionaries",
    tag = "dictionaries",
    operation_id = "importDictionary",
    security(("bearer_token" = [])),
    params(ImportDictionaryQuery),
    request_body(
        description = "The dictionary archive",
        content(("application/zip")),
    ),
    responses(
        (status = 201, description = "The dictionary was imported", body = DictionarySummary),
        (status = 400, description = "The archive could not be parsed (code `unsupported_format` when no format reads it), or neither the file nor the query gives both languages (code `language_required`)", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn import_dictionary(
    State(state): State<AppState>,
    Query(query): Query<ImportDictionaryQuery>,
    body: Bytes,
) -> Result<(StatusCode, Json<DictionarySummary>), ApiFailure> {
    import_bytes(&state, body.to_vec(), query).await
}

#[utoipa::path(
    post,
    path = "/dictionaries/import-local",
    tag = "dictionaries",
    operation_id = "importLocalDictionary",
    security(("bearer_token" = [])),
    request_body = ImportLocalDictionaryRequest,
    responses(
        (status = 201, description = "The dictionary was imported", body = DictionarySummary),
        (status = 400, description = "The archive could not be parsed (code `unsupported_format` when no format reads it), or neither the file nor the request gives both languages (code `language_required`)", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "No file at the given path", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn import_local_dictionary(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Json(request): Json<ImportLocalDictionaryRequest>,
) -> Result<(StatusCode, Json<DictionarySummary>), ApiFailure> {
    let bytes = resolve_local_path(token, &state.config, &request.path).await?;
    let overrides = ImportDictionaryQuery {
        source_language: request.source_language,
        target_language: request.target_language,
    };
    import_bytes(&state, bytes, overrides).await
}

#[utoipa::path(
    get,
    path = "/dictionaries",
    tag = "dictionaries",
    operation_id = "listDictionaries",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "Every imported dictionary, by source language and then position", body = ListDictionariesResponse),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn list_dictionaries(
    State(state): State<AppState>,
) -> Result<Json<ListDictionariesResponse>, ApiFailure> {
    Ok(Json(load_dictionary_list(&state).await?))
}

#[utoipa::path(
    put,
    path = "/dictionaries/{id}",
    tag = "dictionaries",
    operation_id = "updateDictionary",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The dictionary id")),
    request_body = UpdateDictionaryRequest,
    responses(
        (status = 200, description = "The changed dictionary", body = DictionarySummary),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No dictionary has the id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn update_dictionary(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(request): Json<UpdateDictionaryRequest>,
) -> Result<Json<DictionarySummary>, ApiFailure> {
    let stored = state
        .with_storage(move |storage| {
            storage.set_dictionary_enabled(&DictionaryId(id), request.is_enabled)
        })
        .await?;
    Ok(Json(summarize(stored)))
}

/// Swaps the dictionary's position with its neighbour of the same source language. Does
/// nothing at either end.
#[utoipa::path(
    post,
    path = "/dictionaries/{id}/move",
    tag = "dictionaries",
    operation_id = "moveDictionary",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The dictionary id")),
    request_body = MoveDictionaryRequest,
    responses(
        (status = 200, description = "Every dictionary in its new order", body = ListDictionariesResponse),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No dictionary has the id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn move_dictionary(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(request): Json<MoveDictionaryRequest>,
) -> Result<Json<ListDictionariesResponse>, ApiFailure> {
    let direction = match request.direction {
        MoveDirection::Up => easyimmerse_storage::MoveDirection::Up,
        MoveDirection::Down => easyimmerse_storage::MoveDirection::Down,
    };
    state
        .with_storage(move |storage| storage.move_dictionary(&DictionaryId(id), direction))
        .await?;
    Ok(Json(load_dictionary_list(&state).await?))
}

#[utoipa::path(
    delete,
    path = "/dictionaries/{id}",
    tag = "dictionaries",
    operation_id = "deleteDictionary",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The dictionary id")),
    responses(
        (status = 204, description = "The dictionary was deleted"),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No dictionary has the id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn delete_dictionary(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, ApiFailure> {
    state
        .with_storage(move |storage| storage.delete_dictionary(&DictionaryId(id)))
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn load_dictionary_list(state: &AppState) -> Result<ListDictionariesResponse, ApiFailure> {
    let dictionaries = state
        .with_storage(|storage| storage.list_dictionaries())
        .await?;
    Ok(ListDictionariesResponse {
        dictionaries: dictionaries.into_iter().map(summarize).collect(),
    })
}

/// Parses the archive on the blocking pool, since parsing and storing both take a while
/// for large dictionaries.
async fn import_bytes(
    state: &AppState,
    bytes: Vec<u8>,
    overrides: ImportDictionaryQuery,
) -> Result<(StatusCode, Json<DictionarySummary>), ApiFailure> {
    let dictionary = tokio::task::spawn_blocking(move || parse_dictionary(&bytes))
        .await
        .map_err(|error| internal(error.to_string()))??;
    let languages = resolve_languages(&dictionary, overrides)?;
    let stored = state
        .with_storage(move |storage| storage.insert_dictionary(&dictionary, &languages))
        .await?;
    Ok((StatusCode::CREATED, Json(summarize(stored))))
}

/// The languages from the overrides, else from the file; 400 when either is missing.
fn resolve_languages(
    dictionary: &Dictionary,
    overrides: ImportDictionaryQuery,
) -> Result<DictionaryLanguages, ApiFailure> {
    let pick = |chosen: Option<String>, stated: &Option<String>| {
        chosen
            .or_else(|| stated.clone())
            .filter(|language| !language.trim().is_empty())
    };
    match (
        pick(overrides.source_language, &dictionary.source_language),
        pick(overrides.target_language, &dictionary.target_language),
    ) {
        (Some(source_language), Some(target_language)) => Ok(DictionaryLanguages {
            source_language,
            target_language,
        }),
        _ => Err(ApiFailure::new(
            StatusCode::BAD_REQUEST,
            LANGUAGE_REQUIRED,
            "the dictionary does not state its languages, so the request must give them",
        )),
    }
}

fn summarize(dictionary: StoredDictionary) -> DictionarySummary {
    DictionarySummary {
        id: dictionary.id.0,
        title: dictionary.title,
        entry_count: dictionary.entry_count,
        format: dictionary.format,
        source_language: dictionary.source_language,
        target_language: dictionary.target_language,
        is_enabled: dictionary.is_enabled,
    }
}
