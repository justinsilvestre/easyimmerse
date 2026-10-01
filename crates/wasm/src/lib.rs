//! The WebAssembly facade over `easyimmerse-core`.
//!
//! Every exported function takes and returns JSON strings so that the TypeScript wrapper in
//! `packages/wasm` can type them with the ts-rs output in `packages/types`, without a second
//! type generator for the wasm boundary.

mod json_call;

use easyimmerse_core::dictionary::{self, Dictionary};
use easyimmerse_core::document::{self, DocumentFormat};
use easyimmerse_core::flashcard::{self, FlashcardDraftRequest};
use easyimmerse_core::text_source::TextSource;
use easyimmerse_core::timed_text::{self, ParseTimedTextRequest};
use wasm_bindgen::JsError;

pub use json_call::JsonCallError;
use json_call::{parse_input, to_json, to_json_result};

/// Parses a JSON-encoded `ParseTimedTextRequest` into a JSON-encoded `TimedTextTrack`.
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn parse_timed_text(request_json: &str) -> Result<String, JsError> {
    Ok(parse_timed_text_json(request_json)?)
}

/// Parses document bytes into a JSON-encoded `Document`. `format_json` is `null` or a
/// JSON-encoded `DocumentFormat`.
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn parse_document(bytes: &[u8], format_json: &str) -> Result<String, JsError> {
    Ok(parse_document_json(bytes, format_json)?)
}

/// Parses a dictionary archive into a JSON-encoded `Dictionary`.
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn parse_dictionary(bytes: &[u8]) -> Result<String, JsError> {
    Ok(parse_dictionary_json(bytes)?)
}

/// Drafts a flashcard from a JSON-encoded `FlashcardDraftRequest` and returns the
/// JSON-encoded `NewFlashcard`.
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn draft_flashcard(request_json: &str) -> Result<String, JsError> {
    Ok(draft_flashcard_json(request_json)?)
}

/// Looks a term up in a JSON-encoded `Dictionary` and returns the JSON-encoded entries whose
/// term or reading equals it exactly.
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn lookup_term(dictionary_json: &str, term: &str) -> Result<String, JsError> {
    Ok(lookup_term_json(dictionary_json, term)?)
}

fn parse_timed_text_json(request_json: &str) -> Result<String, JsonCallError> {
    let request: ParseTimedTextRequest = parse_input(request_json)?;
    let text = inline_text(request.source)?;
    to_json_result(timed_text::parse_timed_text(&text, request.format))
}

fn parse_document_json(bytes: &[u8], format_json: &str) -> Result<String, JsonCallError> {
    let format: Option<DocumentFormat> = parse_input(format_json)?;
    to_json_result(document::parse_document(bytes, format))
}

fn parse_dictionary_json(bytes: &[u8]) -> Result<String, JsonCallError> {
    to_json_result::<Dictionary, _>(dictionary::parse_dictionary(bytes))
}

fn draft_flashcard_json(request_json: &str) -> Result<String, JsonCallError> {
    let request: FlashcardDraftRequest = parse_input(request_json)?;
    to_json(&flashcard::draft_flashcard(request))
}

fn lookup_term_json(dictionary_json: &str, term: &str) -> Result<String, JsonCallError> {
    let dictionary: Dictionary = parse_input(dictionary_json)?;
    to_json(&dictionary::lookup(&dictionary, term))
}

fn inline_text(source: TextSource) -> Result<String, JsonCallError> {
    match source {
        TextSource::Inline { text } => Ok(text),
        TextSource::Path { .. } => Err(JsonCallError::LocalPathsUnavailable),
    }
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::*;

    fn read_fixture(name: &str) -> Vec<u8> {
        let path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../fixtures")
            .join(name);
        std::fs::read(path).expect("fixture should be readable")
    }

    fn inline_request(text: &str) -> String {
        serde_json::json!({ "source": { "kind": "inline", "text": text }, "format": null })
            .to_string()
    }

    #[test]
    fn parses_an_inline_srt_fixture_into_four_cues() {
        let text = String::from_utf8(read_fixture("sample.srt")).unwrap();
        let track: serde_json::Value =
            serde_json::from_str(&parse_timed_text_json(&inline_request(&text)).unwrap()).unwrap();
        assert_eq!(track["cues"].as_array().unwrap().len(), 4);
    }

    #[test]
    fn rejects_a_path_source() {
        let request = r#"{"source":{"kind":"path","path":"/tmp/a.srt"},"format":null}"#;
        assert_eq!(
            parse_timed_text_json(request).unwrap_err().to_string(),
            "local paths are not available offline"
        );
    }

    #[test]
    fn parses_the_epub_fixture_into_two_chapters() {
        let document: serde_json::Value = serde_json::from_str(
            &parse_document_json(&read_fixture("sample.epub"), "null").unwrap(),
        )
        .unwrap();
        assert_eq!(document["chapters"].as_array().unwrap().len(), 2);
    }

    #[test]
    fn parses_plain_text_with_an_explicit_format() {
        let document: serde_json::Value =
            serde_json::from_str(&parse_document_json(b"Hello.", "\"plain_text\"").unwrap())
                .unwrap();
        assert_eq!(document["chapters"].as_array().unwrap().len(), 1);
    }

    #[test]
    fn parses_the_yomitan_fixture_with_its_title() {
        let dictionary: serde_json::Value = serde_json::from_str(
            &parse_dictionary_json(&read_fixture("sample-yomitan.zip")).unwrap(),
        )
        .unwrap();
        assert_eq!(dictionary["title"], "Sample Dictionary");
    }

    fn structured_dictionary_json() -> String {
        parse_dictionary_json(&read_fixture("sample-yomitan-structured.zip")).unwrap()
    }

    fn structured_dictionary() -> serde_json::Value {
        serde_json::from_str(&structured_dictionary_json()).unwrap()
    }

    #[test]
    fn carries_the_stylesheet_of_the_structured_fixture() {
        assert!(
            structured_dictionary()["stylesheet"]
                .as_str()
                .unwrap()
                .contains("part-of-speech-info")
        );
    }

    #[test]
    fn carries_the_image_of_the_structured_fixture_as_base64() {
        let image = &structured_dictionary()["assets"][0];
        assert!(image["bytes"].as_str().unwrap().starts_with("PHN2Zy"));
    }

    #[test]
    fn looks_up_a_structured_entry_with_its_typed_glossary() {
        let entries: serde_json::Value =
            serde_json::from_str(&lookup_term_json(&structured_dictionary_json(), "犬").unwrap())
                .unwrap();
        assert_eq!(
            entries[0]["definitions"][0],
            serde_json::json!({ "type": "text", "text": "dog" })
        );
    }

    fn draft_request() -> String {
        serde_json::json!({
            "word": "cats", "lemma": "cat", "reading": null,
            "l1_definitions": ["Katze"], "l2_definitions": [],
            "context": null, "context_translation": null,
            "media_id": null, "media_name": null, "clip": null, "screenshot_ms": null,
            "settings": {
                "included_fields": ["word"], "default_tags": [],
                "tag_with_media_name": true, "use_tts_when_no_audio": false
            }
        })
        .to_string()
    }

    fn fixture_dictionary_json() -> String {
        parse_dictionary_json(&read_fixture("sample-yomitan-en.zip")).unwrap()
    }

    #[test]
    fn drafts_a_flashcard_with_the_lemma_as_its_word() {
        let card: serde_json::Value =
            serde_json::from_str(&draft_flashcard_json(&draft_request()).unwrap()).unwrap();
        assert_eq!(
            card["fields"],
            serde_json::json!([{ "kind": "word", "value": "cat" }])
        );
    }

    #[test]
    fn rejects_a_malformed_draft_request() {
        assert!(matches!(
            draft_flashcard_json("{}"),
            Err(JsonCallError::InvalidInput(_))
        ));
    }

    #[test]
    fn looks_up_a_term_in_a_dictionary() {
        let entries: serde_json::Value =
            serde_json::from_str(&lookup_term_json(&fixture_dictionary_json(), "dog").unwrap())
                .unwrap();
        assert_eq!(entries[0]["definitions"], serde_json::json!(["Hund"]));
    }

    #[test]
    fn finds_no_entries_for_an_unknown_term() {
        assert_eq!(
            lookup_term_json(&fixture_dictionary_json(), "bird").unwrap(),
            "[]"
        );
    }
}
