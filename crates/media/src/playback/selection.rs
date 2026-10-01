//! The choice of which video and audio track to play.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::container::ContainerInfo;
use crate::track_info::{TrackInfo, TrackKind};

/// The ids of the tracks to play. A kind without an id is left out.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct TrackSelection {
    pub video: Option<u32>,
    pub audio: Option<u32>,
}

/// Selects, for video and for audio, the track the container marks as default, or else the first track of that kind.
pub fn default_selection(container: &ContainerInfo) -> TrackSelection {
    TrackSelection {
        video: default_track_id(&container.tracks, TrackKind::Video),
        audio: default_track_id(&container.tracks, TrackKind::Audio),
    }
}

fn default_track_id(tracks: &[TrackInfo], kind: TrackKind) -> Option<u32> {
    let mut of_kind = tracks.iter().filter(|track| track.kind == kind);
    let first = of_kind.clone().next()?;
    Some(of_kind.find(|track| track.is_default).unwrap_or(first).id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::container::ContainerFormat;

    fn container_with(tracks: Vec<TrackInfo>) -> ContainerInfo {
        ContainerInfo {
            format: ContainerFormat::Matroska,
            duration_ms: None,
            tracks,
        }
    }

    fn track(id: u32, kind: TrackKind, is_default: bool) -> TrackInfo {
        TrackInfo {
            is_default,
            ..TrackInfo::new(id, kind, "codec".to_owned())
        }
    }

    #[test]
    fn selects_the_default_flagged_audio_track() {
        let container = container_with(vec![
            track(1, TrackKind::Audio, false),
            track(2, TrackKind::Audio, true),
        ]);
        assert_eq!(default_selection(&container).audio, Some(2));
    }

    #[test]
    fn selects_the_first_video_track_when_none_is_flagged() {
        let container = container_with(vec![
            track(1, TrackKind::Subtitle, true),
            track(2, TrackKind::Video, false),
            track(3, TrackKind::Video, false),
        ]);
        assert_eq!(default_selection(&container).video, Some(2));
    }

    #[test]
    fn selects_no_video_for_an_audio_only_file() {
        let container = container_with(vec![track(1, TrackKind::Audio, false)]);
        assert_eq!(default_selection(&container).video, None);
    }
}
