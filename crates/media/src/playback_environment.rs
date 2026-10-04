//! What the client measured about its own media playback abilities.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// The browser engine behind the media element, decided from the user agent.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum PlaybackEngine {
    WebKit,
    Chromium,
    Gecko,
}

/// A media element's `canPlayType` answer. The empty string becomes `No`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum CanPlayAnswer {
    Probably,
    Maybe,
    No,
}

impl CanPlayAnswer {
    pub fn is_positive(self) -> bool {
        self != CanPlayAnswer::No
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct PlaybackEnvironment {
    pub engine: PlaybackEngine,
    /// The answer to `canPlayType` for the file's direct MIME type with codecs.
    pub can_play_type: CanPlayAnswer,
    /// The RFC 6381 codec strings that `MediaSource.isTypeSupported` accepts in fragmented MP4.
    pub mse_codec_strings: Vec<String>,
}

impl PlaybackEnvironment {
    pub fn accepts_in_mse(&self, codec_string: &str) -> bool {
        self.mse_codec_strings
            .iter()
            .any(|accepted| accepted == codec_string)
    }
}
