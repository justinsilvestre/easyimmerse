//! RFC 6381 codec strings in the spelling Media Source Extensions accept.

use crate::avc_codec::{avc_codec_string, avc_profile_parameters};
use crate::hevc_codec::hevc_codec_string;

/// The codec string for the AAC profile named by its MPEG-4 audio object type.
pub fn aac_codec_string(audio_object_type: u8) -> String {
    format!("mp4a.40.{audio_object_type}")
}

/// Maps ffmpeg's names for a codec and its profile to the codec string, or `None` when the codec
/// cannot be carried in fragmented MP4 (Vorbis, PCM, subtitles, and so on).
/// H.264 and HEVC strings need the level; without it they are `None` too.
pub fn rfc6381_codec_string(
    codec: &str,
    profile: Option<&str>,
    level: Option<i64>,
) -> Option<String> {
    match codec {
        "h264" => {
            let (profile_idc, constraint_flags) = avc_profile_parameters(profile?)?;
            Some(avc_codec_string(
                profile_idc,
                constraint_flags,
                u8::try_from(level?).ok()?,
            ))
        }
        "hevc" => hevc_codec_string(profile?, u16::try_from(level?).ok()?),
        "aac" => Some(aac_codec_string(aac_audio_object_type(profile))),
        "mp3" => Some("mp4a.6B".to_owned()),
        "flac" => Some("fLaC".to_owned()),
        "opus" => Some("Opus".to_owned()),
        "ac3" => Some("ac-3".to_owned()),
        "eac3" => Some("ec-3".to_owned()),
        _ => None,
    }
}

/// ffprobe names AAC profiles `LC`, `HE-AAC`, `HE-AACv2`, `Main`, `SSR`, and `LTP`.
/// An unknown or missing profile is taken as the common low-complexity profile.
fn aac_audio_object_type(profile: Option<&str>) -> u8 {
    match profile {
        Some("Main") => 1,
        Some("SSR") => 3,
        Some("LTP") => 4,
        Some("HE-AAC") => 5,
        Some("HE-AACv2") => 29,
        _ => 2,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn codec_string(codec: &str, profile: Option<&str>, level: Option<i64>) -> Option<String> {
        rfc6381_codec_string(codec, profile, level)
    }

    #[test]
    fn spells_high_profile_level_5_1() {
        assert_eq!(
            codec_string("h264", Some("High"), Some(51)).as_deref(),
            Some("avc1.640033")
        );
    }

    #[test]
    fn spells_high_10_with_its_profile_byte() {
        assert_eq!(
            codec_string("h264", Some("High 10"), Some(40)).as_deref(),
            Some("avc1.6E0028")
        );
    }

    #[test]
    fn spells_constrained_baseline_with_its_constraint_flags() {
        assert_eq!(
            codec_string("h264", Some("Constrained Baseline"), Some(30)).as_deref(),
            Some("avc1.42E01E")
        );
    }

    #[test]
    fn gives_no_string_for_h264_without_a_level() {
        assert_eq!(codec_string("h264", Some("High"), None), None);
    }

    #[test]
    fn spells_hevc_main_10_level_4() {
        assert_eq!(
            codec_string("hevc", Some("Main 10"), Some(120)).as_deref(),
            Some("hvc1.2.4.L120.B0")
        );
    }

    #[test]
    fn spells_aac_lc() {
        assert_eq!(
            codec_string("aac", Some("LC"), None).as_deref(),
            Some("mp4a.40.2")
        );
    }

    #[test]
    fn spells_he_aac() {
        assert_eq!(
            codec_string("aac", Some("HE-AAC"), None).as_deref(),
            Some("mp4a.40.5")
        );
    }

    #[test]
    fn spells_he_aac_v2() {
        assert_eq!(
            codec_string("aac", Some("HE-AACv2"), None).as_deref(),
            Some("mp4a.40.29")
        );
    }

    #[test]
    fn spells_mp3_with_an_uppercase_object_type() {
        assert_eq!(codec_string("mp3", None, None).as_deref(), Some("mp4a.6B"));
    }

    #[test]
    fn spells_flac_with_mixed_case() {
        assert_eq!(codec_string("flac", None, None).as_deref(), Some("fLaC"));
    }

    #[test]
    fn spells_opus_capitalized() {
        assert_eq!(codec_string("opus", None, None).as_deref(), Some("Opus"));
    }

    #[test]
    fn spells_dolby_digital_and_plus() {
        let strings = [
            codec_string("ac3", None, None),
            codec_string("eac3", None, None),
        ];
        assert_eq!(strings, [Some("ac-3".to_owned()), Some("ec-3".to_owned())]);
    }

    #[test]
    fn gives_no_string_for_vorbis() {
        assert_eq!(codec_string("vorbis", None, None), None);
    }

    #[test]
    fn gives_no_string_for_subtitles() {
        assert_eq!(codec_string("ass", None, None), None);
    }
}
