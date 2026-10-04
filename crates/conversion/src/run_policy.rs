//! When a request lets the active ffmpeg run continue, and when it restarts the run.

use std::time::Duration;

use easyimmerse_media::SegmentPlan;

/// How far ahead of the newest requested segment a run keeps writing before it stops.
pub const WRITE_AHEAD: Duration = Duration::from_secs(5 * 60);
/// How far ahead of the run's position a request may lie and still wait for the run.
pub const CONTINUE_WITHIN: Duration = Duration::from_secs(60);

/// What a run has done so far.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RunProgress {
    /// The planned segment the run was started at. A run from index 0 begins at the start of
    /// the file; any other run seeks to its start segment and discards it.
    pub start_index: usize,
    /// The newest segment the run has placed in the cache.
    pub latest_index: Option<usize>,
    pub newest_requested_index: usize,
    pub finished: bool,
    /// True when ffmpeg exited with an error rather than being stopped.
    pub failed: bool,
}

impl RunProgress {
    pub fn new(start_index: usize, requested_index: usize) -> Self {
        Self {
            start_index,
            latest_index: None,
            newest_requested_index: requested_index,
            finished: false,
            failed: false,
        }
    }

    /// The segment the run is working past: the newest placed one, else its start.
    fn position(&self) -> usize {
        self.latest_index.unwrap_or(self.start_index)
    }

    /// True for segments a seeking run produced only to reach its start, which may lack audio.
    pub fn discards(&self, index: usize) -> bool {
        self.start_index > 0 && index <= self.start_index
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RequestDecision {
    /// The run will reach the segment soon enough.
    Wait,
    /// Start a new run at this segment, replacing any active one.
    Restart { start_index: usize },
}

/// Decides how a request for an uncached segment is served. A new run starts at the segment
/// before the requested one, because a seek lands one or two keyframes early anyway.
pub fn decide(plan: &SegmentPlan, requested: usize, run: Option<&RunProgress>) -> RequestDecision {
    let restart = RequestDecision::Restart {
        start_index: requested.saturating_sub(1),
    };
    let Some(run) = run.filter(|run| !run.finished) else {
        return restart;
    };
    if run.discards(requested) || requested < run.position() {
        return restart;
    }
    if segment_gap(plan, run.position(), requested) <= CONTINUE_WITHIN {
        RequestDecision::Wait
    } else {
        restart
    }
}

/// True once the run has written the whole write-ahead window past the newest request.
pub fn should_stop(plan: &SegmentPlan, run: &RunProgress) -> bool {
    run.latest_index
        .is_some_and(|latest| segment_gap(plan, run.newest_requested_index, latest) >= WRITE_AHEAD)
}

/// The media time between the starts of two segments, zero when `later` is not later.
fn segment_gap(plan: &SegmentPlan, earlier: usize, later: usize) -> Duration {
    let start_micros = |index: usize| {
        plan.segments.get(index).map_or(0, |segment| {
            plan.timebase.ticks_to_micros(segment.start_ticks)
        })
    };
    let gap = start_micros(later).saturating_sub(start_micros(earlier));
    Duration::from_micros(u64::try_from(gap).unwrap_or(0))
}

#[cfg(test)]
mod tests {
    use easyimmerse_media::{Rational, SourceTiming, plan_segments};

    use super::*;

    /// One hundred segments of ten seconds each.
    fn plan() -> SegmentPlan {
        plan_segments(&SourceTiming {
            timebase: Rational::new(1, 1000),
            start_ticks: 0,
            duration_ticks: 1_000_000,
            keyframe_ticks: (0..100).map(|index| index * 10_000).collect(),
        })
    }

    fn running(start_index: usize, latest_index: Option<usize>) -> RunProgress {
        RunProgress {
            start_index,
            latest_index,
            newest_requested_index: start_index,
            finished: false,
            failed: false,
        }
    }

    #[test]
    fn starts_a_run_at_the_segment_before_the_requested_one_without_a_run() {
        assert_eq!(
            decide(&plan(), 5, None),
            RequestDecision::Restart { start_index: 4 }
        );
    }

    #[test]
    fn starts_at_the_beginning_for_the_first_segment() {
        assert_eq!(
            decide(&plan(), 0, None),
            RequestDecision::Restart { start_index: 0 }
        );
    }

    #[test]
    fn waits_for_a_segment_within_a_minute_ahead() {
        assert_eq!(
            decide(&plan(), 12, Some(&running(4, Some(6)))),
            RequestDecision::Wait
        );
    }

    #[test]
    fn restarts_for_a_segment_more_than_a_minute_ahead() {
        assert_eq!(
            decide(&plan(), 13, Some(&running(4, Some(6)))),
            RequestDecision::Restart { start_index: 12 }
        );
    }

    #[test]
    fn restarts_for_a_segment_behind_the_run() {
        assert_eq!(
            decide(&plan(), 5, Some(&running(4, Some(6)))),
            RequestDecision::Restart { start_index: 4 }
        );
    }

    #[test]
    fn restarts_for_the_start_segment_of_a_seeking_run() {
        assert_eq!(
            decide(&plan(), 4, Some(&running(4, None))),
            RequestDecision::Restart { start_index: 3 }
        );
    }

    #[test]
    fn waits_for_the_first_segment_of_a_run_from_the_beginning() {
        assert_eq!(
            decide(&plan(), 0, Some(&running(0, None))),
            RequestDecision::Wait
        );
    }

    #[test]
    fn restarts_when_the_run_has_finished() {
        let finished = RunProgress {
            finished: true,
            ..running(0, Some(99))
        };
        assert_eq!(
            decide(&plan(), 50, Some(&finished)),
            RequestDecision::Restart { start_index: 49 }
        );
    }

    #[test]
    fn a_seeking_run_discards_its_start_segment() {
        assert!(running(4, None).discards(4));
    }

    #[test]
    fn a_run_from_the_beginning_keeps_its_first_segment() {
        assert!(!running(0, None).discards(0));
    }

    #[test]
    fn stops_five_minutes_past_the_newest_request() {
        let run = RunProgress {
            newest_requested_index: 10,
            ..running(0, Some(40))
        };
        assert!(should_stop(&plan(), &run));
    }

    #[test]
    fn keeps_going_under_five_minutes_past_the_newest_request() {
        let run = RunProgress {
            newest_requested_index: 10,
            ..running(0, Some(39))
        };
        assert!(!should_stop(&plan(), &run));
    }
}
