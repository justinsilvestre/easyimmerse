//! The `styl` modifier box of a `mov_text` sample, which applies bold, italic, and
//! underline styles to character ranges. The ranges are turned back into the
//! `<b>`, `<i>`, and `<u>` tags that subtitle files use.

const BOX_HEADER_SIZE: usize = 8;
const STYLE_RECORD_SIZE: usize = 12;
const BOLD_FLAG: u8 = 0x1;
const ITALIC_FLAG: u8 = 0x2;
const UNDERLINE_FLAG: u8 = 0x4;

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct StyleRecord {
    /// Index of the first styled character.
    pub start_char: usize,
    /// Index of the first character after the styled range.
    pub end_char: usize,
    pub face_flags: u8,
}

/// Collects the style records of every `styl` box among the modifier boxes that
/// follow a sample's text. Malformed trailing data ends the scan without an error.
pub(crate) fn parse_style_records(modifiers: &[u8]) -> Vec<StyleRecord> {
    let mut records = Vec::new();
    let mut remaining = modifiers;
    while remaining.len() >= BOX_HEADER_SIZE {
        let size = u32::from_be_bytes([remaining[0], remaining[1], remaining[2], remaining[3]]);
        let size = size as usize;
        if size < BOX_HEADER_SIZE || size > remaining.len() {
            break;
        }
        if &remaining[4..8] == b"styl" {
            records.extend(parse_style_box_body(&remaining[BOX_HEADER_SIZE..size]));
        }
        remaining = &remaining[size..];
    }
    records
}

fn parse_style_box_body(body: &[u8]) -> impl Iterator<Item = StyleRecord> + '_ {
    let entry_count = body.get(..2).map_or(0, |count| {
        usize::from(u16::from_be_bytes([count[0], count[1]]))
    });
    body.get(2..)
        .unwrap_or_default()
        .as_chunks::<STYLE_RECORD_SIZE>()
        .0
        .iter()
        .take(entry_count)
        .map(|record| StyleRecord {
            start_char: usize::from(u16::from_be_bytes([record[0], record[1]])),
            end_char: usize::from(u16::from_be_bytes([record[2], record[3]])),
            face_flags: record[6],
        })
}

/// Inserts opening and closing tags around each styled character range.
/// Ranges that reach past the end of the text are cut off at the last character,
/// so every opening tag is closed.
pub(crate) fn apply_style_records(text: &str, records: &[StyleRecord]) -> String {
    let character_count = text.chars().count();
    let records = clamp_records(records, character_count);
    let mut output = String::with_capacity(text.len());
    let mut position = 0;
    for character in text.chars() {
        push_tags_at(&mut output, &records, position);
        output.push(character);
        position += 1;
    }
    push_tags_at(&mut output, &records, position);
    output
}

fn clamp_records(records: &[StyleRecord], character_count: usize) -> Vec<StyleRecord> {
    records
        .iter()
        .map(|record| StyleRecord {
            start_char: record.start_char.min(character_count),
            end_char: record.end_char.min(character_count),
            face_flags: record.face_flags,
        })
        .collect()
}

fn push_tags_at(output: &mut String, records: &[StyleRecord], position: usize) {
    for record in records.iter().rev() {
        if record.end_char == position && record.end_char > record.start_char {
            output.push_str(&closing_tags(record.face_flags));
        }
    }
    for record in records {
        if record.start_char == position && record.end_char > record.start_char {
            output.push_str(&opening_tags(record.face_flags));
        }
    }
}

fn opening_tags(face_flags: u8) -> String {
    tag_names(face_flags)
        .map(|name| format!("<{name}>"))
        .collect()
}

fn closing_tags(face_flags: u8) -> String {
    tag_names(face_flags)
        .rev()
        .map(|name| format!("</{name}>"))
        .collect()
}

fn tag_names(face_flags: u8) -> impl DoubleEndedIterator<Item = &'static str> {
    [(BOLD_FLAG, "b"), (ITALIC_FLAG, "i"), (UNDERLINE_FLAG, "u")]
        .into_iter()
        .filter(move |(flag, _)| face_flags & flag != 0)
        .map(|(_, name)| name)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn record(start_char: usize, end_char: usize, face_flags: u8) -> StyleRecord {
        StyleRecord {
            start_char,
            end_char,
            face_flags,
        }
    }

    #[test]
    fn wraps_an_italic_range() {
        let styled = apply_style_records("Everything is quiet.", &[record(0, 10, ITALIC_FLAG)]);
        assert_eq!(styled, "<i>Everything</i> is quiet.");
    }

    #[test]
    fn wraps_a_range_at_the_end_of_the_text() {
        let styled = apply_style_records("so bold", &[record(3, 7, BOLD_FLAG)]);
        assert_eq!(styled, "so <b>bold</b>");
    }

    #[test]
    fn nests_combined_styles_in_a_fixed_order() {
        let styled = apply_style_records(
            "ab",
            &[record(0, 2, BOLD_FLAG | ITALIC_FLAG | UNDERLINE_FLAG)],
        );
        assert_eq!(styled, "<b><i><u>ab</u></i></b>");
    }

    #[test]
    fn leaves_text_alone_without_style_flags() {
        assert_eq!(apply_style_records("plain", &[record(0, 5, 0)]), "plain");
    }

    #[test]
    fn closes_a_range_that_runs_past_the_end_of_the_text() {
        let styled = apply_style_records("short", &[record(2, 40, BOLD_FLAG)]);
        assert_eq!(styled, "sh<b>ort</b>");
    }

    #[test]
    fn ignores_a_range_that_starts_past_the_end_of_the_text() {
        assert_eq!(
            apply_style_records("short", &[record(9, 12, BOLD_FLAG)]),
            "short"
        );
    }

    #[test]
    fn counts_characters_rather_than_bytes() {
        let styled = apply_style_records("猫が寝る", &[record(0, 1, ITALIC_FLAG)]);
        assert_eq!(styled, "<i>猫</i>が寝る");
    }

    #[test]
    fn parses_a_style_box() {
        let styl = [
            0x00, 0x00, 0x00, 0x16, b's', b't', b'y', b'l', 0x00, 0x01, 0x00, 0x00, 0x00, 0x0A,
            0x00, 0x01, 0x02, 0x10, 0xFF, 0xFF, 0xFF, 0xFF,
        ];
        assert_eq!(parse_style_records(&styl), [record(0, 10, ITALIC_FLAG)]);
    }

    #[test]
    fn skips_boxes_of_other_types() {
        let hlit = [0x00, 0x00, 0x00, 0x0C, b'h', b'l', b'i', b't', 0, 0, 0, 0];
        assert_eq!(parse_style_records(&hlit), []);
    }

    #[test]
    fn stops_at_a_box_larger_than_the_remaining_data() {
        let truncated = [0x00, 0x00, 0x01, 0x00, b's', b't', b'y', b'l', 0x00, 0x01];
        assert_eq!(parse_style_records(&truncated), []);
    }
}
