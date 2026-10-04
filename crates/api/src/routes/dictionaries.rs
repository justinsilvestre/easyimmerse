use std::path::PathBuf;

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use easyimmerse_core::dictionary::{DictionaryFormatKind, DictionarySource, SourceFile};
use easyimmerse_storage::{DictionaryId, Storage, StorageError, StoredDictionary};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::{IntoParams, ToSchema};

use crate::auth::error_body::{ApiError, ApiFailure, bad_request, internal, not_found};
use crate::auth::token_kind::TokenKind;
use crate::local_dictionary_files::read_dictionary_files;
use crate::local_path::ensure_local_paths_allowed;
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct DictionarySummary {
    pub id: String,
    pub title: String,
    pub format: DictionaryFormatKind,
    pub entry_count: u64,
    pub term_meta_count: u64,
    pub tag_count: u64,
    pub kanji_count: u64,
    pub kanji_meta_count: u64,
    pub media_count: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema, IntoParams)]
#[into_params(parameter_in = Query)]
#[ts(export)]
pub struct ImportDictionaryQuery {
    /// The name of the uploaded file, whose extension tells formats such as MDict and CSV apart.
    #[serde(rename = "fileName")]
    #[param(rename = "fileName")]
    pub file_name: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ImportLocalDictionaryRequest {
    /// A dictionary file, imported with its siblings of the same stem, or a directory of dictionary files.
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
    params(ImportDictionaryQuery),
    request_body(
        description = "One dictionary file: a zip or tar archive, an MDict `.mdx`, a CSV or TSV file, and so on",
        content(("application/octet-stream")),
    ),
    responses(
        (status = 201, description = "The dictionary was imported", body = DictionarySummary),
        (status = 400, description = "The file could not be read as a dictionary", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn import_dictionary(
    State(state): State<AppState>,
    Query(query): Query<ImportDictionaryQuery>,
    body: Bytes,
) -> Result<(StatusCode, Json<DictionarySummary>), ApiFailure> {
    let file = SourceFile {
        name: query.file_name,
        bytes: body.to_vec(),
    };
    import_files(&state, vec![file]).await
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
        (status = 400, description = "The files could not be read as a dictionary", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 403, description = "The token may not read local paths", body = ApiError),
        (status = 404, description = "Nothing at the given path", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn import_local_dictionary(
    State(state): State<AppState>,
    Extension(token): Extension<TokenKind>,
    Json(request): Json<ImportLocalDictionaryRequest>,
) -> Result<(StatusCode, Json<DictionarySummary>), ApiFailure> {
    ensure_local_paths_allowed(token, &state.config)?;
    let path = PathBuf::from(&request.path);
    let files = tokio::task::spawn_blocking(move || read_dictionary_files(&path))
        .await
        .map_err(|error| internal(error.to_string()))?
        .map_err(|error| describe_read_error(&request.path, error))?;
    import_files(&state, files).await
}

#[utoipa::path(
    get,
    path = "/dictionaries",
    tag = "dictionaries",
    operation_id = "listDictionaries",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "Every imported dictionary, in import order", body = ListDictionariesResponse),
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
    delete,
    path = "/dictionaries/{id}",
    tag = "dictionaries",
    operation_id = "deleteDictionary",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The dictionary id")),
    responses(
        (status = 204, description = "The dictionary and everything it stored were deleted"),
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

/// Imports on the blocking pool, since reading and storing a large dictionary takes a while.
async fn import_files(
    state: &AppState,
    files: Vec<SourceFile>,
) -> Result<(StatusCode, Json<DictionarySummary>), ApiFailure> {
    let summary = state
        .with_storage(move |storage| import_into(storage, files))
        .await?;
    Ok((StatusCode::CREATED, Json(summary)))
}

fn import_into(
    storage: &Storage,
    files: Vec<SourceFile>,
) -> Result<DictionarySummary, StorageError> {
    let mut source = DictionarySource::new(files)?;
    let id = storage.import_dictionary(&mut source)?;
    storage.get_dictionary(&id).map(summarize)
}

fn describe_read_error(path: &str, error: std::io::Error) -> ApiFailure {
    match error.kind() {
        std::io::ErrorKind::NotFound => not_found(format!("nothing at {path:?}")),
        _ => bad_request(format!("could not read {path:?}: {error}")),
    }
}

fn summarize(dictionary: StoredDictionary) -> DictionarySummary {
    let counts = dictionary.counts;
    DictionarySummary {
        id: dictionary.id.0,
        title: dictionary.metadata.title,
        format: dictionary.metadata.format,
        entry_count: counts.entries,
        term_meta_count: counts.term_meta,
        tag_count: counts.tags,
        kanji_count: counts.kanji,
        kanji_meta_count: counts.kanji_meta,
        media_count: counts.media,
    }
}
