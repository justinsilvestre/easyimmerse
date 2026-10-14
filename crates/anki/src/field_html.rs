//! The HTML that Anki fields hold, made from the text of flashcard fields.

use pulldown_cmark::{Event, Options, Parser, Tag, TagEnd, html};

/// The character that separates field values in an Anki note, which no value may contain.
const FIELD_SEPARATOR: char = '\u{1f}';

/// Escapes plain text for a field and keeps its line breaks.
pub(crate) fn plain_text_html(text: &str) -> String {
    let mut html = String::with_capacity(text.len());
    for character in text.trim().chars() {
        match character {
            '&' => html.push_str("&amp;"),
            '<' => html.push_str("&lt;"),
            '>' => html.push_str("&gt;"),
            '"' => html.push_str("&quot;"),
            '\n' => html.push_str("<br>"),
            '\r' | FIELD_SEPARATOR => {}
            other => html.push(other),
        }
    }
    html
}

/// Renders CommonMark as HTML. A definition of a single paragraph is left unwrapped,
/// and HTML written in the Markdown is shown as text, since the app writes none.
pub(crate) fn markdown_html(markdown: &str) -> String {
    let options = Options::ENABLE_TABLES | Options::ENABLE_STRIKETHROUGH;
    let events: Vec<Event> = Parser::new_ext(markdown, options)
        .map(|event| match event {
            Event::Html(raw) | Event::InlineHtml(raw) => Event::Text(raw),
            other => other,
        })
        .collect();
    let shown = if is_single_paragraph(&events) {
        &events[1..events.len() - 1]
    } else {
        &events[..]
    };
    let mut html = String::new();
    html::push_html(&mut html, shown.iter().cloned());
    html.trim_end().replace(FIELD_SEPARATOR, "")
}

fn is_single_paragraph(events: &[Event]) -> bool {
    let paragraph_count = events
        .iter()
        .filter(|event| matches!(event, Event::End(TagEnd::Paragraph)))
        .count();
    paragraph_count == 1
        && matches!(events.first(), Some(Event::Start(Tag::Paragraph)))
        && matches!(events.last(), Some(Event::End(TagEnd::Paragraph)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escapes_plain_text() {
        assert_eq!(plain_text_html("Tom & <Jerry>"), "Tom &amp; &lt;Jerry&gt;");
    }

    #[test]
    fn keeps_the_line_breaks_of_plain_text() {
        assert_eq!(plain_text_html("- Hallo.\n- Hi."), "- Hallo.<br>- Hi.");
    }

    #[test]
    fn leaves_a_single_paragraph_of_markdown_unwrapped() {
        assert_eq!(markdown_html("to *eat*"), "to <em>eat</em>");
    }

    #[test]
    fn renders_a_markdown_list() {
        assert_eq!(
            markdown_html("- house\n- home"),
            "<ul>\n<li>house</li>\n<li>home</li>\n</ul>"
        );
    }

    #[test]
    fn shows_html_in_markdown_as_text() {
        assert_eq!(
            markdown_html("a <b>bold</b> claim"),
            "a &lt;b&gt;bold&lt;/b&gt; claim"
        );
    }

    #[test]
    fn removes_the_field_separator() {
        assert_eq!(plain_text_html("a\u{1f}b"), "ab");
    }
}
