use axum::body::Bytes;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use easyimmerse_core::dictionary::{Dictionary, parse_dictionary};
use easyimmerse_storage::{DictionaryId, Storage, StorageError, StoredDictionary};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure, internal};
use crate::auth::token_kind::TokenKind;
use crate::local_path::resolve_local_path;
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct DictionarySummary {
    pub id: String,
    pub title: String,
    pub entry_count: u64,
    /// The language of the headwords, as an ISO 639 code, when known.
    pub source_language: Option<String>,
    /// The language of the definitions, as an ISO 639 code, when known.
    pub target_language: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ImportLocalDictionaryRequest {
    pub path: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ListDictionariesResponse {
    pub dictionaries: Vec<DictionarySummary>,
}

#[utoipa::path(
    post,
    path = "/dictionaries",
    tag = "dictionaries",
    operation_id = "importDictionary",
    security(("bearer_token" = [])),
    request_body(
        description = "The dictionary archive",
        content(("application/zip")),
    ),
    responses(
        (status = 201, description = "The dictionary was imported", body = DictionarySummary),
        (status = 400, description = "The archive could not be parsed", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn import_dictionary(
    State(state): State<AppState>,
    body: Bytes,
) -> Result<(StatusCode, Json<DictionarySummary>), ApiFailure> {
    import_bytes(&state, body.to_vec()).await
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
        (status = 400, description = "The archive could not be parsed", body = ApiError),
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
    import_bytes(&state, bytes).await
}

#[utoipa::path(
    get,
    path = "/dictionaries",
    tag = "dictionaries",
    operation_id = "listDictionaries",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "Every imported dictionary", body = ListDictionariesResponse),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn list_dictionaries(
    State(state): State<AppState>,
) -> Result<Json<ListDictionariesResponse>, ApiFailure> {
    let dictionaries = state
        .with_storage(|storage| storage.list_dictionaries())
        .await?;
    Ok(Json(ListDictionariesResponse {
        dictionaries: dictionaries.into_iter().map(summarize).collect(),
    }))
}

/// The languages a dictionary translates between, as ISO 639 codes. `null` clears one.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct DictionaryLanguages {
    pub source_language: Option<String>,
    pub target_language: Option<String>,
}

#[utoipa::path(
    put,
    path = "/dictionaries/{id}/languages",
    tag = "dictionaries",
    operation_id = "setDictionaryLanguages",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The dictionary id")),
    request_body = DictionaryLanguages,
    responses(
        (status = 200, description = "The dictionary with its new languages", body = DictionarySummary),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No dictionary has the id", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn set_dictionary_languages(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(languages): Json<DictionaryLanguages>,
) -> Result<Json<DictionarySummary>, ApiFailure> {
    let dictionary = state
        .with_storage(move |storage| {
            storage.set_dictionary_languages(
                &DictionaryId(id),
                languages.source_language.as_deref(),
                languages.target_language.as_deref(),
            )
        })
        .await?;
    Ok(Json(summarize(dictionary)))
}

#[utoipa::path(
    delete,
    path = "/dictionaries/{id}",
    tag = "dictionaries",
    operation_id = "deleteDictionary",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The dictionary id")),
    responses(
        (status = 204, description = "The dictionary and its entries were deleted"),
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

/// Parses the archive on the blocking pool, since parsing and storing both take a while
/// for large dictionaries.
async fn import_bytes(
    state: &AppState,
    bytes: Vec<u8>,
) -> Result<(StatusCode, Json<DictionarySummary>), ApiFailure> {
    let dictionary = tokio::task::spawn_blocking(move || parse_dictionary(&bytes))
        .await
        .map_err(|error| internal(error.to_string()))??;
    let summary = state
        .with_storage(move |storage| store_dictionary(storage, &dictionary))
        .await?;
    Ok((StatusCode::CREATED, Json(summary)))
}

fn store_dictionary(
    storage: &Storage,
    dictionary: &Dictionary,
) -> Result<DictionarySummary, StorageError> {
    let id = storage.insert_dictionary(dictionary)?;
    Ok(DictionarySummary {
        id: id.0,
        title: dictionary.title.clone(),
        entry_count: dictionary.entries.len() as u64,
        source_language: dictionary.source_language.clone(),
        target_language: dictionary.target_language.clone(),
    })
}

pub(crate) fn summarize(dictionary: StoredDictionary) -> DictionarySummary {
    DictionarySummary {
        id: dictionary.id.0,
        title: dictionary.title,
        entry_count: dictionary.entry_count,
        source_language: dictionary.source_language,
        target_language: dictionary.target_language,
    }
}
