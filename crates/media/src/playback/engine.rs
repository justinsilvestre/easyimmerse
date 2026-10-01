//! What each browser engine can do with each container when it plays the original file.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::container::ContainerFormat;

/// The browser engine that plays media, for example WebKit in Safari and in the macOS app.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum WebEngine {
    WebKit,
    Chromium,
    Gecko,
}

/// How well an engine handles a container when it plays the file directly.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ContainerSupport {
    pub plays: bool,
    /// Whether a seek lands on the exact requested time rather than an estimate.
    pub seeks_accurately: bool,
}

const UNPLAYABLE: ContainerSupport = ContainerSupport {
    plays: false,
    seeks_accurately: false,
};
const ACCURATE: ContainerSupport = ContainerSupport {
    plays: true,
    seeks_accurately: true,
};
const INACCURATE: ContainerSupport = ContainerSupport {
    plays: true,
    seeks_accurately: false,
};

/// Returns how the engine handles the container.
/// The table is deliberately conservative: when support is uncertain, it reports less, so the file is converted rather than played badly.
pub fn container_support(engine: WebEngine, format: ContainerFormat) -> ContainerSupport {
    use ContainerFormat::*;
    match (engine, format) {
        (_, Mp4 | Wav) => ACCURATE,
        (WebEngine::WebKit, Matroska | Ogg) => UNPLAYABLE,
        // Seeking in these formats either estimates a byte position from the bit rate or depends on an optional index.
        (_, Mp3 | Adts | Flac | Matroska | Ogg) => INACCURATE,
        (_, Avi) => UNPLAYABLE,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn seeks_mp4_accurately_on_webkit() {
        assert_eq!(
            container_support(WebEngine::WebKit, ContainerFormat::Mp4),
            ACCURATE
        );
    }

    #[test]
    fn does_not_play_matroska_on_webkit() {
        assert!(!container_support(WebEngine::WebKit, ContainerFormat::Matroska).plays);
    }

    #[test]
    fn seeks_raw_mp3_inaccurately() {
        assert!(!container_support(WebEngine::Chromium, ContainerFormat::Mp3).seeks_accurately);
    }

    #[test]
    fn seeks_adts_inaccurately() {
        assert!(!container_support(WebEngine::Gecko, ContainerFormat::Adts).seeks_accurately);
    }

    #[test]
    fn does_not_play_avi_anywhere() {
        assert!(!container_support(WebEngine::Chromium, ContainerFormat::Avi).plays);
    }

    #[test]
    fn serializes_webkit_in_lowercase() {
        assert_eq!(
            serde_json::to_string(&WebEngine::WebKit).expect("json"),
            "\"webkit\""
        );
    }
}
