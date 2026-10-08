//! The dictionary imports that are running or recently finished, so that a client can start an import,
//! poll its progress, and read its outcome even after reconnecting.

use std::collections::HashMap;
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};
use std::time::{Duration, Instant};

use crate::auth::error_body::ApiError;
use crate::routes::dictionaries::DictionarySummary;
use crate::routes::dictionary_imports::{ImportJobState, ImportJobStatus, ImportProgress};

/// How long a finished job stays readable.
const RETENTION: Duration = Duration::from_secs(60 * 60);

/// What the import stored so far, shared between the job and the sink that counts for it.
pub type SharedProgress = Arc<Mutex<ImportProgress>>;

#[derive(Default)]
pub struct ImportJobs {
    jobs: HashMap<String, ImportJob>,
}

struct ImportJob {
    progress: SharedProgress,
    finished: Option<FinishedImport>,
}

struct FinishedImport {
    result: Result<DictionarySummary, ApiError>,
    at: Instant,
}

impl ImportJobs {
    /// Registers a running job and returns its id with the progress its import updates.
    pub fn start(&mut self) -> (String, SharedProgress) {
        self.forget_old();
        let id = hex::encode(rand::random::<[u8; 16]>());
        let progress = SharedProgress::default();
        let job = ImportJob {
            progress: Arc::clone(&progress),
            finished: None,
        };
        self.jobs.insert(id.clone(), job);
        (id, progress)
    }

    pub fn finish(&mut self, id: &str, result: Result<DictionarySummary, ApiError>) {
        if let Some(job) = self.jobs.get_mut(id) {
            job.finished = Some(FinishedImport {
                result,
                at: Instant::now(),
            });
        }
    }

    /// The status of a job, or None when no job has the id or its outcome has been forgotten.
    pub fn status(&mut self, id: &str) -> Option<ImportJobStatus> {
        self.forget_old();
        self.jobs.get(id).map(status_of)
    }

    fn forget_old(&mut self) {
        self.jobs.retain(|_, job| {
            job.finished
                .as_ref()
                .is_none_or(|finished| finished.at.elapsed() < RETENTION)
        });
    }
}

fn status_of(job: &ImportJob) -> ImportJobStatus {
    let progress = *lock(&job.progress);
    let (state, result) = match &job.finished {
        None => (ImportJobState::Running, None),
        Some(FinishedImport { result, .. }) => (
            if result.is_ok() {
                ImportJobState::Done
            } else {
                ImportJobState::Failed
            },
            Some(result),
        ),
    };
    ImportJobStatus {
        state,
        progress,
        dictionary: result.and_then(|result| result.as_ref().ok().cloned()),
        error: result.and_then(|result| result.as_ref().err().cloned()),
    }
}

/// Locks a mutex, recovering the value when a thread panicked while holding it.
pub fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(PoisonError::into_inner)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn summary() -> DictionarySummary {
        DictionarySummary {
            id: "d".to_string(),
            title: "Words".to_string(),
            format: easyimmerse_core::dictionary::DictionaryFormatKind::Csv,
            source_language: None,
            target_language: None,
            entry_count: 0,
            term_meta_count: 0,
            tag_count: 0,
            kanji_count: 0,
            kanji_meta_count: 0,
            media_count: 0,
        }
    }

    #[test]
    fn a_started_job_is_running() {
        let mut jobs = ImportJobs::default();
        let (id, _) = jobs.start();
        assert_eq!(jobs.status(&id).unwrap().state, ImportJobState::Running);
    }

    #[test]
    fn a_job_reports_the_progress_its_import_counted() {
        let mut jobs = ImportJobs::default();
        let (id, progress) = jobs.start();
        lock(&progress).entries = 3;
        assert_eq!(jobs.status(&id).unwrap().progress.entries, 3);
    }

    #[test]
    fn a_finished_job_carries_its_dictionary() {
        let mut jobs = ImportJobs::default();
        let (id, _) = jobs.start();
        jobs.finish(&id, Ok(summary()));
        assert_eq!(jobs.status(&id).unwrap().dictionary, Some(summary()));
    }

    #[test]
    fn a_failed_job_carries_its_error() {
        let mut jobs = ImportJobs::default();
        let (id, _) = jobs.start();
        let error = ApiError {
            code: "bad_request".to_string(),
            message: "broken".to_string(),
        };
        jobs.finish(&id, Err(error.clone()));
        assert_eq!(jobs.status(&id).unwrap().error, Some(error));
    }

    #[test]
    fn an_unknown_job_has_no_status() {
        let mut jobs = ImportJobs::default();
        assert_eq!(jobs.status("missing"), None);
    }
}
