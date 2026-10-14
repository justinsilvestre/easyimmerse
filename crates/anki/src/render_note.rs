use easyimmerse_core::flashcard::{Flashcard, FlashcardFieldKey, FlashcardId};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::anki_field::AnkiField;
use crate::field_html::{markdown_html, plain_text_html};
use crate::guid::note_guid;
use crate::media_ref::{AnkiMediaRef, media_refs};

/// One flashcard rendered as an Anki note.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AnkiNote {
    pub flashcard_id: FlashcardId,
    /// Derived from the flashcard id, and so the same across exports. Anki recognizes a note it already has by this value.
    pub guid: String,
    /// The flashcard's `created_at_ms`, which Anki shows as the note's creation date.
    pub note_id: u64,
    /// The flashcard's `updated_at_ms`. When importing a note it already has, Anki updates it only if this time is newer.
    pub updated_at_ms: u64,
    /// Field values as HTML, in the order of `AnkiNoteType.fields`.
    pub fields: Vec<String>,
    pub tags: Vec<String>,
    /// The media files the fields refer to, which the caller renders and supplies.
    pub media: Vec<AnkiMediaRef>,
}

impl AnkiNote {
    /// Drops the reference to a media file that could not be supplied, leaving its field empty.
    /// A field that named a file Anki does not have would show a broken image or a missing sound,
    /// and would keep the card's front from falling back as it does for a flashcard without that media.
    pub fn without_media(mut self, file_name: &str) -> Self {
        let Some(index) = self
            .media
            .iter()
            .position(|item| item.file_name() == file_name)
        else {
            return self;
        };
        let field = match self.media.remove(index) {
            AnkiMediaRef::Audio { .. } => AnkiField::SentenceAudio,
            AnkiMediaRef::Screenshot { .. } => AnkiField::Screenshot,
        };
        if let Some(value) = self.fields.get_mut(field.index()) {
            value.clear();
        }
        self
    }
}

/// Renders a flashcard as a note of its project's note type. Fields the flashcard does not include are left empty.
pub fn render_note(flashcard: &Flashcard) -> AnkiNote {
    let media = media_refs(flashcard);
    AnkiNote {
        flashcard_id: flashcard.id.clone(),
        guid: note_guid(&flashcard.id),
        note_id: flashcard.created_at_ms,
        updated_at_ms: flashcard.updated_at_ms,
        fields: AnkiField::ALL
            .into_iter()
            .map(|field| field_value(field, flashcard, &media))
            .collect(),
        tags: tags(flashcard),
        media,
    }
}

fn field_value(field: AnkiField, flashcard: &Flashcard, media: &[AnkiMediaRef]) -> String {
    let is_excluded = field
        .flashcard_field()
        .is_some_and(|key| !flashcard.included_fields.contains(&key));
    if is_excluded {
        return String::new();
    }
    let content = &flashcard.content;
    match field {
        AnkiField::Word => plain_text_html(&content.word),
        AnkiField::WordPronunciation => plain_text_html(&content.word_pronunciation),
        AnkiField::Definition => markdown_html(&content.l1_definition),
        AnkiField::TargetLanguageDefinition => markdown_html(&content.l2_definition),
        AnkiField::Sentence => plain_text_html(&content.text_context),
        AnkiField::SentenceTranslation => plain_text_html(&content.text_context_translation),
        AnkiField::SentencePronunciation => plain_text_html(&content.text_context_pronunciation),
        AnkiField::SentenceAudio => sound_reference(media),
        AnkiField::Screenshot => image_reference(media),
        AnkiField::EasyImmerseId => plain_text_html(&flashcard.id.0),
    }
}

fn sound_reference(media: &[AnkiMediaRef]) -> String {
    let audio = media.iter().find_map(|item| match item {
        AnkiMediaRef::Audio { file_name, .. } => Some(file_name),
        AnkiMediaRef::Screenshot { .. } => None,
    });
    audio
        .map(|name| format!("[sound:{name}]"))
        .unwrap_or_default()
}

fn image_reference(media: &[AnkiMediaRef]) -> String {
    let screenshot = media.iter().find_map(|item| match item {
        AnkiMediaRef::Screenshot { file_name, .. } => Some(file_name),
        AnkiMediaRef::Audio { .. } => None,
    });
    screenshot
        .map(|name| format!("<img src=\"{name}\">"))
        .unwrap_or_default()
}

/// Turns the flashcard's tags into Anki tags, which cannot contain spaces.
fn tags(flashcard: &Flashcard) -> Vec<String> {
    if !flashcard.included_fields.contains(&FlashcardFieldKey::Tags) {
        return Vec::new();
    }
    let words = |tag: &String| tag.split_whitespace().collect::<Vec<_>>().join("_");
    flashcard
        .content
        .tags
        .iter()
        .map(words)
        .filter(|tag| !tag.is_empty())
        .collect()
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::media_file::MediaFileId;

    use super::*;
    use crate::test_support::{FLASHCARD_ID, flashcard};

    fn field(note: &AnkiNote, name: &str) -> String {
        let index = AnkiField::ALL
            .iter()
            .position(|field| field.name() == name)
            .expect("the field exists");
        note.fields[index].clone()
    }

    fn excluding(key: FlashcardFieldKey) -> Flashcard {
        let mut flashcard = flashcard();
        flashcard
            .included_fields
            .retain(|included| *included != key);
        flashcard
    }

    #[test]
    fn renders_a_definition_from_markdown() {
        let note = render_note(&flashcard());
        assert_eq!(
            field(&note, "Definition (target language)"),
            "ein <em>Gebäude</em>"
        );
    }

    #[test]
    fn leaves_an_excluded_field_empty() {
        let note = render_note(&excluding(FlashcardFieldKey::L1Definition));
        assert_eq!(field(&note, "Definition"), "");
    }

    #[test]
    fn refers_to_the_sentence_audio_as_a_sound() {
        let note = render_note(&flashcard());
        assert_eq!(
            field(&note, "Sentence audio"),
            format!("[sound:{FLASHCARD_ID}.m4a]")
        );
    }

    #[test]
    fn refers_to_the_screenshot_as_an_image() {
        let note = render_note(&flashcard());
        assert_eq!(
            field(&note, "Screenshot"),
            format!("<img src=\"{FLASHCARD_ID}.jpg\">")
        );
    }

    #[test]
    fn holds_the_flashcard_id() {
        let note = render_note(&flashcard());
        assert_eq!(field(&note, "easyImmerse id"), FLASHCARD_ID);
    }

    #[test]
    fn lists_the_media_the_fields_refer_to() {
        let media_file_id = MediaFileId("media-1".to_owned());
        assert_eq!(
            render_note(&flashcard()).media,
            [
                AnkiMediaRef::Audio {
                    file_name: format!("{FLASHCARD_ID}.m4a"),
                    media_file_id: media_file_id.clone(),
                    start_ms: 1_000,
                    end_ms: 2_500,
                },
                AnkiMediaRef::Screenshot {
                    file_name: format!("{FLASHCARD_ID}.jpg"),
                    media_file_id,
                    at_ms: 1_800,
                },
            ]
        );
    }

    #[test]
    fn empties_the_field_of_a_media_file_dropped() {
        let note = render_note(&flashcard()).without_media(&format!("{FLASHCARD_ID}.jpg"));
        assert_eq!(field(&note, "Screenshot"), "");
    }

    #[test]
    fn keeps_the_other_media_when_one_is_dropped() {
        let note = render_note(&flashcard()).without_media(&format!("{FLASHCARD_ID}.jpg"));
        assert_eq!(
            note.media
                .iter()
                .map(AnkiMediaRef::file_name)
                .collect::<Vec<_>>(),
            [format!("{FLASHCARD_ID}.m4a")]
        );
    }

    #[test]
    fn changes_nothing_when_dropping_a_file_the_note_does_not_name() {
        let note = render_note(&flashcard());
        assert_eq!(note.clone().without_media("other.jpg"), note);
    }

    #[test]
    fn needs_no_media_for_an_excluded_screenshot() {
        let note = render_note(&excluding(FlashcardFieldKey::Screenshot));
        assert_eq!(note.media.len(), 1);
    }

    #[test]
    fn needs_no_media_once_the_media_file_is_removed() {
        let mut flashcard = flashcard();
        flashcard.media_file_id = None;
        assert_eq!(render_note(&flashcard).media, []);
    }

    #[test]
    fn joins_the_words_of_a_tag() {
        assert_eq!(render_note(&flashcard()).tags, ["chapter_one", "noun"]);
    }

    #[test]
    fn leaves_out_excluded_tags() {
        let note = render_note(&excluding(FlashcardFieldKey::Tags));
        assert_eq!(note.tags, Vec::<String>::new());
    }

    #[test]
    fn takes_the_note_id_from_the_creation_time() {
        assert_eq!(render_note(&flashcard()).note_id, 1_760_100_000_000);
    }
}
