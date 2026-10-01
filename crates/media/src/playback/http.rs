//! The bodies that the playback routes send and receive.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use super::direct_type::direct_type;
use super::environment::PlaybackEnvironment;
use super::plan::PlaybackPlan;
use super::selection::{TrackSelection, default_selection};
use crate::container::ContainerInfo;

/// A media file's tracks, with what a client needs to measure whether its browser can play the file.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct MediaTracks {
    pub container: ContainerInfo,
    /// The tracks that play when the client makes no choice.
    pub selection: TrackSelection,
    /// The MIME type of the original file with the selected tracks' codecs, which the client passes to `canPlayType`.
    pub direct_type: String,
}

/// What a client sends to ask how its browser will play a media file.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct PlaybackRequest {
    pub environment: PlaybackEnvironment,
}

/// The server's plan for playing a media file, with the playlist to stream when the plan converts.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct PlaybackResponse {
    pub plan: PlaybackPlan,
    /// The server path of the converted stream's HLS playlist, for example `/conversions/<key>/index.m3u8`.
    /// Present only when the plan converts.
    pub playlist_path: Option<String>,
}

impl MediaTracks {
    /// Describes the container with its default track selection.
    pub fn new(container: ContainerInfo) -> Self {
        let selection = default_selection(&container);
        let direct_type = direct_type(&container, &selection);
        MediaTracks {
            container,
            selection,
            direct_type,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::playback::test_containers::frieren_mkv;

    #[test]
    fn gives_the_direct_type_of_the_default_tracks() {
        assert_eq!(
            MediaTracks::new(frieren_mkv()).direct_type,
            "video/x-matroska; codecs=\"avc1.64001F, mp4a.6B\""
        );
    }

    #[test]
    fn serializes_a_direct_response_without_a_playlist() {
        let response = PlaybackResponse {
            plan: PlaybackPlan::Direct,
            playlist_path: None,
        };
        assert_eq!(
            serde_json::to_string(&response).expect("json"),
            r#"{"plan":{"kind":"direct"},"playlist_path":null}"#
        );
    }
}
