//! Codec strings as defined by RFC 6381, spelled the way Media Source Extensions accept them.
//! A browser checks these strings to decide whether it can play a track inside fragmented MP4.

use crate::codec_string_avc::avc_codec_string_for_profile;
use crate::codec_string_hevc::hevc_codec_string;

/// Returns the codec string for a track that ffprobe describes by codec name, profile name, and level.
/// Returns `None` when the codec cannot be stored in fragmented MP4 or the details do not identify it.
pub fn codec_string(codec: &str, profile: Option<&str>, level: Option<u32>) -> Option<String> {
    match codec {
        "h264" => avc_codec_string_for_profile(profile?, level?),
        "hevc" => hevc_codec_string(profile?, level?),
        "aac" => aac_object_type(profile?).map(aac_codec_string),
        _ => fixed_codec_string(codec).map(str::to_owned),
    }
}

/// Returns the codec string for AAC audio with the given MPEG-4 audio object type, for example 2 for AAC LC.
pub fn aac_codec_string(object_type: u8) -> String {
    format!("mp4a.40.{object_type}")
}

/// Returns the codec string for codecs that have only one, keyed by ffprobe's codec name.
fn fixed_codec_string(codec: &str) -> Option<&'static str> {
    match codec {
        "mp3" => Some("mp4a.6B"),
        "flac" => Some("fLaC"),
        "opus" => Some("Opus"),
        "ac3" => Some("ac-3"),
        "eac3" => Some("ec-3"),
        _ => None,
    }
}

/// Maps ffprobe's AAC profile names to MPEG-4 audio object types.
fn aac_object_type(profile: &str) -> Option<u8> {
    match profile {
        "Main" => Some(1),
        "LC" => Some(2),
        "LTP" => Some(4),
        "HE-AAC" => Some(5),
        "LD" => Some(23),
        "HE-AACv2" => Some(29),
        "ELD" => Some(39),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn describes_high_profile_h264_with_its_level_in_hex() {
        assert_eq!(
            codec_string("h264", Some("High"), Some(31)).as_deref(),
            Some("avc1.64001F")
        );
    }

    #[test]
    fn needs_a_level_for_h264() {
        assert_eq!(codec_string("h264", Some("High"), None), None);
    }

    #[test]
    fn describes_main_profile_hevc() {
        assert_eq!(
            codec_string("hevc", Some("Main"), Some(93)).as_deref(),
            Some("hvc1.1.6.L93.B0")
        );
    }

    #[test]
    fn describes_aac_lc() {
        assert_eq!(
            codec_string("aac", Some("LC"), None).as_deref(),
            Some("mp4a.40.2")
        );
    }

    #[test]
    fn describes_he_aac() {
        assert_eq!(
            codec_string("aac", Some("HE-AAC"), None).as_deref(),
            Some("mp4a.40.5")
        );
    }

    #[test]
    fn describes_he_aac_v2() {
        assert_eq!(
            codec_string("aac", Some("HE-AACv2"), None).as_deref(),
            Some("mp4a.40.29")
        );
    }

    #[test]
    fn needs_a_profile_for_aac() {
        assert_eq!(codec_string("aac", None, None), None);
    }

    #[test]
    fn describes_mp3_by_its_mpeg_1_object_type() {
        assert_eq!(codec_string("mp3", None, None).as_deref(), Some("mp4a.6B"));
    }

    #[test]
    fn spells_flac_as_webkit_accepts_it() {
        assert_eq!(codec_string("flac", None, None).as_deref(), Some("fLaC"));
    }

    #[test]
    fn spells_opus_as_webkit_accepts_it() {
        assert_eq!(codec_string("opus", None, None).as_deref(), Some("Opus"));
    }

    #[test]
    fn describes_ac3() {
        assert_eq!(codec_string("ac3", None, None).as_deref(), Some("ac-3"));
    }

    #[test]
    fn describes_eac3() {
        assert_eq!(codec_string("eac3", None, None).as_deref(), Some("ec-3"));
    }

    #[test]
    fn has_none_for_vorbis() {
        assert_eq!(codec_string("vorbis", None, None), None);
    }

    #[test]
    fn has_none_for_ass_subtitles() {
        assert_eq!(codec_string("ass", None, None), None);
    }

    #[test]
    fn has_none_for_subrip_subtitles() {
        assert_eq!(codec_string("subrip", None, None), None);
    }
}
