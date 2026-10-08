//! Dictionary imports run as jobs: an import route answers at once with a job id,
//! and the client polls the job until the dictionary is stored or the import fails.

use std::sync::Arc;

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use easyimmerse_core::dictionary::{self, DictionarySource, SourceFile, TableLayout};
use easyimmerse_storage::Storage;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::{ApiError, ApiFailure, internal, not_found};
use crate::import_jobs::{SharedProgress, lock};
use crate::import_progress_sink::ImportProgressSink;
use crate::routes::dictionaries::{DictionarySummary, summarize};
use crate::state::AppState;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ImportJobStarted {
    pub id: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum ImportJobState {
    Running,
    Done,
    Failed,
}

/// How many items of each kind the import has stored so far.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ImportProgress {
    pub entries: u64,
    pub term_meta: u64,
    pub kanji: u64,
    pub kanji_meta: u64,
    pub tags: u64,
    pub media: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ImportJobStatus {
    pub state: ImportJobState,
    pub progress: ImportProgress,
    /// The stored dictionary, once the job is done.
    pub dictionary: Option<DictionarySummary>,
    /// Why the import failed, once the job has failed.
    pub error: Option<ApiError>,
}

#[utoipa::path(
    get,
    path = "/dictionaries/imports/{id}",
    tag = "dictionaries",
    operation_id = "getImportJob",
    security(("bearer_token" = [])),
    params(("id" = String, Path, description = "The import job id")),
    responses(
        (status = 200, description = "Where the import stands", body = ImportJobStatus),
        (status = 401, description = "Missing or invalid token", body = ApiError),
        (status = 404, description = "No import job has the id, or its outcome has been forgotten", body = ApiError),
        (status = 421, description = "Unexpected Host header", body = ApiError),
    ),
)]
pub async fn get_import_job(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<ImportJobStatus>, ApiFailure> {
    lock(&state.import_jobs)
        .status(&id)
        .map(Json)
        .ok_or_else(|| not_found(format!("no import job has the id {id:?}")))
}

/// Starts importing the files on the blocking pool and answers with the id of the job to poll.
pub(crate) fn start_import(
    state: &AppState,
    files: Vec<SourceFile>,
    table_layout: Option<TableLayout>,
) -> (StatusCode, Json<ImportJobStarted>) {
    let (id, progress) = lock(&state.import_jobs).start();
    let (storage, jobs) = (Arc::clone(&state.storage), Arc::clone(&state.import_jobs));
    let job_id = id.clone();
    tokio::spawn(async move {
        let file_name = files
            .first()
            .map(|file| file.name.clone())
            .unwrap_or_default();
        let result = tokio::task::spawn_blocking(move || {
            import_into(&storage, files, table_layout, progress)
        })
        .await
        .unwrap_or_else(|error| Err(internal(format!("import task failed: {error}"))));
        if let Err(failure) = &result {
            tracing::error!(file = %file_name, error = %failure.error.message, "the dictionary could not be imported");
        }
        lock(&jobs).finish(&job_id, result.map_err(|failure| failure.error));
    });
    (StatusCode::ACCEPTED, Json(ImportJobStarted { id }))
}

fn import_into(
    storage: &Storage,
    files: Vec<SourceFile>,
    table_layout: Option<TableLayout>,
    progress: SharedProgress,
) -> Result<DictionarySummary, ApiFailure> {
    let mut source = DictionarySource::new(files)?.with_table_layout(table_layout);
    let id = storage.import_dictionary_with(|sink| {
        let mut counting = ImportProgressSink::new(sink, progress);
        dictionary::import_dictionary(&mut source, &mut counting).map(|_| ())
    })?;
    Ok(summarize(storage.get_dictionary(&id)?))
}
