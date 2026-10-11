//! Ebooks and plain text, parsed into chapters of paragraphs.

mod epub;
mod error;
mod opf;
mod plain_text;
mod xhtml_text;

pub use epub::parse_epub;
pub use error::DocumentError;
pub use plain_text::parse_plain_text;

use std::io::Cursor;

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;
use zip::ZipArchive;

/// Parses a document, detecting the format from the bytes when none is given.
pub fn parse_document(
    bytes: &[u8],
    format: Option<DocumentFormat>,
) -> Result<Document, DocumentError> {
    match format.unwrap_or_else(|| detect_document_format(bytes)) {
        DocumentFormat::Epub => parse_epub(bytes),
        DocumentFormat::PlainText => {
            let text = std::str::from_utf8(bytes).map_err(|_| DocumentError::InvalidUtf8)?;
            Ok(parse_plain_text(text))
        }
    }
}

/// Reports EPUB when the bytes are a zip archive with a `mimetype` entry, and plain text
/// otherwise.
pub fn detect_document_format(bytes: &[u8]) -> DocumentFormat {
    if bytes.starts_with(b"PK") && has_mimetype_entry(bytes) {
        DocumentFormat::Epub
    } else {
        DocumentFormat::PlainText
    }
}

fn has_mimetype_entry(bytes: &[u8]) -> bool {
    ZipArchive::new(Cursor::new(bytes))
        .is_ok_and(|archive| archive.index_for_name("mimetype").is_some())
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct Document {
    pub title: String,
    pub language: Option<String>,
    pub chapters: Vec<Chapter>,
    /// Where each paragraph came from in the source file, for formats that address their text
    /// by element ids (EPUB). Absent for plain text.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub provenance: Option<DocumentProvenance>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct Chapter {
    pub title: Option<String>,
    pub paragraphs: Vec<String>,
}

/// Where the paragraphs of a parsed EPUB came from, so that text addressed by element id
/// (as media overlays address it) can be turned into positions in the parsed document.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct DocumentProvenance {
    /// One per entry of `Document.chapters`, in the same order.
    pub chapters: Vec<ChapterProvenance>,
}

/// Where the paragraphs of one chapter came from.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ChapterProvenance {
    /// The path of the chapter's content document inside the EPUB archive: the manifest
    /// item's href resolved against the package document's directory and percent-decoded,
    /// as in `OEBPS/chapter1.xhtml`.
    pub href: String,
    /// One per entry of the chapter's `paragraphs`, in the same order.
    pub paragraphs: Vec<ParagraphProvenance>,
}

/// Where one paragraph came from in its content document.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ParagraphProvenance {
    /// The `id` attribute of the block element the paragraph was extracted from.
    pub element_id: Option<String>,
    /// Every element with an `id` inside the block, in document order.
    pub inline_ids: Vec<InlineElementId>,
}

/// An element with an `id` inside a paragraph's block, and the range its text occupies in the
/// paragraph after whitespace is collapsed.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct InlineElementId {
    pub id: String,
    /// The first UTF-16 code unit of the element's text within the paragraph. An element whose
    /// text is empty after collapsing whitespace has an empty range at its position.
    pub start: u32,
    /// The UTF-16 code unit just after the element's text.
    pub end: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum DocumentFormat {
    Epub,
    PlainText,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::read_fixture_bytes;

    #[test]
    fn detects_the_epub_fixture_as_epub() {
        assert_eq!(
            detect_document_format(&read_fixture_bytes("sample.epub")),
            DocumentFormat::Epub
        );
    }

    #[test]
    fn detects_text_as_plain_text() {
        assert_eq!(
            detect_document_format(b"Hello.\n\nGoodbye."),
            DocumentFormat::PlainText
        );
    }

    #[test]
    fn detects_a_zip_without_a_mimetype_entry_as_plain_text() {
        assert_eq!(
            detect_document_format(&read_fixture_bytes("sample-yomitan.zip")),
            DocumentFormat::PlainText
        );
    }

    #[test]
    fn parses_the_epub_fixture_when_no_format_is_given() {
        let document = parse_document(&read_fixture_bytes("sample.epub"), None).unwrap();
        assert_eq!(document.title, "Sample Book");
    }

    #[test]
    fn parses_plain_text_into_one_chapter() {
        let document = parse_document(b"Hello.\n\nGoodbye.", None).unwrap();
        assert_eq!(document.chapters.len(), 1);
    }

    #[test]
    fn rejects_plain_text_that_is_not_utf8() {
        assert!(matches!(
            parse_document(&[0xff, 0xfe], Some(DocumentFormat::PlainText)),
            Err(DocumentError::InvalidUtf8)
        ));
    }
}
