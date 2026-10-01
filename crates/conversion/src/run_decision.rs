//! Decisions about the ffmpeg run of a conversion: whether a request waits for the current run or restarts it, and when a run has written far enough.

use easyimmerse_media::SegmentPlan;

use crate::produced_segment::is_warm_up;

/// A request waits for a running ffmpeg, rather than restarting it, when the requested segment starts at most this far beyond the newest segment the run has produced.
const CONTINUE_AHEAD_MS: u64 = 60_000;

/// How much media a run writes beyond the most recently requested segment before it stops.
const WRITE_AHEAD_MS: u64 = 300_000;

/// What is known about the current run of ffmpeg for one conversion.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RunProgress {
    /// The planned segment at which the run was asked to start.
    pub start_index: u32,
    /// The highest planned segment the run has produced so far.
    pub produced_through: Option<u32>,
    pub is_running: bool,
}

/// What to do about a request for a segment that is not cached.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SegmentAction {
    /// Wait for the current run to produce the segment.
    Wait,
    /// Start a new run at the given planned segment, which is the one before the requested segment.
    /// A run that does not start at the beginning discards the segments through the one it starts at, so the requested segment is the first one it keeps.
    Restart { start_index: u32 },
}

/// Decides how to serve a request for a segment that is not cached.
pub fn segment_action(
    plan: &SegmentPlan,
    run: Option<&RunProgress>,
    requested: u32,
) -> SegmentAction {
    match run {
        Some(run) if will_produce(plan, run, requested) => SegmentAction::Wait,
        _ => SegmentAction::Restart {
            start_index: requested.saturating_sub(1),
        },
    }
}

/// Tells whether a run has produced enough media beyond the most recently requested segment to stop.
pub fn has_written_far_enough(plan: &SegmentPlan, produced_through: u32, requested: u32) -> bool {
    let (Some(produced), Some(requested)) =
        (start_ms(plan, produced_through), start_ms(plan, requested))
    else {
        return false;
    };
    produced >= requested.saturating_add(WRITE_AHEAD_MS)
}

fn will_produce(plan: &SegmentPlan, run: &RunProgress, requested: u32) -> bool {
    let is_ahead = run
        .produced_through
        .is_none_or(|produced| requested > produced);
    let position = run.produced_through.unwrap_or(run.start_index);
    let is_near = match (start_ms(plan, position), start_ms(plan, requested)) {
        (Some(position), Some(requested)) => {
            requested <= position.saturating_add(CONTINUE_AHEAD_MS)
        }
        _ => false,
    };
    let is_kept = requested >= run.start_index && !is_warm_up(requested, run.start_index);
    run.is_running && is_kept && is_ahead && is_near
}

fn start_ms(plan: &SegmentPlan, index: u32) -> Option<u64> {
    let position = usize::try_from(index).ok()?;
    plan.segments.get(position).map(|segment| segment.start_ms)
}

#[cfg(test)]
mod tests {
    use easyimmerse_media::{MediaTimeline, Timebase};

    use super::*;

    /// A plan of 4-second segments over 20 minutes: segment `n` starts at `4n` seconds.
    fn plan() -> SegmentPlan {
        SegmentPlan::fixed_length(MediaTimeline {
            timebase: Timebase::new(1, 1000).expect("nonzero timebase"),
            start_pts: 0,
            duration_ticks: 1_200_000,
        })
    }

    fn running(start_index: u32, produced_through: Option<u32>) -> RunProgress {
        RunProgress {
            start_index,
            produced_through,
            is_running: true,
        }
    }

    #[test]
    fn starts_a_run_at_the_beginning_for_the_first_segment() {
        assert_eq!(
            segment_action(&plan(), None, 0),
            SegmentAction::Restart { start_index: 0 }
        );
    }

    #[test]
    fn starts_a_run_one_segment_early_for_a_later_segment() {
        assert_eq!(
            segment_action(&plan(), None, 50),
            SegmentAction::Restart { start_index: 49 }
        );
    }

    #[test]
    fn waits_for_the_next_segment_of_a_running_run() {
        let run = running(0, Some(9));
        assert_eq!(segment_action(&plan(), Some(&run), 10), SegmentAction::Wait);
    }

    #[test]
    fn waits_for_a_run_that_has_produced_nothing_yet() {
        let run = running(49, None);
        assert_eq!(segment_action(&plan(), Some(&run), 50), SegmentAction::Wait);
    }

    #[test]
    fn waits_for_a_segment_shortly_ahead_of_a_running_run() {
        let run = running(0, Some(9));
        assert_eq!(segment_action(&plan(), Some(&run), 24), SegmentAction::Wait);
    }

    #[test]
    fn restarts_for_a_segment_far_ahead_of_a_running_run() {
        let run = running(0, Some(9));
        assert_eq!(
            segment_action(&plan(), Some(&run), 30),
            SegmentAction::Restart { start_index: 29 }
        );
    }

    #[test]
    fn restarts_for_a_segment_the_run_has_passed_without_caching() {
        let run = running(10, Some(20));
        assert_eq!(
            segment_action(&plan(), Some(&run), 10),
            SegmentAction::Restart { start_index: 9 }
        );
    }

    #[test]
    fn restarts_for_the_segment_at_which_a_seeking_run_starts() {
        let run = running(49, None);
        assert_eq!(
            segment_action(&plan(), Some(&run), 49),
            SegmentAction::Restart { start_index: 48 }
        );
    }

    #[test]
    fn restarts_for_a_segment_before_the_run_start() {
        let run = running(10, None);
        assert_eq!(
            segment_action(&plan(), Some(&run), 5),
            SegmentAction::Restart { start_index: 4 }
        );
    }

    #[test]
    fn restarts_when_the_run_has_stopped() {
        let run = RunProgress {
            is_running: false,
            ..running(0, Some(9))
        };
        assert_eq!(
            segment_action(&plan(), Some(&run), 10),
            SegmentAction::Restart { start_index: 9 }
        );
    }

    #[test]
    fn keeps_writing_until_five_minutes_beyond_the_request() {
        assert!(!has_written_far_enough(&plan(), 84, 10));
    }

    #[test]
    fn stops_writing_five_minutes_beyond_the_request() {
        assert!(has_written_far_enough(&plan(), 85, 10));
    }
}
