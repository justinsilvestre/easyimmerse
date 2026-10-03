use crate::container::{ContainerFormat, ContainerInfo, TrackInfo, TrackKind};
use crate::mp3_frame_header::{
    Mp3FrameHeader, XingHeader, id3v2_tag_length, parse_mp3_frame_header, parse_xing_header,
};

const MILLIS_PER_SECOND: u64 = 1000;

/// Describes an MP3 file from its first frame header. The duration comes from the Xing or Info
/// header when there is one, and otherwise assumes a constant bit rate.
pub(crate) fn probe_mp3(bytes: &[u8]) -> ContainerInfo {
    let audio = &bytes[id3v2_tag_length(bytes).min(bytes.len())..];
    let header = parse_mp3_frame_header(audio);
    let xing = header.and_then(|header| parse_xing_header(audio, header));
    let duration_ms = header.and_then(|header| duration_ms(header, xing, audio.len() as u64));
    let bit_rate = header.map(|header| average_bit_rate(header, xing, duration_ms));
    ContainerInfo {
        format: ContainerFormat::Mp3,
        duration_ms,
        start_ms: None,
        bit_rate,
        tracks: vec![TrackInfo {
            index: 0,
            kind: TrackKind::Audio,
            codec: "mp3".to_owned(),
            codec_string: Some("mp4a.6B".to_owned()),
            sample_rate: header.map(|header| header.sample_rate),
            channels: header.map(|header| header.channels),
            bit_rate,
            is_default: true,
            ..TrackInfo::default()
        }],
    }
}

fn duration_ms(header: Mp3FrameHeader, xing: Option<XingHeader>, audio_length: u64) -> Option<u64> {
    match xing.and_then(|xing| xing.frame_count) {
        Some(frame_count) => Some(
            u64::from(frame_count) * u64::from(header.samples_per_frame) * MILLIS_PER_SECOND
                / u64::from(header.sample_rate),
        ),
        None => (header.bit_rate > 0)
            .then(|| audio_length * 8 * MILLIS_PER_SECOND / u64::from(header.bit_rate)),
    }
}

fn average_bit_rate(
    header: Mp3FrameHeader,
    xing: Option<XingHeader>,
    duration_ms: Option<u64>,
) -> u64 {
    match (xing.and_then(|xing| xing.byte_count), duration_ms) {
        (Some(byte_count), Some(duration_ms)) if duration_ms > 0 => {
            u64::from(byte_count) * 8 * MILLIS_PER_SECOND / duration_ms
        }
        _ => u64::from(header.bit_rate),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::read_fixture_bytes;

    fn probe_fixture() -> ContainerInfo {
        probe_mp3(&read_fixture_bytes("sample.mp3"))
    }

    #[test]
    fn describes_one_audio_track() {
        let kinds: Vec<TrackKind> = probe_fixture().tracks.iter().map(|t| t.kind).collect();
        assert_eq!(kinds, [TrackKind::Audio]);
    }

    #[test]
    fn names_the_codec_mp3() {
        assert_eq!(probe_fixture().tracks[0].codec, "mp3");
    }

    #[test]
    fn spells_the_codec_string() {
        assert_eq!(
            probe_fixture().tracks[0].codec_string.as_deref(),
            Some("mp4a.6B")
        );
    }

    #[test]
    fn reads_the_sample_rate_and_channels() {
        let track = &probe_fixture().tracks[0];
        assert_eq!((track.sample_rate, track.channels), (Some(44100), Some(1)));
    }

    #[test]
    fn reads_a_three_second_duration_from_the_info_header() {
        let duration_ms = probe_fixture().duration_ms.expect("duration");
        assert!((2990..=3030).contains(&duration_ms), "{duration_ms}");
    }

    #[test]
    fn reads_a_64_kbps_bit_rate() {
        let bit_rate = probe_fixture().bit_rate.expect("bit rate");
        assert!((60_000..=68_000).contains(&bit_rate), "{bit_rate}");
    }

    #[test]
    fn leaves_the_duration_unknown_without_a_frame_header() {
        assert_eq!(
            probe_mp3(b"ID3\x04\x00\x00\x00\x00\x00\x00").duration_ms,
            None
        );
    }
}
