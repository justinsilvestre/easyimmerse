//! Per-track decisions for a conversion: copy the stream, or transcode it.

use crate::container::{ContainerInfo, TrackInfo};
use crate::conversion_settings::{AudioTarget, ConversionSettings, VideoTarget};
use crate::playback_environment::{PlaybackEngine, PlaybackEnvironment};
use crate::playback_plan::{AudioAction, UnsupportedReason, VideoAction};
use crate::transcode_video::{PictureSize, fit_picture, transcode_bit_rate};

/// MP3 inside fragmented MP4 is valid but silent in WebKit, so it is never copied there.
const WEBKIT_UNCOPYABLE_AUDIO_CODEC: &str = "mp3";
/// H.264 High 10 is rejected by WebKit's Media Source Extensions.
const WEBKIT_UNCOPYABLE_VIDEO_PREFIX: &str = "avc1.6E";

/// Copies audio the client decodes from fragmented MP4, and otherwise transcodes it to the
/// audio target. FLAC that the client cannot play falls back to AAC.
pub(crate) fn plan_audio_action(
    track: &TrackInfo,
    environment: &PlaybackEnvironment,
    settings: &ConversionSettings,
) -> Result<AudioAction, UnsupportedReason> {
    if can_copy_audio(track, environment) {
        return Ok(AudioAction::Copy { index: track.index });
    }
    let target = match settings.audio_target {
        AudioTarget::Flac if !environment.accepts_in_mse(AudioTarget::Flac.codec_string()) => {
            AudioTarget::Aac
        }
        target => target,
    };
    if !environment.accepts_in_mse(target.codec_string()) {
        return Err(UnsupportedReason::AudioCodecUnsupported);
    }
    Ok(AudioAction::Transcode {
        index: track.index,
        target,
    })
}

fn can_copy_audio(track: &TrackInfo, environment: &PlaybackEnvironment) -> bool {
    if environment.engine == PlaybackEngine::WebKit && track.codec == WEBKIT_UNCOPYABLE_AUDIO_CODEC
    {
        return false;
    }
    track
        .codec_string
        .as_deref()
        .is_some_and(|codec_string| environment.accepts_in_mse(codec_string))
}

/// Copies video the client decodes from fragmented MP4, and otherwise transcodes it to H.264
/// when the server has an encoder and the client plays the result.
pub(crate) fn plan_video_action(
    track: &TrackInfo,
    container: &ContainerInfo,
    environment: &PlaybackEnvironment,
    settings: &ConversionSettings,
) -> Result<VideoAction, UnsupportedReason> {
    if can_copy_video(track, environment) {
        return Ok(VideoAction::Copy { index: track.index });
    }
    let target = settings
        .video_target
        .as_ref()
        .filter(|_| environment.accepts_in_mse(VideoTarget::CODEC_STRING))
        .ok_or(UnsupportedReason::VideoCodecUnsupported)?;
    let source_size = picture_size(track);
    let scale_to = source_size
        .map(fit_picture)
        .transpose()
        .map_err(|_| UnsupportedReason::PictureTooTall)?
        .flatten();
    Ok(VideoAction::Transcode {
        index: track.index,
        encoder: target.encoder.clone(),
        scale_to,
        bit_rate: transcode_bit_rate(
            scale_to.or(source_size),
            track.frame_rate,
            track.bit_rate.or(container.bit_rate),
        ),
        deinterlace: track.interlaced,
    })
}

fn can_copy_video(track: &TrackInfo, environment: &PlaybackEnvironment) -> bool {
    track.codec_string.as_deref().is_some_and(|codec_string| {
        let webkit_rejects = environment.engine == PlaybackEngine::WebKit
            && codec_string.starts_with(WEBKIT_UNCOPYABLE_VIDEO_PREFIX);
        !webkit_rejects && environment.accepts_in_mse(codec_string)
    })
}

fn picture_size(track: &TrackInfo) -> Option<PictureSize> {
    match (track.width, track.height) {
        (Some(width), Some(height)) if width > 0 && height > 0 => {
            Some(PictureSize { width, height })
        }
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::container::{ContainerFormat, TrackKind};
    use crate::rational::Rational;

    fn environment(engine: PlaybackEngine, codec_strings: &[&str]) -> PlaybackEnvironment {
        PlaybackEnvironment {
            engine,
            can_play_type: crate::playback_environment::CanPlayAnswer::No,
            mse_codec_strings: codec_strings.iter().map(|s| (*s).to_owned()).collect(),
        }
    }

    fn settings(audio_target: AudioTarget, encoder: Option<&str>) -> ConversionSettings {
        ConversionSettings {
            audio_target,
            video_target: encoder.map(|encoder| VideoTarget {
                encoder: encoder.to_owned(),
            }),
        }
    }

    fn audio_track(codec: &str, codec_string: Option<&str>) -> TrackInfo {
        TrackInfo {
            index: 1,
            kind: TrackKind::Audio,
            codec: codec.to_owned(),
            codec_string: codec_string.map(str::to_owned),
            ..TrackInfo::default()
        }
    }

    fn video_track(codec_string: Option<&str>) -> TrackInfo {
        TrackInfo {
            index: 0,
            kind: TrackKind::Video,
            codec: "h264".to_owned(),
            codec_string: codec_string.map(str::to_owned),
            width: Some(1920),
            height: Some(1080),
            frame_rate: Some(Rational::new(24, 1)),
            ..TrackInfo::default()
        }
    }

    fn empty_container() -> ContainerInfo {
        ContainerInfo {
            format: ContainerFormat::Matroska,
            duration_ms: None,
            start_ms: None,
            bit_rate: None,
            tracks: vec![],
        }
    }

    #[test]
    fn copies_audio_the_client_accepts() {
        let action = plan_audio_action(
            &audio_track("aac", Some("mp4a.40.2")),
            &environment(PlaybackEngine::Chromium, &["mp4a.40.2"]),
            &settings(AudioTarget::Aac, None),
        );
        assert_eq!(action, Ok(AudioAction::Copy { index: 1 }));
    }

    #[test]
    fn transcodes_vorbis_to_the_audio_target() {
        let action = plan_audio_action(
            &audio_track("vorbis", None),
            &environment(PlaybackEngine::Chromium, &["mp4a.40.2", "fLaC"]),
            &settings(AudioTarget::Flac, None),
        );
        assert_eq!(
            action,
            Ok(AudioAction::Transcode {
                index: 1,
                target: AudioTarget::Flac
            })
        );
    }

    #[test]
    fn falls_back_from_flac_to_aac_when_the_client_rejects_flac() {
        let action = plan_audio_action(
            &audio_track("vorbis", None),
            &environment(PlaybackEngine::WebKit, &["mp4a.40.2"]),
            &settings(AudioTarget::Flac, None),
        );
        assert_eq!(
            action,
            Ok(AudioAction::Transcode {
                index: 1,
                target: AudioTarget::Aac
            })
        );
    }

    #[test]
    fn never_copies_mp3_in_webkit() {
        let action = plan_audio_action(
            &audio_track("mp3", Some("mp4a.6B")),
            &environment(PlaybackEngine::WebKit, &["mp4a.6B", "mp4a.40.2"]),
            &settings(AudioTarget::Aac, None),
        );
        assert_eq!(
            action,
            Ok(AudioAction::Transcode {
                index: 1,
                target: AudioTarget::Aac
            })
        );
    }

    #[test]
    fn refuses_audio_when_the_client_accepts_no_target() {
        let action = plan_audio_action(
            &audio_track("vorbis", None),
            &environment(PlaybackEngine::Gecko, &[]),
            &settings(AudioTarget::Aac, None),
        );
        assert_eq!(action, Err(UnsupportedReason::AudioCodecUnsupported));
    }

    #[test]
    fn copies_video_the_client_accepts() {
        let action = plan_video_action(
            &video_track(Some("avc1.64001F")),
            &empty_container(),
            &environment(PlaybackEngine::WebKit, &["avc1.64001F"]),
            &settings(AudioTarget::Aac, None),
        );
        assert_eq!(action, Ok(VideoAction::Copy { index: 0 }));
    }

    #[test]
    fn never_copies_high_10_in_webkit() {
        let action = plan_video_action(
            &video_track(Some("avc1.6E0028")),
            &empty_container(),
            &environment(PlaybackEngine::WebKit, &["avc1.6E0028", "avc1.640033"]),
            &settings(AudioTarget::Aac, Some("h264_videotoolbox")),
        );
        assert!(
            matches!(action, Ok(VideoAction::Transcode { .. })),
            "{action:?}"
        );
    }

    #[test]
    fn copies_high_10_in_chromium() {
        let action = plan_video_action(
            &video_track(Some("avc1.6E0028")),
            &empty_container(),
            &environment(PlaybackEngine::Chromium, &["avc1.6E0028"]),
            &settings(AudioTarget::Aac, None),
        );
        assert_eq!(action, Ok(VideoAction::Copy { index: 0 }));
    }

    #[test]
    fn transcodes_with_the_encoder_and_the_bit_rate_rule() {
        let action = plan_video_action(
            &video_track(None),
            &empty_container(),
            &environment(PlaybackEngine::Chromium, &["avc1.640033"]),
            &settings(AudioTarget::Aac, Some("h264_videotoolbox")),
        );
        assert_eq!(
            action,
            Ok(VideoAction::Transcode {
                index: 0,
                encoder: "h264_videotoolbox".to_owned(),
                scale_to: None,
                bit_rate: 6_220_800,
                deinterlace: false,
            })
        );
    }

    #[test]
    fn caps_the_bit_rate_at_the_container_bit_rate_when_the_track_has_none() {
        let container = ContainerInfo {
            bit_rate: Some(3_000_000),
            ..empty_container()
        };
        let action = plan_video_action(
            &video_track(None),
            &container,
            &environment(PlaybackEngine::Chromium, &["avc1.640033"]),
            &settings(AudioTarget::Aac, Some("h264_videotoolbox")),
        );
        assert!(
            matches!(
                action,
                Ok(VideoAction::Transcode {
                    bit_rate: 3_000_000,
                    ..
                })
            ),
            "{action:?}"
        );
    }

    #[test]
    fn refuses_video_without_an_encoder() {
        let action = plan_video_action(
            &video_track(None),
            &empty_container(),
            &environment(PlaybackEngine::Chromium, &["avc1.640033"]),
            &settings(AudioTarget::Aac, None),
        );
        assert_eq!(action, Err(UnsupportedReason::VideoCodecUnsupported));
    }

    #[test]
    fn refuses_a_picture_too_tall_to_encode() {
        let track = TrackInfo {
            width: Some(4320),
            height: Some(7680),
            ..video_track(None)
        };
        let action = plan_video_action(
            &track,
            &empty_container(),
            &environment(PlaybackEngine::Chromium, &["avc1.640033"]),
            &settings(AudioTarget::Aac, Some("h264_videotoolbox")),
        );
        assert_eq!(action, Err(UnsupportedReason::PictureTooTall));
    }
}
