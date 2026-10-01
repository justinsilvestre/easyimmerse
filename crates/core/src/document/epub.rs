use std::io::{Cursor, Read};

use percent_encoding::percent_decode_str;
use roxmltree::Document as XmlDocument;
use zip::ZipArchive;
use zip::result::ZipError;

use super::error::DocumentError;
use super::opf::{Opf, parse_opf};
use super::xhtml_text::extract_chapter;
use super::{Chapter, Document};

/// Parses an EPUB archive into a document with one chapter per spine item, skipping the
/// navigation document.
pub fn parse_epub(bytes: &[u8]) -> Result<Document, DocumentError> {
    let mut archive = ZipArchive::new(Cursor::new(bytes))?;
    let opf_path = find_rootfile_path(&read_entry(&mut archive, "META-INF/container.xml")?)?;
    let opf = parse_opf(&read_entry(&mut archive, &opf_path)?)?;
    let chapters = read_chapters(&mut archive, &opf, parent_directory(&opf_path))?;
    Ok(Document {
        title: opf.title,
        language: opf.language,
        chapters,
    })
}

fn find_rootfile_path(container_xml: &str) -> Result<String, DocumentError> {
    let document = XmlDocument::parse(container_xml)?;
    document
        .descendants()
        .find(|node| node.has_tag_name("rootfile"))
        .and_then(|node| node.attribute("full-path"))
        .map(String::from)
        .ok_or(DocumentError::MissingRootfile)
}

fn read_chapters(
    archive: &mut ZipArchive<Cursor<&[u8]>>,
    opf: &Opf,
    directory: &str,
) -> Result<Vec<Chapter>, DocumentError> {
    let mut chapters = Vec::new();
    for idref in &opf.spine {
        let item = opf
            .find_manifest_item(idref)
            .ok_or_else(|| DocumentError::UnknownSpineItem(idref.clone()))?;
        if !item.is_navigation() {
            chapters.push(extract_chapter(&read_entry(
                archive,
                &resolve_href(directory, &item.href),
            )?)?);
        }
    }
    Ok(chapters)
}

fn read_entry(
    archive: &mut ZipArchive<Cursor<&[u8]>>,
    name: &str,
) -> Result<String, DocumentError> {
    let mut entry = archive.by_name(name).map_err(|error| match error {
        ZipError::FileNotFound => DocumentError::MissingEntry(name.to_string()),
        other => DocumentError::Archive(other),
    })?;
    let mut text = String::new();
    entry
        .read_to_string(&mut text)
        .map_err(|source| DocumentError::UnreadableEntry {
            name: name.to_string(),
            source,
        })?;
    Ok(text)
}

fn parent_directory(path: &str) -> &str {
    path.rsplit_once('/').map_or("", |(directory, _)| directory)
}

/// Joins an href from the OPF onto the OPF's directory,
/// resolving `.` and `..` segments and dropping any fragment.
/// The result is percent-decoded, since archive entry names are not percent-encoded.
fn resolve_href(directory: &str, href: &str) -> String {
    let encoded_path = href.split('#').next().unwrap_or_default();
    let path = percent_decode_str(encoded_path).decode_utf8_lossy();
    let mut segments: Vec<&str> = directory
        .split('/')
        .filter(|segment| !segment.is_empty())
        .collect();
    for segment in path.split('/') {
        match segment {
            ".." => {
                segments.pop();
            }
            "." | "" => {}
            other => segments.push(other),
        }
    }
    segments.join("/")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::read_fixture_bytes;

    fn parse_fixture() -> Document {
        parse_epub(&read_fixture_bytes("sample.epub")).expect("fixture should parse")
    }

    #[test]
    fn reads_the_title_of_the_epub_fixture() {
        assert_eq!(parse_fixture().title, "Sample Book");
    }

    #[test]
    fn reads_the_language_of_the_epub_fixture() {
        assert_eq!(parse_fixture().language, Some("en".into()));
    }

    #[test]
    fn skips_the_navigation_document() {
        assert_eq!(parse_fixture().chapters.len(), 2);
    }

    #[test]
    fn reads_the_chapter_titles_in_spine_order() {
        let titles: Vec<Option<String>> = parse_fixture()
            .chapters
            .iter()
            .map(|c| c.title.clone())
            .collect();
        assert_eq!(
            titles,
            vec![Some("Chapter One".into()), Some("Chapter Two".into())]
        );
    }

    #[test]
    fn reads_the_paragraphs_of_chapter_one() {
        assert_eq!(
            parse_fixture().chapters[0].paragraphs,
            vec![
                "The cat is sleeping on the windowsill.",
                "The dog wants to eat, and it is hungry."
            ]
        );
    }

    #[test]
    fn merges_the_inline_span_of_chapter_two_into_one_paragraph() {
        assert_eq!(
            parse_fixture().chapters[1].paragraphs[1],
            "The cat says good night to the dog."
        );
    }

    #[test]
    fn rejects_bytes_that_are_not_a_zip_archive() {
        assert!(matches!(
            parse_epub(b"not a zip"),
            Err(DocumentError::Archive(_))
        ));
    }

    #[test]
    fn rejects_an_archive_without_a_container_file() {
        assert!(matches!(
            parse_epub(&read_fixture_bytes("sample-yomitan.zip")),
            Err(DocumentError::MissingEntry(name)) if name == "META-INF/container.xml"
        ));
    }

    #[test]
    fn percent_decodes_hrefs() {
        assert_eq!(
            resolve_href("OEBPS", "Chapter%201.xhtml"),
            "OEBPS/Chapter 1.xhtml"
        );
    }

    #[test]
    fn resolves_hrefs_relative_to_the_opf_directory() {
        assert_eq!(
            resolve_href("OEBPS", "../images/./a.png#frag"),
            "images/a.png"
        );
    }
}
