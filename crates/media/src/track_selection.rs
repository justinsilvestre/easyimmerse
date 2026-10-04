//! The choice of one video and one audio track, by stream index.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::container::{ContainerInfo, TrackKind};

#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Hash, Default, Serialize, Deserialize, TS, ToSchema,
)]
#[ts(export)]
pub struct TrackSelection {
    pub video: Option<u32>,
    pub audio: Option<u32>,
}

/// Selects the default-flagged track of each kind, or the first track of that kind.
pub fn default_track_selection(container: &ContainerInfo) -> TrackSelection {
    TrackSelection {
        video: default_track_index(container, TrackKind::Video),
        audio: default_track_index(container, TrackKind::Audio),
    }
}

fn default_track_index(container: &ContainerInfo, kind: TrackKind) -> Option<u32> {
    let mut tracks = container.tracks_of_kind(kind).peekable();
    let first = tracks.peek().map(|track| track.index);
    tracks
        .find(|track| track.is_default)
        .map(|track| track.index)
        .or(first)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::container::{ContainerFormat, TrackInfo};

    fn container(tracks: Vec<TrackInfo>) -> ContainerInfo {
        ContainerInfo {
            format: ContainerFormat::Matroska,
            duration_ms: None,
            start_ms: None,
            bit_rate: None,
            tracks,
        }
    }

    fn track(index: u32, kind: TrackKind, is_default: bool) -> TrackInfo {
        TrackInfo {
            index,
            kind,
            is_default,
            ..TrackInfo::default()
        }
    }

    #[test]
    fn prefers_the_default_flagged_track() {
        let container = container(vec![
            track(0, TrackKind::Video, true),
            track(1, TrackKind::Audio, false),
            track(2, TrackKind::Audio, true),
        ]);
        assert_eq!(default_track_selection(&container).audio, Some(2));
    }

    #[test]
    fn falls_back_to_the_first_track_of_the_kind() {
        let container = container(vec![
            track(0, TrackKind::Audio, false),
            track(1, TrackKind::Audio, false),
        ]);
        assert_eq!(default_track_selection(&container).audio, Some(0));
    }

    #[test]
    fn selects_no_video_for_an_audio_file() {
        let container = container(vec![track(0, TrackKind::Audio, true)]);
        assert_eq!(default_track_selection(&container).video, None);
    }
}
