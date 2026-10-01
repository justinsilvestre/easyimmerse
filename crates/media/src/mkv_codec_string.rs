//! Reads codec strings from a Matroska track's codec ID and codec private data.

use crate::codec_string::{aac_codec_string, codec_string};
use crate::codec_string_avc::avc_codec_string;

/// Returns the codec string for a Matroska codec ID such as `V_MPEG4/ISO/AVC`.
/// H.264 and AAC need the codec private data, which holds their configuration record.
pub(crate) fn describe_codec_string(
    codec_id: &str,
    codec_private: Option<&[u8]>,
) -> Option<String> {
    match codec_id {
        "V_MPEG4/ISO/AVC" => describe_avc(codec_private?),
        "A_AAC" => aac_object_type(codec_private?).map(aac_codec_string),
        _ => codec_string(ffprobe_codec_name(codec_id)?, None, None),
    }
}

/// Reads the profile, constraint flags, and level that follow the version byte of an H.264 configuration record.
fn describe_avc(record: &[u8]) -> Option<String> {
    match record {
        [_, profile_idc, constraint_flags, level_idc, ..] => Some(avc_codec_string(
            *profile_idc,
            *constraint_flags,
            *level_idc,
        )),
        _ => None,
    }
}

/// Reads the audio object type from the first five bits of an AAC audio specific configuration.
/// The value 31 means the real type follows in the next six bits.
fn aac_object_type(config: &[u8]) -> Option<u8> {
    let first = *config.first()? >> 3;
    if first != 31 {
        return Some(first);
    }
    let extension = ((config[0] & 0b111) << 3) | (*config.get(1)? >> 5);
    Some(32 + extension)
}

fn ffprobe_codec_name(codec_id: &str) -> Option<&'static str> {
    match codec_id {
        "A_MPEG/L3" => Some("mp3"),
        "A_FLAC" => Some("flac"),
        "A_OPUS" => Some("opus"),
        "A_AC3" => Some("ac3"),
        "A_EAC3" => Some("eac3"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_an_h264_configuration_record() {
        let record = [1, 0x64, 0x00, 0x1F, 0xFF];
        assert_eq!(
            describe_codec_string("V_MPEG4/ISO/AVC", Some(&record)).as_deref(),
            Some("avc1.64001F")
        );
    }

    #[test]
    fn rejects_a_truncated_h264_configuration_record() {
        assert_eq!(
            describe_codec_string("V_MPEG4/ISO/AVC", Some(&[1, 0x64])),
            None
        );
    }

    #[test]
    fn reads_the_aac_object_type() {
        assert_eq!(
            describe_codec_string("A_AAC", Some(&[0x12, 0x10])).as_deref(),
            Some("mp4a.40.2")
        );
    }

    #[test]
    fn reads_an_escaped_aac_object_type() {
        assert_eq!(aac_object_type(&[0b1111_1000, 0b1110_0000]), Some(39));
    }

    #[test]
    fn needs_codec_private_data_for_aac() {
        assert_eq!(describe_codec_string("A_AAC", None), None);
    }

    #[test]
    fn describes_mp3() {
        assert_eq!(
            describe_codec_string("A_MPEG/L3", None).as_deref(),
            Some("mp4a.6B")
        );
    }

    #[test]
    fn describes_opus() {
        assert_eq!(
            describe_codec_string("A_OPUS", None).as_deref(),
            Some("Opus")
        );
    }

    #[test]
    fn has_none_for_vorbis() {
        assert_eq!(describe_codec_string("A_VORBIS", None), None);
    }

    #[test]
    fn has_none_for_ass_subtitles() {
        assert_eq!(describe_codec_string("S_TEXT/ASS", None), None);
    }
}
