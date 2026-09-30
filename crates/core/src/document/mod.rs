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
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct Chapter {
    pub title: Option<String>,
    pub paragraphs: Vec<String>,
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
