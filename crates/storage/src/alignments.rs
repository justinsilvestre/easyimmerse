use easyimmerse_core::alignment::{AddAlignmentRequest, Alignment, AlignmentContent, AlignmentId};
use easyimmerse_core::media_file::MediaFileId;
use rusqlite::{Connection, OptionalExtension, Row, params};

use crate::error::StorageError;
use crate::media_files::{ensure_media_file_in_project, get_media_file};
use crate::new_row::{generate_id, now_ms};
use crate::stored_integer::{read_json, read_unsigned, to_stored_integer};

const ALIGNMENT_COLUMNS: &str =
    "id, media_file_id, counterpart_media_file_id, kind, provider, content_json, created_at_ms";

/// Lists a document's alignments, newest first.
pub fn list_alignments(
    conn: &Connection,
    media_file_id: &MediaFileId,
) -> Result<Vec<Alignment>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT {ALIGNMENT_COLUMNS} FROM alignments WHERE media_file_id = ?1 \
         ORDER BY created_at_ms DESC, rowid DESC"
    ))?;
    let alignments = statement
        .query_map(params![media_file_id.0], read_alignment)?
        .collect::<Result<_, _>>()?;
    Ok(alignments)
}

/// Adds an alignment to a document. Its counterpart must be another media file of the same project.
pub fn add_alignment(
    conn: &Connection,
    media_file_id: &MediaFileId,
    request: &AddAlignmentRequest,
) -> Result<Alignment, StorageError> {
    let media_file = get_media_file(conn, media_file_id)?;
    let counterpart = request.content.counterpart_media_file_id();
    if counterpart == media_file_id {
        return Err(StorageError::PairedWithItself(media_file_id.0.clone()));
    }
    ensure_media_file_in_project(conn, &media_file.project_id, counterpart)?;
    let id = AlignmentId(generate_id());
    conn.execute(
        &format!(
            "INSERT INTO alignments ({ALIGNMENT_COLUMNS}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
        ),
        params![
            id.0,
            media_file_id.0,
            counterpart.0,
            kind_name(&request.content),
            request.provider,
            serde_json::to_string(&request.content)?,
            to_stored_integer(now_ms()),
        ],
    )?;
    get_alignment(conn, &id)
}

/// Removes one of a document's alignments.
pub fn remove_alignment(
    conn: &Connection,
    media_file_id: &MediaFileId,
    alignment_id: &AlignmentId,
) -> Result<(), StorageError> {
    let removed = conn.execute(
        "DELETE FROM alignments WHERE id = ?1 AND media_file_id = ?2",
        params![alignment_id.0, media_file_id.0],
    )?;
    if removed == 0 {
        Err(StorageError::AlignmentNotFound(alignment_id.0.clone()))
    } else {
        Ok(())
    }
}

fn get_alignment(conn: &Connection, id: &AlignmentId) -> Result<Alignment, StorageError> {
    conn.query_row(
        &format!("SELECT {ALIGNMENT_COLUMNS} FROM alignments WHERE id = ?1"),
        params![id.0],
        read_alignment,
    )
    .optional()?
    .ok_or_else(|| StorageError::AlignmentNotFound(id.0.clone()))
}

fn kind_name(content: &AlignmentContent) -> &'static str {
    match content {
        AlignmentContent::Audio { .. } => "audio",
        AlignmentContent::Translation { .. } => "translation",
    }
}

/// The `kind` and counterpart columns repeat what `content_json` holds, for queries and
/// for the foreign key, so the row is read from the JSON alone.
fn read_alignment(row: &Row) -> rusqlite::Result<Alignment> {
    Ok(Alignment {
        id: AlignmentId(row.get(0)?),
        media_file_id: MediaFileId(row.get(1)?),
        provider: row.get(4)?,
        content: read_json(row, 5)?,
        created_at_ms: read_unsigned(row, 6)?,
    })
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::alignment::{TextSpan, TimedSpan, TranslationLink};
    use easyimmerse_core::media_file::MediaFileSource;
    use easyimmerse_core::project::ProjectId;

    use super::*;
    use crate::Storage;

    fn project() -> ProjectId {
        ProjectId("placeholder-1".to_string())
    }

    fn add_media(storage: &Storage, project_id: &ProjectId, name: &str) -> MediaFileId {
        storage
            .add_media_file(
                project_id,
                name,
                &MediaFileSource::Path {
                    path: format!("/{name}"),
                },
            )
            .unwrap()
            .id
    }

    /// A storage holding a book and its audiobook in the same project.
    fn storage_with_book_and_audio() -> (Storage, MediaFileId, MediaFileId) {
        let storage = Storage::open_in_memory().unwrap();
        crate::review_test_support::seed_known_placeholder_projects(&storage);
        let book = add_media(&storage, &project(), "book.epub");
        let audio = add_media(&storage, &project(), "book.mp3");
        (storage, book, audio)
    }

    fn span(start: u32, end: u32) -> TextSpan {
        TextSpan {
            chapter_index: 0,
            paragraph_index: 0,
            start,
            end,
            quote: None,
        }
    }

    fn audio_request(audio: &MediaFileId) -> AddAlignmentRequest {
        AddAlignmentRequest {
            provider: Some("cloud".to_string()),
            content: AlignmentContent::Audio {
                audio_media_file_id: audio.clone(),
                segments: vec![TimedSpan {
                    span: span(0, 12),
                    start_ms: 0,
                    end_ms: 1500,
                }],
            },
        }
    }

    fn translation_request(translation: &MediaFileId) -> AddAlignmentRequest {
        AddAlignmentRequest {
            provider: None,
            content: AlignmentContent::Translation {
                translation_media_file_id: translation.clone(),
                links: vec![TranslationLink {
                    spans: vec![span(0, 12)],
                    translation_spans: vec![span(0, 10)],
                }],
            },
        }
    }

    #[test]
    fn lists_nothing_for_a_document_without_alignments() {
        let (storage, book, _) = storage_with_book_and_audio();
        assert_eq!(storage.list_alignments(&book).unwrap(), vec![]);
    }

    #[test]
    fn an_added_alignment_is_listed() {
        let (storage, book, audio) = storage_with_book_and_audio();
        let added = storage
            .add_alignment(&book, &audio_request(&audio))
            .unwrap();
        assert_eq!(storage.list_alignments(&book).unwrap(), vec![added]);
    }

    #[test]
    fn an_added_alignment_keeps_its_content() {
        let (storage, book, audio) = storage_with_book_and_audio();
        let added = storage
            .add_alignment(&book, &audio_request(&audio))
            .unwrap();
        assert_eq!(added.content, audio_request(&audio).content);
    }

    #[test]
    fn lists_the_newest_alignment_first() {
        let (storage, book, audio) = storage_with_book_and_audio();
        let translation = add_media(&storage, &project(), "translation.txt");
        storage
            .add_alignment(&book, &audio_request(&audio))
            .unwrap();
        let newer = storage
            .add_alignment(&book, &translation_request(&translation))
            .unwrap();
        assert_eq!(storage.list_alignments(&book).unwrap()[0], newer);
    }

    #[test]
    fn keeps_the_alignments_of_the_counterpart_out_of_the_document_list() {
        let (storage, book, audio) = storage_with_book_and_audio();
        storage
            .add_alignment(&book, &audio_request(&audio))
            .unwrap();
        assert_eq!(storage.list_alignments(&audio).unwrap(), vec![]);
    }

    #[test]
    fn refuses_an_alignment_for_an_unknown_document() {
        let (storage, _, audio) = storage_with_book_and_audio();
        let result =
            storage.add_alignment(&MediaFileId("missing".to_string()), &audio_request(&audio));
        assert!(matches!(result, Err(StorageError::MediaFileNotFound(_))));
    }

    #[test]
    fn refuses_a_counterpart_of_another_project() {
        let (storage, book, _) = storage_with_book_and_audio();
        let foreign = add_media(
            &storage,
            &ProjectId("placeholder-2".to_string()),
            "other.mp3",
        );
        let result = storage.add_alignment(&book, &audio_request(&foreign));
        assert!(matches!(result, Err(StorageError::MediaFileNotFound(_))));
    }

    #[test]
    fn refuses_to_align_a_document_with_itself() {
        let (storage, book, _) = storage_with_book_and_audio();
        let result = storage.add_alignment(&book, &audio_request(&book));
        assert!(matches!(result, Err(StorageError::PairedWithItself(_))));
    }

    #[test]
    fn removes_an_alignment() {
        let (storage, book, audio) = storage_with_book_and_audio();
        let added = storage
            .add_alignment(&book, &audio_request(&audio))
            .unwrap();
        storage.remove_alignment(&book, &added.id).unwrap();
        assert_eq!(storage.list_alignments(&book).unwrap(), vec![]);
    }

    #[test]
    fn removing_an_unknown_alignment_fails() {
        let (storage, book, _) = storage_with_book_and_audio();
        let result = storage.remove_alignment(&book, &AlignmentId("missing".to_string()));
        assert!(matches!(result, Err(StorageError::AlignmentNotFound(_))));
    }

    #[test]
    fn does_not_remove_an_alignment_through_another_document() {
        let (storage, book, audio) = storage_with_book_and_audio();
        let added = storage
            .add_alignment(&book, &audio_request(&audio))
            .unwrap();
        let result = storage.remove_alignment(&audio, &added.id);
        assert!(matches!(result, Err(StorageError::AlignmentNotFound(_))));
    }

    #[test]
    fn removing_the_counterpart_removes_the_alignment() {
        let (storage, book, audio) = storage_with_book_and_audio();
        storage
            .add_alignment(&book, &audio_request(&audio))
            .unwrap();
        storage.remove_media_file(&audio).unwrap();
        assert_eq!(storage.list_alignments(&book).unwrap(), vec![]);
    }

    #[test]
    fn removing_the_document_removes_its_alignments() {
        let (storage, book, audio) = storage_with_book_and_audio();
        let added = storage
            .add_alignment(&book, &audio_request(&audio))
            .unwrap();
        storage.remove_media_file(&book).unwrap();
        assert!(matches!(
            storage.read(|conn| get_alignment(conn, &added.id)),
            Err(StorageError::AlignmentNotFound(_))
        ));
    }

    #[test]
    fn a_new_media_file_has_no_translation_document() {
        let (storage, book, _) = storage_with_book_and_audio();
        assert_eq!(
            storage
                .get_media_file(&book)
                .unwrap()
                .translation_media_file_id,
            None
        );
    }

    #[test]
    fn stores_the_translation_document() {
        let (storage, book, _) = storage_with_book_and_audio();
        let translation = add_media(&storage, &project(), "translation.txt");
        storage
            .set_translation_document(&book, Some(&translation))
            .unwrap();
        assert_eq!(
            storage
                .get_media_file(&book)
                .unwrap()
                .translation_media_file_id,
            Some(translation)
        );
    }

    #[test]
    fn clears_the_translation_document() {
        let (storage, book, _) = storage_with_book_and_audio();
        let translation = add_media(&storage, &project(), "translation.txt");
        storage
            .set_translation_document(&book, Some(&translation))
            .unwrap();
        storage.set_translation_document(&book, None).unwrap();
        assert_eq!(
            storage
                .get_media_file(&book)
                .unwrap()
                .translation_media_file_id,
            None
        );
    }

    #[test]
    fn removing_the_translation_clears_the_pairing() {
        let (storage, book, _) = storage_with_book_and_audio();
        let translation = add_media(&storage, &project(), "translation.txt");
        storage
            .set_translation_document(&book, Some(&translation))
            .unwrap();
        storage.remove_media_file(&translation).unwrap();
        assert_eq!(
            storage
                .get_media_file(&book)
                .unwrap()
                .translation_media_file_id,
            None
        );
    }

    #[test]
    fn refuses_a_translation_document_of_another_project() {
        let (storage, book, _) = storage_with_book_and_audio();
        let foreign = add_media(
            &storage,
            &ProjectId("placeholder-2".to_string()),
            "other.txt",
        );
        let result = storage.set_translation_document(&book, Some(&foreign));
        assert!(matches!(result, Err(StorageError::MediaFileNotFound(_))));
    }

    #[test]
    fn refuses_a_document_as_its_own_translation() {
        let (storage, book, _) = storage_with_book_and_audio();
        let result = storage.set_translation_document(&book, Some(&book));
        assert!(matches!(result, Err(StorageError::PairedWithItself(_))));
    }
}
