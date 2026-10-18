use roxmltree::{Document as XmlDocument, Node};

use super::error::DocumentError;
use super::{Chapter, InlineElementId, ParagraphProvenance};
use crate::text_blocks::BYTE_ORDER_MARK;

/// A chapter extracted from a content document, with where each of its paragraphs came from.
#[derive(Debug, Clone, PartialEq)]
pub struct ExtractedChapter {
    pub chapter: Chapter,
    /// One per entry of `chapter.paragraphs`, in the same order.
    pub paragraphs: Vec<ParagraphProvenance>,
}

/// Extracts a chapter from an XHTML content document: the first `h1`, `h2`, or `h3` becomes
/// the title, and each `p` becomes one paragraph with inline elements merged into its text
/// and whitespace collapsed to single spaces. Each paragraph's provenance records the `p`'s
/// `id` and the range of the text of every element with an `id` inside it.
pub fn extract_chapter_with_provenance(xhtml: &str) -> Result<ExtractedChapter, DocumentError> {
    let document = XmlDocument::parse(xhtml)?;
    let title = document
        .descendants()
        .find(is_heading)
        .map(|node| collapse(node).text);
    let (paragraphs, provenance) = document
        .descendants()
        .filter(|node| node.has_tag_name("p"))
        .map(|node| {
            let collapsed = collapse(node);
            let provenance = ParagraphProvenance {
                element_id: node.attribute("id").map(String::from),
                inline_ids: collapsed.inline_ids,
            };
            (collapsed.text, provenance)
        })
        .filter(|(text, _)| !text.is_empty())
        .unzip();
    Ok(ExtractedChapter {
        chapter: Chapter {
            title: title.filter(|text| !text.is_empty()),
            paragraphs,
        },
        paragraphs: provenance,
    })
}

fn is_heading(node: &Node) -> bool {
    ["h1", "h2", "h3"].iter().any(|tag| node.has_tag_name(*tag))
}

/// The text of an element, with the ranges of the elements with an `id` inside it.
struct CollapsedText {
    text: String,
    inline_ids: Vec<InlineElementId>,
}

/// Concatenates every text node under `node`, leaving out byte order marks and collapsing
/// runs of whitespace to one space with none at either end, in one pass over the subtree.
///
/// The length of the output so far, in UTF-16 code units, is the position of whatever is
/// appended next. A space is only written once the next visible character arrives, so an
/// element with an `id` starts at its first visible character, after any collapsed space
/// before it, and ends after its last one, before any collapsed space after it. An element
/// with no visible text has an empty range: just after a collapsed space before it when more
/// text follows, and at the current end of the output otherwise.
fn collapse(node: Node) -> CollapsedText {
    let mut collapser = Collapser::default();
    collapser.walk_children(node);
    collapser.finish()
}

#[derive(Default)]
struct Collapser {
    text: String,
    /// The length of `text` in UTF-16 code units.
    length: u32,
    /// Whether whitespace has been seen since the last visible character, after some text.
    pending_space: bool,
    ids: Vec<PendingId>,
    /// Entries of `ids` whose start is the position of the next visible character.
    awaiting_start: Vec<usize>,
}

struct PendingId {
    id: String,
    start: Option<u32>,
    end: Option<u32>,
    /// Whether the element closed with no visible text, so that its range stays empty.
    closed_empty: bool,
}

impl Collapser {
    /// Appends the text under `node` in document order, noting where each element with an
    /// `id` starts and ends. The recursion is as deep as the XML, which the parser limits.
    fn walk_children(&mut self, node: Node) {
        for child in node.children() {
            if child.is_element() {
                let index = child.attribute("id").map(|id| self.open_id(id));
                self.walk_children(child);
                if let Some(index) = index {
                    self.close_id(index);
                }
            } else if child.is_text() {
                child
                    .text()
                    .unwrap_or_default()
                    .chars()
                    .for_each(|character| self.push(character));
            }
        }
    }

    fn push(&mut self, character: char) {
        if character == BYTE_ORDER_MARK {
            return;
        }
        if character.is_whitespace() {
            self.pending_space |= !self.text.is_empty();
            return;
        }
        if self.pending_space {
            self.append(' ');
            self.pending_space = false;
        }
        for index in self.awaiting_start.drain(..) {
            let pending = &mut self.ids[index];
            pending.start = Some(self.length);
            if pending.closed_empty {
                pending.end = Some(self.length);
            }
        }
        self.append(character);
    }

    fn append(&mut self, character: char) {
        self.text.push(character);
        // A char is one or two UTF-16 code units, so the cast cannot truncate.
        self.length = self.length.saturating_add(character.len_utf16() as u32);
    }

    /// Notes an element with an `id` whose text comes next, and returns its index in `ids`.
    fn open_id(&mut self, id: &str) -> usize {
        self.ids.push(PendingId {
            id: id.to_string(),
            start: None,
            end: None,
            closed_empty: false,
        });
        let index = self.ids.len() - 1;
        self.awaiting_start.push(index);
        index
    }

    /// Ends the range of the element at `index` in `ids` after the text appended so far.
    fn close_id(&mut self, index: usize) {
        let length = self.length;
        let pending = &mut self.ids[index];
        if pending.start.is_some() {
            pending.end = Some(length);
        } else if self.pending_space {
            pending.closed_empty = true;
        } else {
            pending.start = Some(length);
            pending.end = Some(length);
            self.awaiting_start.retain(|&awaiting| awaiting != index);
        }
    }

    fn finish(self) -> CollapsedText {
        let length = self.length;
        CollapsedText {
            text: self.text,
            inline_ids: self
                .ids
                .into_iter()
                .map(|pending| InlineElementId {
                    id: pending.id,
                    start: pending.start.unwrap_or(length),
                    end: pending.end.unwrap_or(length),
                })
                .collect(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::document::parse_epub;
    use crate::test_support::read_fixture_bytes;

    fn extract_chapter(xhtml: &str) -> Result<Chapter, DocumentError> {
        extract_chapter_with_provenance(xhtml).map(|extracted| extracted.chapter)
    }

    fn provenance_of(body: &str) -> Vec<ParagraphProvenance> {
        extract_chapter_with_provenance(&wrap(body))
            .unwrap()
            .paragraphs
    }

    fn inline_ids_of(body: &str) -> Vec<InlineElementId> {
        provenance_of(body).remove(0).inline_ids
    }

    fn inline_id(id: &str, start: u32, end: u32) -> InlineElementId {
        InlineElementId {
            id: id.to_string(),
            start,
            end,
        }
    }

    fn wrap(body: &str) -> String {
        format!(r#"<html xmlns="http://www.w3.org/1999/xhtml"><body>{body}</body></html>"#)
    }

    #[test]
    fn removes_a_byte_order_mark_inside_a_paragraph() {
        let xhtml = wrap("<p>Fir\u{feff}st one.</p>");
        assert_eq!(
            extract_chapter(&xhtml).unwrap().paragraphs,
            vec!["First one."]
        );
    }

    #[test]
    fn reads_a_chapter_that_starts_with_a_byte_order_mark() {
        let xhtml = format!("\u{feff}{}", wrap("<p>First one.</p>"));
        assert_eq!(
            extract_chapter(&xhtml).unwrap().paragraphs,
            vec!["First one."]
        );
    }

    #[test]
    fn uses_the_first_heading_as_the_title() {
        let chapter = extract_chapter(&wrap("<h2>Two</h2><h1>One</h1>")).unwrap();
        assert_eq!(chapter.title, Some("Two".into()));
    }

    #[test]
    fn leaves_the_title_empty_without_a_heading() {
        assert_eq!(extract_chapter(&wrap("<p>Text</p>")).unwrap().title, None);
    }

    #[test]
    fn merges_inline_elements_into_the_paragraph_text() {
        let chapter =
            extract_chapter(&wrap("<p>Say <span>good <em>night</em></span>.</p>")).unwrap();
        assert_eq!(chapter.paragraphs, vec!["Say good night."]);
    }

    #[test]
    fn collapses_whitespace_inside_a_paragraph() {
        let chapter = extract_chapter(&wrap("<p>\n  One\n  two  </p>")).unwrap();
        assert_eq!(chapter.paragraphs, vec!["One two"]);
    }

    #[test]
    fn skips_empty_paragraphs() {
        assert_eq!(
            extract_chapter(&wrap("<p> </p><p>A</p>"))
                .unwrap()
                .paragraphs,
            vec!["A"]
        );
    }

    #[test]
    fn rejects_malformed_xml() {
        assert!(matches!(
            extract_chapter("<html>"),
            Err(DocumentError::Xml(_))
        ));
    }

    #[test]
    fn records_the_id_of_the_paragraph_element() {
        assert_eq!(
            provenance_of(r#"<p id="p1">Text</p>"#)[0].element_id,
            Some("p1".into())
        );
    }

    #[test]
    fn records_no_id_for_a_paragraph_element_without_one() {
        assert_eq!(provenance_of("<p>Text</p>")[0].element_id, None);
    }

    #[test]
    fn records_one_provenance_per_paragraph_leaving_out_empty_ones() {
        let ids: Vec<Option<String>> =
            provenance_of(r#"<h1 id="h">Title</h1><p id="a">A</p><p id="e"> </p><p id="b">B</p>"#)
                .into_iter()
                .map(|provenance| provenance.element_id)
                .collect();
        assert_eq!(ids, vec![Some("a".into()), Some("b".into())]);
    }

    #[test]
    fn records_the_range_of_an_inline_element_with_an_id() {
        assert_eq!(
            inline_ids_of(r#"<p>The <span id="s1">old</span> house</p>"#),
            vec![inline_id("s1", 4, 7)]
        );
    }

    #[test]
    fn records_the_collapsed_range_of_an_inline_element_with_whitespace() {
        assert_eq!(
            inline_ids_of("<p>The <span id=\"s1\">\n  very\n   old  </span>  house</p>"),
            vec![inline_id("s1", 4, 12)]
        );
    }

    #[test]
    fn keeps_the_text_of_a_paragraph_with_inline_whitespace_unchanged() {
        assert_eq!(
            extract_chapter(&wrap(
                "<p>The <span id=\"s1\">\n  very\n   old  </span>  house</p>"
            ))
            .unwrap()
            .paragraphs,
            vec!["The very old house"]
        );
    }

    #[test]
    fn counts_inline_ranges_in_utf16_code_units() {
        assert_eq!(
            inline_ids_of(r#"<p>Ça 😀 <span id="s1">été</span>.</p>"#),
            vec![inline_id("s1", 6, 9)]
        );
    }

    #[test]
    fn records_nested_inline_elements_in_document_order() {
        assert_eq!(
            inline_ids_of(r#"<p>Say <span id="a">good <em id="b">night</em></span>.</p>"#),
            vec![inline_id("a", 4, 14), inline_id("b", 9, 14)]
        );
    }

    #[test]
    fn leaves_byte_order_marks_out_of_inline_ranges() {
        assert_eq!(
            inline_ids_of("<p>A\u{feff}B <span id=\"s1\">C</span></p>"),
            vec![inline_id("s1", 3, 4)]
        );
    }

    #[test]
    fn gives_an_empty_element_an_empty_range_where_it_stands() {
        assert_eq!(
            inline_ids_of(r#"<p>old<a id="n1"/> house</p>"#),
            vec![inline_id("n1", 3, 3)]
        );
    }

    #[test]
    fn places_an_empty_element_after_a_space_before_it() {
        assert_eq!(
            inline_ids_of(r#"<p>old <a id="n1"/>house</p>"#),
            vec![inline_id("n1", 4, 4)]
        );
    }

    #[test]
    fn places_an_empty_element_at_the_start_of_a_paragraph_at_zero() {
        assert_eq!(
            inline_ids_of(r#"<p> <a id="n1"> </a> house</p>"#),
            vec![inline_id("n1", 0, 0)]
        );
    }

    #[test]
    fn places_an_empty_element_at_the_end_of_a_paragraph_at_its_length() {
        assert_eq!(
            inline_ids_of(r#"<p>old <a id="n1"/> </p>"#),
            vec![inline_id("n1", 3, 3)]
        );
    }

    #[test]
    fn records_the_provenance_of_the_epub_fixture() {
        let document = parse_epub(&read_fixture_bytes("sample.epub")).unwrap();
        let provenance = document.provenance.unwrap();
        let hrefs: Vec<&str> = provenance
            .chapters
            .iter()
            .map(|chapter| chapter.href.as_str())
            .collect();
        assert_eq!(hrefs, vec!["OEBPS/chapter1.xhtml", "OEBPS/chapter2.xhtml"]);
    }

    #[test]
    fn records_one_paragraph_provenance_per_paragraph_of_the_epub_fixture() {
        let document = parse_epub(&read_fixture_bytes("sample.epub")).unwrap();
        let counts: Vec<(usize, usize)> = document
            .chapters
            .iter()
            .zip(&document.provenance.unwrap().chapters)
            .map(|(chapter, provenance)| (chapter.paragraphs.len(), provenance.paragraphs.len()))
            .collect();
        assert_eq!(counts, vec![(2, 2), (2, 2)]);
    }

    #[test]
    fn keeps_the_first_paragraph_of_the_epub_fixture_unchanged() {
        let document = parse_epub(&read_fixture_bytes("sample.epub")).unwrap();
        assert_eq!(
            document.chapters[0].paragraphs[0],
            "The cat is sleeping on the windowsill."
        );
    }
}
