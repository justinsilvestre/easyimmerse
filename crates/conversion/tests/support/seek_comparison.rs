//! Compares the frames that the source and the converted video show after a seek half a frame past a frame's start, as the player seeks to a cue.

use easyimmerse_media::TrackKind;
use easyimmerse_media_ffmpeg::{FfmpegPaths, probe_file};

use super::converted_media::{ConvertedMedia, VIDEO_TRACK_ID};
use super::displayed_video::{DisplayedVideo, shown_frame_index};
use super::source_media::{VideoPacket, decode_video_frames, read_source_video_packets};
use super::{FIXTURE_NAME, fixture_path};

/// Returns the start times, in microseconds, of the source frames where the converted video shows a different frame than the source.
pub fn mismatched_seek_targets(media: &ConvertedMedia) -> Vec<i64> {
    let source_path = fixture_path(FIXTURE_NAME);
    let source = DisplayedVideo::new(sorted_source_times(), decode_video_frames(&source_path));
    let converted = converted_video(media);
    let half_frame_us = half_frame_us();
    sorted_source_times()
        .into_iter()
        .filter(|&start_us| {
            let target = start_us as f64 + half_frame_us;
            source.frame_at(target) != converted.frame_at(target)
        })
        .collect()
}

/// Returns, for each frame of the converted video that is not shown after seeking to it, the frame's index and the index of the frame shown instead.
/// Each frame of the fixture shows its own index, so this does not depend on decoding the source.
pub fn misplaced_frames(media: &ConvertedMedia) -> Vec<(usize, u32)> {
    let converted = converted_video(media);
    let half_frame_us = half_frame_us();
    let shown_at =
        |start_us: i64| shown_frame_index(converted.frame_at(start_us as f64 + half_frame_us));
    sorted_source_times()
        .into_iter()
        .enumerate()
        .map(|(index, start_us)| (index, shown_at(start_us)))
        .filter(|&(index, shown)| shown as usize != index)
        .collect()
}

fn converted_video(media: &ConvertedMedia) -> DisplayedVideo {
    let timescale = media.timescale(VIDEO_TRACK_ID);
    let times = media
        .samples_by_segment(VIDEO_TRACK_ID)
        .concat()
        .iter()
        .map(|sample| VideoPacket::from_sample(sample, timescale).presentation_us)
        .collect();
    let joined = media.cache.path().join("joined.mp4");
    media.write_joined(&joined);
    DisplayedVideo::new(times, decode_video_frames(&joined))
}

fn sorted_source_times() -> Vec<i64> {
    let packets = read_source_video_packets(&fixture_path(FIXTURE_NAME));
    let mut times: Vec<i64> = packets
        .iter()
        .map(|packet| packet.presentation_us)
        .collect();
    times.sort_unstable();
    times
}

/// Returns half the fixture's frame duration from its probed frame rate, the offset that the player adds to a cue start when it seeks.
fn half_frame_us() -> f64 {
    let container =
        probe_file(&fixture_path(FIXTURE_NAME), &FfmpegPaths::default()).expect("probe");
    let video = container
        .tracks
        .iter()
        .find(|track| track.kind == TrackKind::Video)
        .and_then(|track| track.video.as_ref())
        .expect("a video track");
    let rate = video.frame_rate.as_ref().expect("a frame rate");
    f64::from(rate.denominator) * 1e6 / f64::from(rate.numerator) / 2.0
}
