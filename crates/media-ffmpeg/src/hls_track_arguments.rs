//! The ffmpeg arguments that select each track of an HLS stream and choose how it is encoded.

use std::ffi::OsString;

use easyimmerse_media::TrackInfo;
use easyimmerse_media::playback::{AudioTarget, TrackAction, TrackConversion};

/// The bit rate of transcoded AAC audio, which is always stereo.
/// It matches typical source bit rates, such as a 192 kbps MP3, and is transparent for speech and music.
pub const AAC_BIT_RATE: &str = "192k";

/// The ffmpeg encoder used for AAC audio.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AacEncoder {
    /// Apple's AudioToolbox encoder, which is much faster than the built-in one but exists only on Apple platforms.
    AudioToolbox,
    /// ffmpeg's own encoder, available everywhere.
    Builtin,
}

impl AacEncoder {
    pub fn for_current_platform() -> Self {
        if cfg!(target_os = "macos") {
            AacEncoder::AudioToolbox
        } else {
            AacEncoder::Builtin
        }
    }

    fn ffmpeg_name(self) -> &'static str {
        match self {
            AacEncoder::AudioToolbox => "aac_at",
            AacEncoder::Builtin => "aac",
        }
    }
}

pub(crate) fn video_arguments(video: &TrackInfo) -> Vec<OsString> {
    let mut arguments = os_strings(&["-map", &format!("0:{}", video.id), "-c:v", "copy"]);
    if is_hevc(video) {
        // ffmpeg tags copied HEVC as hev1 by default, which WebKit refuses to play.
        arguments.extend(os_strings(&["-tag:v", "hvc1"]));
    }
    arguments
}

pub(crate) fn audio_arguments(audio: &TrackConversion, aac_encoder: AacEncoder) -> Vec<OsString> {
    let codec_arguments: &[&str] = match audio.action {
        TrackAction::Copy => &["-c:a", "copy"],
        TrackAction::Transcode {
            target: AudioTarget::Aac,
        } => &[
            "-c:a",
            aac_encoder.ffmpeg_name(),
            "-b:a",
            AAC_BIT_RATE,
            "-ac",
            "2",
        ],
        TrackAction::Transcode {
            target: AudioTarget::Flac,
        } => &["-c:a", "flac", "-sample_fmt", "s16"],
    };
    let map = format!("0:{}", audio.track_id);
    [os_strings(&["-map", &map]), os_strings(codec_arguments)].concat()
}

pub(crate) fn os_strings(values: &[&str]) -> Vec<OsString> {
    values.iter().map(OsString::from).collect()
}

fn is_hevc(video: &TrackInfo) -> bool {
    video
        .codec_string
        .as_deref()
        .is_some_and(|codec_string| codec_string.starts_with("hvc1"))
}

#[cfg(test)]
mod tests {
    use easyimmerse_media::TrackKind;

    use super::*;

    fn video_track(codec: &str, codec_string: &str) -> TrackInfo {
        TrackInfo {
            codec_string: Some(codec_string.to_owned()),
            ..TrackInfo::new(0, TrackKind::Video, codec.to_owned())
        }
    }

    fn audio_conversion(action: TrackAction) -> TrackConversion {
        TrackConversion {
            track_id: 2,
            action,
            reasons: Vec::new(),
        }
    }

    fn aac_arguments(aac_encoder: AacEncoder) -> Vec<OsString> {
        let action = TrackAction::Transcode {
            target: AudioTarget::Aac,
        };
        audio_arguments(&audio_conversion(action), aac_encoder)
    }

    #[test]
    fn maps_and_copies_the_video_track_by_its_stream_index() {
        let arguments = video_arguments(&video_track("h264", "avc1.64001F"));
        assert_eq!(arguments, os_strings(&["-map", "0:0", "-c:v", "copy"]));
    }

    #[test]
    fn tags_copied_hevc_as_hvc1() {
        let arguments = video_arguments(&video_track("hevc", "hvc1.1.6.L93.B0"));
        assert_eq!(arguments[4..], os_strings(&["-tag:v", "hvc1"]));
    }

    #[test]
    fn maps_and_copies_the_audio_track_by_its_stream_index() {
        let arguments = audio_arguments(
            &audio_conversion(TrackAction::Copy),
            AacEncoder::AudioToolbox,
        );
        assert_eq!(arguments, os_strings(&["-map", "0:2", "-c:a", "copy"]));
    }

    #[test]
    fn transcodes_to_stereo_aac_at_the_fixed_bit_rate() {
        let arguments = aac_arguments(AacEncoder::AudioToolbox);
        let expected = ["-c:a", "aac_at", "-b:a", "192k", "-ac", "2"];
        assert_eq!(arguments[2..], os_strings(&expected));
    }

    #[test]
    fn uses_the_built_in_aac_encoder_when_chosen() {
        let arguments = aac_arguments(AacEncoder::Builtin);
        assert_eq!(arguments[2..4], os_strings(&["-c:a", "aac"]));
    }

    #[test]
    fn transcodes_to_16_bit_flac_keeping_the_channels() {
        let action = TrackAction::Transcode {
            target: AudioTarget::Flac,
        };
        let arguments = audio_arguments(&audio_conversion(action), AacEncoder::AudioToolbox);
        let expected = ["-c:a", "flac", "-sample_fmt", "s16"];
        assert_eq!(arguments[2..], os_strings(&expected));
    }
}
