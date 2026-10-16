//! The HTML that Anki fields hold, made from the text of flashcard fields.

use pulldown_cmark::{Event, Options, Parser, Tag, TagEnd, html};

use crate::anki_field::FIELD_SEPARATOR;

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
/// Links and images keep their destination only when it is an http, https or mailto URL.
pub(crate) fn markdown_html(markdown: &str) -> String {
    let options = Options::ENABLE_TABLES | Options::ENABLE_STRIKETHROUGH;
    let events = without_unsafe_destinations(
        Parser::new_ext(markdown, options).map(|event| match event {
            Event::Html(raw) | Event::InlineHtml(raw) => Event::Text(raw),
            other => other,
        }),
    );
    let shown = if is_single_paragraph(&events) {
        &events[1..events.len() - 1]
    } else {
        &events[..]
    };
    let mut html = String::new();
    html::push_html(&mut html, shown.iter().cloned());
    html.trim_end().replace(FIELD_SEPARATOR, "")
}

/// Drops the link and image tags whose destination is not safe, which leaves their text.
fn without_unsafe_destinations<'a>(events: impl Iterator<Item = Event<'a>>) -> Vec<Event<'a>> {
    let mut kept = Vec::new();
    let mut is_dropped_stack = Vec::new();
    for event in events {
        match &event {
            Event::Start(Tag::Link { dest_url, .. } | Tag::Image { dest_url, .. }) => {
                is_dropped_stack.push(!is_safe_destination(dest_url));
                if !is_dropped_stack.last().copied().unwrap_or(false) {
                    kept.push(event);
                }
            }
            Event::End(TagEnd::Link | TagEnd::Image) => {
                if !is_dropped_stack.pop().unwrap_or(false) {
                    kept.push(event);
                }
            }
            _ => kept.push(event),
        }
    }
    kept
}

/// Browsers ignore whitespace and control characters inside a scheme, so they are stripped first.
fn is_safe_destination(destination: &str) -> bool {
    let stripped: String = destination
        .chars()
        .filter(|character| !character.is_whitespace() && !character.is_control())
        .collect::<String>()
        .to_ascii_lowercase();
    ["http://", "https://", "mailto:"]
        .iter()
        .any(|scheme| stripped.starts_with(scheme))
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
    fn keeps_the_text_of_a_link_with_a_script_destination() {
        assert_eq!(markdown_html("[x](javascript:alert(1))"), "x");
    }

    #[test]
    fn keeps_the_text_of_a_link_with_a_disguised_script_destination() {
        assert_eq!(markdown_html("[x](<JaVa\tScript:alert(1)>)"), "x");
    }

    #[test]
    fn keeps_the_alt_text_of_an_image_with_a_data_destination() {
        assert_eq!(markdown_html("![pic](data:text/html;base64,AA)"), "pic");
    }

    #[test]
    fn keeps_a_link_with_an_https_destination() {
        assert_eq!(
            markdown_html("[x](HTTPS://example.com)"),
            "<a href=\"HTTPS://example.com\">x</a>"
        );
    }

    #[test]
    fn keeps_a_link_with_a_mailto_destination() {
        assert_eq!(
            markdown_html("[x](mailto:a@b.c)"),
            "<a href=\"mailto:a@b.c\">x</a>"
        );
    }

    #[test]
    fn keeps_an_image_with_an_http_destination() {
        assert_eq!(
            markdown_html("![pic](http://example.com/a.png)"),
            "<img src=\"http://example.com/a.png\" alt=\"pic\" />"
        );
    }

    #[test]
    fn removes_the_field_separator() {
        assert_eq!(plain_text_html("a\u{1f}b"), "ab");
    }
}
