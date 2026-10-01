//! The state of a conversion's ffmpeg runs that requests and run watchers share.

use std::time::{Duration, Instant};

use tokio::task::JoinHandle;

use crate::run_decision::RunProgress;

/// A run that a request has decided to start.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RunStart {
    pub number: u64,
    pub start_index: u32,
}

/// The current run, the most recent request, and the tasks that watch runs.
#[derive(Default)]
pub struct RunControl {
    pub run: Option<CurrentRun>,
    /// The most recently requested segment, which the current run writes ahead of.
    pub requested: u32,
    /// When a request last used the conversion.
    pub last_used: Option<Instant>,
    next_run_number: u64,
    pub is_shut_down: bool,
    pub watchers: Vec<JoinHandle<()>>,
}

/// The most recently started run. A run that has ended stays current, with its failure if it failed, until another run starts.
pub struct CurrentRun {
    pub number: u64,
    pub progress: RunProgress,
    pub failure: Option<String>,
}

impl RunControl {
    /// Tells whether a run is active or a request used the conversion within `window`.
    /// A replaced run counts as active until its watcher ends, since it may still move segments into the cache.
    pub fn is_in_use(&self, window: Duration) -> bool {
        let is_running = self.run.as_ref().is_some_and(|run| run.progress.is_running);
        let is_watched = self.watchers.iter().any(|watcher| !watcher.is_finished());
        let was_used = self.last_used.is_some_and(|used| used.elapsed() < window);
        is_running || is_watched || was_used
    }

    /// Returns the current run if it has the given number.
    pub fn current_run(&mut self, run_number: u64) -> Option<&mut CurrentRun> {
        self.run.as_mut().filter(|run| run.number == run_number)
    }

    /// Returns the error output of the run with the given number, if it is current and has failed.
    pub fn failure_of(&self, run_number: Option<u64>) -> Option<String> {
        let run = self
            .run
            .as_ref()
            .filter(|run| Some(run.number) == run_number)?;
        run.failure.clone()
    }

    /// Records a new run as the current one and returns its number and start.
    pub fn begin_run(&mut self, start_index: u32) -> RunStart {
        let start = RunStart {
            number: self.next_run_number,
            start_index,
        };
        self.next_run_number += 1;
        let progress = RunProgress {
            start_index,
            produced_through: None,
            is_running: true,
        };
        self.run = Some(CurrentRun {
            number: start.number,
            progress,
            failure: None,
        });
        start
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn is_in_use_while_a_replaced_run_is_still_watched() {
        let mut control = RunControl::default();
        control
            .watchers
            .push(tokio::spawn(std::future::pending::<()>()));
        assert!(control.is_in_use(Duration::ZERO));
    }

    #[test]
    fn numbers_runs_in_the_order_they_begin() {
        let mut control = RunControl::default();
        control.begin_run(0);
        assert_eq!(control.begin_run(5).number, 1);
    }

    #[test]
    fn reports_the_failure_of_the_current_run() {
        let mut control = RunControl::default();
        let start = control.begin_run(0);
        if let Some(run) = control.current_run(start.number) {
            run.failure = Some("bad input".to_owned());
        }
        assert_eq!(
            control.failure_of(Some(start.number)),
            Some("bad input".to_owned())
        );
    }

    #[test]
    fn ignores_the_failure_of_a_replaced_run() {
        let mut control = RunControl::default();
        let replaced = control.begin_run(0);
        if let Some(run) = control.current_run(replaced.number) {
            run.failure = Some("bad input".to_owned());
        }
        control.begin_run(5);
        assert_eq!(control.failure_of(Some(replaced.number)), None);
    }
}
