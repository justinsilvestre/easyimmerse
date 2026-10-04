//! Description of one MP4 track from its sample entry.

use mp4::{Mp4Track, TrackType};

use crate::avc_codec::{avc_codec_string, avc_profile_name};
use crate::codec_string::aac_codec_string;
use crate::container::{ContainerFormat, TrackInfo, TrackKind, parse_language_tag};
use crate::error::MediaError;
use crate::rational::Rational;

const TRACK_ENABLED_FLAG: u32 = 0x1;
const MP3_OBJECT_TYPE_INDICATIONS: [u8; 2] = [0x69, 0x6B];

pub(crate) fn describe_mp4_track(index: u32, track: &Mp4Track) -> Result<TrackInfo, MediaError> {
    let kind = track.track_type().map_or(TrackKind::Other, to_track_kind);
    let common = TrackInfo {
        index,
        container_track_id: Some(track.track_id()),
        kind,
        is_default: track.trak.tkhd.flags & TRACK_ENABLED_FLAG != 0,
        language: parse_language_tag(track.language()),
        ..TrackInfo::default()
    };
    let stsd = &track.trak.mdia.minf.stbl.stsd;
    if stsd.avc1.is_some() {
        Ok(describe_avc(common, track))
    } else if stsd.mp4a.is_some() {
        Ok(describe_mp4a(common, track))
    } else if stsd.tx3g.is_some() {
        Ok(TrackInfo {
            codec: "mov_text".to_owned(),
            ..common
        })
    } else if kind == TrackKind::Other {
        Ok(TrackInfo {
            codec: "unknown".to_owned(),
            ..common
        })
    } else {
        Err(MediaError::RequiresFfprobe(ContainerFormat::Mp4))
    }
}

/// The sample entry boxes are not exported by the `mp4` crate, so these readers take the track
/// and are only called when the matching entry is present.
fn describe_avc(common: TrackInfo, track: &Mp4Track) -> TrackInfo {
    let Some(avc1) = &track.trak.mdia.minf.stbl.stsd.avc1 else {
        return common;
    };
    let avcc = &avc1.avcc;
    TrackInfo {
        codec: "h264".to_owned(),
        profile: avc_profile_name(avcc.avc_profile_indication, avcc.profile_compatibility)
            .map(str::to_owned),
        level: Some(i64::from(avcc.avc_level_indication)),
        codec_string: Some(avc_codec_string(
            avcc.avc_profile_indication,
            avcc.profile_compatibility,
            avcc.avc_level_indication,
        )),
        width: Some(u32::from(avc1.width)),
        height: Some(u32::from(avc1.height)),
        frame_rate: frame_rate(track),
        bit_rate: nonzero(u64::from(track.bitrate())),
        ..common
    }
}

fn describe_mp4a(common: TrackInfo, track: &Mp4Track) -> TrackInfo {
    let Some(mp4a) = &track.trak.mdia.minf.stbl.stsd.mp4a else {
        return common;
    };
    let object_type_indication = mp4a
        .esds
        .as_ref()
        .map(|esds| esds.es_desc.dec_config.object_type_indication);
    let is_mp3 =
        object_type_indication.is_some_and(|oti| MP3_OBJECT_TYPE_INDICATIONS.contains(&oti));
    let audio_object_type = track.audio_profile().ok().map(|profile| profile as u8);
    let fallback_sample_rate = nonzero(u64::from(mp4a.samplerate.value())).map(|rate| rate as u32);
    TrackInfo {
        codec: if is_mp3 { "mp3" } else { "aac" }.to_owned(),
        profile: (!is_mp3)
            .then(|| audio_object_type.and_then(aac_profile_name))
            .flatten()
            .map(str::to_owned),
        codec_string: Some(if is_mp3 {
            "mp4a.6B".to_owned()
        } else {
            aac_codec_string(audio_object_type.unwrap_or(2))
        }),
        sample_rate: track
            .sample_freq_index()
            .map_or(fallback_sample_rate, |index| Some(index.freq())),
        channels: nonzero(u64::from(mp4a.channelcount)).map(|channels| channels as u32),
        bit_rate: nonzero(u64::from(track.bitrate())),
        ..common
    }
}

fn aac_profile_name(audio_object_type: u8) -> Option<&'static str> {
    Some(match audio_object_type {
        1 => "Main",
        2 => "LC",
        3 => "SSR",
        4 => "LTP",
        5 => "HE-AAC",
        29 => "HE-AACv2",
        _ => return None,
    })
}

/// The frame rate from the most common sample duration in the time-to-sample table.
fn frame_rate(track: &Mp4Track) -> Option<Rational> {
    let entries = &track.trak.mdia.minf.stbl.stts.entries;
    let commonest = entries.iter().max_by_key(|entry| entry.sample_count)?;
    (commonest.sample_delta > 0).then(|| {
        Rational::new(
            u64::from(track.timescale()),
            u64::from(commonest.sample_delta),
        )
        .reduced()
    })
}

fn nonzero(value: u64) -> Option<u64> {
    (value > 0).then_some(value)
}

fn to_track_kind(track_type: TrackType) -> TrackKind {
    match track_type {
        TrackType::Video => TrackKind::Video,
        TrackType::Audio => TrackKind::Audio,
        TrackType::Subtitle => TrackKind::Subtitle,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mp4_container::probe_mp4;
    use crate::test_support::read_fixture_bytes;

    fn fixture_track(index: usize) -> TrackInfo {
        probe_mp4(&read_fixture_bytes("sample.mp4"))
            .expect("the fixture should parse")
            .tracks
            .remove(index)
    }

    #[test]
    fn names_the_video_codec() {
        assert_eq!(fixture_track(0).codec, "h264");
    }

    #[test]
    fn names_the_video_profile() {
        assert_eq!(fixture_track(0).profile.as_deref(), Some("High"));
    }

    #[test]
    fn spells_the_video_codec_string_from_the_avc_configuration() {
        assert_eq!(
            fixture_track(0).codec_string.as_deref(),
            Some("avc1.64000C")
        );
    }

    #[test]
    fn reads_the_picture_size() {
        let video = fixture_track(0);
        assert_eq!((video.width, video.height), (Some(320), Some(180)));
    }

    #[test]
    fn reads_the_frame_rate_as_a_rational() {
        assert_eq!(fixture_track(0).frame_rate, Some(Rational::new(24, 1)));
    }

    #[test]
    fn marks_enabled_tracks_as_default() {
        assert!(fixture_track(0).is_default);
    }

    #[test]
    fn names_the_audio_profile() {
        assert_eq!(fixture_track(1).profile.as_deref(), Some("LC"));
    }

    #[test]
    fn spells_the_audio_codec_string() {
        assert_eq!(fixture_track(1).codec_string.as_deref(), Some("mp4a.40.2"));
    }

    #[test]
    fn reads_the_sample_rate_and_channels() {
        let audio = fixture_track(1);
        assert_eq!((audio.sample_rate, audio.channels), (Some(44100), Some(1)));
    }

    #[test]
    fn reads_the_audio_bit_rate_from_the_decoder_configuration() {
        let bit_rate = fixture_track(1).bit_rate.expect("bit rate");
        assert!((40_000..60_000).contains(&bit_rate), "{bit_rate}");
    }

    #[test]
    fn names_the_subtitle_codec_without_a_codec_string() {
        let subtitle = fixture_track(2);
        assert_eq!(
            (subtitle.codec.as_str(), subtitle.codec_string),
            ("mov_text", None)
        );
    }
}
