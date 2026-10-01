//! The division of a media file into consecutive segments for HTTP Live Streaming (HLS).

use std::iter::once;

use serde::{Deserialize, Serialize};

use crate::media_timeline::{KeyframeIndex, MediaTimeline};

/// The nominal segment length for files without video.
const AUDIO_SEGMENT_SECONDS: i128 = 4;

/// The segments a converted file is split into, in playback order.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SegmentPlan {
    pub timeline: MediaTimeline,
    /// Consecutive segments that together cover the whole timeline.
    pub segments: Vec<Segment>,
}

/// One segment, with times measured in ticks of the timeline's timebase.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Segment {
    pub index: u32,
    pub start_pts: i64,
    pub duration_ticks: u64,
    /// The playback time at which the segment starts, which is its start pts minus the timeline's start pts.
    pub start_ms: u64,
}

impl SegmentPlan {
    /// Plans one segment per keyframe interval, as when video is copied without re-encoding.
    /// The first segment starts at the timeline start and ends at the second keyframe, even when the first keyframe comes after the start.
    pub fn from_keyframes(index: &KeyframeIndex) -> Self {
        let start = index.timeline.start_pts;
        let later_keyframes = index
            .keyframe_pts
            .iter()
            .skip(1)
            .copied()
            .filter(|&pts| pts > start);
        Self::from_starts(index.timeline, once(start).chain(later_keyframes))
    }

    /// Plans segments of a fixed nominal length, the last one shorter, for files without video.
    pub fn fixed_length(timeline: MediaTimeline) -> Self {
        let starts = (0..).map(|number| {
            let offset = timeline
                .timebase
                .units_to_ticks(number * AUDIO_SEGMENT_SECONDS, 1);
            timeline.start_pts.saturating_add(saturate(offset))
        });
        Self::from_starts(timeline, starts)
    }

    /// Returns the segment whose start is closest to `pts`, preferring the later segment on a tie.
    /// This identifies a produced segment from a timestamp near its start, such as the decode time of its first frame.
    pub fn nearest_segment(&self, pts: i64) -> Option<&Segment> {
        let later_index = self
            .segments
            .partition_point(|segment| segment.start_pts < pts);
        let earlier = later_index
            .checked_sub(1)
            .and_then(|index| self.segments.get(index));
        let later = self.segments.get(later_index);
        match (earlier, later) {
            (Some(earlier), Some(later))
                if earlier.start_pts.abs_diff(pts) < later.start_pts.abs_diff(pts) =>
            {
                Some(earlier)
            }
            _ => later.or(earlier),
        }
    }

    fn from_starts(timeline: MediaTimeline, starts: impl Iterator<Item = i64>) -> Self {
        let mut starts: Vec<i64> = starts.take_while(|&pts| pts < timeline.end_pts()).collect();
        starts.dedup();
        let ends = starts
            .iter()
            .skip(1)
            .copied()
            .chain(once(timeline.end_pts()));
        let segments = starts
            .iter()
            .zip(ends)
            .enumerate()
            .map(|(index, (&start, end))| Segment {
                index: index as u32,
                start_pts: start,
                duration_ticks: start.abs_diff(end),
                start_ms: playback_ms(&timeline, start),
            })
            .collect();
        SegmentPlan { timeline, segments }
    }
}

fn playback_ms(timeline: &MediaTimeline, pts: i64) -> u64 {
    let ms = timeline
        .timebase
        .ticks_to_units(pts - timeline.start_pts, 1000);
    u64::try_from(ms).unwrap_or(0)
}

fn saturate(ticks: i128) -> i64 {
    i64::try_from(ticks).unwrap_or(i64::MAX)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::media_timeline::Timebase;

    fn timeline(start_pts: i64, duration_ticks: u64) -> MediaTimeline {
        MediaTimeline {
            timebase: Timebase::new(1, 1000).expect("nonzero timebase"),
            start_pts,
            duration_ticks,
        }
    }

    fn keyframe_plan(start_pts: i64, keyframe_pts: &[i64]) -> SegmentPlan {
        SegmentPlan::from_keyframes(&KeyframeIndex {
            timeline: timeline(start_pts, 10_000),
            keyframe_pts: keyframe_pts.to_vec(),
        })
    }

    fn starts(plan: &SegmentPlan) -> Vec<i64> {
        plan.segments
            .iter()
            .map(|segment| segment.start_pts)
            .collect()
    }

    fn durations(plan: &SegmentPlan) -> Vec<u64> {
        plan.segments
            .iter()
            .map(|segment| segment.duration_ticks)
            .collect()
    }

    #[test]
    fn starts_a_segment_at_each_keyframe() {
        assert_eq!(starts(&keyframe_plan(0, &[0, 1502, 2711])), [0, 1502, 2711]);
    }

    #[test]
    fn starts_the_first_segment_at_the_timeline_start_when_the_first_keyframe_is_later() {
        assert_eq!(
            starts(&keyframe_plan(0, &[500, 2002, 3211])),
            [0, 2002, 3211]
        );
    }

    #[test]
    fn ends_the_last_segment_at_the_duration() {
        assert_eq!(durations(&keyframe_plan(0, &[0, 6000])), [6000, 4000]);
    }

    #[test]
    fn measures_playback_time_from_the_timeline_start() {
        let plan = keyframe_plan(500, &[500, 1700]);
        assert_eq!(plan.segments[1].start_ms, 1200);
    }

    #[test]
    fn numbers_the_segments_in_order() {
        let indexes: Vec<u32> = keyframe_plan(0, &[0, 3000, 6000])
            .segments
            .iter()
            .map(|segment| segment.index)
            .collect();
        assert_eq!(indexes, [0, 1, 2]);
    }

    #[test]
    fn splits_audio_into_four_second_segments_with_a_short_last_one() {
        assert_eq!(
            durations(&SegmentPlan::fixed_length(timeline(23, 10_000))),
            [4000, 4000, 2000]
        );
    }

    #[test]
    fn plans_one_segment_when_there_are_no_keyframes() {
        assert_eq!(durations(&keyframe_plan(0, &[])), [10_000]);
    }

    #[test]
    fn ignores_keyframes_before_the_timeline_start() {
        assert_eq!(starts(&keyframe_plan(0, &[-500, 0, 1502])), [0, 1502]);
    }

    #[test]
    fn ignores_a_keyframe_at_the_end_of_the_timeline() {
        assert_eq!(starts(&keyframe_plan(0, &[0, 6000, 10_000])), [0, 6000]);
    }

    #[test]
    fn merges_duplicate_keyframes() {
        assert_eq!(starts(&keyframe_plan(0, &[0, 1502, 1502])), [0, 1502]);
    }

    #[test]
    fn starts_segments_at_keyframes_after_a_negative_start() {
        assert_eq!(starts(&keyframe_plan(-42, &[-42, 958])), [-42, 958]);
    }

    fn nearest_start(pts: i64) -> Option<i64> {
        keyframe_plan(0, &[0, 1502, 2711])
            .nearest_segment(pts)
            .map(|segment| segment.start_pts)
    }

    #[test]
    fn finds_the_segment_that_starts_shortly_after_a_timestamp() {
        assert_eq!(nearest_start(1460), Some(1502));
    }

    #[test]
    fn finds_the_segment_that_starts_shortly_before_a_timestamp() {
        assert_eq!(nearest_start(1540), Some(1502));
    }

    #[test]
    fn prefers_the_later_segment_on_a_tie() {
        assert_eq!(nearest_start(751), Some(1502));
    }

    #[test]
    fn finds_the_first_segment_for_a_timestamp_before_the_start() {
        assert_eq!(nearest_start(-40), Some(0));
    }

    #[test]
    fn finds_the_last_segment_for_a_timestamp_after_the_end() {
        assert_eq!(nearest_start(20_000), Some(2711));
    }

    #[test]
    fn finds_no_segment_in_an_empty_plan() {
        let plan = SegmentPlan::fixed_length(timeline(0, 0));
        assert_eq!(plan.nearest_segment(0), None);
    }

    #[test]
    fn plans_no_segments_for_an_empty_timeline() {
        assert_eq!(SegmentPlan::fixed_length(timeline(0, 0)).segments, []);
    }
}
