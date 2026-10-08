use super::{Chapter, Document};
use crate::text_blocks::{join_text_lines, remove_byte_order_marks, split_blocks};

/// Parses plain text into one untitled chapter whose paragraphs are separated by blank lines.
pub fn parse_plain_text(text: &str) -> Document {
    let paragraphs = split_blocks(&remove_byte_order_marks(text))
        .iter()
        .map(|lines| join_text_lines(lines))
        .collect();
    Document {
        title: String::new(),
        language: None,
        chapters: vec![Chapter {
            title: None,
            paragraphs,
        }],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_paragraphs_on_blank_lines() {
        assert_eq!(
            parse_plain_text("First one.\n\nSecond one.\n").chapters[0].paragraphs,
            vec!["First one.", "Second one."]
        );
    }

    #[test]
    fn keeps_line_breaks_inside_a_paragraph() {
        assert_eq!(
            parse_plain_text("Line one.\r\nLine two.").chapters[0].paragraphs,
            vec!["Line one.\nLine two."]
        );
    }

    #[test]
    fn leaves_a_byte_order_mark_out_of_the_first_paragraph() {
        assert_eq!(
            parse_plain_text("\u{feff}First one.").chapters[0].paragraphs,
            vec!["First one."]
        );
    }

    #[test]
    fn leaves_a_byte_order_mark_out_of_a_later_paragraph() {
        assert_eq!(
            parse_plain_text("First one.\n\n\u{feff}Second one.").chapters[0].paragraphs,
            vec!["First one.", "Second one."]
        );
    }

    #[test]
    fn produces_an_untitled_chapter() {
        assert_eq!(parse_plain_text("Hello.").chapters[0].title, None);
    }

    #[test]
    fn produces_no_paragraphs_for_empty_text() {
        assert_eq!(
            parse_plain_text("\n\n").chapters[0].paragraphs,
            Vec::<String>::new()
        );
    }
}
