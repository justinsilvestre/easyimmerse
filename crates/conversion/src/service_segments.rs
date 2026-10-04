//! Serving the init segment and media segments of a conversion, starting and replacing ffmpeg
//! runs as requests demand.

use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};

use tokio::sync::watch;

use crate::entry::ConversionEntry;
use crate::error::ConversionError;
use crate::key::ConversionKey;
use crate::run::ConversionRun;
use crate::run_policy::{RequestDecision, decide};
use crate::service::ConversionService;

/// How long a request waits for its segment before answering with a timeout.
pub const SEGMENT_WAIT_TIMEOUT: Duration = Duration::from_secs(60);
const INIT_WAIT_TIMEOUT: Duration = Duration::from_secs(30);
/// How many runs one request may start before it gives up on a segment ffmpeg never produces.
const MAX_RUN_STARTS_PER_REQUEST: usize = 3;

enum Outcome {
    Ready(PathBuf),
    Pending,
}

impl ConversionService {
    /// The init segment, produced by a run from the start of the file when no run is active.
    pub async fn init_segment(&self, key: &ConversionKey) -> Result<PathBuf, ConversionError> {
        let entry = self.entry(key).await?;
        entry.record_request();
        let path = entry.init_segment_path();
        let _waiting = entry.waiting();
        let deadline = Instant::now() + INIT_WAIT_TIMEOUT;
        let mut starts = 0;
        loop {
            let mut produced = entry.produced.subscribe();
            produced.borrow_and_update();
            if path.is_file() {
                return Ok(path);
            }
            self.ensure_some_run(&entry, &path, &mut starts).await?;
            self.await_change(&entry, 0, &mut produced, deadline, INIT_WAIT_TIMEOUT)
                .await?;
        }
    }

    /// A media segment, waiting for the active run or starting a new one as needed.
    pub async fn segment(
        &self,
        key: &ConversionKey,
        index: usize,
    ) -> Result<PathBuf, ConversionError> {
        let entry = self.entry(key).await?;
        if index >= entry.segment_count() {
            return Err(ConversionError::UnknownSegment {
                key: key.to_string(),
                index,
            });
        }
        entry.record_request();
        let path = entry.segment_path(index);
        let _waiting = entry.waiting();
        let deadline = Instant::now() + SEGMENT_WAIT_TIMEOUT;
        let mut starts = 0;
        loop {
            let mut produced = entry.produced.subscribe();
            produced.borrow_and_update();
            if let Outcome::Ready(path) = self
                .check_segment(&entry, &path, index, &mut starts)
                .await?
            {
                return Ok(path);
            }
            self.await_change(&entry, index, &mut produced, deadline, SEGMENT_WAIT_TIMEOUT)
                .await?;
        }
    }

    async fn check_segment(
        &self,
        entry: &Arc<ConversionEntry>,
        path: &Path,
        index: usize,
        starts: &mut usize,
    ) -> Result<Outcome, ConversionError> {
        if path.is_file() {
            self.schedule_eviction();
            return Ok(Outcome::Ready(path.to_path_buf()));
        }
        let mut run = entry.run.lock().await;
        let progress = run.as_ref().map(ConversionRun::progress);
        match decide(&entry.manifest.segment_plan, index, progress.as_ref()) {
            RequestDecision::Wait => {
                if let Some(run) = run.as_ref() {
                    run.note_request(index);
                }
            }
            RequestDecision::Restart { start_index } => {
                count_start(entry, path, starts)?;
                if let Some(previous) = run.take() {
                    previous.stop().await;
                }
                *run = Some(
                    ConversionRun::start(&self.inner.ffmpeg, Arc::clone(entry), start_index, index)
                        .await?,
                );
            }
        }
        Ok(Outcome::Pending)
    }

    async fn ensure_some_run(
        &self,
        entry: &Arc<ConversionEntry>,
        path: &Path,
        starts: &mut usize,
    ) -> Result<(), ConversionError> {
        let mut run = entry.run.lock().await;
        if run.as_ref().is_some_and(|run| !run.is_finished()) {
            return Ok(());
        }
        count_start(entry, path, starts)?;
        *run = Some(ConversionRun::start(&self.inner.ffmpeg, Arc::clone(entry), 0, 0).await?);
        Ok(())
    }

    /// Waits for the run to place something, and reports a run that died with an error.
    async fn await_change(
        &self,
        entry: &Arc<ConversionEntry>,
        index: usize,
        produced: &mut watch::Receiver<u64>,
        deadline: Instant,
        timeout: Duration,
    ) -> Result<(), ConversionError> {
        let changed = tokio::time::timeout_at(deadline.into(), produced.changed()).await;
        if changed.is_err() {
            return Err(ConversionError::SegmentTimeout {
                key: entry.key.to_string(),
                index,
                timeout,
            });
        }
        let failed = entry
            .run
            .lock()
            .await
            .as_ref()
            .is_some_and(|run| run.progress().failed);
        if failed {
            return Err(ConversionError::RunFailed {
                key: entry.key.to_string(),
                stderr: entry.stderr_text(),
            });
        }
        Ok(())
    }
}

/// Counts a run a request is about to start, and fails the request once its earlier runs have
/// all ended without producing the file it waits for.
fn count_start(
    entry: &ConversionEntry,
    path: &Path,
    starts: &mut usize,
) -> Result<(), ConversionError> {
    if *starts == MAX_RUN_STARTS_PER_REQUEST {
        return Err(ConversionError::SegmentNotProduced {
            key: entry.key.to_string(),
            segment: path
                .file_name()
                .map(|name| name.to_string_lossy().into_owned())
                .unwrap_or_default(),
            runs: *starts,
            stderr: entry.stderr_text(),
        });
    }
    *starts += 1;
    Ok(())
}
