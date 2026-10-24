use std::io::{Cursor, Read};

use zip::ZipArchive;

use super::epub::{find_rootfile_path, parent_directory, read_entry, resolve_href};
use super::error::DocumentError;
use super::opf::parse_opf;
use crate::image_media_type::image_media_type;

/// A picture taken from a book.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BookPicture {
    /// The type of the picture, told from its bytes.
    pub media_type: &'static str,
    pub bytes: Vec<u8>,
}

/// Takes the cover picture out of an EPUB archive. Returns None when the book names no cover,
/// when the archive lacks the file it names, or when that file is not a JPEG, PNG, GIF or WebP picture.
pub fn epub_cover(bytes: &[u8]) -> Result<Option<BookPicture>, DocumentError> {
    let mut archive = ZipArchive::new(Cursor::new(bytes))?;
    let opf_path = find_rootfile_path(&read_entry(&mut archive, "META-INF/container.xml")?)?;
    let opf = parse_opf(&read_entry(&mut archive, &opf_path)?)?;
    let Some(item) = opf.find_cover_item() else {
        return Ok(None);
    };
    let href = resolve_href(parent_directory(&opf_path), &item.href);
    let Some(picture) = read_entry_bytes(&mut archive, &href)? else {
        return Ok(None);
    };
    Ok(image_media_type(&picture).map(|media_type| BookPicture {
        media_type,
        bytes: picture,
    }))
}

fn read_entry_bytes(
    archive: &mut ZipArchive<Cursor<&[u8]>>,
    name: &str,
) -> Result<Option<Vec<u8>>, DocumentError> {
    let Ok(mut entry) = archive.by_name(name) else {
        return Ok(None);
    };
    let mut bytes = Vec::new();
    entry
        .read_to_end(&mut bytes)
        .map_err(|source| DocumentError::UnreadableEntry {
            name: name.to_string(),
            source,
        })?;
    Ok(Some(bytes))
}

#[cfg(test)]
mod tests {
    use std::io::Write;

    use zip::ZipWriter;
    use zip::write::SimpleFileOptions;

    use super::*;
    use crate::test_support::read_fixture_bytes;

    const JPEG: &[u8] = &[0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10];

    const CONTAINER: &str = r#"<container><rootfiles>
        <rootfile full-path="OEBPS/content.opf"/>
    </rootfiles></container>"#;

    /// An EPUB archive whose package document has the given manifest and metadata, with the given other files.
    fn epub(metadata: &str, manifest: &str, files: &[(&str, &[u8])]) -> Vec<u8> {
        let opf = format!(
            "<package><metadata>{metadata}</metadata><manifest>{manifest}</manifest><spine/></package>"
        );
        let mut zip = ZipWriter::new(Cursor::new(Vec::new()));
        let entries = [
            ("META-INF/container.xml", CONTAINER.as_bytes()),
            ("OEBPS/content.opf", opf.as_bytes()),
        ];
        for (name, bytes) in entries.iter().chain(files) {
            zip.start_file(*name, SimpleFileOptions::default()).unwrap();
            zip.write_all(bytes).unwrap();
        }
        zip.finish().unwrap().into_inner()
    }

    fn epub_3_with_cover(cover: &[u8]) -> Vec<u8> {
        let manifest = r#"<item id="cover" href="images/cover.jpg" properties="cover-image"/>"#;
        epub("", manifest, &[("OEBPS/images/cover.jpg", cover)])
    }

    #[test]
    fn takes_the_cover_an_epub_3_book_marks() {
        let cover = epub_cover(&epub_3_with_cover(JPEG)).unwrap();
        assert_eq!(
            cover,
            Some(BookPicture {
                media_type: "image/jpeg",
                bytes: JPEG.to_vec()
            })
        );
    }

    #[test]
    fn takes_the_cover_an_epub_2_book_names() {
        let bytes = epub(
            r#"<meta name="cover" content="pic"/>"#,
            r#"<item id="pic" href="../cover.jpg"/>"#,
            &[("cover.jpg", JPEG)],
        );
        assert_eq!(
            epub_cover(&bytes).unwrap().map(|cover| cover.bytes),
            Some(JPEG.to_vec())
        );
    }

    #[test]
    fn takes_no_cover_from_a_book_that_names_none() {
        assert_eq!(
            epub_cover(&read_fixture_bytes("sample.epub")).unwrap(),
            None
        );
    }

    #[test]
    fn takes_no_cover_that_the_archive_lacks() {
        let manifest = r#"<item id="cover" href="missing.jpg" properties="cover-image"/>"#;
        assert_eq!(epub_cover(&epub("", manifest, &[])).unwrap(), None);
    }

    #[test]
    fn takes_no_cover_that_is_not_a_picture_it_can_show() {
        let svg = br#"<svg xmlns="http://www.w3.org/2000/svg"/>"#;
        assert_eq!(epub_cover(&epub_3_with_cover(svg)).unwrap(), None);
    }
}
