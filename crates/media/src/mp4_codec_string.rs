//! Reads codec strings from the sample description that an MP4 track stores.

use mp4::Mp4Track;

use crate::codec_string::aac_codec_string;
use crate::codec_string_avc::avc_codec_string;

/// The object type indication that the MPEG-4 audio descriptor uses for AAC.
const MPEG4_AUDIO: u8 = 0x40;
/// The object type indication for MPEG-2 audio, which includes MP3.
const MPEG2_AUDIO: u8 = 0x69;
/// The object type indication for MPEG-1 audio, which includes MP3.
const MPEG1_AUDIO: u8 = 0x6B;

/// Returns the codec string of an H.264, AAC, or MP3 track, and `None` for other codecs.
pub(crate) fn describe_codec_string(track: &Mp4Track) -> Option<String> {
    let entries = &track.trak.mdia.minf.stbl.stsd;
    if let Some(avc1) = &entries.avc1 {
        let config = &avc1.avcc;
        return Some(avc_codec_string(
            config.avc_profile_indication,
            config.profile_compatibility,
            config.avc_level_indication,
        ));
    }
    let decoder_config = &entries.mp4a.as_ref()?.esds.as_ref()?.es_desc.dec_config;
    match decoder_config.object_type_indication {
        MPEG4_AUDIO => Some(aac_codec_string(decoder_config.dec_specific.profile)),
        MPEG1_AUDIO | MPEG2_AUDIO => Some("mp4a.6B".to_owned()),
        _ => None,
    }
}
