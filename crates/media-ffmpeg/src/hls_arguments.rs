//! The ffmpeg arguments that convert a media file into an HLS stream of fragmented MP4 segments.

use std::ffi::OsString;
use std::path::Path;

use easyimmerse_media::TrackInfo;
use easyimmerse_media::playback::{AudioTarget, TrackConversion};

use crate::hls_track_arguments::{AacEncoder, audio_arguments, os_strings, video_arguments};

/// The name of the init segment, which describes the tracks, inside the output directory.
pub const INIT_SEGMENT_NAME: &str = "init.mp4";

/// The name of the playlist that ffmpeg writes inside the output directory.
pub const PLAYLIST_NAME: &str = "index.m3u8";

/// The pattern of media segment names that ffmpeg writes, numbered from zero in the order it produces them in each run.
pub const SEGMENT_NAME_PATTERN: &str = "s%05d.m4s";

/// How many seconds later than in the source every output timestamp is.
/// Encoder priming samples and some sources start before zero, and some players, such as WebKit's, read a decode time before zero as a very large positive time.
/// Priming samples are the near-silent samples an AAC encoder emits before the first source sample.
/// Every run uses the same offset, so segments from different runs line up.
/// hls.js subtracts the decode time of the first segment it loads, so the offset does not change playback times.
pub const TIMESTAMP_OFFSET_SECONDS: u32 = 10;

/// The file to read and where in it to begin.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct HlsSource<'a> {
    pub path: &'a Path,
    /// The source time in seconds at which to begin, as a decimal string, or `None` to begin at the start of the file.
    /// ffmpeg starts at a keyframe before this time, sometimes one or two keyframes earlier than the nearest one, and keeps the source timestamps.
    pub start_seconds: Option<&'a str>,
    /// The time in seconds at which the source's timeline starts, as a decimal string. Audio packets that start before it are dropped.
    pub timeline_start_seconds: &'a str,
}

/// The tracks that go into the stream. The video track is always copied unchanged.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct HlsTracks<'a> {
    pub video: Option<&'a TrackInfo>,
    pub audio: Option<&'a TrackConversion<AudioTarget>>,
}

/// Builds the ffmpeg arguments that write the init segment, numbered media segments, and a playlist into the output directory.
/// With a video track ffmpeg cuts a segment at every keyframe; without one it cuts about every four seconds.
pub fn hls_arguments(
    source: &HlsSource,
    tracks: &HlsTracks,
    aac_encoder: AacEncoder,
    output_dir: &Path,
) -> Vec<OsString> {
    let mut arguments = input_arguments(source);
    arguments.extend(tracks.video.into_iter().flat_map(video_arguments));
    if let Some(audio) = tracks.audio {
        arguments.extend(audio_arguments(audio, aac_encoder));
        arguments.extend(audio_drop_arguments(source.timeline_start_seconds));
    }
    arguments.extend(output_arguments(tracks.video.is_some(), output_dir));
    arguments
}

fn input_arguments(source: &HlsSource) -> Vec<OsString> {
    let mut arguments = os_strings(&["-copyts"]);
    if let Some(start) = source.start_seconds {
        arguments.extend(os_strings(&["-ss", start]));
    }
    arguments.extend([OsString::from("-i"), source.path.into()]);
    arguments
}

/// Drops the audio packets that start before the source's timeline, such as those holding only encoder priming samples.
/// hls.js aligns the playlist with the track that starts earliest in the first segment it loads, so audio that starts before the video would shift the video's place on the playlist timeline.
/// The filter sees timestamps before the output offset is added.
fn audio_drop_arguments(timeline_start_seconds: &str) -> Vec<OsString> {
    let filter = format!("noise=drop=lt(pts*tb\\,{timeline_start_seconds})");
    os_strings(&["-bsf:a", &filter])
}

fn output_arguments(has_video: bool, output_dir: &Path) -> Vec<OsString> {
    // A target duration shorter than any keyframe interval makes ffmpeg cut at every keyframe.
    let segment_seconds = if has_video { "0.001" } else { "4" };
    let offset = TIMESTAMP_OFFSET_SECONDS.to_string();
    let mut arguments = os_strings(&[
        "-output_ts_offset",
        &offset,
        "-avoid_negative_ts",
        "disabled",
        "-f",
        "hls",
        "-hls_segment_type",
        "fmp4",
        "-hls_time",
        segment_seconds,
        "-hls_playlist_type",
        "vod",
        "-hls_fmp4_init_filename",
        INIT_SEGMENT_NAME,
        // The muxer that writes each segment receives movflags only through this option.
        // frag_discont keeps each segment's decode times on the source timeline when ffmpeg starts partway through the file, and negative_cts_offsets keeps B-frame presentation times equal to the source.
        "-hls_segment_options",
        "movflags=+frag_discont+negative_cts_offsets",
        "-hls_flags",
        "temp_file",
        "-hls_segment_filename",
    ]);
    arguments.push(output_dir.join(SEGMENT_NAME_PATTERN).into());
    arguments.push(output_dir.join(PLAYLIST_NAME).into());
    arguments
}

#[cfg(test)]
mod tests {
    use easyimmerse_media::TrackKind;
    use easyimmerse_media::playback::TrackAction;

    use super::*;

    fn video_track() -> TrackInfo {
        TrackInfo {
            codec_string: Some("avc1.64001F".to_owned()),
            ..TrackInfo::new(0, TrackKind::Video, "h264".to_owned())
        }
    }

    fn audio_copy() -> TrackConversion<AudioTarget> {
        TrackConversion {
            track_id: 2,
            action: TrackAction::Copy,
            reasons: Vec::new(),
        }
    }

    fn arguments_for(source: &HlsSource, tracks: &HlsTracks) -> Vec<String> {
        hls_arguments(source, tracks, AacEncoder::AudioToolbox, Path::new("/out"))
            .iter()
            .map(|argument| argument.to_string_lossy().into_owned())
            .collect()
    }

    fn source(start_seconds: Option<&str>) -> HlsSource<'_> {
        HlsSource {
            path: Path::new("/media/source.mkv"),
            start_seconds,
            timeline_start_seconds: "0.000000",
        }
    }

    fn video_and_audio_arguments() -> Vec<String> {
        let (video, audio) = (video_track(), audio_copy());
        let tracks = HlsTracks {
            video: Some(&video),
            audio: Some(&audio),
        };
        arguments_for(&source(None), &tracks)
    }

    #[test]
    fn seeks_after_keeping_timestamps_and_before_reading_the_input() {
        let tracks = HlsTracks {
            video: None,
            audio: None,
        };
        let arguments = arguments_for(&source(Some("6.131125")), &tracks);
        assert_eq!(arguments[..4], ["-copyts", "-ss", "6.131125", "-i"]);
    }

    #[test]
    fn cuts_four_second_segments_for_audio_alone() {
        let audio = audio_copy();
        let tracks = HlsTracks {
            video: None,
            audio: Some(&audio),
        };
        let arguments = arguments_for(&source(None), &tracks);
        assert!(arguments.windows(2).any(|pair| pair == ["-hls_time", "4"]));
    }

    #[test]
    fn passes_the_spike_flags_in_order() {
        let expected = [
            "-copyts",
            "-i",
            "/media/source.mkv",
            "-map",
            "0:0",
            "-c:v",
            "copy",
            "-map",
            "0:2",
            "-c:a",
            "copy",
            "-bsf:a",
            "noise=drop=lt(pts*tb\\,0.000000)",
            "-output_ts_offset",
            "10",
            "-avoid_negative_ts",
            "disabled",
            "-f",
            "hls",
            "-hls_segment_type",
            "fmp4",
            "-hls_time",
            "0.001",
            "-hls_playlist_type",
            "vod",
            "-hls_fmp4_init_filename",
            "init.mp4",
            "-hls_segment_options",
            "movflags=+frag_discont+negative_cts_offsets",
            "-hls_flags",
            "temp_file",
            "-hls_segment_filename",
            "/out/s%05d.m4s",
            "/out/index.m3u8",
        ];
        assert_eq!(video_and_audio_arguments(), expected);
    }
}
