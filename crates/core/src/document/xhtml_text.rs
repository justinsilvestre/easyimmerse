use roxmltree::{Document as XmlDocument, Node};

use super::Chapter;
use super::error::DocumentError;

/// Extracts a chapter from an XHTML content document: the first `h1`, `h2`, or `h3` becomes
/// the title, and each `p` becomes one paragraph with inline elements merged into its text
/// and whitespace collapsed to single spaces.
pub fn extract_chapter(xhtml: &str) -> Result<Chapter, DocumentError> {
    let document = XmlDocument::parse(xhtml)?;
    let title = document.descendants().find(is_heading).map(collapsed_text);
    let paragraphs = document
        .descendants()
        .filter(|node| node.has_tag_name("p"))
        .map(collapsed_text)
        .filter(|text| !text.is_empty())
        .collect();
    Ok(Chapter {
        title: title.filter(|text| !text.is_empty()),
        paragraphs,
    })
}

fn is_heading(node: &Node) -> bool {
    ["h1", "h2", "h3"].iter().any(|tag| node.has_tag_name(*tag))
}

/// Concatenates every text node under `node`, then collapses runs of whitespace to one space.
fn collapsed_text(node: Node) -> String {
    let text: String = node
        .descendants()
        .filter(Node::is_text)
        .filter_map(|node| node.text())
        .collect();
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn wrap(body: &str) -> String {
        format!(r#"<html xmlns="http://www.w3.org/1999/xhtml"><body>{body}</body></html>"#)
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
}
