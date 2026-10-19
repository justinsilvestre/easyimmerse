//! Sample books that come with an English translation and a narrated clip, aligned with both.

use std::path::Path;

use easyimmerse_core::alignment::{AddAlignmentRequest, AlignmentContent};
use easyimmerse_core::media_file::{MediaFile, MediaFileId, MediaFileSource};
use easyimmerse_core::project::ProjectId;

use super::{SampleContentError, fixture_error, fixture_path, project_exists};
use crate::{Storage, StorageError};

/// Each book's fixtures are named after it: `<name>.epub`, `<name>.en.epub`, `<name>.m4a`,
/// `<name>-translation-alignment.json`, and `<name>-audio-alignment.json`.
pub const SAMPLE_BOOKS: [(&str, &str); 2] = [
    ("placeholder-1", "lazarillo-de-tormes"),
    ("placeholder-2", "toshishun"),
];

/// A sample book's files, read before anything is written.
pub struct BookFixtures {
    project_id: ProjectId,
    name: &'static str,
    paths: [String; 3],
    translation_alignment: AddAlignmentRequest,
    audio_alignment: AddAlignmentRequest,
}

pub fn read_book_fixtures(
    dir: &Path,
    (project_id, name): (&str, &'static str),
) -> Result<BookFixtures, SampleContentError> {
    Ok(BookFixtures {
        project_id: ProjectId(project_id.to_string()),
        name,
        paths: [
            fixture_path(dir, &format!("{name}.epub"))?,
            fixture_path(dir, &format!("{name}.en.epub"))?,
            fixture_path(dir, &format!("{name}.m4a"))?,
        ],
        translation_alignment: read_alignment(dir, &format!("{name}-translation-alignment.json"))?,
        audio_alignment: read_alignment(dir, &format!("{name}-audio-alignment.json"))?,
    })
}

/// Adds the book, its translation, and its audio to the book's project, unless the project is gone
/// or the database received the book before. The book is paired with its translation and aligned with both.
///
/// Each book is marked on its own, so that a database seeded before the book existed still receives it.
pub fn add_sample_book_once(
    storage: &Storage,
    book: &BookFixtures,
) -> Result<(), SampleContentError> {
    let seeded_preference = format!("sample_book_seeded:{}", book.name);
    if storage.get_preference(&seeded_preference)?.is_some() {
        return Ok(());
    }
    if project_exists(storage, &book.project_id)? {
        add_sample_book(storage, book)?;
    }
    Ok(storage.set_preference(&seeded_preference, "true")?)
}

fn add_sample_book(storage: &Storage, book: &BookFixtures) -> Result<(), SampleContentError> {
    let [original_path, translation_path, audio_path] = &book.paths;
    let name = book.name;
    let original = add_file(storage, book, &format!("{name}.epub"), original_path)?;
    let translation = add_file(storage, book, &format!("{name}.en.epub"), translation_path)?;
    let audio = add_file(storage, book, &format!("{name}.m4a"), audio_path)?;
    storage.set_translation_document(&original.id, Some(&translation.id))?;
    let alignments = [
        with_counterpart(&book.translation_alignment, &translation.id),
        with_counterpart(&book.audio_alignment, &audio.id),
    ];
    for alignment in &alignments {
        storage.add_alignment(&original.id, alignment)?;
    }
    Ok(())
}

fn add_file(
    storage: &Storage,
    book: &BookFixtures,
    name: &str,
    path: &str,
) -> Result<MediaFile, StorageError> {
    let source = MediaFileSource::Path {
        path: path.to_string(),
    };
    storage.add_media_file(&book.project_id, name, &source)
}

/// Replaces the placeholder id that the fixture gives the alignment's counterpart.
fn with_counterpart(request: &AddAlignmentRequest, id: &MediaFileId) -> AddAlignmentRequest {
    let mut request = request.clone();
    match &mut request.content {
        AlignmentContent::Audio {
            audio_media_file_id: counterpart,
            ..
        }
        | AlignmentContent::Translation {
            translation_media_file_id: counterpart,
            ..
        } => *counterpart = id.clone(),
    }
    request
}

fn read_alignment(dir: &Path, name: &str) -> Result<AddAlignmentRequest, SampleContentError> {
    let path = dir.join(name);
    let text = std::fs::read_to_string(&path).map_err(|source| fixture_error(&path, source))?;
    serde_json::from_str(&text).map_err(|source| SampleContentError::Alignment { path, source })
}

#[cfg(test)]
mod tests;
