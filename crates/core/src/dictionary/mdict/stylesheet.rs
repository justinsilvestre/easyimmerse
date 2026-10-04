use std::collections::HashMap;

/// The style table of a header's `StyleSheet` attribute.
///
/// The attribute holds groups of three lines: a style number, the HTML that opens the style,
/// and the HTML that closes it. Records then mark styled runs with the number between backticks,
/// as in `` `1`word``; a run lasts until the next marker or the end of the record.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct StyleSheet(HashMap<u32, (String, String)>);

impl StyleSheet {
    pub fn parse(attribute: &str) -> Self {
        let lines: Vec<&str> = attribute.lines().collect();
        let mut styles = HashMap::new();
        let mut index = 0;
        while index < lines.len() {
            match lines[index].trim().parse() {
                Ok(number) => {
                    let line = |offset: usize| lines.get(index + offset).copied().unwrap_or("");
                    styles.insert(number, (line(1).to_string(), line(2).to_string()));
                    index += 3;
                }
                Err(_) => index += 1,
            }
        }
        Self(styles)
    }

    /// Replaces each style marker with its opening HTML, and closes each run.
    pub fn apply(&self, text: &str) -> String {
        if self.0.is_empty() {
            return text.to_string();
        }
        let mut output = String::with_capacity(text.len());
        let mut pending_close = "";
        let mut rest = text;
        while let Some((before, (open, close), after)) = self.next_marker(rest) {
            output.push_str(before);
            output.push_str(pending_close);
            output.push_str(open);
            pending_close = close;
            rest = after;
        }
        output.push_str(rest);
        output.push_str(pending_close);
        output
    }

    /// Finds the next marker of a known style, returning the text before it, the style, and the text after it.
    fn next_marker<'a>(&self, text: &'a str) -> Option<(&'a str, &(String, String), &'a str)> {
        let mut search_from = 0;
        loop {
            let start = search_from + text[search_from..].find('`')?;
            let length = text[start + 1..].find('`')?;
            let end = start + 1 + length;
            let style = text[start + 1..end]
                .parse()
                .ok()
                .and_then(|number| self.0.get(&number));
            match style {
                Some(style) => return Some((&text[..start], style, &text[end + 1..])),
                None => search_from = start + 1,
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn styles() -> StyleSheet {
        StyleSheet::parse("1\r\n<b>\r\n</b>\r\n2\r\n<i>\r\n</i>\r\n")
    }

    #[test]
    fn wraps_each_marked_run_in_its_style() {
        assert_eq!(
            styles().apply("`1`cat`2`a feline"),
            "<b>cat</b><i>a feline</i>"
        );
    }

    #[test]
    fn keeps_text_before_the_first_marker() {
        assert_eq!(styles().apply("see `1`cat"), "see <b>cat</b>");
    }

    #[test]
    fn keeps_a_marker_of_an_unknown_style() {
        assert_eq!(styles().apply("`9`cat"), "`9`cat");
    }

    #[test]
    fn keeps_text_without_markers() {
        assert_eq!(styles().apply("a `quoted` word"), "a `quoted` word");
    }

    #[test]
    fn reads_a_style_whose_closing_line_is_missing() {
        assert_eq!(StyleSheet::parse("1\n<br>").apply("`1`x"), "<br>x");
    }
}
