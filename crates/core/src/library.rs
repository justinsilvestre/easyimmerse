//! The server's library: media that library managers prepare for everyone on the server,
//! with its text divided into words and one dictionary entry chosen for each word.

use serde::{Deserialize, Serialize};
use thiserror::Error;
use ts_rs::TS;
use utoipa::ToSchema;

use crate::flashcard::{AudioClip, FlashcardContent, FlashcardId, Screenshot};
use crate::media_file::MediaFileId;
use crate::project::ProjectId;
use crate::timed_text::TimedTextFormat;

/// Thirty-two lowercase hexadecimal digits, as in the ids the app makes.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(transparent)]
#[ts(export)]
pub struct LibraryItemId(pub String);

impl LibraryItemId {
    /// Tells whether the id has the form of the ids the server makes: thirty-two lowercase hexadecimal digits.
    pub fn is_well_formed(&self) -> bool {
        self.0.len() == 32
            && self
                .0
                .bytes()
                .all(|byte| matches!(byte, b'0'..=b'9' | b'a'..=b'f'))
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum LibraryItemKind {
    Video,
    Audio,
    /// A text file, read in the reader.
    Document,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum LibraryDifficulty {
    Beginner,
    Intermediate,
    Advanced,
}

/// Whether learners can see an item. Only a published item is shown to people who cannot manage the library.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "kind", rename_all = "snake_case")]
#[ts(export)]
pub enum LibraryItemStatus {
    Draft,
    /// The server is preparing the clips and screenshots of a publish.
    Processing,
    Published,
    /// The last publish failed, for the reason the message gives.
    Failed {
        message: String,
    },
}

/// An item of the library, without its text.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct LibraryItem {
    pub id: LibraryItemId,
    pub title: String,
    pub description: String,
    pub language: String,
    pub translation_language: String,
    pub kind: LibraryItemKind,
    pub difficulty: Option<LibraryDifficulty>,
    pub tags: Vec<String>,
    /// The uploaded file's original name. Null until a file is uploaded.
    pub file_name: Option<String>,
    /// The length of a video or audio item, known once it is published.
    pub duration_ms: Option<u64>,
    /// The time of the video frame the cover is taken from. Null for the first cue's screenshot time.
    pub cover_at_ms: Option<u64>,
    pub has_cover: bool,
    pub segment_count: u32,
    pub status: LibraryItemStatus,
    /// Milliseconds since the Unix epoch.
    pub created_at_ms: u64,
    /// Milliseconds since the Unix epoch.
    pub updated_at_ms: u64,
}

/// What a manager sends to create an item or change its metadata.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct LibraryItemDraft {
    pub title: String,
    pub description: String,
    pub language: String,
    pub translation_language: String,
    pub kind: LibraryItemKind,
    pub difficulty: Option<LibraryDifficulty>,
    pub tags: Vec<String>,
    pub cover_at_ms: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct LibraryListing {
    pub items: Vec<LibraryItem>,
}

/// The text of an item: its subtitle cues or paragraphs, in order.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct LibraryText {
    pub segments: Vec<LibrarySegment>,
    /// The titles of a document's chapters, one per chapter, null for an untitled one. Empty for video and audio items.
    pub chapter_titles: Vec<Option<String>>,
}

/// A subtitle cue of a video or audio item, or a paragraph of a document, with the words the manager set.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct LibrarySegment {
    pub index: u32,
    /// The chapter of a document's paragraph.
    pub chapter_index: Option<u32>,
    pub start_ms: Option<u64>,
    pub end_ms: Option<u64>,
    /// The time of the cue's screenshot, set when a video item is published.
    pub screenshot_at_ms: Option<u64>,
    pub text: String,
    pub translation: Option<String>,
    pub words: Vec<LibraryWord>,
}

/// One word of a segment, and the one entry a learner sees for it. Offsets are UTF-16 code units of the segment's text.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct LibraryWord {
    pub start: u32,
    pub end: u32,
    pub entry: LibraryEntry,
}

/// The dictionary entry a manager chose or wrote for a word.
/// L1 is the language the learner already knows; L2 is the one they are learning.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct LibraryEntry {
    pub term: String,
    pub reading: Option<String>,
    pub l1_definition: String,
    pub l2_definition: String,
}

/// Subtitle texts as uploaded; the format is detected when not given, as for subtitle tracks.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct LibrarySubtitles {
    pub target_text: String,
    pub translation_text: Option<String>,
    pub format: Option<TimedTextFormat>,
}

/// What a manager sends to give one entry to every word of an item that has the given text.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ApplyLibraryEntry {
    /// The text of the words, exactly as it stands in their segments.
    pub word_text: String,
    pub entry: LibraryEntry,
}

/// What a learner sends to add an item to a project.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AddLibraryItem {
    /// The project to add the item to. Null to create a project for the item's language.
    pub project_id: Option<ProjectId>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct LibraryItemAdded {
    pub project_id: ProjectId,
    pub media_file_id: MediaFileId,
}

/// What a learner sends to make a flashcard from a library item. Sending the same id again replaces that flashcard.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct NewLibraryFlashcard {
    pub id: FlashcardId,
    pub segment_index: u32,
    /// Where the card's word begins in the segment's text. Null for a card of the whole segment.
    pub word_start: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum LibraryError {
    #[error("{0:?} is not a library item kind, difficulty or status")]
    UnknownName(String),
    #[error("the word from {start} to {end} is empty or runs past the end of the text")]
    WordOutOfRange { start: u32, end: u32 },
    #[error("the word from {start} to {end} begins or ends inside a character")]
    WordOffCharacterBoundary { start: u32, end: u32 },
    #[error("the word starting at {start} overlaps the word before it")]
    WordsOverlap { start: u32 },
    #[error("the word starting at {start} comes before the word listed ahead of it")]
    WordsOutOfOrder { start: u32 },
}

/// Builds the content of a flashcard for the word of the segment that begins at `word_start`,
/// or for the whole segment when `word_start` is None. Returns None when no word begins there.
/// The tags are left empty for the caller to fill.
pub fn library_flashcard_content(
    segment: &LibrarySegment,
    word_start: Option<u32>,
    kind: LibraryItemKind,
) -> Option<FlashcardContent> {
    let entry = match word_start {
        Some(start) => Some(&segment.words.iter().find(|word| word.start == start)?.entry),
        None => None,
    };
    Some(FlashcardContent {
        word: entry.map(|entry| entry.term.clone()).unwrap_or_default(),
        word_pronunciation: entry
            .and_then(|entry| entry.reading.clone())
            .unwrap_or_default(),
        l1_definition: entry
            .map(|entry| entry.l1_definition.clone())
            .unwrap_or_default(),
        l2_definition: entry
            .map(|entry| entry.l2_definition.clone())
            .unwrap_or_default(),
        text_context: segment.text.clone(),
        text_context_translation: segment.translation.clone().unwrap_or_default(),
        text_context_pronunciation: String::new(),
        audio_context: audio_context(segment, kind),
        screenshot: screenshot(segment, kind),
        tags: Vec::new(),
    })
}

fn audio_context(segment: &LibrarySegment, kind: LibraryItemKind) -> Option<AudioClip> {
    if kind == LibraryItemKind::Document {
        return None;
    }
    let (start_ms, end_ms) = segment.start_ms.zip(segment.end_ms)?;
    Some(AudioClip { start_ms, end_ms })
}

fn screenshot(segment: &LibrarySegment, kind: LibraryItemKind) -> Option<Screenshot> {
    if kind != LibraryItemKind::Video {
        return None;
    }
    segment.screenshot_at_ms.map(|at_ms| Screenshot { at_ms })
}

/// Gives the entry to each word of the segment whose text is `word_text`.
/// Returns the segment's new words, or None when no word has that text.
pub fn words_with_entry(
    segment: &LibrarySegment,
    word_text: &str,
    entry: &LibraryEntry,
) -> Option<Vec<LibraryWord>> {
    let units: Vec<u16> = segment.text.encode_utf16().collect();
    let text_of = |word: &LibraryWord| {
        let range = units.get(word.start as usize..word.end as usize)?;
        String::from_utf16(range).ok()
    };
    let matches = |word: &LibraryWord| text_of(word).as_deref() == Some(word_text);
    if !segment.words.iter().any(matches) {
        return None;
    }
    let words = segment.words.iter().map(|word| LibraryWord {
        entry: if matches(word) {
            entry.clone()
        } else {
            word.entry.clone()
        },
        ..word.clone()
    });
    Some(words.collect())
}

/// Checks that each word lies within the text on character boundaries,
/// that no two words overlap, and that the words are listed in the order they appear.
pub fn validate_words(text: &str, words: &[LibraryWord]) -> Result<(), LibraryError> {
    let boundaries = utf16_character_boundaries(text);
    let length = boundaries.last().copied().unwrap_or(0);
    let mut previous: Option<&LibraryWord> = None;
    for word in words {
        let (start, end) = (word.start, word.end);
        if start >= end || end > length {
            return Err(LibraryError::WordOutOfRange { start, end });
        }
        if boundaries.binary_search(&start).is_err() || boundaries.binary_search(&end).is_err() {
            return Err(LibraryError::WordOffCharacterBoundary { start, end });
        }
        if let Some(previous) = previous {
            if start < previous.start {
                return Err(LibraryError::WordsOutOfOrder { start });
            }
            if start < previous.end {
                return Err(LibraryError::WordsOverlap { start });
            }
        }
        previous = Some(word);
    }
    Ok(())
}

/// The UTF-16 offsets at which a character of the text begins, followed by the text's length.
fn utf16_character_boundaries(text: &str) -> Vec<u32> {
    let mut boundaries = vec![0];
    let mut offset = 0u32;
    for character in text.chars() {
        offset += character.len_utf16() as u32;
        boundaries.push(offset);
    }
    boundaries
}

impl LibraryItemKind {
    /// The kind's name as it is serialized and stored.
    pub fn as_str(self) -> &'static str {
        match self {
            LibraryItemKind::Video => "video",
            LibraryItemKind::Audio => "audio",
            LibraryItemKind::Document => "document",
        }
    }

    pub fn parse(name: &str) -> Result<Self, LibraryError> {
        [Self::Video, Self::Audio, Self::Document]
            .into_iter()
            .find(|kind| kind.as_str() == name)
            .ok_or_else(|| LibraryError::UnknownName(name.to_string()))
    }
}

impl LibraryDifficulty {
    /// The difficulty's name as it is serialized and stored.
    pub fn as_str(self) -> &'static str {
        match self {
            LibraryDifficulty::Beginner => "beginner",
            LibraryDifficulty::Intermediate => "intermediate",
            LibraryDifficulty::Advanced => "advanced",
        }
    }

    pub fn parse(name: &str) -> Result<Self, LibraryError> {
        [Self::Beginner, Self::Intermediate, Self::Advanced]
            .into_iter()
            .find(|difficulty| difficulty.as_str() == name)
            .ok_or_else(|| LibraryError::UnknownName(name.to_string()))
    }
}

impl LibraryItemStatus {
    /// The status's name as it is serialized and stored, without a failure's message.
    pub fn as_str(&self) -> &'static str {
        match self {
            LibraryItemStatus::Draft => "draft",
            LibraryItemStatus::Processing => "processing",
            LibraryItemStatus::Published => "published",
            LibraryItemStatus::Failed { .. } => "failed",
        }
    }

    /// Reads a stored status name, taking the message of a failure from `failure`.
    pub fn parse(name: &str, failure: Option<String>) -> Result<Self, LibraryError> {
        match name {
            "draft" => Ok(Self::Draft),
            "processing" => Ok(Self::Processing),
            "published" => Ok(Self::Published),
            "failed" => Ok(Self::Failed {
                message: failure.unwrap_or_default(),
            }),
            other => Err(LibraryError::UnknownName(other.to_string())),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(term: &str) -> LibraryEntry {
        LibraryEntry {
            term: term.to_string(),
            reading: Some(format!("{term} reading")),
            l1_definition: format!("{term} in English"),
            l2_definition: format!("{term} auf Deutsch"),
        }
    }

    fn word(start: u32, end: u32) -> LibraryWord {
        LibraryWord {
            start,
            end,
            entry: entry("Hund"),
        }
    }

    fn segment() -> LibrarySegment {
        LibrarySegment {
            index: 0,
            chapter_index: None,
            start_ms: Some(1_000),
            end_ms: Some(2_000),
            screenshot_at_ms: Some(1_500),
            text: "Der Hund bellt".to_string(),
            translation: Some("The dog barks".to_string()),
            words: vec![word(4, 8)],
        }
    }

    fn segment_with_two_words() -> LibrarySegment {
        LibrarySegment {
            words: vec![word(0, 3), word(4, 8)],
            ..segment()
        }
    }

    #[test]
    fn words_with_entry_gives_the_entry_to_the_word_with_the_text() {
        let words = words_with_entry(&segment_with_two_words(), "Hund", &entry("dog")).unwrap();
        assert_eq!(words[1].entry, entry("dog"));
    }

    #[test]
    fn words_with_entry_leaves_the_other_words_alone() {
        let words = words_with_entry(&segment_with_two_words(), "Hund", &entry("dog")).unwrap();
        assert_eq!(words[0].entry, entry("Hund"));
    }

    #[test]
    fn words_with_entry_changes_nothing_when_no_word_has_the_text() {
        assert_eq!(words_with_entry(&segment(), "Katze", &entry("cat")), None);
    }

    fn content(word_start: Option<u32>, kind: LibraryItemKind) -> Option<FlashcardContent> {
        library_flashcard_content(&segment(), word_start, kind)
    }

    #[test]
    fn library_flashcard_content_takes_the_word_card_from_the_entry() {
        let card = content(Some(4), LibraryItemKind::Video).unwrap();
        assert_eq!(
            (
                card.word,
                card.word_pronunciation,
                card.l1_definition,
                card.l2_definition
            ),
            (
                "Hund".to_string(),
                "Hund reading".to_string(),
                "Hund in English".to_string(),
                "Hund auf Deutsch".to_string()
            )
        );
    }

    #[test]
    fn library_flashcard_content_takes_the_context_from_the_segment() {
        let card = content(Some(4), LibraryItemKind::Video).unwrap();
        assert_eq!(
            (card.text_context, card.text_context_translation),
            ("Der Hund bellt".to_string(), "The dog barks".to_string())
        );
    }

    #[test]
    fn library_flashcard_content_gives_a_video_card_its_clip_and_screenshot() {
        let card = content(Some(4), LibraryItemKind::Video).unwrap();
        assert_eq!(
            (card.audio_context, card.screenshot),
            (
                Some(AudioClip {
                    start_ms: 1_000,
                    end_ms: 2_000
                }),
                Some(Screenshot { at_ms: 1_500 })
            )
        );
    }

    #[test]
    fn library_flashcard_content_gives_an_audio_card_no_screenshot() {
        let card = content(Some(4), LibraryItemKind::Audio).unwrap();
        assert_eq!(card.screenshot, None);
    }

    #[test]
    fn library_flashcard_content_leaves_the_word_of_a_cue_only_card_empty() {
        let card = content(None, LibraryItemKind::Video).unwrap();
        assert_eq!(card.word, "");
    }

    #[test]
    fn library_flashcard_content_keeps_the_clip_of_a_cue_only_card() {
        let card = content(None, LibraryItemKind::Audio).unwrap();
        assert!(card.audio_context.is_some());
    }

    #[test]
    fn library_flashcard_content_gives_a_document_card_no_clip() {
        let card = content(Some(4), LibraryItemKind::Document).unwrap();
        assert_eq!(card.audio_context, None);
    }

    #[test]
    fn library_flashcard_content_refuses_an_unknown_word() {
        assert_eq!(content(Some(5), LibraryItemKind::Video), None);
    }

    #[test]
    fn validate_words_accepts_ordered_words() {
        assert_eq!(
            validate_words("Der Hund bellt", &[word(0, 3), word(4, 8)]),
            Ok(())
        );
    }

    #[test]
    fn validate_words_refuses_overlapping_words() {
        assert_eq!(
            validate_words("Der Hund bellt", &[word(0, 5), word(4, 8)]),
            Err(LibraryError::WordsOverlap { start: 4 })
        );
    }

    #[test]
    fn validate_words_refuses_words_out_of_order() {
        assert_eq!(
            validate_words("Der Hund bellt", &[word(4, 8), word(0, 3)]),
            Err(LibraryError::WordsOutOfOrder { start: 0 })
        );
    }

    #[test]
    fn validate_words_refuses_a_word_inside_a_character() {
        // The emoji takes two UTF-16 code units, so offset 1 falls inside it.
        assert_eq!(
            validate_words("😀 Hund", &[word(1, 3)]),
            Err(LibraryError::WordOffCharacterBoundary { start: 1, end: 3 })
        );
    }

    #[test]
    fn validate_words_refuses_a_word_past_the_end() {
        assert_eq!(
            validate_words("Hund", &[word(0, 5)]),
            Err(LibraryError::WordOutOfRange { start: 0, end: 5 })
        );
    }

    #[test]
    fn tags_a_failed_status_with_its_kind() {
        let json = serde_json::to_value(LibraryItemStatus::Failed {
            message: "no audio".to_string(),
        })
        .unwrap();
        assert_eq!(
            json,
            serde_json::json!({ "kind": "failed", "message": "no audio" })
        );
    }

    #[test]
    fn parses_the_kind_name_it_stores() {
        assert_eq!(
            LibraryItemKind::parse(LibraryItemKind::Document.as_str()),
            Ok(LibraryItemKind::Document)
        );
    }
}
