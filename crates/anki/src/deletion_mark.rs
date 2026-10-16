//! The note that marks, on import, the note of a flashcard deleted in easyImmerse, since a package cannot delete a note.

use easyimmerse_core::flashcard::AnkiPendingDeletion;

use crate::anki_field::AnkiField;
use crate::field_html::plain_text_html;
use crate::guid::note_guid;
use crate::render_note::AnkiNote;

/// The tag of a note that marks a flashcard deleted in easyImmerse, which the user searches Anki for.
pub const DELETED_TAG: &str = "easyImmerse::deleted";

/// Renders the note that replaces, on import, the note of a flashcard deleted in easyImmerse.
/// It shares the note's GUID and keeps the flashcard id; every other field is empty except the word field,
/// which tells the user to delete the note. Its only tag is `DELETED_TAG`.
pub fn deletion_mark(deletion: &AnkiPendingDeletion) -> AnkiNote {
    let mut fields = vec![String::new(); AnkiField::ALL.len()];
    fields[AnkiField::Word.index()] = plain_text_html(&deletion_notice(&deletion.word));
    fields[AnkiField::EasyImmerseId.index()] = plain_text_html(&deletion.flashcard_id.0);
    AnkiNote {
        flashcard_id: deletion.flashcard_id.clone(),
        guid: note_guid(&deletion.flashcard_id),
        note_id: deletion.requested_at_ms,
        fields,
        tags: vec![DELETED_TAG.to_owned()],
        media: Vec::new(),
    }
}

fn deletion_notice(word: &str) -> String {
    if word.is_empty() {
        "This flashcard was deleted in easyImmerse. Delete this note.".to_owned()
    } else {
        format!("“{word}” was deleted in easyImmerse. Delete this note.")
    }
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::flashcard::FlashcardId;

    use super::*;
    use crate::render_note::render_note;
    use crate::test_support::{FLASHCARD_ID, flashcard};

    fn deletion(word: &str) -> AnkiPendingDeletion {
        AnkiPendingDeletion {
            flashcard_id: FlashcardId(FLASHCARD_ID.to_owned()),
            word: word.to_owned(),
            requested_at_ms: 1_760_400_000_000,
            reached_by_package: true,
            reached_by_anki_connect: false,
        }
    }

    #[test]
    fn shares_the_guid_of_the_flashcards_note() {
        assert_eq!(
            deletion_mark(&deletion("Haus")).guid,
            render_note(&flashcard()).guid
        );
    }

    #[test]
    fn tells_the_user_in_the_word_field_to_delete_the_note() {
        let mark = deletion_mark(&deletion("Haus"));
        assert_eq!(
            mark.fields[AnkiField::Word.index()],
            "“Haus” was deleted in easyImmerse. Delete this note."
        );
    }

    #[test]
    fn names_a_flashcard_deleted_without_a_word_in_general() {
        let mark = deletion_mark(&deletion(""));
        assert_eq!(
            mark.fields[AnkiField::Word.index()],
            "This flashcard was deleted in easyImmerse. Delete this note."
        );
    }

    #[test]
    fn escapes_the_word_as_html() {
        let mark = deletion_mark(&deletion("<b>"));
        assert_eq!(
            mark.fields[AnkiField::Word.index()],
            "“&lt;b&gt;” was deleted in easyImmerse. Delete this note."
        );
    }

    #[test]
    fn keeps_the_flashcard_id() {
        let mark = deletion_mark(&deletion("Haus"));
        assert_eq!(mark.fields[AnkiField::EasyImmerseId.index()], FLASHCARD_ID);
    }

    #[test]
    fn empties_every_other_field() {
        let mark = deletion_mark(&deletion("Haus"));
        let others: Vec<&String> = AnkiField::ALL
            .iter()
            .filter(|field| !matches!(field, AnkiField::Word | AnkiField::EasyImmerseId))
            .map(|field| &mark.fields[field.index()])
            .collect();
        assert!(others.iter().all(|value| value.is_empty()));
    }

    #[test]
    fn carries_only_the_deleted_tag() {
        assert_eq!(deletion_mark(&deletion("Haus")).tags, vec![DELETED_TAG]);
    }

    #[test]
    fn refers_to_no_media() {
        assert!(deletion_mark(&deletion("Haus")).media.is_empty());
    }
}
