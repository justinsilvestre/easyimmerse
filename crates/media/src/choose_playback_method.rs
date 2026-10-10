//! Chooses whether a client plays a file directly, after conversion, or not at all.

use crate::container::{ContainerInfo, TrackInfo, TrackKind};
use crate::conversion_settings::ConversionSettings;
use crate::direct_playback::{DirectSupport, direct_mime_type, direct_support};
use crate::playback_environment::PlaybackEnvironment;
use crate::playback_method::{ConversionPlan, ConversionReason, PlaybackMethod, UnsupportedReason};
use crate::track_actions::{choose_audio_action, choose_video_action};
use crate::track_selection::{TrackSelection, default_track_selection};

/// Chooses how a client plays the selected tracks. `settings` is `None` when the server
/// has no conversion service, in which case anything but direct playback is unsupported.
pub fn choose_playback_method(
    container: &ContainerInfo,
    selection: &TrackSelection,
    environment: &PlaybackEnvironment,
    settings: Option<&ConversionSettings>,
) -> PlaybackMethod {
    let (video, audio) = match select_tracks(container, selection) {
        Ok(tracks) => tracks,
        Err(reason) => return PlaybackMethod::Unsupported { reason },
    };
    let reasons = direct_playback_obstacles(container, selection, environment);
    if reasons.is_empty() {
        return PlaybackMethod::Direct;
    }
    let Some(settings) = settings else {
        return PlaybackMethod::Unsupported {
            reason: UnsupportedReason::ConversionUnavailable,
        };
    };
    let video = video.map(|track| choose_video_action(track, container, environment, settings));
    let audio = audio.map(|track| choose_audio_action(track, environment, settings));
    match (video.transpose(), audio.transpose()) {
        (Ok(video), Ok(audio)) => PlaybackMethod::Convert(ConversionPlan {
            video,
            audio,
            reasons,
        }),
        (Err(reason), _) | (_, Err(reason)) => PlaybackMethod::Unsupported { reason },
    }
}

type SelectedTracks<'a> = (Option<&'a TrackInfo>, Option<&'a TrackInfo>);

fn select_tracks<'a>(
    container: &'a ContainerInfo,
    selection: &TrackSelection,
) -> Result<SelectedTracks<'a>, UnsupportedReason> {
    let video = find_track(container, selection.video, TrackKind::Video)?;
    let audio = find_track(container, selection.audio, TrackKind::Audio)?;
    if video.is_none() && audio.is_none() {
        return Err(UnsupportedReason::NoTracks);
    }
    Ok((video, audio))
}

fn find_track(
    container: &ContainerInfo,
    index: Option<u32>,
    kind: TrackKind,
) -> Result<Option<&TrackInfo>, UnsupportedReason> {
    index.map_or(Ok(None), |index| {
        container
            .track(index)
            .filter(|track| track.kind == kind)
            .map(Some)
            .ok_or(UnsupportedReason::TrackNotFound)
    })
}

/// Direct playback needs a container the engine seeks accurately, the default tracks, and a
/// positive `canPlayType` answer for the file's MIME type with codecs.
fn direct_playback_obstacles(
    container: &ContainerInfo,
    selection: &TrackSelection,
    environment: &PlaybackEnvironment,
) -> Vec<ConversionReason> {
    let mut reasons = Vec::new();
    let support = direct_support(container.format, environment.engine);
    match support {
        DirectSupport::Unsupported => reasons.push(ConversionReason::ContainerUnsupported),
        DirectSupport::InaccurateSeeking => reasons.push(ConversionReason::InaccurateSeeking),
        DirectSupport::Accurate => {}
    }
    if *selection != default_track_selection(container) {
        reasons.push(ConversionReason::NonDefaultTracks);
    }
    let codecs_rejected = direct_mime_type(container, selection).is_none()
        || !environment.can_play_type.is_positive();
    if support != DirectSupport::Unsupported && codecs_rejected {
        reasons.push(ConversionReason::CodecUnsupported);
    }
    reasons
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::container::ContainerFormat;
    use crate::conversion_settings::{AudioTarget, VideoTarget};
    use crate::playback_environment::{CanPlayAnswer, PlaybackEngine};
    use crate::playback_method::{AudioAction, VideoAction};

    fn track(index: u32, kind: TrackKind, codec: &str, codec_string: Option<&str>) -> TrackInfo {
        TrackInfo {
            index,
            kind,
            codec: codec.to_owned(),
            codec_string: codec_string.map(str::to_owned),
            is_default: true,
            ..TrackInfo::default()
        }
    }

    fn container(format: ContainerFormat, tracks: Vec<TrackInfo>) -> ContainerInfo {
        ContainerInfo {
            format,
            duration_ms: Some(10_000),
            start_ms: Some(0),
            bit_rate: None,
            tracks,
        }
    }

    fn h264_aac(format: ContainerFormat) -> ContainerInfo {
        container(
            format,
            vec![
                track(0, TrackKind::Video, "h264", Some("avc1.4D400C")),
                track(1, TrackKind::Audio, "aac", Some("mp4a.40.2")),
            ],
        )
    }

    fn chromium(can_play_type: CanPlayAnswer) -> PlaybackEnvironment {
        PlaybackEnvironment {
            engine: PlaybackEngine::Chromium,
            can_play_type,
            mse_codec_strings: ["avc1.4D400C", "avc1.640033", "mp4a.40.2", "fLaC", "mp4a.6B"]
                .map(str::to_owned)
                .to_vec(),
        }
    }

    fn settings() -> ConversionSettings {
        ConversionSettings {
            audio_target: AudioTarget::Aac,
            video_target: Some(VideoTarget {
                encoder: "h264_videotoolbox".to_owned(),
            }),
        }
    }

    fn both_tracks() -> TrackSelection {
        TrackSelection {
            video: Some(0),
            audio: Some(1),
        }
    }

    #[test]
    fn plays_a_playable_mp4_directly() {
        let method = choose_playback_method(
            &h264_aac(ContainerFormat::Mp4),
            &both_tracks(),
            &chromium(CanPlayAnswer::Probably),
            Some(&settings()),
        );
        assert_eq!(method, PlaybackMethod::Direct);
    }

    #[test]
    fn remuxes_a_matroska_file_by_copying_both_tracks() {
        let method = choose_playback_method(
            &h264_aac(ContainerFormat::Matroska),
            &both_tracks(),
            &chromium(CanPlayAnswer::No),
            Some(&settings()),
        );
        assert_eq!(
            method,
            PlaybackMethod::Convert(ConversionPlan {
                video: Some(VideoAction::Copy { index: 0 }),
                audio: Some(AudioAction::Copy { index: 1 }),
                reasons: vec![ConversionReason::ContainerUnsupported],
            })
        );
    }

    #[test]
    fn converts_an_mp4_when_the_client_rejects_its_codecs() {
        let method = choose_playback_method(
            &h264_aac(ContainerFormat::Mp4),
            &both_tracks(),
            &chromium(CanPlayAnswer::No),
            Some(&settings()),
        );
        assert!(
            matches!(&method, PlaybackMethod::Convert(conversion) if conversion.reasons == [ConversionReason::CodecUnsupported]),
            "{method:?}"
        );
    }

    #[test]
    fn converts_raw_mp3_because_it_seeks_inaccurately() {
        let container = container(
            ContainerFormat::Mp3,
            vec![track(0, TrackKind::Audio, "mp3", Some("mp4a.6B"))],
        );
        let selection = TrackSelection {
            video: None,
            audio: Some(0),
        };
        let method = choose_playback_method(
            &container,
            &selection,
            &chromium(CanPlayAnswer::Probably),
            Some(&settings()),
        );
        assert_eq!(
            method,
            PlaybackMethod::Convert(ConversionPlan {
                video: None,
                audio: Some(AudioAction::Copy { index: 0 }),
                reasons: vec![ConversionReason::InaccurateSeeking],
            })
        );
    }

    #[test]
    fn converts_for_a_non_default_track_choice() {
        let mut container = h264_aac(ContainerFormat::Mp4);
        container
            .tracks
            .push(track(2, TrackKind::Audio, "aac", Some("mp4a.40.2")));
        let selection = TrackSelection {
            video: Some(0),
            audio: Some(2),
        };
        let method = choose_playback_method(
            &container,
            &selection,
            &chromium(CanPlayAnswer::Probably),
            Some(&settings()),
        );
        assert!(
            matches!(&method, PlaybackMethod::Convert(conversion) if conversion.reasons == [ConversionReason::NonDefaultTracks]),
            "{method:?}"
        );
    }

    #[test]
    fn refuses_conversion_without_a_conversion_service() {
        let method = choose_playback_method(
            &h264_aac(ContainerFormat::Matroska),
            &both_tracks(),
            &chromium(CanPlayAnswer::No),
            None,
        );
        assert_eq!(
            method,
            PlaybackMethod::Unsupported {
                reason: UnsupportedReason::ConversionUnavailable
            }
        );
    }

    #[test]
    fn refuses_a_selection_naming_a_missing_track() {
        let selection = TrackSelection {
            video: Some(5),
            audio: Some(1),
        };
        let method = choose_playback_method(
            &h264_aac(ContainerFormat::Mp4),
            &selection,
            &chromium(CanPlayAnswer::Probably),
            Some(&settings()),
        );
        assert_eq!(
            method,
            PlaybackMethod::Unsupported {
                reason: UnsupportedReason::TrackNotFound
            }
        );
    }

    #[test]
    fn refuses_a_file_without_audio_or_video() {
        let container = container(
            ContainerFormat::Matroska,
            vec![track(0, TrackKind::Subtitle, "subrip", None)],
        );
        let method = choose_playback_method(
            &container,
            &TrackSelection::default(),
            &chromium(CanPlayAnswer::No),
            Some(&settings()),
        );
        assert_eq!(
            method,
            PlaybackMethod::Unsupported {
                reason: UnsupportedReason::NoTracks
            }
        );
    }
}
