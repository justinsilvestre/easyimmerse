//! Where a conversion cuts its segments: at the source's keyframes, or every few seconds of audio.

use serde::{Deserialize, Serialize};

use crate::rational::Rational;
use crate::source_timing::SourceTiming;

/// Audio-only sources have no keyframes, so they are cut into segments of this nominal length.
const NOMINAL_SEGMENT_SECONDS: u64 = 4;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Segment {
    pub start_ticks: i64,
    pub end_ticks: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SegmentPlan {
    pub timebase: Rational,
    /// The source start time, which the playlist presents as player time zero.
    pub start_ticks: i64,
    pub segments: Vec<Segment>,
}

/// Cuts one segment per keyframe interval, the first starting at the source start and the last
/// ending at the source end. Without keyframes the cuts fall every four seconds.
pub fn plan_segments(timing: &SourceTiming) -> SegmentPlan {
    let end_ticks = timing.start_ticks + timing.duration_ticks.max(0);
    let interior_cuts: Vec<i64> = if timing.keyframe_ticks.is_empty() {
        nominal_cuts(timing, end_ticks)
    } else {
        sorted_keyframes(timing)
    };
    let mut boundaries = vec![timing.start_ticks];
    boundaries.extend(
        interior_cuts
            .into_iter()
            .filter(|&tick| tick > timing.start_ticks && tick < end_ticks),
    );
    boundaries.push(end_ticks);
    SegmentPlan {
        timebase: timing.timebase,
        start_ticks: timing.start_ticks,
        segments: boundaries
            .windows(2)
            .map(|pair| Segment {
                start_ticks: pair[0],
                end_ticks: pair[1],
            })
            .collect(),
    }
}

fn sorted_keyframes(timing: &SourceTiming) -> Vec<i64> {
    let mut keyframes = timing.keyframe_ticks.clone();
    keyframes.sort_unstable();
    keyframes.dedup();
    keyframes
}

fn nominal_cuts(timing: &SourceTiming, end_ticks: i64) -> Vec<i64> {
    let step = timing
        .timebase
        .ticks_per_seconds(NOMINAL_SEGMENT_SECONDS)
        .max(1);
    (1..)
        .map(|count| timing.start_ticks + count * step)
        .take_while(|&tick| tick < end_ticks)
        .collect()
}

impl SegmentPlan {
    /// The segment whose start lies nearest to a decode time given in another timescale, such as
    /// a track fragment's `tfdt` in the init segment's timescale. The caller removes any output
    /// timestamp offset first. Fragments start one or two frames before their keyframe's
    /// presentation time when B-frames are present, which is why the nearest start is taken
    /// rather than the last one at or before the time.
    pub fn index_for_decode_time(&self, decode_ticks: i64, timescale: u32) -> Option<usize> {
        let distance = |segment: &Segment| {
            let start = i128::from(segment.start_ticks)
                * i128::from(self.timebase.num)
                * i128::from(timescale);
            let decode = i128::from(decode_ticks) * i128::from(self.timebase.den);
            (start - decode).abs()
        };
        (0..self.segments.len()).min_by_key(|&index| distance(&self.segments[index]))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn video_timing() -> SourceTiming {
        SourceTiming {
            timebase: Rational::new(1, 1000),
            start_ticks: 0,
            duration_ticks: 10_021,
            keyframe_ticks: vec![0, 2000, 4000, 6000, 8000],
        }
    }

    #[test]
    fn cuts_one_segment_per_keyframe_interval() {
        let plan = plan_segments(&video_timing());
        let starts: Vec<i64> = plan
            .segments
            .iter()
            .map(|segment| segment.start_ticks)
            .collect();
        assert_eq!(starts, [0, 2000, 4000, 6000, 8000]);
    }

    #[test]
    fn ends_the_last_segment_at_the_duration() {
        let plan = plan_segments(&video_timing());
        assert_eq!(
            plan.segments.last().map(|segment| segment.end_ticks),
            Some(10_021)
        );
    }

    #[test]
    fn sorts_keyframes_that_arrive_in_decode_order() {
        let timing = SourceTiming {
            keyframe_ticks: vec![4000, 0, 2000],
            ..video_timing()
        };
        let starts: Vec<i64> = plan_segments(&timing)
            .segments
            .iter()
            .map(|segment| segment.start_ticks)
            .collect();
        assert_eq!(starts, [0, 2000, 4000]);
    }

    #[test]
    fn starts_at_the_source_start_time_and_drops_earlier_keyframes() {
        let timing = SourceTiming {
            start_ticks: 1480,
            duration_ticks: 10_000,
            keyframe_ticks: vec![1400, 1480, 3480],
            ..video_timing()
        };
        let starts: Vec<i64> = plan_segments(&timing)
            .segments
            .iter()
            .map(|segment| segment.start_ticks)
            .collect();
        assert_eq!(starts, [1480, 3480]);
    }

    #[test]
    fn cuts_audio_only_sources_every_four_seconds() {
        let timing = SourceTiming {
            timebase: Rational::new(1, 44100),
            start_ticks: 0,
            duration_ticks: 44100 * 10,
            keyframe_ticks: vec![],
        };
        let starts: Vec<i64> = plan_segments(&timing)
            .segments
            .iter()
            .map(|segment| segment.start_ticks)
            .collect();
        assert_eq!(starts, [0, 176_400, 352_800]);
    }

    #[test]
    fn finds_the_segment_nearest_to_a_decode_time_in_another_timescale() {
        let plan = plan_segments(&video_timing());
        assert_eq!(
            plan.index_for_decode_time(4_000 * 90 - 2 * 3600, 90_000),
            Some(2)
        );
    }

    #[test]
    fn finds_no_segment_in_an_empty_plan() {
        let plan = SegmentPlan {
            timebase: Rational::new(1, 1000),
            start_ticks: 0,
            segments: vec![],
        };
        assert_eq!(plan.index_for_decode_time(0, 1000), None);
    }
}
