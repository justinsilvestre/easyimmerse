//! Decoding of one `mov_text` sample: a big-endian 16-bit text length, the UTF-8
//! text, then optional modifier boxes such as `styl`.

use thiserror::Error;

use crate::mov_text_style::{apply_style_records, parse_style_records};

#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum MovTextSampleError {
    #[error("the sample is shorter than its declared text length")]
    Truncated,
    #[error("the text is not valid UTF-8")]
    InvalidUtf8,
}

/// Returns the sample's text with inline markup restored from its style records, or
/// `None` for an empty sample, which marks a gap between subtitles.
pub(crate) fn decode_mov_text_sample(sample: &[u8]) -> Result<Option<String>, MovTextSampleError> {
    let (text_bytes, modifiers) = split_text_and_modifiers(sample)?;
    if text_bytes.is_empty() {
        return Ok(None);
    }
    let text = std::str::from_utf8(text_bytes).map_err(|_| MovTextSampleError::InvalidUtf8)?;
    Ok(Some(apply_style_records(
        text,
        &parse_style_records(modifiers),
    )))
}

fn split_text_and_modifiers(sample: &[u8]) -> Result<(&[u8], &[u8]), MovTextSampleError> {
    let [high, low, rest @ ..] = sample else {
        return Err(MovTextSampleError::Truncated);
    };
    let text_length = usize::from(u16::from_be_bytes([*high, *low]));
    if rest.len() < text_length {
        return Err(MovTextSampleError::Truncated);
    }
    Ok(rest.split_at(text_length))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_plain_text() {
        let sample = [&[0x00, 0x05][..], b"Hello"].concat();
        assert_eq!(
            decode_mov_text_sample(&sample),
            Ok(Some("Hello".to_owned()))
        );
    }

    #[test]
    fn treats_an_empty_sample_as_a_gap() {
        assert_eq!(decode_mov_text_sample(&[0x00, 0x00]), Ok(None));
    }

    #[test]
    fn restores_italics_from_a_style_box() {
        let styl = [
            0x00, 0x00, 0x00, 0x16, b's', b't', b'y', b'l', 0x00, 0x01, 0x00, 0x00, 0x00, 0x05,
            0x00, 0x01, 0x02, 0x10, 0xFF, 0xFF, 0xFF, 0xFF,
        ];
        let sample = [&[0x00, 0x08][..], b"Hello me", &styl].concat();
        assert_eq!(
            decode_mov_text_sample(&sample),
            Ok(Some("<i>Hello</i> me".to_owned()))
        );
    }

    #[test]
    fn rejects_a_sample_shorter_than_its_text_length() {
        let sample = [&[0x00, 0x09][..], b"Hello"].concat();
        assert_eq!(
            decode_mov_text_sample(&sample),
            Err(MovTextSampleError::Truncated)
        );
    }

    #[test]
    fn rejects_a_sample_without_a_length_prefix() {
        assert_eq!(
            decode_mov_text_sample(&[0x00]),
            Err(MovTextSampleError::Truncated)
        );
    }

    #[test]
    fn rejects_invalid_utf8() {
        let sample = [0x00, 0x02, 0xFF, 0xFE];
        assert_eq!(
            decode_mov_text_sample(&sample),
            Err(MovTextSampleError::InvalidUtf8)
        );
    }
}
