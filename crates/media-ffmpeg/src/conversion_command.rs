//! The ffmpeg argument list of one conversion run, which writes fragmented MP4 HLS segments.
//! The flag sets are the result of extensive trial; change them only when a test proves an
//! alternative.

use std::ffi::OsString;
use std::path::Path;

use easyimmerse_media::{AudioAction, AudioTarget, NOMINAL_SEGMENT_SECONDS, VideoAction};

use crate::ffmpeg_time::format_micros_as_seconds;

/// Added to every output timestamp, so that no decode time can fall below zero when audio
/// encoder priming pushes the first audio packet before the source start. The first decode
/// time of every produced segment carries this offset.
pub const OUTPUT_TS_OFFSET_SECONDS: u32 = 10;
/// macOS has AudioToolbox's AAC encoder; every other platform uses ffmpeg's own.
pub const AAC_ENCODER: &str = if cfg!(target_os = "macos") {
    "aac_at"
} else {
    "aac"
};
/// 192 kbps stereo matches typical sources and is transparent for speech and music.
pub const AAC_BIT_RATE: &str = "192k";
pub const INIT_SEGMENT_FILE_NAME: &str = "init.mp4";
/// ffmpeg's numbering pattern; the run's own numbering is never used to identify a segment.
pub const RUN_SEGMENT_FILE_PATTERN: &str = "s%05d.m4s";
pub const RUN_PLAYLIST_FILE_NAME: &str = "index.m3u8";
const HEVC_CODEC_NAME: &str = "hevc";

/// What one ffmpeg run converts.
#[derive(Debug, Clone, PartialEq)]
pub struct ConversionJob<'a> {
    pub source: &'a Path,
    pub video: Option<&'a VideoAction>,
    pub audio: Option<&'a AudioAction>,
    /// ffmpeg's name for the selected video track's codec. Copied HEVC needs the `hvc1` tag.
    pub video_codec: Option<&'a str>,
    /// The source start time, which is player time zero. Audio packets before it are dropped.
    pub timeline_start_micros: i64,
    /// Where the run begins, or `None` to begin at the start of the file.
    pub seek_micros: Option<i64>,
    /// The directory the run writes its init segment, media segments and playlist into.
    pub output_dir: &'a Path,
}

/// Builds the complete argument list for `ffmpeg`, without the program name.
pub fn conversion_args(job: &ConversionJob) -> Vec<OsString> {
    let mut args = Args::default();
    args.push_all([
        "-hide_banner",
        "-nostdin",
        "-nostats",
        "-loglevel",
        "warning",
    ]);
    args.push("-copyts");
    if let Some(seek_micros) = job.seek_micros {
        args.push_all(["-ss", &format_micros_as_seconds(seek_micros)]);
    }
    args.push("-i");
    args.push(job.source.as_os_str().to_owned());
    // An output option: placed before the input it counts as an input option and is ignored.
    args.push("-output_ts_offset");
    args.push(OUTPUT_TS_OFFSET_SECONDS.to_string());
    push_maps(&mut args, job);
    push_video_codec(&mut args, job);
    push_audio_codec(&mut args, job);
    push_output(&mut args, job);
    args.0
}

fn push_maps(args: &mut Args, job: &ConversionJob) {
    let indexes = [job.video.map(video_index), job.audio.map(audio_index)];
    for index in indexes.into_iter().flatten() {
        args.push_all(["-map", &format!("0:{index}")]);
    }
}

fn push_video_codec(args: &mut Args, job: &ConversionJob) {
    match job.video {
        None => {}
        Some(VideoAction::Copy { .. }) => {
            args.push_all(["-c:v", "copy"]);
            if job.video_codec == Some(HEVC_CODEC_NAME) {
                args.push_all(["-tag:v", "hvc1"]);
            }
        }
        Some(VideoAction::Transcode {
            encoder,
            scale_to,
            bit_rate,
            deinterlace,
            ..
        }) => {
            args.push_all(["-c:v", encoder, "-realtime", "1", "-profile:v", "high"]);
            args.push_all(["-pix_fmt", "yuv420p", "-b:v", &bit_rate.to_string()]);
            args.push_all(["-bf", "0", "-g", "1000000", "-force_key_frames", "source"]);
            args.push_all(["-fps_mode", "passthrough", "-enc_time_base:v", "demux"]);
            let mut filters = Vec::new();
            if *deinterlace {
                filters.push("bwdif=mode=send_frame".to_owned());
            }
            if let Some(size) = scale_to {
                filters.push(format!("scale={}:{}", size.width, size.height));
            }
            if !filters.is_empty() {
                args.push_all(["-vf", &filters.join(",")]);
            }
        }
    }
}

fn push_audio_codec(args: &mut Args, job: &ConversionJob) {
    match job.audio {
        None => return,
        Some(AudioAction::Copy { .. }) => args.push_all(["-c:a", "copy"]),
        Some(AudioAction::Transcode {
            target: AudioTarget::Aac,
            ..
        }) => args.push_all(["-c:a", AAC_ENCODER, "-b:a", AAC_BIT_RATE]),
        Some(AudioAction::Transcode {
            target: AudioTarget::Flac,
            ..
        }) => args.push_all(["-c:a", "flac", "-sample_fmt", "s16"]),
    }
    // Drops the encoder's priming packets, which lie before the timeline start, except the
    // last of them: the first real packet needs it for overlap-add, or its first samples come
    // out attenuated. The comma is escaped because ffmpeg splits a filter list on commas.
    let filter = format!(
        "noise=drop=lt((pts+2*duration)*tb\\,{})",
        format_micros_as_seconds(job.timeline_start_micros)
    );
    args.push_all(["-bsf:a", &filter]);
}

/// A tiny segment time makes the muxer cut at every video keyframe. Audio packets are all
/// keyframes, so audio-only output is cut at the planner's nominal segment length instead.
fn push_output(args: &mut Args, job: &ConversionJob) {
    let segment_time = if job.video.is_some() {
        "0.001".to_owned()
    } else {
        NOMINAL_SEGMENT_SECONDS.to_string()
    };
    args.push_all(["-avoid_negative_ts", "disabled", "-f", "hls"]);
    args.push_all(["-hls_segment_type", "fmp4", "-hls_time", &segment_time]);
    args.push_all(["-hls_playlist_type", "vod"]);
    args.push_all(["-hls_fmp4_init_filename", INIT_SEGMENT_FILE_NAME]);
    args.push_all([
        "-hls_segment_options",
        "movflags=+frag_discont+negative_cts_offsets",
    ]);
    args.push_all(["-hls_flags", "temp_file", "-hls_segment_filename"]);
    args.push(
        job.output_dir
            .join(RUN_SEGMENT_FILE_PATTERN)
            .into_os_string(),
    );
    args.push(job.output_dir.join(RUN_PLAYLIST_FILE_NAME).into_os_string());
}

fn video_index(action: &VideoAction) -> u32 {
    match action {
        VideoAction::Copy { index } | VideoAction::Transcode { index, .. } => *index,
    }
}

fn audio_index(action: &AudioAction) -> u32 {
    match action {
        AudioAction::Copy { index } | AudioAction::Transcode { index, .. } => *index,
    }
}

#[derive(Default)]
struct Args(Vec<OsString>);

impl Args {
    fn push(&mut self, arg: impl Into<OsString>) {
        self.0.push(arg.into());
    }

    fn push_all<'a>(&mut self, args: impl IntoIterator<Item = &'a str>) {
        self.0.extend(args.into_iter().map(OsString::from));
    }
}

#[cfg(test)]
mod tests {
    use easyimmerse_media::PictureSize;

    use super::*;

    fn job<'a>(
        video: Option<&'a VideoAction>,
        audio: Option<&'a AudioAction>,
        video_codec: Option<&'a str>,
    ) -> ConversionJob<'a> {
        ConversionJob {
            source: Path::new("/videos/a.mkv"),
            video,
            audio,
            video_codec,
            timeline_start_micros: 0,
            seek_micros: None,
            output_dir: Path::new("/cache/run"),
        }
    }

    fn strings(args: Vec<OsString>) -> Vec<String> {
        args.into_iter()
            .map(|arg| arg.to_string_lossy().into_owned())
            .collect()
    }

    fn joined(job: &ConversionJob) -> String {
        strings(conversion_args(job)).join(" ")
    }

    const COPY_VIDEO: VideoAction = VideoAction::Copy { index: 0 };
    const COPY_AUDIO: AudioAction = AudioAction::Copy { index: 1 };
    const AAC_AUDIO: AudioAction = AudioAction::Transcode {
        index: 1,
        target: AudioTarget::Aac,
    };

    fn transcode_video(scale_to: Option<PictureSize>, deinterlace: bool) -> VideoAction {
        VideoAction::Transcode {
            index: 0,
            encoder: "h264_videotoolbox".to_owned(),
            scale_to,
            bit_rate: 2_764_800,
            deinterlace,
        }
    }

    #[test]
    fn builds_the_copy_command_exactly() {
        let job = job(Some(&COPY_VIDEO), Some(&COPY_AUDIO), Some("h264"));
        assert_eq!(
            strings(conversion_args(&job)),
            [
                "-hide_banner",
                "-nostdin",
                "-nostats",
                "-loglevel",
                "warning",
                "-copyts",
                "-i",
                "/videos/a.mkv",
                "-output_ts_offset",
                "10",
                "-map",
                "0:0",
                "-map",
                "0:1",
                "-c:v",
                "copy",
                "-c:a",
                "copy",
                "-bsf:a",
                "noise=drop=lt((pts+2*duration)*tb\\,0.000000)",
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
                "/cache/run/s%05d.m4s",
                "/cache/run/index.m3u8",
            ]
        );
    }

    #[test]
    fn seeks_before_the_input() {
        let job = ConversionJob {
            seek_micros: Some(4_000_000),
            ..job(Some(&COPY_VIDEO), Some(&COPY_AUDIO), Some("h264"))
        };
        assert!(
            joined(&job).contains("-copyts -ss 4.000000 -i /videos/a.mkv -output_ts_offset 10")
        );
    }

    #[test]
    fn drops_audio_before_the_timeline_start() {
        let job = ConversionJob {
            timeline_start_micros: 1_458_667,
            ..job(Some(&COPY_VIDEO), Some(&COPY_AUDIO), Some("h264"))
        };
        assert!(joined(&job).contains("-bsf:a noise=drop=lt((pts+2*duration)*tb\\,1.458667)"));
    }

    #[test]
    fn tags_copied_hevc_as_hvc1() {
        let job = job(Some(&COPY_VIDEO), Some(&COPY_AUDIO), Some("hevc"));
        assert!(joined(&job).contains("-c:v copy -tag:v hvc1 -c:a copy"));
    }

    #[test]
    fn transcodes_audio_to_aac_at_192_kbps() {
        let job = job(Some(&COPY_VIDEO), Some(&AAC_AUDIO), Some("h264"));
        assert!(joined(&job).contains(&format!("-c:a {AAC_ENCODER} -b:a 192k")));
    }

    #[test]
    fn transcodes_audio_to_16_bit_flac() {
        let flac = AudioAction::Transcode {
            index: 1,
            target: AudioTarget::Flac,
        };
        let job = job(Some(&COPY_VIDEO), Some(&flac), Some("h264"));
        assert!(joined(&job).contains("-c:a flac -sample_fmt s16"));
    }

    #[test]
    fn transcodes_video_with_the_hardware_encoder_flags() {
        let video = transcode_video(None, false);
        let job = job(Some(&video), Some(&COPY_AUDIO), Some("mpeg4"));
        assert!(joined(&job).contains(
            "-c:v h264_videotoolbox -realtime 1 -profile:v high -pix_fmt yuv420p \
             -b:v 2764800 -bf 0 -g 1000000 -force_key_frames source \
             -fps_mode passthrough -enc_time_base:v demux -c:a copy"
        ));
    }

    #[test]
    fn deinterlaces_and_scales_in_one_filter_chain() {
        let video = transcode_video(
            Some(PictureSize {
                width: 640,
                height: 360,
            }),
            true,
        );
        let job = job(Some(&video), None, Some("h264"));
        assert!(joined(&job).contains("-vf bwdif=mode=send_frame,scale=640:360"));
    }

    #[test]
    fn maps_only_the_audio_track_of_an_audio_only_source() {
        let job = job(None, Some(&AAC_AUDIO), None);
        assert!(joined(&job).contains("-output_ts_offset 10 -map 0:1 -c:a"));
    }

    #[test]
    fn cuts_audio_only_output_at_the_nominal_segment_length() {
        let job = job(None, Some(&AAC_AUDIO), None);
        assert!(joined(&job).contains("-hls_time 4 "));
    }

    #[test]
    fn omits_the_audio_filter_without_audio() {
        let job = job(Some(&COPY_VIDEO), None, Some("h264"));
        assert!(!joined(&job).contains("-bsf:a"));
    }
}
