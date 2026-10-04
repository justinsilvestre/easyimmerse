//! Parsing of an MPEG audio layer III frame header and the Xing or Info header that follows it.

const ID3V2_HEADER_LENGTH: usize = 10;
const FRAME_HEADER_LENGTH: usize = 4;
const BIT_RATES_MPEG1_KBPS: [u32; 15] = [
    0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
];
const BIT_RATES_MPEG2_KBPS: [u32; 15] =
    [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SAMPLE_RATES_MPEG1: [u32; 3] = [44100, 48000, 32000];
const XING_FRAME_COUNT_FLAG: u32 = 0x1;
const XING_BYTE_COUNT_FLAG: u32 = 0x2;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct Mp3FrameHeader {
    pub bit_rate: u32,
    pub sample_rate: u32,
    pub channels: u32,
    pub samples_per_frame: u32,
    is_mpeg1: bool,
}

/// The totals a variable-bit-rate encoder writes into the first frame.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub(crate) struct XingHeader {
    pub frame_count: Option<u32>,
    pub byte_count: Option<u32>,
}

/// The length of the ID3v2 tag at the start of the file, or zero when there is none.
pub(crate) fn id3v2_tag_length(bytes: &[u8]) -> usize {
    match bytes {
        [b'I', b'D', b'3', _, _, flags, a, b, c, d, ..] => {
            let footer = if flags & 0x10 != 0 {
                ID3V2_HEADER_LENGTH
            } else {
                0
            };
            let size = [a, b, c, d]
                .iter()
                .fold(0usize, |size, &byte| (size << 7) | usize::from(byte & 0x7F));
            ID3V2_HEADER_LENGTH + size + footer
        }
        _ => 0,
    }
}

/// Parses a layer III frame header, or `None` when the bytes do not start with a valid one.
pub(crate) fn parse_mp3_frame_header(bytes: &[u8]) -> Option<Mp3FrameHeader> {
    let &[first, second, third, fourth] = bytes.get(..FRAME_HEADER_LENGTH)? else {
        return None;
    };
    let version_bits = (second >> 3) & 0b11;
    let layer_bits = (second >> 1) & 0b11;
    if first != 0xFF || second & 0xE0 != 0xE0 || version_bits == 1 || layer_bits != 0b01 {
        return None;
    }
    let is_mpeg1 = version_bits == 0b11;
    let bit_rate_index = usize::from(third >> 4);
    let sample_rate_index = usize::from((third >> 2) & 0b11);
    if bit_rate_index == 0 || bit_rate_index == 15 || sample_rate_index == 3 {
        return None;
    }
    let bit_rates = if is_mpeg1 {
        BIT_RATES_MPEG1_KBPS
    } else {
        BIT_RATES_MPEG2_KBPS
    };
    let sample_rate_divisor = match version_bits {
        0b11 => 1,
        0b10 => 2,
        _ => 4,
    };
    Some(Mp3FrameHeader {
        bit_rate: bit_rates[bit_rate_index] * 1000,
        sample_rate: SAMPLE_RATES_MPEG1[sample_rate_index] / sample_rate_divisor,
        channels: if fourth >> 6 == 0b11 { 1 } else { 2 },
        samples_per_frame: if is_mpeg1 { 1152 } else { 576 },
        is_mpeg1,
    })
}

/// Reads the Xing or Info header of the frame that starts at the beginning of `frame`.
pub(crate) fn parse_xing_header(frame: &[u8], header: Mp3FrameHeader) -> Option<XingHeader> {
    let side_info_length = match (header.is_mpeg1, header.channels) {
        (true, 1) => 17,
        (true, _) => 32,
        (false, 1) => 9,
        (false, _) => 17,
    };
    let mut cursor = FRAME_HEADER_LENGTH + side_info_length;
    if !matches!(frame.get(cursor..cursor + 4)?, b"Xing" | b"Info") {
        return None;
    }
    cursor += 4;
    let flags = read_u32(frame, cursor)?;
    cursor += 4;
    let mut xing = XingHeader::default();
    if flags & XING_FRAME_COUNT_FLAG != 0 {
        xing.frame_count = Some(read_u32(frame, cursor)?);
        cursor += 4;
    }
    if flags & XING_BYTE_COUNT_FLAG != 0 {
        xing.byte_count = Some(read_u32(frame, cursor)?);
    }
    Some(xing)
}

fn read_u32(bytes: &[u8], offset: usize) -> Option<u32> {
    let slice: [u8; 4] = bytes.get(offset..offset + 4)?.try_into().ok()?;
    Some(u32::from_be_bytes(slice))
}

#[cfg(test)]
mod tests {
    use super::*;

    const MPEG1_MONO_128K_44100: [u8; 4] = [0xFF, 0xFB, 0x90, 0xC0];

    #[test]
    fn reads_an_mpeg1_header() {
        let header = parse_mp3_frame_header(&MPEG1_MONO_128K_44100).expect("valid header");
        assert_eq!(
            (
                header.bit_rate,
                header.sample_rate,
                header.channels,
                header.samples_per_frame
            ),
            (128_000, 44100, 1, 1152)
        );
    }

    #[test]
    fn reads_an_mpeg2_stereo_header() {
        let header = parse_mp3_frame_header(&[0xFF, 0xF3, 0x50, 0x00]).expect("valid header");
        assert_eq!(
            (
                header.bit_rate,
                header.sample_rate,
                header.channels,
                header.samples_per_frame
            ),
            (40_000, 22050, 2, 576)
        );
    }

    #[test]
    fn rejects_a_reserved_bit_rate_index() {
        assert_eq!(parse_mp3_frame_header(&[0xFF, 0xFB, 0xF0, 0xC0]), None);
    }

    #[test]
    fn rejects_a_layer_other_than_three() {
        assert_eq!(parse_mp3_frame_header(&[0xFF, 0xFD, 0x90, 0xC0]), None);
    }

    #[test]
    fn measures_an_id3v2_tag_with_a_syncsafe_size() {
        assert_eq!(
            id3v2_tag_length(b"ID3\x04\x00\x00\x00\x00\x02\x01rest"),
            10 + 257
        );
    }

    #[test]
    fn measures_no_tag_in_a_bare_frame() {
        assert_eq!(id3v2_tag_length(&MPEG1_MONO_128K_44100), 0);
    }

    #[test]
    fn reads_the_frame_and_byte_counts_of_an_info_header() {
        let header = parse_mp3_frame_header(&MPEG1_MONO_128K_44100).expect("valid header");
        let mut frame = MPEG1_MONO_128K_44100.to_vec();
        frame.extend_from_slice(&[0; 17]);
        frame.extend_from_slice(b"Info");
        frame.extend_from_slice(&3u32.to_be_bytes());
        frame.extend_from_slice(&115u32.to_be_bytes());
        frame.extend_from_slice(&24_000u32.to_be_bytes());
        assert_eq!(
            parse_xing_header(&frame, header),
            Some(XingHeader {
                frame_count: Some(115),
                byte_count: Some(24_000)
            })
        );
    }

    #[test]
    fn finds_no_xing_header_in_a_plain_frame() {
        let header = parse_mp3_frame_header(&MPEG1_MONO_128K_44100).expect("valid header");
        assert_eq!(parse_xing_header(&[0; 64], header), None);
    }
}
