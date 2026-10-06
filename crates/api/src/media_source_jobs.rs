//! Fetching media through a media-source plugin as a job: the fetch takes as long as a
//! download, so the request that starts it answers at once and the client polls the job,
//! which carries the plugin's progress and everything it and its commands reported.

use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use easyimmerse_core::media_file::MediaFile;
use easyimmerse_core::project::ProjectId;
use easyimmerse_core::providers::media_source::{MediaLocator, ProgressEvent};
use easyimmerse_plugins::{HostEvent, LogLevel};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::auth::error_body::ApiError;

/// How many finished jobs the server remembers, so that a client can still read the
/// outcome of a fetch it started a while ago.
const FINISHED_JOBS_KEPT: usize = 50;
/// How many log lines a job keeps; a download's progress lines would otherwise crowd out
/// the rest.
const LOG_LINES_KEPT: usize = 200;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(transparent)]
#[ts(export)]
pub struct MediaSourceJobId(pub String);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum MediaSourceJobStatus {
    Running,
    Done,
    Failed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum MediaSourceLogLevel {
    Info,
    Warn,
    Error,
    /// A line that a command the plugin ran wrote to its standard output or error.
    Output,
}

/// One line of what a job reported.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct MediaSourceLogLine {
    /// Milliseconds since the Unix epoch.
    pub at_ms: u64,
    pub level: MediaSourceLogLevel,
    pub message: String,
}

/// A fetch through a media-source plugin, from its start to the media file it added or the
/// error it ended in.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct MediaSourceJob {
    pub id: MediaSourceJobId,
    pub project_id: ProjectId,
    pub plugin: String,
    pub locator: MediaLocator,
    pub status: MediaSourceJobStatus,
    /// The plugin's latest progress report.
    pub progress: Option<ProgressEvent>,
    /// What the plugin and its commands reported, oldest first; only the latest lines are kept.
    pub log: Vec<MediaSourceLogLine>,
    /// The added media file, once the job is done.
    pub media_file: Option<MediaFile>,
    /// Why the job failed, once it has.
    pub error: Option<ApiError>,
    /// Milliseconds since the Unix epoch.
    pub started_at_ms: u64,
    pub finished_at_ms: Option<u64>,
}

impl MediaSourceJob {
    pub fn start(project_id: ProjectId, plugin: &str, locator: MediaLocator) -> Self {
        Self {
            id: MediaSourceJobId(hex::encode(rand::random::<[u8; 16]>())),
            project_id,
            plugin: plugin.to_string(),
            locator,
            status: MediaSourceJobStatus::Running,
            progress: None,
            log: Vec::new(),
            media_file: None,
            error: None,
            started_at_ms: now_ms(),
            finished_at_ms: None,
        }
    }

    pub fn is_finished(&self) -> bool {
        self.status != MediaSourceJobStatus::Running
    }

    fn push_line(&mut self, level: MediaSourceLogLevel, message: String) {
        self.log.push(MediaSourceLogLine {
            at_ms: now_ms(),
            level,
            message,
        });
        if self.log.len() > LOG_LINES_KEPT {
            let excess = self.log.len() - LOG_LINES_KEPT;
            self.log.drain(..excess);
        }
    }

    /// Records what the plugin host reported.
    pub fn record(&mut self, event: HostEvent) {
        match event {
            HostEvent::Log(entry) => self.push_line(log_level(entry.level), entry.message),
            HostEvent::Progress(event) => {
                self.push_line(MediaSourceLogLevel::Info, event.message.clone());
                self.progress = Some(event);
            }
            HostEvent::CommandStarted { command, args } => self.push_line(
                MediaSourceLogLevel::Info,
                format!("running {command} {}", shell_words(&args)),
            ),
            HostEvent::CommandOutput { line, .. } => {
                self.push_line(MediaSourceLogLevel::Output, line)
            }
            HostEvent::CommandFinished {
                command,
                exit_code,
                elapsed_ms,
            } => {
                let level = if exit_code == 0 {
                    MediaSourceLogLevel::Info
                } else {
                    MediaSourceLogLevel::Warn
                };
                self.push_line(
                    level,
                    format!(
                        "{command} finished with exit code {exit_code} after {:.1} s",
                        elapsed_ms as f64 / 1000.0
                    ),
                );
            }
        }
    }

    pub fn finish_with(&mut self, media_file: MediaFile) {
        self.status = MediaSourceJobStatus::Done;
        self.media_file = Some(media_file);
        self.finished_at_ms = Some(now_ms());
    }

    pub fn fail_with(&mut self, error: ApiError) {
        self.push_line(MediaSourceLogLevel::Error, error.message.clone());
        self.status = MediaSourceJobStatus::Failed;
        self.error = Some(error);
        self.finished_at_ms = Some(now_ms());
    }
}

fn log_level(level: LogLevel) -> MediaSourceLogLevel {
    match level {
        LogLevel::Info => MediaSourceLogLevel::Info,
        LogLevel::Warn => MediaSourceLogLevel::Warn,
        LogLevel::Error => MediaSourceLogLevel::Error,
    }
}

/// Quotes the arguments that contain spaces, as a shell would want them.
fn shell_words(args: &[String]) -> String {
    args.iter()
        .map(|arg| {
            if arg.contains(char::is_whitespace) || arg.is_empty() {
                format!("{arg:?}")
            } else {
                arg.clone()
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_millis() as u64)
        .unwrap_or(0)
}

/// The jobs the server has run since it started, newest last.
#[derive(Debug, Default)]
pub struct MediaSourceJobs {
    jobs: Mutex<Vec<MediaSourceJob>>,
}

impl MediaSourceJobs {
    pub fn insert(&self, job: MediaSourceJob) {
        let mut jobs = self.lock();
        jobs.push(job);
        prune_finished(&mut jobs);
    }

    pub fn get(&self, id: &MediaSourceJobId) -> Option<MediaSourceJob> {
        self.lock().iter().find(|job| &job.id == id).cloned()
    }

    /// Changes the job in place, returning whether it was found.
    pub fn update(&self, id: &MediaSourceJobId, change: impl FnOnce(&mut MediaSourceJob)) -> bool {
        let mut jobs = self.lock();
        match jobs.iter_mut().find(|job| &job.id == id) {
            Some(job) => {
                change(job);
                true
            }
            None => false,
        }
    }

    /// A listener for the plugin host that records every event on the job.
    pub fn listener(
        self: &Arc<Self>,
        id: MediaSourceJobId,
    ) -> impl FnMut(HostEvent) + Send + 'static {
        let jobs = Arc::clone(self);
        move |event| {
            jobs.update(&id, |job| job.record(event));
        }
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, Vec<MediaSourceJob>> {
        // A panic while holding the lock leaves the jobs readable, so the poison is ignored.
        self.jobs
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

/// Forgets the oldest finished jobs beyond the number kept. Running jobs are always kept.
fn prune_finished(jobs: &mut Vec<MediaSourceJob>) {
    let finished = jobs.iter().filter(|job| job.is_finished()).count();
    let mut to_drop = finished.saturating_sub(FINISHED_JOBS_KEPT);
    jobs.retain(|job| {
        if to_drop > 0 && job.is_finished() {
            to_drop -= 1;
            false
        } else {
            true
        }
    });
}

/// The directory for one fetch: under the plugin's own directory in the media directory,
/// named after the job.
pub fn output_dir_for(media_dir: &Path, job: &MediaSourceJob) -> PathBuf {
    media_dir.join(&job.plugin).join(&job.id.0)
}

#[cfg(test)]
mod tests {
    use easyimmerse_plugins::LogEntry;

    use super::*;

    fn job() -> MediaSourceJob {
        MediaSourceJob::start(
            ProjectId("p".to_string()),
            "source",
            MediaLocator("x".to_string()),
        )
    }

    fn finished_job() -> MediaSourceJob {
        let mut job = job();
        job.fail_with(ApiError {
            code: "c".to_string(),
            message: "m".to_string(),
        });
        job
    }

    #[test]
    fn starts_running_without_progress() {
        let job = job();
        assert_eq!(
            (job.status, job.progress),
            (MediaSourceJobStatus::Running, None)
        );
    }

    #[test]
    fn keeps_the_latest_progress_report() {
        let mut job = job();
        for fraction in [0.25, 0.5] {
            job.record(HostEvent::Progress(ProgressEvent {
                fraction,
                message: "working".to_string(),
            }));
        }
        assert_eq!(job.progress.map(|event| event.fraction), Some(0.5));
    }

    #[test]
    fn logs_a_progress_report_as_an_info_line() {
        let mut job = job();
        job.record(HostEvent::Progress(ProgressEvent {
            fraction: 0.5,
            message: "halfway".to_string(),
        }));
        assert_eq!(
            (job.log[0].level, job.log[0].message.as_str()),
            (MediaSourceLogLevel::Info, "halfway")
        );
    }

    #[test]
    fn logs_a_plugin_warning_at_its_level() {
        let mut job = job();
        job.record(HostEvent::Log(LogEntry {
            level: LogLevel::Warn,
            message: "careful".to_string(),
        }));
        assert_eq!(job.log[0].level, MediaSourceLogLevel::Warn);
    }

    #[test]
    fn logs_a_started_command_with_its_arguments_quoted_where_needed() {
        let mut job = job();
        job.record(HostEvent::CommandStarted {
            command: "tool".to_string(),
            args: vec!["-o".to_string(), "a b".to_string()],
        });
        assert_eq!(job.log[0].message, "running tool -o \"a b\"");
    }

    #[test]
    fn logs_a_commands_output_as_output_lines() {
        let mut job = job();
        job.record(HostEvent::CommandOutput {
            command: "tool".to_string(),
            line: "[download] 50%".to_string(),
        });
        assert_eq!(job.log[0].level, MediaSourceLogLevel::Output);
    }

    #[test]
    fn logs_a_failed_command_as_a_warning() {
        let mut job = job();
        job.record(HostEvent::CommandFinished {
            command: "tool".to_string(),
            exit_code: 1,
            elapsed_ms: 1500,
        });
        assert_eq!(
            (job.log[0].level, job.log[0].message.as_str()),
            (
                MediaSourceLogLevel::Warn,
                "tool finished with exit code 1 after 1.5 s"
            )
        );
    }

    #[test]
    fn keeps_only_the_latest_log_lines() {
        let mut job = job();
        for index in 0..(LOG_LINES_KEPT + 10) {
            job.record(HostEvent::CommandOutput {
                command: "tool".to_string(),
                line: index.to_string(),
            });
        }
        assert_eq!(
            (job.log.len(), job.log[0].message.as_str()),
            (LOG_LINES_KEPT, "10")
        );
    }

    #[test]
    fn failing_records_the_error_in_the_log_too() {
        let job = finished_job();
        assert_eq!(
            (job.status, job.log.last().map(|line| line.level)),
            (
                MediaSourceJobStatus::Failed,
                Some(MediaSourceLogLevel::Error)
            )
        );
    }

    #[test]
    fn finds_an_inserted_job_by_id() {
        let jobs = MediaSourceJobs::default();
        let job = job();
        jobs.insert(job.clone());
        assert_eq!(jobs.get(&job.id), Some(job));
    }

    #[test]
    fn updates_a_job_in_place() {
        let jobs = MediaSourceJobs::default();
        let job = job();
        jobs.insert(job.clone());
        jobs.update(&job.id, |job| job.status = MediaSourceJobStatus::Done);
        assert_eq!(
            jobs.get(&job.id).map(|job| job.status),
            Some(MediaSourceJobStatus::Done)
        );
    }

    #[test]
    fn forgets_the_oldest_finished_jobs_beyond_the_number_kept() {
        let jobs = MediaSourceJobs::default();
        let oldest = finished_job();
        jobs.insert(oldest.clone());
        for _ in 0..FINISHED_JOBS_KEPT {
            jobs.insert(finished_job());
        }
        assert_eq!(jobs.get(&oldest.id), None);
    }

    #[test]
    fn keeps_a_running_job_however_many_have_finished() {
        let jobs = MediaSourceJobs::default();
        let running = job();
        jobs.insert(running.clone());
        for _ in 0..(FINISHED_JOBS_KEPT + 5) {
            jobs.insert(finished_job());
        }
        assert!(jobs.get(&running.id).is_some());
    }

    #[test]
    fn the_listener_records_events_on_the_job() {
        let jobs = Arc::new(MediaSourceJobs::default());
        let job = job();
        jobs.insert(job.clone());
        let mut listener = jobs.listener(job.id.clone());
        listener(HostEvent::Log(LogEntry {
            level: LogLevel::Info,
            message: "hi".to_string(),
        }));
        assert_eq!(jobs.get(&job.id).unwrap().log[0].message, "hi");
    }

    #[test]
    fn puts_the_output_dir_under_the_plugins_dir_in_the_media_dir() {
        let job = job();
        assert_eq!(
            output_dir_for(Path::new("/media"), &job),
            Path::new("/media/source").join(&job.id.0)
        );
    }
}
