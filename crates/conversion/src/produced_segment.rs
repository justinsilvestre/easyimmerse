//! Identifying the segment files that one ffmpeg run produces.

use easyimmerse_media::SegmentPlan;

/// The fMP4 track whose decode times identify a segment. ffmpeg numbers tracks from 1 in mapping order, and the video track, when present, is mapped first.
pub const IDENTIFYING_TRACK_ID: u32 = 1;

/// Returns ffmpeg's number for a completed segment file named like `s00012.m4s`.
/// Files still being written carry a further suffix and are not matched.
pub fn produced_number(file_name: &str) -> Option<u32> {
    let digits = file_name.strip_prefix('s')?.strip_suffix(".m4s")?;
    let is_number = !digits.is_empty() && digits.bytes().all(|byte| byte.is_ascii_digit());
    is_number.then(|| digits.parse().ok()).flatten()
}

/// Tells whether a produced segment is a warm-up segment to discard: one at or before the planned segment where a run that seeks was asked to start.
/// ffmpeg begins such a run at an earlier keyframe, and it starts transcoded audio exactly at the requested time after encoder priming samples that hold no source audio, so these segments lack audio or begin with priming.
pub fn is_warm_up(planned_index: u32, run_start_index: u32) -> bool {
    run_start_index > 0 && planned_index <= run_start_index
}

/// Maps the decode time of a produced segment's first sample, in units of its track's timescale, to the planned segment that starts nearest to it.
pub fn planned_index(plan: &SegmentPlan, decode_time: u64, timescale: u32) -> Option<u32> {
    // ffmpeg writes a time before zero, such as the start of transcoded audio that begins with encoder priming samples, as its 64-bit two's complement.
    let signed_decode_time = decode_time as i64;
    let ticks = plan
        .timeline
        .timebase
        .units_to_ticks(i128::from(signed_decode_time), u64::from(timescale));
    let pts = i64::try_from(ticks).ok()?;
    plan.nearest_segment(pts).map(|segment| segment.index)
}

#[cfg(test)]
mod tests {
    use easyimmerse_media::{KeyframeIndex, MediaTimeline, Timebase};

    use super::*;

    fn plan() -> SegmentPlan {
        SegmentPlan::from_keyframes(&KeyframeIndex {
            timeline: MediaTimeline {
                timebase: Timebase::new(1, 1000).expect("nonzero timebase"),
                start_pts: 0,
                duration_ticks: 10_000,
            },
            keyframe_pts: vec![0, 1502, 2711, 6131],
        })
    }

    #[test]
    fn reads_the_number_of_a_completed_segment() {
        assert_eq!(produced_number("s00012.m4s"), Some(12));
    }

    #[test]
    fn ignores_a_segment_still_being_written() {
        assert_eq!(produced_number("s00012.m4s.tmp"), None);
    }

    #[test]
    fn ignores_the_init_segment() {
        assert_eq!(produced_number("init.mp4"), None);
    }

    #[test]
    fn discards_a_segment_before_the_start_of_a_run_that_seeks() {
        assert!(is_warm_up(6, 7));
    }

    #[test]
    fn discards_the_start_segment_of_a_run_that_seeks() {
        assert!(is_warm_up(7, 7));
    }

    #[test]
    fn keeps_later_segments_of_a_run_that_seeks() {
        assert!(!is_warm_up(8, 7));
    }

    #[test]
    fn keeps_the_first_segment_of_a_run_from_the_beginning() {
        assert!(!is_warm_up(0, 0));
    }

    #[test]
    fn maps_a_decode_time_slightly_before_a_keyframe_to_its_segment() {
        assert_eq!(planned_index(&plan(), 2_686_000, 1_000_000), Some(2));
    }

    #[test]
    fn maps_a_decode_time_before_zero_to_the_first_segment() {
        assert_eq!(planned_index(&plan(), u64::MAX - 2111, 48_000), Some(0));
    }

    #[test]
    fn maps_a_decode_time_in_another_timescale() {
        assert_eq!(planned_index(&plan(), 98_096, 16_000), Some(3));
    }
}
