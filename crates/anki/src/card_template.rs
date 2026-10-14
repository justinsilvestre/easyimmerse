//! The card template, which places each field on the front or the back of the card.

use easyimmerse_core::flashcard::FlashcardFieldKey;

use crate::anki_field::AnkiField;
use crate::note_type::AnkiTemplate;

/// The fields the front shows when every front field of a card is empty, so that no card has a blank front.
const FALLBACK_FIELDS: [AnkiField; 2] = [AnkiField::Word, AnkiField::Sentence];

/// Builds the note type's single card template from the fields chosen for the front.
/// When every front field of a card is empty, the front shows the word and the sentence instead, and the back leaves them out.
pub(crate) fn card_template(front_fields: &[FlashcardFieldKey]) -> AnkiTemplate {
    let is_front = |field: &AnkiField| {
        field
            .flashcard_field()
            .is_some_and(|key| front_fields.contains(&key))
    };
    let (front, back): (Vec<AnkiField>, Vec<AnkiField>) =
        AnkiField::SHOWN.into_iter().partition(is_front);
    AnkiTemplate {
        name: "Card".to_owned(),
        front: front_template(&front),
        back: back_template(&front, &back),
    }
}

fn front_template(front: &[AnkiField]) -> String {
    let fallback: Vec<String> = FALLBACK_FIELDS
        .into_iter()
        .filter(|field| !front.contains(field))
        .map(field_block)
        .collect();
    let mut lines: Vec<String> = front.iter().copied().map(field_block).collect();
    if !fallback.is_empty() {
        lines.push(when_all_empty(front, &fallback.join("\n")));
    }
    lines.join("\n")
}

fn back_template(front: &[AnkiField], back: &[AnkiField]) -> String {
    let mut lines = vec!["{{FrontSide}}".to_owned(), "<hr id=answer>".to_owned()];
    lines.extend(back.iter().map(|&field| {
        if FALLBACK_FIELDS.contains(&field) {
            when_any_set(front, &field_block(field))
        } else {
            field_block(field)
        }
    }));
    lines.retain(|line| !line.is_empty());
    lines.join("\n")
}

/// Shows a field's value in an element whose class the card's CSS styles, and nothing when the value is empty.
fn field_block(field: AnkiField) -> String {
    let name = field.name();
    format!(
        "{}<div class=\"{}\">{{{{{name}}}}}</div>{}",
        section(name),
        css_class(field),
        close(name)
    )
}

fn when_all_empty(fields: &[AnkiField], content: &str) -> String {
    let opening: String = fields.iter().map(|field| inverted(field.name())).collect();
    let closing: String = fields
        .iter()
        .rev()
        .map(|field| close(field.name()))
        .collect();
    if fields.is_empty() {
        content.to_owned()
    } else {
        format!("{opening}\n{content}\n{closing}")
    }
}

/// Shows the content when any of the fields has a value, as a chain of sections, since templates have no "or".
fn when_any_set(fields: &[AnkiField], content: &str) -> String {
    match fields {
        [] => String::new(),
        [only] => format!(
            "{}\n{content}\n{}",
            section(only.name()),
            close(only.name())
        ),
        [first, rest @ ..] => {
            let name = first.name();
            let others = when_any_set(rest, content);
            format!(
                "{}\n{content}\n{}\n{}\n{others}\n{}",
                section(name),
                close(name),
                inverted(name),
                close(name)
            )
        }
    }
}

fn section(name: &str) -> String {
    format!("{{{{#{name}}}}}")
}

fn inverted(name: &str) -> String {
    format!("{{{{^{name}}}}}")
}

fn close(name: &str) -> String {
    format!("{{{{/{name}}}}}")
}

fn css_class(field: AnkiField) -> &'static str {
    match field {
        AnkiField::Word => "word",
        AnkiField::WordPronunciation | AnkiField::SentencePronunciation => "pronunciation",
        AnkiField::Definition | AnkiField::TargetLanguageDefinition => "definition",
        AnkiField::Sentence => "sentence",
        AnkiField::SentenceTranslation => "translation",
        AnkiField::SentenceAudio => "audio",
        AnkiField::Screenshot => "screenshot",
        AnkiField::EasyImmerseId => "id",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::INTERMEDIATE_FRONT;

    const ADVANCED_FRONT: [FlashcardFieldKey; 3] = [
        FlashcardFieldKey::Word,
        FlashcardFieldKey::TextContext,
        FlashcardFieldKey::Screenshot,
    ];

    const WORD: &str = r#"{{#Word}}<div class="word">{{Word}}</div>{{/Word}}"#;
    const WORD_PRONUNCIATION: &str = r#"{{#Word pronunciation}}<div class="pronunciation">{{Word pronunciation}}</div>{{/Word pronunciation}}"#;
    const DEFINITION: &str =
        r#"{{#Definition}}<div class="definition">{{Definition}}</div>{{/Definition}}"#;
    const TARGET_DEFINITION: &str = r#"{{#Definition (target language)}}<div class="definition">{{Definition (target language)}}</div>{{/Definition (target language)}}"#;
    const SENTENCE: &str = r#"{{#Sentence}}<div class="sentence">{{Sentence}}</div>{{/Sentence}}"#;
    const TRANSLATION: &str = r#"{{#Sentence translation}}<div class="translation">{{Sentence translation}}</div>{{/Sentence translation}}"#;
    const SENTENCE_PRONUNCIATION: &str = r#"{{#Sentence pronunciation}}<div class="pronunciation">{{Sentence pronunciation}}</div>{{/Sentence pronunciation}}"#;
    const AUDIO: &str =
        r#"{{#Sentence audio}}<div class="audio">{{Sentence audio}}</div>{{/Sentence audio}}"#;
    const SCREENSHOT: &str =
        r#"{{#Screenshot}}<div class="screenshot">{{Screenshot}}</div>{{/Screenshot}}"#;

    /// The lines that show `block` on the back of the intermediate layout only when the audio or the screenshot is set.
    fn unless_fallback(block: &str) -> String {
        [
            "{{#Sentence audio}}",
            block,
            "{{/Sentence audio}}",
            "{{^Sentence audio}}",
            "{{#Screenshot}}",
            block,
            "{{/Screenshot}}",
            "{{/Sentence audio}}",
        ]
        .join("\n")
    }

    #[test]
    fn puts_the_intermediate_front_fields_before_the_fallback() {
        let expected = [
            AUDIO,
            SCREENSHOT,
            "{{^Sentence audio}}{{^Screenshot}}",
            WORD,
            SENTENCE,
            "{{/Screenshot}}{{/Sentence audio}}",
        ]
        .join("\n");
        assert_eq!(card_template(&INTERMEDIATE_FRONT).front, expected);
    }

    #[test]
    fn shows_the_word_and_sentence_on_the_intermediate_back_unless_the_front_fell_back_to_them() {
        let expected = [
            "{{FrontSide}}",
            "<hr id=answer>",
            &unless_fallback(WORD),
            WORD_PRONUNCIATION,
            DEFINITION,
            TARGET_DEFINITION,
            &unless_fallback(SENTENCE),
            TRANSLATION,
            SENTENCE_PRONUNCIATION,
        ]
        .join("\n");
        assert_eq!(card_template(&INTERMEDIATE_FRONT).back, expected);
    }

    #[test]
    fn needs_no_fallback_on_the_advanced_front() {
        let expected = [WORD, SENTENCE, SCREENSHOT].join("\n");
        assert_eq!(card_template(&ADVANCED_FRONT).front, expected);
    }

    #[test]
    fn puts_the_other_fields_on_the_advanced_back() {
        let expected = [
            "{{FrontSide}}",
            "<hr id=answer>",
            WORD_PRONUNCIATION,
            DEFINITION,
            TARGET_DEFINITION,
            TRANSLATION,
            SENTENCE_PRONUNCIATION,
            AUDIO,
        ]
        .join("\n");
        assert_eq!(card_template(&ADVANCED_FRONT).back, expected);
    }

    #[test]
    fn shows_the_word_and_sentence_on_the_front_when_no_field_is_chosen_for_it() {
        assert_eq!(card_template(&[]).front, [WORD, SENTENCE].join("\n"));
    }

    #[test]
    fn leaves_the_word_and_sentence_off_the_back_when_no_field_is_chosen_for_the_front() {
        let expected = [
            "{{FrontSide}}",
            "<hr id=answer>",
            WORD_PRONUNCIATION,
            DEFINITION,
            TARGET_DEFINITION,
            TRANSLATION,
            SENTENCE_PRONUNCIATION,
            AUDIO,
            SCREENSHOT,
        ]
        .join("\n");
        assert_eq!(card_template(&[]).back, expected);
    }

    #[test]
    fn ignores_tags_among_the_front_fields() {
        assert_eq!(
            card_template(&[FlashcardFieldKey::Tags]),
            card_template(&[])
        );
    }
}
