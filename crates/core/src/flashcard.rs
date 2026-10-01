//! The flashcard model: its fields, the settings that decide which fields a new card gets,
//! presets for those settings, and drafting a card from a word in context.
//!
//! "L1" is the user's own language, the project's translation language. "L2" is the
//! language being learned, the project's target language.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::media_file::MediaId;
use crate::time_range::TimeRange;

/// Builds the flashcard a click on a word produces, before the user edits it.
///
/// Only the fields the settings include are present, in the canonical field order. A field
/// whose value is unknown is still present with an empty value, so the editing form can
/// offer it. The audio clip and the screenshot are not stored as text: the card records
/// the clip range and the screenshot time, and the media is produced on export.
pub fn draft_flashcard(request: FlashcardDraftRequest) -> NewFlashcard {
    let fields = canonical_field_order()
        .iter()
        .filter(|kind| request.settings.included_fields.contains(kind))
        .map(|kind| FlashcardField {
            kind: *kind,
            value: draft_field_value(*kind, &request),
        })
        .collect();
    NewFlashcard {
        media_id: request.media_id.clone(),
        fields,
        tags: draft_tags(&request),
        clip: request.clip,
        screenshot_ms: request.screenshot_ms,
    }
}

/// Returns the fields a preset includes, in the canonical field order.
pub fn preset_fields(preset: FlashcardPreset) -> Vec<FlashcardFieldKind> {
    use FlashcardFieldKind::*;
    match preset {
        FlashcardPreset::Beginner => vec![
            Word,
            WordPronunciation,
            L1Definition,
            Context,
            ContextTranslation,
            ContextPronunciation,
            ContextAudio,
            Screenshot,
        ],
        FlashcardPreset::Intermediate => vec![
            Word,
            L1Definition,
            Context,
            ContextTranslation,
            ContextAudio,
            Screenshot,
        ],
        FlashcardPreset::Advanced => vec![Word, L2Definition, Context, ContextAudio, Screenshot],
    }
}

/// The order fields appear in on a card and in the editing form.
pub fn canonical_field_order() -> [FlashcardFieldKind; 9] {
    use FlashcardFieldKind::*;
    [
        Word,
        WordPronunciation,
        L1Definition,
        L2Definition,
        Context,
        ContextTranslation,
        ContextPronunciation,
        ContextAudio,
        Screenshot,
    ]
}

fn draft_field_value(kind: FlashcardFieldKind, request: &FlashcardDraftRequest) -> String {
    use FlashcardFieldKind::*;
    match kind {
        Word => request
            .lemma
            .clone()
            .unwrap_or_else(|| request.word.clone()),
        WordPronunciation => request.reading.clone().unwrap_or_default(),
        L1Definition => request.l1_definitions.join("\n"),
        L2Definition => request.l2_definitions.join("\n"),
        Context => request.context.clone().unwrap_or_default(),
        ContextTranslation => request.context_translation.clone().unwrap_or_default(),
        ContextPronunciation | ContextAudio | Screenshot => String::new(),
    }
}

fn draft_tags(request: &FlashcardDraftRequest) -> Vec<String> {
    let mut tags = request.settings.default_tags.clone();
    if request.settings.tag_with_media_name {
        if let Some(name) = &request.media_name {
            tags.push(media_name_tag(name));
        }
    }
    tags
}

/// Turns a file name into a tag: the extension is dropped and whitespace becomes
/// underscores, since Anki separates tags on whitespace.
pub fn media_name_tag(name: &str) -> String {
    let stem = name.rsplit_once('.').map_or(name, |(stem, _)| stem);
    stem.split_whitespace().collect::<Vec<_>>().join("_")
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(transparent)]
#[ts(export)]
pub struct FlashcardId(pub String);

/// A saved flashcard.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct Flashcard {
    pub id: FlashcardId,
    /// The media file the card was made from, when it was made from one.
    pub media_id: Option<MediaId>,
    pub fields: Vec<FlashcardField>,
    pub tags: Vec<String>,
    /// The span of the media file the context audio is cut from.
    pub clip: Option<TimeRange>,
    /// The media time the screenshot is taken at.
    pub screenshot_ms: Option<u64>,
    /// An RFC 3339 timestamp.
    pub created_at: String,
}

/// A flashcard as sent to be created or updated: everything but the id and the timestamp.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct NewFlashcard {
    pub media_id: Option<MediaId>,
    pub fields: Vec<FlashcardField>,
    pub tags: Vec<String>,
    pub clip: Option<TimeRange>,
    pub screenshot_ms: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct FlashcardField {
    pub kind: FlashcardFieldKind,
    pub value: String,
}

/// The kinds of field a flashcard can have. Each kind appears at most once on a card.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum FlashcardFieldKind {
    /// The dictionary headword, or the word as it appeared when no entry was found.
    Word,
    WordPronunciation,
    /// The definition in the user's own language.
    L1Definition,
    /// The definition in the language being learned.
    L2Definition,
    /// The sentence or subtitle cue the word appeared in.
    Context,
    ContextTranslation,
    ContextPronunciation,
    /// The audio of the context, cut from the media file on export.
    ContextAudio,
    /// A video frame from within the context, captured on export.
    Screenshot,
}

/// Per-project defaults for new flashcards.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct FlashcardSettings {
    pub included_fields: Vec<FlashcardFieldKind>,
    pub default_tags: Vec<String>,
    /// Adds a tag made from the media file's name to every new card.
    pub tag_with_media_name: bool,
    /// Fills the audio fields with synthesized speech when the media has no audio track.
    pub use_tts_when_no_audio: bool,
}

impl FlashcardSettings {
    pub fn for_preset(preset: FlashcardPreset) -> Self {
        Self {
            included_fields: preset_fields(preset),
            default_tags: Vec::new(),
            tag_with_media_name: true,
            use_tts_when_no_audio: false,
        }
    }
}

/// Named starting points for the flashcard settings, by learner level.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum FlashcardPreset {
    Beginner,
    Intermediate,
    Advanced,
}

/// Everything the app knows about a word at the moment the user asks for a flashcard.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct FlashcardDraftRequest {
    /// The word as it appeared in the text.
    pub word: String,
    /// The dictionary headword, when a lookup found one.
    pub lemma: Option<String>,
    pub reading: Option<String>,
    pub l1_definitions: Vec<String>,
    pub l2_definitions: Vec<String>,
    pub context: Option<String>,
    pub context_translation: Option<String>,
    pub media_id: Option<MediaId>,
    pub media_name: Option<String>,
    pub clip: Option<TimeRange>,
    pub screenshot_ms: Option<u64>,
    pub settings: FlashcardSettings,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request(preset: FlashcardPreset) -> FlashcardDraftRequest {
        FlashcardDraftRequest {
            word: "cats".into(),
            lemma: Some("cat".into()),
            reading: Some("kæt".into()),
            l1_definitions: vec!["Katze".into()],
            l2_definitions: vec!["a small domesticated carnivorous mammal".into()],
            context: Some("The cats are sleeping.".into()),
            context_translation: Some("Die Katzen schlafen.".into()),
            media_id: Some(MediaId("m1".into())),
            media_name: Some("Episode 1.mp4".into()),
            clip: Some(TimeRange {
                start_ms: 500,
                end_ms: 1500,
            }),
            screenshot_ms: Some(1000),
            settings: FlashcardSettings::for_preset(preset),
        }
    }

    fn kinds(card: &NewFlashcard) -> Vec<FlashcardFieldKind> {
        card.fields.iter().map(|field| field.kind).collect()
    }

    fn value_of(card: &NewFlashcard, kind: FlashcardFieldKind) -> Option<&str> {
        card.fields
            .iter()
            .find(|field| field.kind == kind)
            .map(|field| field.value.as_str())
    }

    #[test]
    fn the_beginner_preset_includes_the_pronunciation_fields() {
        let fields = preset_fields(FlashcardPreset::Beginner);
        assert!(fields.contains(&FlashcardFieldKind::WordPronunciation));
    }

    #[test]
    fn the_intermediate_preset_excludes_the_pronunciation_fields() {
        let fields = preset_fields(FlashcardPreset::Intermediate);
        assert!(!fields.contains(&FlashcardFieldKind::WordPronunciation));
    }

    #[test]
    fn the_advanced_preset_excludes_the_l1_definition() {
        let fields = preset_fields(FlashcardPreset::Advanced);
        assert!(!fields.contains(&FlashcardFieldKind::L1Definition));
    }

    #[test]
    fn the_advanced_preset_includes_the_l2_definition() {
        let fields = preset_fields(FlashcardPreset::Advanced);
        assert!(fields.contains(&FlashcardFieldKind::L2Definition));
    }

    #[test]
    fn drafts_only_the_included_fields_in_canonical_order() {
        let card = draft_flashcard(request(FlashcardPreset::Advanced));
        assert_eq!(kinds(&card), preset_fields(FlashcardPreset::Advanced));
    }

    #[test]
    fn prefers_the_lemma_for_the_word_field() {
        let card = draft_flashcard(request(FlashcardPreset::Beginner));
        assert_eq!(value_of(&card, FlashcardFieldKind::Word), Some("cat"));
    }

    #[test]
    fn falls_back_to_the_word_as_it_appeared_without_a_lemma() {
        let mut request = request(FlashcardPreset::Beginner);
        request.lemma = None;
        let card = draft_flashcard(request);
        assert_eq!(value_of(&card, FlashcardFieldKind::Word), Some("cats"));
    }

    #[test]
    fn joins_several_definitions_with_line_breaks() {
        let mut request = request(FlashcardPreset::Beginner);
        request.l1_definitions = vec!["Katze".into(), "Kater".into()];
        let card = draft_flashcard(request);
        assert_eq!(
            value_of(&card, FlashcardFieldKind::L1Definition),
            Some("Katze\nKater")
        );
    }

    #[test]
    fn leaves_the_screenshot_field_empty() {
        let card = draft_flashcard(request(FlashcardPreset::Beginner));
        assert_eq!(value_of(&card, FlashcardFieldKind::Screenshot), Some(""));
    }

    #[test]
    fn keeps_the_clip_and_screenshot_time() {
        let card = draft_flashcard(request(FlashcardPreset::Beginner));
        assert_eq!(
            (card.clip.map(|c| c.end_ms), card.screenshot_ms),
            (Some(1500), Some(1000))
        );
    }

    #[test]
    fn tags_the_card_with_the_media_name_by_default() {
        let card = draft_flashcard(request(FlashcardPreset::Beginner));
        assert_eq!(card.tags, vec!["Episode_1".to_string()]);
    }

    #[test]
    fn puts_the_default_tags_before_the_media_name_tag() {
        let mut request = request(FlashcardPreset::Beginner);
        request.settings.default_tags = vec!["german".into()];
        let card = draft_flashcard(request);
        assert_eq!(
            card.tags,
            vec!["german".to_string(), "Episode_1".to_string()]
        );
    }

    #[test]
    fn omits_the_media_name_tag_when_the_setting_is_off() {
        let mut request = request(FlashcardPreset::Beginner);
        request.settings.tag_with_media_name = false;
        let card = draft_flashcard(request);
        assert!(card.tags.is_empty());
    }

    #[test]
    fn a_media_name_tag_has_no_extension_and_no_spaces() {
        assert_eq!(media_name_tag("My Show S01E02.mkv"), "My_Show_S01E02");
    }
}
