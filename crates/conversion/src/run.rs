//! One ffmpeg process converting an entry from a planned segment onward, and the task that
//! moves what it writes into the cache.

use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use easyimmerse_media_ffmpeg::{ConversionJob, conversion_args};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::oneshot;
use tokio::task::JoinHandle;

use crate::cache_layout::CacheLayout;
use crate::entry::ConversionEntry;
use crate::error::ConversionError;
use crate::run_monitor::{collect_output, remember_failure};
use crate::run_policy::RunProgress;

const POLL_INTERVAL: Duration = Duration::from_millis(100);

pub struct ConversionRun {
    pub progress: Arc<Mutex<RunProgress>>,
    stop: Option<oneshot::Sender<()>>,
    task: JoinHandle<()>,
}

impl ConversionRun {
    /// Clears the run directory, starts ffmpeg, and starts watching its output.
    pub async fn start(
        ffmpeg: &Path,
        entry: Arc<ConversionEntry>,
        start_index: usize,
        requested_index: usize,
    ) -> Result<Self, ConversionError> {
        let run_dir = CacheLayout::run_dir(&entry.dir);
        reset_run_dir(&run_dir).await?;
        let child = spawn_ffmpeg(ffmpeg, &entry, start_index, &run_dir)?;
        let progress = Arc::new(Mutex::new(RunProgress::new(start_index, requested_index)));
        let (stop, stop_requested) = oneshot::channel();
        let task = tokio::spawn(supervise(
            child,
            Arc::clone(&entry),
            run_dir,
            Arc::clone(&progress),
            stop_requested,
        ));
        Ok(Self {
            progress,
            stop: Some(stop),
            task,
        })
    }

    pub fn progress(&self) -> RunProgress {
        self.progress
            .lock()
            .map(|progress| *progress)
            .unwrap_or_else(|poisoned| *poisoned.into_inner())
    }

    pub fn is_finished(&self) -> bool {
        self.progress().finished
    }

    pub fn note_request(&self, index: usize) {
        if let Ok(mut progress) = self.progress.lock() {
            progress.newest_requested_index = progress.newest_requested_index.max(index);
        }
    }

    /// Kills the process and waits until its output has been dealt with.
    pub async fn stop(mut self) {
        if let Some(stop) = self.stop.take() {
            let _ = stop.send(());
        }
        let _ = (&mut self.task).await;
    }
}

/// Aborting the task drops the child, which kills the process.
impl Drop for ConversionRun {
    fn drop(&mut self) {
        self.task.abort();
    }
}

fn spawn_ffmpeg(
    ffmpeg: &Path,
    entry: &ConversionEntry,
    start_index: usize,
    run_dir: &Path,
) -> Result<Child, ConversionError> {
    let plan = &entry.manifest.segment_plan;
    let seek_micros = (start_index > 0)
        .then(|| plan.segments.get(start_index))
        .flatten()
        .map(|segment| plan.timebase.ticks_to_micros(segment.start_ticks));
    let job = ConversionJob {
        source: &entry.manifest.source.path,
        video: entry.manifest.plan.video.as_ref(),
        audio: entry.manifest.plan.audio.as_ref(),
        video_codec: entry.manifest.video_codec.as_deref(),
        timeline_start_micros: plan.timebase.ticks_to_micros(plan.start_ticks),
        seek_micros,
        output_dir: run_dir,
    };
    Command::new(ffmpeg)
        .args(conversion_args(&job))
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|source| {
            easyimmerse_media_ffmpeg::FfmpegError::Spawn {
                binary: easyimmerse_media_ffmpeg::BinaryName::Ffmpeg,
                source,
            }
            .into()
        })
}

async fn reset_run_dir(run_dir: &PathBuf) -> Result<(), ConversionError> {
    match tokio::fs::remove_dir_all(run_dir).await {
        Ok(()) => {}
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(ConversionError::cache_io(run_dir)(error)),
    }
    tokio::fs::create_dir_all(run_dir)
        .await
        .map_err(ConversionError::cache_io(run_dir))
}

/// Polls the run directory until the process exits or a stop is requested, then collects
/// whatever the process finished writing.
async fn supervise(
    mut child: Child,
    entry: Arc<ConversionEntry>,
    run_dir: PathBuf,
    progress: Arc<Mutex<RunProgress>>,
    mut stop_requested: oneshot::Receiver<()>,
) {
    let stderr_task = child.stderr.take().map(|stderr| {
        let buffer = Arc::clone(&entry.stderr);
        tokio::spawn(async move {
            let mut lines = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                ConversionEntry::append_stderr(&buffer, &format!("{line}\n"));
            }
        })
    });
    let mut ticks = tokio::time::interval(POLL_INTERVAL);
    let exit_status = loop {
        tokio::select! {
            _ = ticks.tick() => {
                if collect_output(&entry, &run_dir, &progress).await {
                    let _ = child.start_kill();
                }
            }
            _ = &mut stop_requested => {
                let _ = child.start_kill();
            }
            status = child.wait() => break status,
        }
    };
    collect_output(&entry, &run_dir, &progress).await;
    if let Some(task) = stderr_task {
        let _ = task.await;
    }
    remember_failure(&entry, exit_status, &progress);
    if let Ok(mut progress) = progress.lock() {
        progress.finished = true;
    }
    entry.notify_produced();
}
