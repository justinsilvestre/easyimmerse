use easyimmerse_core::alignment::{Alignment, TextSpan};
use easyimmerse_core::document::{Document, parse_epub};
use easyimmerse_core::media_file::MediaFile;

use super::*;
use crate::sample_content::tests::{
    fixtures_dir, media_names, placeholder_storage, seeded_storage, spanish_project,
};
use crate::sample_content::{SEEDED_PREFERENCE, seed_sample_content};

fn spanish_media(storage: &Storage) -> Vec<MediaFile> {
    storage.list_media_files(&spanish_project()).unwrap()
}

fn spanish_book_alignments(storage: &Storage) -> Vec<Alignment> {
    storage
        .list_alignments(&spanish_media(storage)[1].id)
        .unwrap()
}

fn parse_fixture(name: &str) -> Document {
    parse_epub(&std::fs::read(fixtures_dir().join(name)).unwrap()).unwrap()
}

fn text_at(document: &Document, span: &TextSpan) -> String {
    let chapter = &document.chapters[span.chapter_index as usize];
    let paragraph: Vec<u16> = chapter.paragraphs[span.paragraph_index as usize]
        .encode_utf16()
        .collect();
    String::from_utf16(&paragraph[span.start as usize..span.end as usize]).unwrap()
}

/// The spans of a book's alignment fixtures whose quotes differ from the parsed text they address.
fn mismatched_quotes(name: &'static str) -> Vec<String> {
    let dir = fixtures_dir();
    let book = read_book_fixtures(&dir, ("placeholder-1", name)).unwrap();
    let original = parse_fixture(&format!("{name}.epub"));
    let translation = parse_fixture(&format!("{name}.en.epub"));
    let mut spans: Vec<(&Document, &TextSpan)> = Vec::new();
    if let AlignmentContent::Audio { segments, .. } = &book.audio_alignment.content {
        spans.extend(segments.iter().map(|segment| (&original, &segment.span)));
    }
    if let AlignmentContent::Translation { links, .. } = &book.translation_alignment.content {
        for link in links {
            spans.extend(link.spans.iter().map(|span| (&original, span)));
            spans.extend(
                link.translation_spans
                    .iter()
                    .map(|span| (&translation, span)),
            );
        }
    }
    spans
        .into_iter()
        .filter(|(document, span)| span.quote.as_deref() != Some(&text_at(document, span)))
        .map(|(_, span)| format!("{span:?}"))
        .collect()
}

#[test]
fn pairs_the_book_with_its_translation() {
    let storage = seeded_storage();
    let media = spanish_media(&storage);
    assert_eq!(
        media[1].translation_media_file_id,
        Some(media[2].id.clone())
    );
}

#[test]
fn aligns_the_book_with_its_translation() {
    let storage = seeded_storage();
    let translation_id = spanish_media(&storage)[2].id.clone();
    assert!(spanish_book_alignments(&storage).iter().any(|alignment| matches!(
        &alignment.content,
        AlignmentContent::Translation { translation_media_file_id, .. } if *translation_media_file_id == translation_id
    )));
}

#[test]
fn aligns_the_book_with_its_audio() {
    let storage = seeded_storage();
    let audio_id = spanish_media(&storage)[3].id.clone();
    assert!(spanish_book_alignments(&storage).iter().any(|alignment| matches!(
        &alignment.content,
        AlignmentContent::Audio { audio_media_file_id, .. } if *audio_media_file_id == audio_id
    )));
}

#[test]
fn quotes_the_spanish_book_as_the_parser_reads_it() {
    assert_eq!(
        mismatched_quotes("lazarillo-de-tormes"),
        Vec::<String>::new()
    );
}

#[test]
fn quotes_the_japanese_book_as_the_parser_reads_it() {
    assert_eq!(mismatched_quotes("toshishun"), Vec::<String>::new());
}

#[test]
fn gives_a_database_seeded_before_the_books_existed_the_books() {
    let storage = placeholder_storage();
    storage.set_preference(SEEDED_PREFERENCE, "true").unwrap();
    seed_sample_content(&storage, &fixtures_dir()).unwrap();
    assert_eq!(
        media_names(&storage, &spanish_project()),
        vec![
            "lazarillo-de-tormes.epub",
            "lazarillo-de-tormes.en.epub",
            "lazarillo-de-tormes.m4a"
        ]
    );
}

#[test]
fn leaves_a_removed_sample_book_removed_when_run_again() {
    let storage = seeded_storage();
    storage
        .remove_media_file(&spanish_media(&storage)[1].id)
        .unwrap();
    seed_sample_content(&storage, &fixtures_dir()).unwrap();
    assert_eq!(spanish_media(&storage).len(), 3);
}
