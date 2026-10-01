//! Decides between direct playback and a converted stream.

use super::engine::container_support;
use super::environment::{AudioTarget, PlaybackEnvironment};
use super::plan::{ConversionReason, PlaybackPlan, UnsupportedReason};
use super::selection::{TrackSelection, default_selection};
use super::track_planner::TrackPlanner;
use crate::container::ContainerInfo;

/// Plans how the browser described by the environment will play the selected tracks.
/// Audio whose codec the browser cannot stream is transcoded to the target; video is only ever copied.
pub fn plan_playback(
    container: &ContainerInfo,
    selection: &TrackSelection,
    environment: &PlaybackEnvironment,
    target: AudioTarget,
) -> PlaybackPlan {
    if selection.video.is_none() && selection.audio.is_none() {
        return unsupported(UnsupportedReason::NoTracksSelected);
    }
    let reasons = direct_play_obstacles(container, selection, environment);
    if reasons.is_empty() {
        return PlaybackPlan::Direct;
    }
    let planner = TrackPlanner {
        container,
        environment,
        target,
        reasons,
    };
    planner
        .plan(selection)
        .map_or_else(unsupported, PlaybackPlan::Convert)
}

/// Lists what prevents the browser from playing the selected tracks from the original file.
fn direct_play_obstacles(
    container: &ContainerInfo,
    selection: &TrackSelection,
    environment: &PlaybackEnvironment,
) -> Vec<ConversionReason> {
    let support = container_support(environment.engine, container.format);
    let plays = support.plays && environment.direct_play;
    let mut reasons = Vec::new();
    if !plays {
        reasons.push(ConversionReason::ContainerUnsupported);
    } else if !support.seeks_accurately {
        reasons.push(ConversionReason::InaccurateSeeking);
    }
    if *selection != default_selection(container) {
        reasons.push(ConversionReason::NonDefaultTracks);
    }
    reasons
}

fn unsupported(reason: UnsupportedReason) -> PlaybackPlan {
    PlaybackPlan::Unsupported { reason }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::container::ContainerFormat;
    use crate::playback::plan::{ConversionPlan, TrackAction, TrackConversion};
    use crate::playback::test_containers::*;
    use crate::track_info::TrackKind;

    fn plan_default(container: &ContainerInfo, environment: &PlaybackEnvironment) -> PlaybackPlan {
        plan_playback(
            container,
            &default_selection(container),
            environment,
            AudioTarget::Aac,
        )
    }

    fn conversion(plan: PlaybackPlan) -> ConversionPlan {
        match plan {
            PlaybackPlan::Convert(conversion) => conversion,
            other => panic!("expected a conversion, got {other:?}"),
        }
    }

    fn mp4_h264_aac() -> ContainerInfo {
        container(
            ContainerFormat::Mp4,
            vec![
                track(1, TrackKind::Video, H264),
                track(2, TrackKind::Audio, AAC),
            ],
        )
    }

    #[test]
    fn plays_h264_and_aac_in_mp4_directly_on_webkit() {
        let plan = plan_default(&mp4_h264_aac(), &webkit(true, WEBKIT_FMP4_CODECS));
        assert_eq!(plan, PlaybackPlan::Direct);
    }

    #[test]
    fn copies_h264_video_out_of_matroska_on_webkit() {
        let plan = plan_default(&frieren_mkv(), &webkit(false, WEBKIT_FMP4_CODECS));
        assert_eq!(
            conversion(plan).video,
            Some(TrackConversion {
                track_id: 0,
                action: TrackAction::Copy,
                reasons: vec![ConversionReason::ContainerUnsupported],
            })
        );
    }

    #[test]
    fn transcodes_mp3_audio_out_of_matroska_to_aac_on_webkit() {
        let plan = plan_default(&frieren_mkv(), &webkit(false, WEBKIT_FMP4_CODECS));
        assert_eq!(
            conversion(plan).audio,
            Some(TrackConversion {
                track_id: 1,
                action: TrackAction::Transcode {
                    target: AudioTarget::Aac
                },
                reasons: vec![
                    ConversionReason::ContainerUnsupported,
                    ConversionReason::CodecUnsupported
                ],
            })
        );
    }

    #[test]
    fn converts_matroska_on_webkit_even_when_the_browser_claims_to_play_it() {
        let plan = plan_default(&frieren_mkv(), &webkit(true, WEBKIT_FMP4_CODECS));
        assert_eq!(
            conversion(plan).video.map(|video| video.reasons),
            Some(vec![ConversionReason::ContainerUnsupported])
        );
    }

    #[test]
    fn copies_aac_audio_out_of_matroska() {
        let mkv = container(
            ContainerFormat::Matroska,
            vec![
                track(0, TrackKind::Video, H264),
                track(1, TrackKind::Audio, AAC),
            ],
        );
        let plan = plan_default(&mkv, &webkit(false, WEBKIT_FMP4_CODECS));
        assert_eq!(
            conversion(plan).audio.map(|audio| audio.action),
            Some(TrackAction::Copy)
        );
    }

    #[test]
    fn converts_a_directly_playable_file_for_a_non_default_selection() {
        let selection = TrackSelection {
            video: None,
            audio: Some(2),
        };
        let plan = plan_playback(
            &mp4_h264_aac(),
            &selection,
            &webkit(true, WEBKIT_FMP4_CODECS),
            AudioTarget::Aac,
        );
        assert_eq!(
            conversion(plan).audio.map(|audio| audio.reasons),
            Some(vec![ConversionReason::NonDefaultTracks])
        );
    }

    #[test]
    fn rejects_hevc_video_that_the_browser_cannot_stream() {
        let mkv = container(
            ContainerFormat::Matroska,
            vec![
                track(0, TrackKind::Video, HEVC),
                track(1, TrackKind::Audio, AAC),
            ],
        );
        let plan = plan_default(&mkv, &webkit(false, WEBKIT_FMP4_CODECS));
        assert_eq!(
            plan,
            PlaybackPlan::Unsupported {
                reason: UnsupportedReason::VideoCodecUnsupported
            }
        );
    }

    #[test]
    fn transcodes_raw_mp3_because_it_seeks_inaccurately() {
        let mp3 = container(ContainerFormat::Mp3, vec![track(0, TrackKind::Audio, MP3)]);
        let plan = plan_default(&mp3, &webkit(true, WEBKIT_FMP4_CODECS));
        assert_eq!(
            conversion(plan).audio,
            Some(TrackConversion {
                track_id: 0,
                action: TrackAction::Transcode {
                    target: AudioTarget::Aac
                },
                reasons: vec![
                    ConversionReason::InaccurateSeeking,
                    ConversionReason::CodecUnsupported
                ],
            })
        );
    }

    #[test]
    fn rejects_audio_when_neither_its_codec_nor_the_target_can_be_streamed() {
        let plan = plan_default(&frieren_mkv(), &webkit(false, &[H264]));
        assert_eq!(
            plan,
            PlaybackPlan::Unsupported {
                reason: UnsupportedReason::AudioCodecUnsupported
            }
        );
    }

    #[test]
    fn rejects_a_selection_without_tracks() {
        let plan = plan_playback(
            &mp4_h264_aac(),
            &TrackSelection::default(),
            &webkit(true, WEBKIT_FMP4_CODECS),
            AudioTarget::Aac,
        );
        assert_eq!(
            plan,
            PlaybackPlan::Unsupported {
                reason: UnsupportedReason::NoTracksSelected
            }
        );
    }

    #[test]
    fn rejects_a_selected_id_that_names_a_track_of_another_kind() {
        let selection = TrackSelection {
            video: Some(2),
            audio: None,
        };
        let plan = plan_playback(
            &mp4_h264_aac(),
            &selection,
            &webkit(true, WEBKIT_FMP4_CODECS),
            AudioTarget::Aac,
        );
        assert_eq!(
            plan,
            PlaybackPlan::Unsupported {
                reason: UnsupportedReason::TrackNotFound
            }
        );
    }

    #[test]
    fn serializes_the_frieren_plan_as_a_tagged_union() {
        let plan = plan_default(&frieren_mkv(), &webkit(false, WEBKIT_FMP4_CODECS));
        assert_eq!(
            serde_json::to_value(plan).expect("json"),
            serde_json::json!({
                "kind": "convert",
                "video": {"track_id": 0, "action": {"kind": "copy"}, "reasons": ["container_unsupported"]},
                "audio": {
                    "track_id": 1,
                    "action": {"kind": "transcode", "target": "aac"},
                    "reasons": ["container_unsupported", "codec_unsupported"]
                }
            })
        );
    }
}
