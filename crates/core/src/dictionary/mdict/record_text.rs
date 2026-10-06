use super::text_encoding::TextEncoding;

/// Decodes a record of an `.mdx` file, without the NUL and line break that usually end it.
pub fn record_text(encoding: TextEncoding, record: &[u8]) -> String {
    let mut text = encoding.decode(record);
    let length = text
        .trim_end_matches(|character: char| character == '\0' || character.is_ascii_whitespace())
        .len();
    text.truncate(length);
    text
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_the_trailing_nul_and_line_break() {
        let utf8 = TextEncoding::from_label("UTF-8").unwrap();
        assert_eq!(record_text(utf8, b"<b>cat</b>\r\n\0"), "<b>cat</b>");
    }

    #[test]
    fn strips_a_utf16_nul() {
        let text = record_text(TextEncoding::UTF_16LE, &[b'a', 0, 0, 0]);
        assert_eq!(text, "a");
    }
}
