//! The fields of the note type, in the order Anki stores them.

use easyimmerse_core::flashcard::FlashcardFieldKey;

/// A field of the note type. The order of `ALL` is the order of the note's field values.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum AnkiField {
    Word,
    WordPronunciation,
    Definition,
    TargetLanguageDefinition,
    Sentence,
    SentenceTranslation,
    SentencePronunciation,
    SentenceAudio,
    Screenshot,
    EasyImmerseId,
}

impl AnkiField {
    pub(crate) const ALL: [AnkiField; 10] = [
        AnkiField::Word,
        AnkiField::WordPronunciation,
        AnkiField::Definition,
        AnkiField::TargetLanguageDefinition,
        AnkiField::Sentence,
        AnkiField::SentenceTranslation,
        AnkiField::SentencePronunciation,
        AnkiField::SentenceAudio,
        AnkiField::Screenshot,
        AnkiField::EasyImmerseId,
    ];

    /// The fields that cards show, which are all but the flashcard id.
    pub(crate) const SHOWN: [AnkiField; 9] = [
        AnkiField::Word,
        AnkiField::WordPronunciation,
        AnkiField::Definition,
        AnkiField::TargetLanguageDefinition,
        AnkiField::Sentence,
        AnkiField::SentenceTranslation,
        AnkiField::SentencePronunciation,
        AnkiField::SentenceAudio,
        AnkiField::Screenshot,
    ];

    /// The field's position among a note's field values.
    pub(crate) fn index(self) -> usize {
        AnkiField::ALL
            .iter()
            .position(|field| *field == self)
            .unwrap_or_default()
    }

    pub(crate) fn name(self) -> &'static str {
        match self {
            AnkiField::Word => "Word",
            AnkiField::WordPronunciation => "Word pronunciation",
            AnkiField::Definition => "Definition",
            AnkiField::TargetLanguageDefinition => "Definition (target language)",
            AnkiField::Sentence => "Sentence",
            AnkiField::SentenceTranslation => "Sentence translation",
            AnkiField::SentencePronunciation => "Sentence pronunciation",
            AnkiField::SentenceAudio => "Sentence audio",
            AnkiField::Screenshot => "Screenshot",
            AnkiField::EasyImmerseId => "easyImmerse id",
        }
    }

    /// The flashcard field the value comes from. The flashcard id has none.
    pub(crate) fn flashcard_field(self) -> Option<FlashcardFieldKey> {
        match self {
            AnkiField::Word => Some(FlashcardFieldKey::Word),
            AnkiField::WordPronunciation => Some(FlashcardFieldKey::WordPronunciation),
            AnkiField::Definition => Some(FlashcardFieldKey::L1Definition),
            AnkiField::TargetLanguageDefinition => Some(FlashcardFieldKey::L2Definition),
            AnkiField::Sentence => Some(FlashcardFieldKey::TextContext),
            AnkiField::SentenceTranslation => Some(FlashcardFieldKey::TextContextTranslation),
            AnkiField::SentencePronunciation => Some(FlashcardFieldKey::TextContextPronunciation),
            AnkiField::SentenceAudio => Some(FlashcardFieldKey::AudioContext),
            AnkiField::Screenshot => Some(FlashcardFieldKey::Screenshot),
            AnkiField::EasyImmerseId => None,
        }
    }
}
