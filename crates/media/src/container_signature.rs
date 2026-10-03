//! Recognition of a container format from the leading bytes of a file.

use crate::container::ContainerFormat;

const MP4_BOX_TYPE_OFFSET: usize = 4;
const EBML_MAGIC: [u8; 4] = [0x1A, 0x45, 0xDF, 0xA3];
const RIFF_FORM_TYPE_OFFSET: usize = 8;
const MPEG_TS_SYNC_BYTE: u8 = 0x47;
const MPEG_TS_PACKET_LENGTH: usize = 188;

/// Recognizes the container from its signature bytes.
pub fn detect_container_format(bytes: &[u8]) -> Option<ContainerFormat> {
    if bytes.get(MP4_BOX_TYPE_OFFSET..MP4_BOX_TYPE_OFFSET + 4) == Some(b"ftyp") {
        Some(ContainerFormat::Mp4)
    } else if bytes.starts_with(&EBML_MAGIC) {
        Some(ContainerFormat::Matroska)
    } else if bytes.starts_with(b"OggS") {
        Some(ContainerFormat::Ogg)
    } else if bytes.starts_with(b"fLaC") {
        Some(ContainerFormat::Flac)
    } else if bytes.starts_with(b"RIFF") {
        detect_riff_format(bytes)
    } else if is_mpeg_ts(bytes) {
        Some(ContainerFormat::MpegTs)
    } else if bytes.starts_with(b"ID3") {
        Some(ContainerFormat::Mp3)
    } else {
        detect_from_frame_sync(bytes)
    }
}

fn detect_riff_format(bytes: &[u8]) -> Option<ContainerFormat> {
    match bytes.get(RIFF_FORM_TYPE_OFFSET..RIFF_FORM_TYPE_OFFSET + 4)? {
        b"WAVE" => Some(ContainerFormat::Wav),
        b"AVI " => Some(ContainerFormat::Avi),
        _ => None,
    }
}

/// An MPEG transport stream has a sync byte at the start of every 188-byte packet.
fn is_mpeg_ts(bytes: &[u8]) -> bool {
    bytes.first() == Some(&MPEG_TS_SYNC_BYTE)
        && bytes.get(MPEG_TS_PACKET_LENGTH) == Some(&MPEG_TS_SYNC_BYTE)
}

/// Both MP3 and ADTS frames start with eleven set sync bits. The two bits after the MPEG
/// version are the layer, which is zero only in ADTS.
fn detect_from_frame_sync(bytes: &[u8]) -> Option<ContainerFormat> {
    match bytes {
        [0xFF, second, ..] if second & 0xE0 == 0xE0 => {
            let layer = (second >> 1) & 0b11;
            Some(if layer == 0 {
                ContainerFormat::Adts
            } else {
                ContainerFormat::Mp3
            })
        }
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::read_fixture_bytes;

    #[test]
    fn detects_the_mp4_fixture() {
        let format = detect_container_format(&read_fixture_bytes("sample.mp4"));
        assert_eq!(format, Some(ContainerFormat::Mp4));
    }

    #[test]
    fn detects_the_matroska_fixture() {
        let format = detect_container_format(&read_fixture_bytes("sample.mkv"));
        assert_eq!(format, Some(ContainerFormat::Matroska));
    }

    #[test]
    fn detects_the_mp3_fixture() {
        let format = detect_container_format(&read_fixture_bytes("sample.mp3"));
        assert_eq!(format, Some(ContainerFormat::Mp3));
    }

    #[test]
    fn detects_mp3_from_a_bare_frame_sync() {
        assert_eq!(
            detect_container_format(&[0xFF, 0xFB, 0x90, 0x00]),
            Some(ContainerFormat::Mp3)
        );
    }

    #[test]
    fn detects_adts_from_a_frame_sync_with_layer_zero() {
        assert_eq!(
            detect_container_format(&[0xFF, 0xF1, 0x50, 0x80]),
            Some(ContainerFormat::Adts)
        );
    }

    #[test]
    fn detects_ogg() {
        assert_eq!(
            detect_container_format(b"OggS\0\x02"),
            Some(ContainerFormat::Ogg)
        );
    }

    #[test]
    fn detects_flac() {
        assert_eq!(
            detect_container_format(b"fLaC\0\0\0\x22"),
            Some(ContainerFormat::Flac)
        );
    }

    #[test]
    fn detects_wav() {
        assert_eq!(
            detect_container_format(b"RIFF\x24\0\0\0WAVEfmt "),
            Some(ContainerFormat::Wav)
        );
    }

    #[test]
    fn detects_avi() {
        assert_eq!(
            detect_container_format(b"RIFF\x24\0\0\0AVI LIST"),
            Some(ContainerFormat::Avi)
        );
    }

    #[test]
    fn detects_an_mpeg_transport_stream() {
        let mut bytes = vec![0u8; 2 * MPEG_TS_PACKET_LENGTH];
        bytes[0] = MPEG_TS_SYNC_BYTE;
        bytes[MPEG_TS_PACKET_LENGTH] = MPEG_TS_SYNC_BYTE;
        assert_eq!(
            detect_container_format(&bytes),
            Some(ContainerFormat::MpegTs)
        );
    }

    #[test]
    fn detects_nothing_in_an_unknown_riff_form() {
        assert_eq!(detect_container_format(b"RIFF\x24\0\0\0WEBPVP8 "), None);
    }

    #[test]
    fn detects_nothing_in_garbage() {
        assert_eq!(
            detect_container_format(b"hello world, this is not media"),
            None
        );
    }

    #[test]
    fn detects_nothing_in_empty_input() {
        assert_eq!(detect_container_format(&[]), None);
    }
}
