//! The shared state of one registered conversion: its manifest and the progress of its current ffmpeg run.

use std::sync::{Mutex, MutexGuard, PoisonError};

use tokio::sync::watch;
use tokio::task::JoinHandle;

use crate::entry_paths::EntryPaths;
use crate::error::ConversionError;
use crate::manifest::{Manifest, now_ms, write_manifest};
use crate::run_control::{RunControl, RunStart};
use crate::run_decision::{SegmentAction, has_written_far_enough, segment_action};

pub struct Conversion {
    pub entry: EntryPaths,
    pub manifest: Manifest,
    control: Mutex<RunControl>,
    manifest_writes: tokio::sync::Mutex<()>,
    changes: watch::Sender<()>,
}

/// What a request does next, given the state of the current run.
pub enum Step {
    /// Wait for the run with this number.
    Wait(u64),
    Start(RunStart),
}

impl Conversion {
    pub fn new(entry: EntryPaths, manifest: Manifest) -> Self {
        Conversion {
            entry,
            manifest,
            control: Mutex::default(),
            manifest_writes: tokio::sync::Mutex::new(()),
            changes: watch::Sender::new(()),
        }
    }

    /// Returns a receiver that is marked changed whenever a run makes progress or ends.
    pub fn subscribe(&self) -> watch::Receiver<()> {
        self.changes.subscribe()
    }

    /// Records a request for a segment. The current run writes ahead of the most recently requested one.
    pub fn note_request(&self, index: u32) {
        self.control().requested = index;
    }

    pub fn requested(&self) -> u32 {
        self.control().requested
    }

    /// Decides whether a request for an uncached segment waits for the current run or starts a new one, and reserves the new run.
    /// Fails when the run the request last waited for has failed, or when a new run is needed but not allowed.
    pub fn next_step(
        &self,
        index: u32,
        waited_run: Option<u64>,
        may_start: bool,
    ) -> Result<Step, ConversionError> {
        let mut control = self.control();
        if control.is_shut_down {
            return Err(ConversionError::ShutDown);
        }
        if let Some(failure) = control.failure_of(waited_run) {
            return Err(ConversionError::RunFailed(failure));
        }
        let progress = control.run.as_ref().map(|run| run.progress);
        match segment_action(&self.manifest.segment_plan, progress.as_ref(), index) {
            SegmentAction::Wait => Ok(Step::Wait(control.run.as_ref().map_or(0, |run| run.number))),
            SegmentAction::Restart { .. } if !may_start => Err(ConversionError::NotProduced(index)),
            SegmentAction::Restart { start_index } => {
                Ok(Step::Start(control.begin_run(start_index)))
            }
        }
    }

    pub fn add_watcher(&self, watcher: JoinHandle<()>) {
        let mut control = self.control();
        control.watchers.retain(|watcher| !watcher.is_finished());
        control.watchers.push(watcher);
    }

    /// Records the highest planned segment a run has produced.
    pub fn record_progress(&self, run_number: u64, produced: u32) {
        if let Some(run) = self.control().current_run(run_number) {
            run.progress.produced_through = run.progress.produced_through.max(Some(produced));
        }
        self.changes.send_replace(());
    }

    pub fn finish_run(&self, run_number: u64, failure: Option<String>) {
        if let Some(run) = self.control().current_run(run_number) {
            run.progress.is_running = false;
            run.failure = failure;
        }
        self.changes.send_replace(());
    }

    /// Tells whether a run should stop: it has been replaced by another run, the service is shutting down, or it has written far enough ahead.
    pub fn should_stop(&self, run_number: u64) -> bool {
        let mut control = self.control();
        let requested = control.requested;
        let Some(run) = control.current_run(run_number) else {
            return true;
        };
        let produced = run.progress.produced_through;
        produced.is_some_and(|produced| {
            has_written_far_enough(&self.manifest.segment_plan, produced, requested)
        })
    }

    /// Stops new runs, asks the current run to stop, and returns the tasks that watch runs so the caller can wait for them.
    pub fn shut_down(&self) -> Vec<JoinHandle<()>> {
        let mut control = self.control();
        control.is_shut_down = true;
        control.run = None;
        std::mem::take(&mut control.watchers)
    }

    /// Records in the manifest that the entry was just used.
    pub async fn touch(&self) -> Result<(), ConversionError> {
        let _write = self.manifest_writes.lock().await;
        let manifest = Manifest {
            last_access_ms: now_ms(),
            ..self.manifest.clone()
        };
        Ok(write_manifest(&self.entry.manifest(), &manifest).await?)
    }

    fn control(&self) -> MutexGuard<'_, RunControl> {
        self.control.lock().unwrap_or_else(PoisonError::into_inner)
    }
}

#[cfg(test)]
mod tests {
    use std::path::{Path, PathBuf};

    use easyimmerse_media::playback::ConversionPlan;
    use easyimmerse_media::{MediaTimeline, SegmentPlan, Timebase};

    use super::*;
    use crate::key::ConversionKey;

    /// A conversion of 4-second segments over 20 minutes.
    fn conversion() -> Conversion {
        let key = ConversionKey::parse(&"0".repeat(64)).expect("valid key");
        let timeline = MediaTimeline {
            timebase: Timebase::new(1, 1000).expect("nonzero timebase"),
            start_pts: 0,
            duration_ticks: 1_200_000,
        };
        let manifest = Manifest {
            source_path: PathBuf::from("/media/episode.mkv"),
            source_size: 1000,
            source_modified_ms: 5,
            plan: ConversionPlan {
                video: None,
                audio: None,
            },
            video_track: None,
            segment_plan: SegmentPlan::fixed_length(timeline),
            created_ms: 10,
            last_access_ms: 20,
        };
        Conversion::new(EntryPaths::new(Path::new("/cache"), &key), manifest)
    }

    fn start_index(step: Result<Step, ConversionError>) -> Option<u32> {
        match step {
            Ok(Step::Start(start)) => Some(start.start_index),
            _ => None,
        }
    }

    #[test]
    fn starts_a_run_before_a_requested_segment() {
        assert_eq!(
            start_index(conversion().next_step(50, None, true)),
            Some(49)
        );
    }

    #[test]
    fn lets_a_second_request_wait_for_the_run_the_first_one_started() {
        let conversion = conversion();
        let _ = conversion.next_step(50, None, true);
        let step = conversion.next_step(51, None, true);
        assert!(matches!(step, Ok(Step::Wait(0))));
    }

    #[test]
    fn reports_the_failure_of_the_run_a_request_waited_for() {
        let conversion = conversion();
        let _ = conversion.next_step(50, None, true);
        conversion.finish_run(0, Some("bad input".to_owned()));
        let step = conversion.next_step(50, Some(0), true);
        assert!(matches!(step, Err(ConversionError::RunFailed(errors)) if errors == "bad input"));
    }

    #[test]
    fn stops_a_replaced_run() {
        let conversion = conversion();
        let _ = conversion.next_step(50, None, true);
        let _ = conversion.next_step(200, None, true);
        assert!(conversion.should_stop(0));
    }

    #[test]
    fn refuses_requests_after_shutting_down() {
        let conversion = conversion();
        conversion.shut_down();
        let step = conversion.next_step(50, None, true);
        assert!(matches!(step, Err(ConversionError::ShutDown)));
    }
}
