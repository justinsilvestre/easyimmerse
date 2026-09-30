use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use easyimmerse_core::dictionary::{TermEntry, parse_dictionary};
use easyimmerse_storage::{DictionaryId, Storage, StoredDictionary};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::{IntoParams, ToSchema};

use crate::auth::error_body::{ApiError, ApiFailure};
use crate::auth::token_kind::TokenKind;
use crate::local_path::resolve_local_path;
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct DictionarySummary {
    pub id: String,
    pub title: String,
    pub entry_count: u64,
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

/// Parses the archive on the blocking pool, since parsing and storing both take a while
/// for large dictionaries.
async fn import_bytes(
    state: &AppState,
    bytes: Vec<u8>,
) -> Result<(StatusCode, Json<DictionarySummary>), ApiFailure> {
    let dictionary = tokio::task::spawn_blocking(move || parse_dictionary(&bytes))
        .await
        .map_err(|error| crate::auth::error_body::internal(error.to_string()))??;
    let summary = state
        .with_storage(move |storage| store_dictionary(storage, &dictionary))
        .await?;
    Ok((StatusCode::CREATED, Json(summary)))
}

fn store_dictionary(
    storage: &Storage,
    dictionary: &easyimmerse_core::dictionary::Dictionary,
) -> Result<DictionarySummary, easyimmerse_storage::StorageError> {
    let id = storage.insert_dictionary(dictionary)?;
    Ok(DictionarySummary {
        id: id.0,
        title: dictionary.title.clone(),
        entry_count: dictionary.entries.len() as u64,
    })
}

fn summarize(dictionary: StoredDictionary) -> DictionarySummary {
    DictionarySummary {
        id: dictionary.id.0,
        title: dictionary.title,
        entry_count: dictionary.entry_count,
    }
}
