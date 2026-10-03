//! Mapping of Matroska codec identifiers and private data to ffmpeg's names and codec strings.

use crate::avc_codec::{avc_codec_string, avc_profile_name};
use crate::codec_string::rfc6381_codec_string;
use crate::hevc_codec::hevc_codec_string;

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct MkvCodec {
    pub name: String,
    pub profile: Option<String>,
    pub level: Option<i64>,
    pub codec_string: Option<String>,
}

pub(crate) fn describe_mkv_codec(codec_id: &str, codec_private: Option<&[u8]>) -> MkvCodec {
    match codec_id {
        "V_MPEG4/ISO/AVC" => describe_avc(codec_private.unwrap_or_default()),
        "V_MPEGH/ISO/HEVC" => describe_hevc(codec_private.unwrap_or_default()),
        "A_AAC" => describe_aac(codec_private.unwrap_or_default()),
        other => simple_codec(ffmpeg_codec_name(other)),
    }
}

fn simple_codec(name: &str) -> MkvCodec {
    MkvCodec {
        name: name.to_owned(),
        profile: None,
        level: None,
        codec_string: rfc6381_codec_string(name, None, None),
    }
}

/// The `avcC` record starts with a version byte, then the profile, constraint flags, and level.
fn describe_avc(avcc: &[u8]) -> MkvCodec {
    let Some(&[profile_idc, constraint_flags, level_idc]) = avcc.get(1..4) else {
        return simple_codec("h264");
    };
    MkvCodec {
        name: "h264".to_owned(),
        profile: avc_profile_name(profile_idc, constraint_flags).map(str::to_owned),
        level: Some(i64::from(level_idc)),
        codec_string: Some(avc_codec_string(profile_idc, constraint_flags, level_idc)),
    }
}

/// The `hvcC` record carries the profile indication in the low five bits of its second byte
/// and the level indication in its thirteenth byte.
fn describe_hevc(hvcc: &[u8]) -> MkvCodec {
    let (Some(profile_byte), Some(&level_idc)) = (hvcc.get(1), hvcc.get(12)) else {
        return simple_codec("hevc");
    };
    let profile = match profile_byte & 0x1F {
        1 => Some("Main"),
        2 => Some("Main 10"),
        3 => Some("Main Still Picture"),
        4 => Some("Rext"),
        _ => None,
    };
    MkvCodec {
        name: "hevc".to_owned(),
        profile: profile.map(str::to_owned),
        level: Some(i64::from(level_idc)),
        codec_string: profile.and_then(|profile| hevc_codec_string(profile, u16::from(level_idc))),
    }
}

/// The AudioSpecificConfig starts with the five-bit audio object type.
fn describe_aac(config: &[u8]) -> MkvCodec {
    let object_type = config.first().map_or(2, |first| first >> 3);
    let profile = match object_type {
        1 => "Main",
        3 => "SSR",
        4 => "LTP",
        5 => "HE-AAC",
        29 => "HE-AACv2",
        _ => "LC",
    };
    MkvCodec {
        name: "aac".to_owned(),
        profile: Some(profile.to_owned()),
        level: None,
        codec_string: rfc6381_codec_string("aac", Some(profile), None),
    }
}

fn ffmpeg_codec_name(codec_id: &str) -> &str {
    match codec_id {
        "V_MPEG4/ISO/ASP" | "V_MPEG4/ISO/SP" | "V_MPEG4/ISO/AP" => "mpeg4",
        "V_VP8" => "vp8",
        "V_VP9" => "vp9",
        "V_AV1" => "av1",
        "V_MPEG2" => "mpeg2video",
        "A_MPEG/L3" => "mp3",
        "A_MPEG/L2" => "mp2",
        "A_FLAC" => "flac",
        "A_OPUS" => "opus",
        "A_VORBIS" => "vorbis",
        "A_AC3" => "ac3",
        "A_EAC3" => "eac3",
        "A_DTS" => "dts",
        "A_TRUEHD" => "truehd",
        "S_TEXT/UTF8" => "subrip",
        "S_TEXT/ASS" | "S_TEXT/SSA" => "ass",
        "S_TEXT/WEBVTT" => "webvtt",
        "S_HDMV/PGS" => "hdmv_pgs_subtitle",
        "S_VOBSUB" => "dvd_subtitle",
        other if other.starts_with("A_PCM/INT/LIT") => "pcm_s16le",
        other => other,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_the_avc_profile_and_level_from_the_private_data() {
        let codec = describe_mkv_codec("V_MPEG4/ISO/AVC", Some(&[1, 77, 0x40, 31, 0xFF]));
        assert_eq!(
            (
                codec.profile.as_deref(),
                codec.level,
                codec.codec_string.as_deref()
            ),
            (Some("Main"), Some(31), Some("avc1.4D401F"))
        );
    }

    #[test]
    fn describes_avc_without_private_data_by_name_only() {
        assert_eq!(
            describe_mkv_codec("V_MPEG4/ISO/AVC", None),
            simple_codec("h264")
        );
    }

    #[test]
    fn reads_the_hevc_profile_and_level_from_the_private_data() {
        let mut hvcc = vec![1, 0x02, 0x40, 0, 0, 0, 0x90, 0, 0, 0, 0, 0, 120];
        hvcc.extend_from_slice(&[0; 10]);
        let codec = describe_mkv_codec("V_MPEGH/ISO/HEVC", Some(&hvcc));
        assert_eq!(codec.codec_string.as_deref(), Some("hvc1.2.4.L120.B0"));
    }

    #[test]
    fn reads_the_aac_object_type_from_the_audio_specific_config() {
        let codec = describe_mkv_codec("A_AAC", Some(&[0x2B, 0x92, 0x08, 0x00]));
        assert_eq!(codec.codec_string.as_deref(), Some("mp4a.40.5"));
    }

    #[test]
    fn maps_vorbis_to_a_name_without_a_codec_string() {
        let codec = describe_mkv_codec("A_VORBIS", None);
        assert_eq!((codec.name.as_str(), codec.codec_string), ("vorbis", None));
    }

    #[test]
    fn maps_opus_to_its_codec_string() {
        assert_eq!(
            describe_mkv_codec("A_OPUS", None).codec_string.as_deref(),
            Some("Opus")
        );
    }

    #[test]
    fn keeps_an_unknown_codec_id_as_the_name() {
        assert_eq!(describe_mkv_codec("V_QUICKTIME", None).name, "V_QUICKTIME");
    }
}
