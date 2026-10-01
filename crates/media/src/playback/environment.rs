//! What the client reports about the browser that will play a file.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use super::engine::WebEngine;

/// The playback abilities that a client measures in its browser and sends to the server.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct PlaybackEnvironment {
    pub engine: WebEngine,
    /// Whether the browser says it can play the original file's MIME type and codecs.
    pub direct_play: bool,
    /// The codec strings that the browser accepts inside fragmented MP4 streamed through Media Source Extensions, for example `avc1.64001F`.
    pub fmp4_codecs: Vec<String>,
}

impl PlaybackEnvironment {
    /// Reports whether the browser accepts the codec string inside fragmented MP4.
    pub fn accepts_fmp4_codec(&self, codec_string: &str) -> bool {
        self.fmp4_codecs
            .iter()
            .any(|accepted| accepted == codec_string)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn environment_accepting(codec_strings: &[&str]) -> PlaybackEnvironment {
        PlaybackEnvironment {
            engine: WebEngine::WebKit,
            direct_play: false,
            fmp4_codecs: codec_strings
                .iter()
                .map(|codec| codec.to_string())
                .collect(),
        }
    }

    #[test]
    fn accepts_a_listed_codec_string() {
        assert!(environment_accepting(&["mp4a.40.2"]).accepts_fmp4_codec("mp4a.40.2"));
    }

    #[test]
    fn matches_codec_strings_case_sensitively() {
        assert!(!environment_accepting(&["fLaC"]).accepts_fmp4_codec("flac"));
    }
}
