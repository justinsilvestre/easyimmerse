//! Checks that HLS segments converted from `conversion.mkv` play back like the source, including where ffmpeg restarted partway through the file.
//! Requesting the segments in reverse order makes every segment after the second come from its own ffmpeg run, so each boundary between them is a seam between two runs.

mod support;

use easyimmerse_media::read_first_decode_times;
use support::converted_media::{AUDIO_TRACK_ID, VIDEO_TRACK_ID, convert_fixture};
use support::seek_comparison::{mismatched_seek_targets, misplaced_frames};
use support::segment_comparison::{audio_gaps, mismatched_segments, presentation_offsets};

const IN_ORDER: [u32; 11] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const REVERSED: [u32; 11] = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

/// The number of samples per channel in one AAC frame.
const AAC_FRAME_SAMPLES: i64 = 1024;

/// How far the audio timestamps of two runs may disagree where their segments meet. Restarted runs reproduced audio timestamps this closely in the spike.
const SEAM_TOLERANCE_US: f64 = 45.0;

/// Some players, such as WebKit's, read a decode time of 2^63 or more as a very large positive time rather than as a time before zero.
#[tokio::test(flavor = "multi_thread")]
async fn stores_every_decode_time_below_2_63() {
    let Some(media) = convert_fixture(&IN_ORDER).await else {
        return;
    };
    let wrapped = media.segments.iter().flat_map(|segment| {
        let decode_times = read_first_decode_times(segment).expect("decode times");
        decode_times.into_values().filter(|&time| time >= 1 << 63)
    });
    assert_eq!(wrapped.count(), 0);
}

/// hls.js aligns the playlist with whichever track starts earlier in the first segment it loads, so audio that started earlier would shift the video.
#[tokio::test(flavor = "multi_thread")]
async fn starts_the_audio_of_the_first_segment_no_earlier_than_its_video() {
    let Some(media) = convert_fixture(&IN_ORDER).await else {
        return;
    };
    let first_us = |track_id| {
        let sample = media.samples_by_segment(track_id)[0][0].clone();
        sample.decode_time * 1_000_000 / i64::from(media.timescale(track_id))
    };
    assert!(first_us(AUDIO_TRACK_ID) >= first_us(VIDEO_TRACK_ID));
}

#[tokio::test(flavor = "multi_thread")]
async fn copies_each_group_of_pictures_into_its_planned_segment_in_one_run() {
    let Some(media) = convert_fixture(&IN_ORDER).await else {
        return;
    };
    assert_eq!(mismatched_segments(&media), Vec::<usize>::new());
}

#[tokio::test(flavor = "multi_thread")]
async fn copies_each_group_of_pictures_into_its_planned_segment_across_restarts() {
    let Some(media) = convert_fixture(&REVERSED).await else {
        return;
    };
    assert_eq!(mismatched_segments(&media), Vec::<usize>::new());
}

/// Documents a known issue: the first frame of each segment that does not start a run is presented 1 ms early, and the rest of the segment keeps the source times.
/// Every frame in the fixture's Matroska file has a duration of 41 ms although frames are 41 or 42 ms apart.
/// ffmpeg's MP4 muxer starts each fragment after a run's first at the previous fragment's start plus the durations of its frames, so the fragment starts 1 ms early.
#[tokio::test(flavor = "multi_thread")]
async fn presents_each_frame_at_most_a_millisecond_before_the_source() {
    let Some(media) = convert_fixture(&REVERSED).await else {
        return;
    };
    let offsets = presentation_offsets(&media);
    let outside = offsets
        .iter()
        .filter(|(_, offset)| !(-1000..=0).contains(offset));
    assert_eq!(outside.count(), 0, "{offsets:?}");
}

#[ignore = "known issue: ffmpeg presents the first frame of most segments 1 ms early; see presents_each_frame_at_most_a_millisecond_before_the_source"]
#[tokio::test(flavor = "multi_thread")]
async fn presents_each_frame_at_its_source_time() {
    let Some(media) = convert_fixture(&REVERSED).await else {
        return;
    };
    assert_eq!(presentation_offsets(&media), Vec::<(usize, i64)>::new());
}

#[tokio::test(flavor = "multi_thread")]
async fn continues_audio_without_a_gap_between_segments_of_one_run() {
    let Some(media) = convert_fixture(&IN_ORDER).await else {
        return;
    };
    let gaps = audio_gaps(&media);
    assert_eq!(
        gaps.iter().filter(|(_, gap)| *gap != 0).count(),
        0,
        "{gaps:?}"
    );
}

/// Documents a known issue: each run that transcodes audio starts its own sequence of AAC frames at its seek time, so audio from two runs can overlap or leave a gap shorter than one frame where they meet.
#[tokio::test(flavor = "multi_thread")]
async fn offsets_audio_across_a_restart_by_less_than_one_aac_frame() {
    let Some(media) = convert_fixture(&REVERSED).await else {
        return;
    };
    let gaps = audio_gaps(&media);
    let too_far = gaps
        .iter()
        .filter(|(_, gap)| gap.abs() >= AAC_FRAME_SAMPLES);
    assert_eq!(too_far.count(), 0, "{gaps:?}");
}

#[ignore = "known issue: runs that seek start their own AAC frame grid; enable once restarts snap the seek to the first run's grid"]
#[tokio::test(flavor = "multi_thread")]
async fn continues_audio_across_a_restart_within_the_seam_tolerance() {
    let Some(media) = convert_fixture(&REVERSED).await else {
        return;
    };
    let timescale = f64::from(media.timescale(AUDIO_TRACK_ID));
    let gaps = audio_gaps(&media);
    let too_far = gaps
        .iter()
        .filter(|(_, gap)| (*gap as f64 * 1e6 / timescale).abs() > SEAM_TOLERANCE_US);
    assert_eq!(too_far.count(), 0, "{gaps:?}");
}

#[tokio::test(flavor = "multi_thread")]
async fn shows_the_source_frame_at_every_interior_seek_target_in_one_run() {
    let Some(media) = convert_fixture(&IN_ORDER).await else {
        return;
    };
    assert_eq!(mismatched_seek_targets(&media), Vec::<i64>::new());
}

#[tokio::test(flavor = "multi_thread")]
async fn shows_the_source_frame_at_every_interior_seek_target_across_restarts() {
    let Some(media) = convert_fixture(&REVERSED).await else {
        return;
    };
    assert_eq!(mismatched_seek_targets(&media), Vec::<i64>::new());
}

/// A cue that starts exactly where a frame starts must show that frame, not the one before it.
#[tokio::test(flavor = "multi_thread")]
async fn shows_the_frame_that_starts_at_a_boundary_when_seeking_half_a_frame_in() {
    let Some(media) = convert_fixture(&REVERSED).await else {
        return;
    };
    assert_eq!(misplaced_frames(&media), Vec::<(usize, u32)>::new());
}
