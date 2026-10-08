use axum::Json;
use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use easyimmerse_core::dictionary::{
    ColumnRole, DictionaryFormatKind, SourceFile, TableLayout, TablePreview, preview_table,
};
use easyimmerse_storage::{DictionaryId, StoredDictionary};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::{IntoParams, ToSchema};

use crate::auth::error_body::{ApiError, ApiFailure, bad_request, internal};
use crate::routes::dictionary_imports::{ImportJobStarted, start_import};
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct DictionarySummary {
    pub id: String,
    pub title: String,
    pub format: DictionaryFormatKind,
    /// The language of the words looked up, as a BCP 47 tag, when the dictionary states it.
    pub source_language: Option<String>,
    /// The language of the definitions, as a BCP 47 tag, when the dictionary states it.
    pub target_language: Option<String>,
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
    /// What each column of a table holds, as column roles separated by commas, in place of the detected layout.
    pub columns: Option<String>,
    /// Whether the first row of a table is a header. Read only together with `columns`; false when left out.
    #[serde(rename = "hasHeader")]
    #[param(rename = "hasHeader")]
    pub has_header: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema, IntoParams)]
#[into_params(parameter_in = Query)]
#[ts(export)]
pub struct PreviewDictionaryTableQuery {
    /// The name of the uploaded file, whose extension marks it as a CSV, TSV or Tabfile table.
    #[serde(rename = "fileName")]
    #[param(rename = "fileName")]
    pub file_name: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ListDictionariesResponse {
    pub dictionaries: Vec<DictionarySummary>,
}

/// Starts importing the file and answers with the job to poll at `/dictionaries/imports/{id}`,
/// since a large dictionary takes longer to store than a browser waits for a response.
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
        (status = 202, description = "The import was started", body = ImportJobStarted),
        (status = 400, description = "The chosen columns are not column roles", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn import_dictionary(
    State(state): State<AppState>,
    Query(query): Query<ImportDictionaryQuery>,
    body: Bytes,
) -> Result<(StatusCode, Json<ImportJobStarted>), ApiFailure> {
    let table_layout = chosen_table_layout(&query)?;
    let file = SourceFile {
        name: query.file_name,
        bytes: body.to_vec(),
    };
    Ok(start_import(&state, vec![file], table_layout))
}

/// Detects what each column of a table holds and returns that layout with the table's first rows,
/// so that the user can check it before importing.
#[utoipa::path(
    post,
    path = "/dictionaries/preview",
    tag = "dictionaries",
    operation_id = "previewDictionaryTable",
    security(("bearer_token" = [])),
    params(PreviewDictionaryTableQuery),
    request_body(
        description = "A CSV, TSV or Tabfile table, or an archive holding one",
        content(("application/octet-stream")),
    ),
    responses(
        (status = 200, description = "The detected layout and the first rows", body = TablePreview),
        (status = 400, description = "The file could not be read as a table", body = ApiError),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn preview_dictionary_table(
    Query(query): Query<PreviewDictionaryTableQuery>,
    body: Bytes,
) -> Result<Json<TablePreview>, ApiFailure> {
    let preview =
        tokio::task::spawn_blocking(move || preview_table(&query.file_name, body.to_vec()))
            .await
            .map_err(|error| internal(error.to_string()))??;
    Ok(Json(preview))
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

fn chosen_table_layout(query: &ImportDictionaryQuery) -> Result<Option<TableLayout>, ApiFailure> {
    let Some(columns) = &query.columns else {
        return Ok(None);
    };
    let columns = columns
        .split(',')
        .map(parse_column_role)
        .collect::<Result<_, _>>()?;
    Ok(Some(TableLayout {
        columns,
        has_header: query.has_header.unwrap_or(false),
    }))
}

fn parse_column_role(name: &str) -> Result<ColumnRole, ApiFailure> {
    serde_json::from_value(serde_json::Value::String(name.trim().to_string()))
        .map_err(|_| bad_request(format!("{name:?} is not a column role")))
}

pub(crate) fn summarize(dictionary: StoredDictionary) -> DictionarySummary {
    let counts = dictionary.counts;
    DictionarySummary {
        id: dictionary.id.0,
        title: dictionary.metadata.title,
        format: dictionary.metadata.format,
        source_language: dictionary.metadata.source_language,
        target_language: dictionary.metadata.target_language,
        entry_count: counts.entries,
        term_meta_count: counts.term_meta,
        tag_count: counts.tags,
        kanji_count: counts.kanji,
        kanji_meta_count: counts.kanji_meta,
        media_count: counts.media,
    }
}
