//! The cache key of a conversion: a hash over everything that determines its output.

use std::fmt;

use easyimmerse_media::{ConversionPlan, TrackSelection};
use serde::Serialize;
use sha2::{Digest, Sha256};

use crate::source_identity::SourceIdentity;

/// Bump this whenever the converted output changes for the same inputs, such as after a change
/// to the ffmpeg flags or to the segment plan, so that stale cache entries are never served.
pub const CONVERTER_VERSION: u32 = 1;

const KEY_LENGTH: usize = 64;

/// Sixty-four lowercase hexadecimal digits.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ConversionKey(String);

impl ConversionKey {
    /// Accepts only the exact spelling a key is generated with, so that a key taken from a
    /// request can name a cache directory safely.
    pub fn parse(text: &str) -> Option<Self> {
        let well_formed = text.len() == KEY_LENGTH
            && text
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte));
        well_formed.then(|| Self(text.to_owned()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for ConversionKey {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}

#[derive(Serialize)]
struct KeyInputs<'a> {
    converter_version: u32,
    source: &'a SourceIdentity,
    selection: &'a TrackSelection,
    /// Carries the per-track actions, including the encoder, bit rate and audio target.
    plan: &'a ConversionPlan,
}

pub fn conversion_key(
    source: &SourceIdentity,
    selection: &TrackSelection,
    plan: &ConversionPlan,
) -> ConversionKey {
    let inputs = KeyInputs {
        converter_version: CONVERTER_VERSION,
        source,
        selection,
        plan,
    };
    let json = serde_json::to_vec(&inputs).unwrap_or_default();
    ConversionKey(hex::encode(Sha256::digest(json)))
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use easyimmerse_media::{AudioAction, AudioTarget, ConversionReason, VideoAction};

    use super::*;

    fn source() -> SourceIdentity {
        SourceIdentity {
            path: PathBuf::from("/videos/a.mkv"),
            size: 1000,
            modified_ms: 2000,
        }
    }

    fn plan(target: AudioTarget) -> ConversionPlan {
        ConversionPlan {
            video: Some(VideoAction::Copy { index: 0 }),
            audio: Some(AudioAction::Transcode { index: 1, target }),
            reasons: vec![ConversionReason::ContainerUnsupported],
        }
    }

    fn key(source: &SourceIdentity, target: AudioTarget) -> ConversionKey {
        conversion_key(source, &TrackSelection::default(), &plan(target))
    }

    #[test]
    fn produces_sixty_four_hex_digits() {
        assert!(ConversionKey::parse(key(&source(), AudioTarget::Aac).as_str()).is_some());
    }

    #[test]
    fn is_stable_for_the_same_inputs() {
        assert_eq!(
            key(&source(), AudioTarget::Aac),
            key(&source(), AudioTarget::Aac)
        );
    }

    #[test]
    fn changes_with_the_audio_target() {
        assert_ne!(
            key(&source(), AudioTarget::Aac),
            key(&source(), AudioTarget::Flac)
        );
    }

    #[test]
    fn changes_with_the_source_modification_time() {
        let touched = SourceIdentity {
            modified_ms: 3000,
            ..source()
        };
        assert_ne!(
            key(&source(), AudioTarget::Aac),
            key(&touched, AudioTarget::Aac)
        );
    }

    #[test]
    fn rejects_a_key_with_upper_case_or_path_characters() {
        let parsed = ["ABCDEF", "../etc", ""]
            .map(|text| ConversionKey::parse(&format!("{text:0<64}")).is_some());
        assert_eq!(parsed, [false, false, true]);
    }
}
