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

/// The audio codec to transcode to when a track's own codec cannot be streamed.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum AudioTarget {
    /// AAC LC, a lossy codec.
    Aac,
    /// 16-bit FLAC, a lossless codec.
    Flac,
}

impl PlaybackEnvironment {
    /// Reports whether the browser accepts the codec string inside fragmented MP4.
    pub fn accepts_fmp4_codec(&self, codec_string: &str) -> bool {
        self.fmp4_codecs
            .iter()
            .any(|accepted| accepted == codec_string)
    }
}

impl AudioTarget {
    /// Returns the codec string that a browser checks for this target.
    pub fn codec_string(self) -> &'static str {
        match self {
            AudioTarget::Aac => "mp4a.40.2",
            AudioTarget::Flac => "fLaC",
        }
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

    #[test]
    fn spells_the_aac_target_as_aac_lc() {
        assert_eq!(AudioTarget::Aac.codec_string(), "mp4a.40.2");
    }

    #[test]
    fn spells_the_flac_target_as_webkit_accepts_it() {
        assert_eq!(AudioTarget::Flac.codec_string(), "fLaC");
    }
}
