//! Running ffmpeg for a conversion and moving the segments it completes into the cache.

use std::path::Path;
use std::process::ExitStatus;
use std::sync::Arc;
use std::time::Duration;

use thiserror::Error;
use tokio::process::Child;

use crate::collector::{CollectError, RunCollector, remove_run_dir};
use crate::conversion::Conversion;
use crate::run_control::RunStart;
use crate::spawn_ffmpeg::{ERROR_LOG_NAME, RunSettings, spawn_ffmpeg};

/// How often the run directory is checked for completed segments.
const POLL_INTERVAL: Duration = Duration::from_millis(100);

#[derive(Debug, Error)]
pub enum RunError {
    #[error(transparent)]
    Collect(#[from] CollectError),
    #[error("failed to run ffmpeg: {0}")]
    Io(#[from] std::io::Error),
    #[error("ffmpeg exited with {status}: {errors}")]
    Failed { status: ExitStatus, errors: String },
}

/// Starts ffmpeg for the run in a fresh run directory and a task that collects its segments until the run ends or should stop.
pub async fn start_run(
    conversion: &Arc<Conversion>,
    settings: &RunSettings,
    start: RunStart,
) -> Result<(), RunError> {
    let run_dir = conversion.entry.run_dir(start.number);
    remove_run_dir(&run_dir).await?;
    tokio::fs::create_dir_all(&run_dir).await?;
    let child = spawn_ffmpeg(conversion, settings, &run_dir, start.start_index).await?;
    let collector = RunCollector::new(conversion.entry.clone(), run_dir, start.start_index);
    let watcher = tokio::spawn(watch_run(
        Arc::clone(conversion),
        child,
        collector,
        start.number,
    ));
    conversion.add_watcher(watcher);
    Ok(())
}

async fn watch_run(
    conversion: Arc<Conversion>,
    mut child: Child,
    mut collector: RunCollector,
    run_number: u64,
) {
    let outcome = supervise(&conversion, &mut child, &mut collector, run_number).await;
    // The process may already have exited, in which case there is nothing to kill.
    let _ = child.kill().await;
    let failure = outcome.err().map(|error| error.to_string());
    let _ = remove_run_dir(&collector.run_dir).await;
    conversion.finish_run(run_number, failure);
}

/// Collects segments until ffmpeg exits or the run should stop.
async fn supervise(
    conversion: &Conversion,
    child: &mut Child,
    collector: &mut RunCollector,
    run_number: u64,
) -> Result<(), RunError> {
    loop {
        let exit = tokio::select! {
            status = child.wait() => Some(status?),
            () = tokio::time::sleep(POLL_INTERVAL) => None,
        };
        if let Some(produced) = collector.collect(&conversion.manifest.segment_plan).await? {
            conversion.record_progress(run_number, produced);
        }
        match exit {
            Some(status) if !status.success() => {
                return Err(failure(status, &collector.run_dir).await);
            }
            Some(_) => return Ok(()),
            None if conversion.should_stop(run_number) => return Ok(()),
            None => {}
        }
    }
}

async fn failure(status: ExitStatus, run_dir: &Path) -> RunError {
    let errors = tokio::fs::read_to_string(run_dir.join(ERROR_LOG_NAME))
        .await
        .unwrap_or_default();
    RunError::Failed {
        status,
        errors: errors.trim().to_owned(),
    }
}
