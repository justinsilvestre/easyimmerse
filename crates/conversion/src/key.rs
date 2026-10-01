//! The key that names a cached conversion, derived from everything that determines its output.

use std::fmt;
use std::path::Path;

use easyimmerse_media::playback::{ConversionPlan, TrackAction, TrackConversion};
use serde::Serialize;
use sha2::{Digest, Sha256};
use thiserror::Error;

/// The version of the conversion output. Raising it gives every conversion a new key, so outdated cache entries are never served.
pub const CONVERTER_VERSION: u32 = 1;

const KEY_LENGTH: usize = 64;

/// A conversion's name in the cache: a lowercase hexadecimal SHA-256 digest.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ConversionKey(String);

/// The facts about a source file that change when the file is replaced or edited.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SourceIdentity<'a> {
    pub path: &'a Path,
    pub size: u64,
    pub modified_ms: u64,
}

#[derive(Debug, Error)]
pub enum KeyError {
    #[error("the conversion key input could not be encoded: {0}")]
    Encoding(#[from] serde_json::Error),
}

impl ConversionKey {
    /// Accepts only a well-formed key, so a key taken from a request can be used safely in a file path.
    pub fn parse(text: &str) -> Option<Self> {
        let is_well_formed = text.len() == KEY_LENGTH
            && text
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte));
        is_well_formed.then(|| ConversionKey(text.to_owned()))
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

/// Derives the key of converting the source with the plan.
/// The reasons recorded in the plan do not affect the output, so they do not affect the key.
pub fn derive_key(
    source: &SourceIdentity,
    plan: &ConversionPlan,
) -> Result<ConversionKey, KeyError> {
    let input = KeyInput {
        converter_version: CONVERTER_VERSION,
        source_path: source.path.to_string_lossy().into_owned(),
        source_size: source.size,
        source_modified_ms: source.modified_ms,
        video: plan.video.as_ref().map(TrackOutput::from),
        audio: plan.audio.as_ref().map(TrackOutput::from),
    };
    let digest = Sha256::digest(serde_json::to_vec(&input)?);
    Ok(ConversionKey(hex::encode(digest)))
}

#[derive(Serialize)]
struct KeyInput {
    converter_version: u32,
    source_path: String,
    source_size: u64,
    source_modified_ms: u64,
    video: Option<TrackOutput>,
    audio: Option<TrackOutput>,
}

#[derive(Serialize)]
struct TrackOutput {
    track_id: u32,
    action: TrackAction,
}

impl From<&TrackConversion> for TrackOutput {
    fn from(track: &TrackConversion) -> Self {
        TrackOutput {
            track_id: track.track_id,
            action: track.action,
        }
    }
}

#[cfg(test)]
mod tests {
    use easyimmerse_media::playback::ConversionReason;

    use super::*;

    fn plan(audio_track_id: u32, reasons: Vec<ConversionReason>) -> ConversionPlan {
        ConversionPlan {
            video: None,
            audio: Some(TrackConversion {
                track_id: audio_track_id,
                action: TrackAction::Copy,
                reasons,
            }),
        }
    }

    fn key(modified_ms: u64, plan: &ConversionPlan) -> ConversionKey {
        let source = SourceIdentity {
            path: Path::new("/media/episode.mkv"),
            size: 1000,
            modified_ms,
        };
        derive_key(&source, plan).expect("the key input encodes")
    }

    #[test]
    fn derives_a_64_character_hexadecimal_key() {
        let derived = key(5, &plan(1, Vec::new()));
        assert_eq!(ConversionKey::parse(derived.as_str()), Some(derived));
    }

    #[test]
    fn derives_the_same_key_for_the_same_input() {
        assert_eq!(key(5, &plan(1, Vec::new())), key(5, &plan(1, Vec::new())));
    }

    #[test]
    fn derives_a_new_key_when_the_source_is_modified() {
        assert_ne!(key(5, &plan(1, Vec::new())), key(6, &plan(1, Vec::new())));
    }

    #[test]
    fn derives_a_new_key_for_another_track() {
        assert_ne!(key(5, &plan(1, Vec::new())), key(5, &plan(2, Vec::new())));
    }

    #[test]
    fn ignores_the_reasons_for_converting() {
        let reasons = vec![ConversionReason::CodecUnsupported];
        assert_eq!(key(5, &plan(1, Vec::new())), key(5, &plan(1, reasons)));
    }

    #[test]
    fn rejects_a_key_with_path_characters() {
        let text = format!("../{}", "a".repeat(KEY_LENGTH - 3));
        assert_eq!(ConversionKey::parse(&text), None);
    }

    #[test]
    fn rejects_uppercase_hexadecimal() {
        assert_eq!(ConversionKey::parse(&"A".repeat(KEY_LENGTH)), None);
    }
}
