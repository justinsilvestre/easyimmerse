//! Alignments: how a document in a project lines up with the audio file that reads it
//! aloud, or with a second document that translates it.
//!
//! Documents have no ids inside them, so text is addressed by position in the parsed
//! `Document`: a chapter, a paragraph within it, and a range of the paragraph string.
//! An alignment is therefore only valid for the document as the current parser produces it.
//! See `docs/alignment-data.md`.

use serde::{Deserialize, Serialize};
use thiserror::Error;
use ts_rs::TS;
use utoipa::ToSchema;

use crate::media_file::MediaFileId;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(transparent)]
#[ts(export)]
pub struct AlignmentId(pub String);

/// A range of one paragraph of a parsed document.
///
/// `chapter_index` and `paragraph_index` count from zero within the parsed document.
/// `start` and `end` are offsets into the paragraph string counted in UTF-16 code units,
/// exactly as JavaScript's `String` indexes them, and `end` is exclusive. Rust code treats
/// the offsets as opaque numbers and never slices paragraphs by them. A span never crosses
/// a paragraph; text that covers several paragraphs is a list of spans.
///
/// The position is only valid for the document as the current parser produces it; `quote`
/// is what identifies the passage once the parser changes.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct TextSpan {
    pub chapter_index: u32,
    pub paragraph_index: u32,
    /// The first UTF-16 code unit of the span within the paragraph.
    pub start: u32,
    /// The UTF-16 code unit just after the span.
    pub end: u32,
    /// The text the span covers, as the parser produced it. Optional in the type so that
    /// tests can write spans tersely, but every provider and importer sets it. The reader
    /// ignores a span whose quote no longer matches the text at its position.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub quote: Option<String>,
}

/// Text of a document heard between two times of an audio file.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct TimedSpan {
    pub span: TextSpan,
    /// Milliseconds from the start of the audio file.
    pub start_ms: u64,
    /// Milliseconds from the start of the audio file; exclusive.
    pub end_ms: u64,
}

/// Text of a document paired with the text of its translation that says the same thing.
///
/// Either side may hold several spans, for a sentence the translation splits in two or joins
/// with the next, and either side may be empty, for text the translation leaves out or adds,
/// but not both. The spans on each side are sorted and do not overlap.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct TranslationLink {
    /// Spans of the aligned document.
    pub spans: Vec<TextSpan>,
    /// Spans of the translation document.
    pub translation_spans: Vec<TextSpan>,
}

/// What a document is aligned with, and how.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(tag = "kind", rename_all = "snake_case")]
#[ts(export)]
pub enum AlignmentContent {
    /// The document lined up with an audio file that reads it aloud.
    Audio {
        /// The media file of the audio.
        audio_media_file_id: MediaFileId,
        /// Sorted by their span's position in the document and by time, usually one per
        /// sentence. Text with no segment is never highlighted.
        segments: Vec<TimedSpan>,
    },
    /// The document lined up with another document of the project that translates it.
    Translation {
        /// The media file of the translation document.
        translation_media_file_id: MediaFileId,
        /// Sorted by the position of their first document span; links with no document span
        /// are sorted by their first translation span.
        links: Vec<TranslationLink>,
    },
}

/// A saved alignment of a document.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct Alignment {
    pub id: AlignmentId,
    /// The document the alignment belongs to. Its counterpart is named inside `content`.
    pub media_file_id: MediaFileId,
    /// What produced the alignment: a plugin name, or `cloud`. Null for an alignment added
    /// from a file.
    pub provider: Option<String>,
    /// Milliseconds since the Unix epoch.
    pub created_at_ms: u64,
    pub content: AlignmentContent,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AddAlignmentRequest {
    /// What produced the alignment: a plugin name, or `cloud`. Null for an alignment added
    /// from a file.
    pub provider: Option<String>,
    pub content: AlignmentContent,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AlignmentsResponse {
    /// The document's alignments, newest first.
    pub alignments: Vec<Alignment>,
}

/// The translation a document is paired with before the two are aligned, so that either
/// can be read on its own.
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct TranslationDocumentSelection {
    /// Null clears the pairing.
    pub translation_media_file_id: Option<MediaFileId>,
}

/// Why alignment content is malformed. Bounds are not checked, since checking them needs
/// the parsed documents.
#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum AlignmentError {
    #[error(
        "a span of chapter {chapter_index}, paragraph {paragraph_index} ends at {end} before it starts at {start}"
    )]
    SpanEndsBeforeStart {
        chapter_index: u32,
        paragraph_index: u32,
        start: u32,
        end: u32,
    },
    #[error(
        "the quote of a span of chapter {chapter_index}, paragraph {paragraph_index} is {quote_length} UTF-16 code units long, but the span from {start} to {end} covers {span_length}"
    )]
    QuoteLengthMismatch {
        chapter_index: u32,
        paragraph_index: u32,
        start: u32,
        end: u32,
        quote_length: usize,
        span_length: u32,
    },
    #[error("a segment ends at {end_ms} ms before it starts at {start_ms} ms")]
    SegmentEndsBeforeStart { start_ms: u64, end_ms: u64 },
    #[error("a translation link has no spans on either side")]
    EmptyTranslationLink,
}

impl AlignmentContent {
    /// The media file the document is aligned with: the audio file or the translation.
    pub fn counterpart_media_file_id(&self) -> &MediaFileId {
        match self {
            AlignmentContent::Audio {
                audio_media_file_id,
                ..
            } => audio_media_file_id,
            AlignmentContent::Translation {
                translation_media_file_id,
                ..
            } => translation_media_file_id,
        }
    }

    /// Checks that every span and segment starts no later than it ends, that every quote is
    /// as long as its span, and that no translation link is empty on both sides.
    pub fn validate(&self) -> Result<(), AlignmentError> {
        match self {
            AlignmentContent::Audio { segments, .. } => {
                segments.iter().try_for_each(TimedSpan::validate)
            }
            AlignmentContent::Translation { links, .. } => {
                links.iter().try_for_each(TranslationLink::validate)
            }
        }
    }
}

impl TextSpan {
    /// Checks that the span starts no later than it ends and that its quote, when it has
    /// one, is as many UTF-16 code units long as the span.
    pub fn validate(&self) -> Result<(), AlignmentError> {
        if self.start > self.end {
            return Err(AlignmentError::SpanEndsBeforeStart {
                chapter_index: self.chapter_index,
                paragraph_index: self.paragraph_index,
                start: self.start,
                end: self.end,
            });
        }
        let span_length = self.end - self.start;
        match &self.quote {
            Some(quote) => {
                let quote_length = quote.encode_utf16().count();
                if usize::try_from(span_length).is_ok_and(|length| length == quote_length) {
                    Ok(())
                } else {
                    Err(AlignmentError::QuoteLengthMismatch {
                        chapter_index: self.chapter_index,
                        paragraph_index: self.paragraph_index,
                        start: self.start,
                        end: self.end,
                        quote_length,
                        span_length,
                    })
                }
            }
            None => Ok(()),
        }
    }
}

impl TranslationLink {
    /// Checks that the link has a span on at least one side and that each span is valid.
    pub fn validate(&self) -> Result<(), AlignmentError> {
        if self.spans.is_empty() && self.translation_spans.is_empty() {
            return Err(AlignmentError::EmptyTranslationLink);
        }
        self.spans
            .iter()
            .chain(&self.translation_spans)
            .try_for_each(TextSpan::validate)
    }
}

impl TimedSpan {
    pub fn validate(&self) -> Result<(), AlignmentError> {
        self.span.validate()?;
        if self.start_ms > self.end_ms {
            Err(AlignmentError::SegmentEndsBeforeStart {
                start_ms: self.start_ms,
                end_ms: self.end_ms,
            })
        } else {
            Ok(())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::document::{parse_epub, parse_plain_text};
    use crate::test_support::{read_fixture_bytes, read_fixture_text};

    fn span(start: u32, end: u32) -> TextSpan {
        TextSpan {
            chapter_index: 0,
            paragraph_index: 1,
            start,
            end,
            quote: None,
        }
    }

    fn quoted(start: u32, end: u32, quote: &str) -> TextSpan {
        TextSpan {
            quote: Some(quote.to_string()),
            ..span(start, end)
        }
    }

    fn audio(segments: Vec<TimedSpan>) -> AlignmentContent {
        AlignmentContent::Audio {
            audio_media_file_id: MediaFileId("audio".to_string()),
            segments,
        }
    }

    fn translation(links: Vec<TranslationLink>) -> AlignmentContent {
        AlignmentContent::Translation {
            translation_media_file_id: MediaFileId("translation".to_string()),
            links,
        }
    }

    #[test]
    fn tags_audio_content_with_its_kind() {
        let json = serde_json::to_value(audio(vec![])).unwrap();
        assert_eq!(
            json,
            serde_json::json!({ "kind": "audio", "audio_media_file_id": "audio", "segments": [] })
        );
    }

    #[test]
    fn reads_translation_content_from_snake_case_json() {
        let content: AlignmentContent = serde_json::from_value(serde_json::json!({
            "kind": "translation",
            "translation_media_file_id": "translation",
            "links": [{
                "spans": [{ "chapter_index": 0, "paragraph_index": 1, "start": 0, "end": 4 }],
                "translation_spans": []
            }]
        }))
        .unwrap();
        assert_eq!(
            content,
            translation(vec![TranslationLink {
                spans: vec![span(0, 4)],
                translation_spans: vec![],
            }])
        );
    }

    #[test]
    fn names_the_audio_file_as_the_counterpart_of_audio_content() {
        assert_eq!(
            audio(vec![]).counterpart_media_file_id(),
            &MediaFileId("audio".to_string())
        );
    }

    #[test]
    fn names_the_translation_as_the_counterpart_of_translation_content() {
        assert_eq!(
            translation(vec![]).counterpart_media_file_id(),
            &MediaFileId("translation".to_string())
        );
    }

    #[test]
    fn accepts_an_empty_span() {
        let content = audio(vec![TimedSpan {
            span: span(3, 3),
            start_ms: 0,
            end_ms: 10,
        }]);
        assert_eq!(content.validate(), Ok(()));
    }

    #[test]
    fn refuses_a_segment_whose_span_ends_before_it_starts() {
        let content = audio(vec![TimedSpan {
            span: span(5, 2),
            start_ms: 0,
            end_ms: 10,
        }]);
        assert!(matches!(
            content.validate(),
            Err(AlignmentError::SpanEndsBeforeStart { .. })
        ));
    }

    #[test]
    fn refuses_a_segment_that_ends_before_it_starts() {
        let content = audio(vec![TimedSpan {
            span: span(0, 2),
            start_ms: 20,
            end_ms: 10,
        }]);
        assert_eq!(
            content.validate(),
            Err(AlignmentError::SegmentEndsBeforeStart {
                start_ms: 20,
                end_ms: 10
            })
        );
    }

    #[test]
    fn refuses_a_translation_span_that_ends_before_it_starts() {
        let content = translation(vec![TranslationLink {
            spans: vec![span(0, 2)],
            translation_spans: vec![span(4, 1)],
        }]);
        assert!(matches!(
            content.validate(),
            Err(AlignmentError::SpanEndsBeforeStart { .. })
        ));
    }

    #[test]
    fn leaves_out_a_missing_quote_when_serializing() {
        let json = serde_json::to_value(span(0, 4)).unwrap();
        assert_eq!(
            json,
            serde_json::json!({ "chapter_index": 0, "paragraph_index": 1, "start": 0, "end": 4 })
        );
    }

    #[test]
    fn reads_the_quote_of_a_span() {
        let read: TextSpan = serde_json::from_value(serde_json::json!({
            "chapter_index": 0, "paragraph_index": 1, "start": 0, "end": 4, "quote": "Hund"
        }))
        .unwrap();
        assert_eq!(read, quoted(0, 4, "Hund"));
    }

    #[test]
    fn accepts_a_quote_as_long_as_its_span() {
        assert_eq!(quoted(4, 8, "Hund").validate(), Ok(()));
    }

    #[test]
    fn counts_the_length_of_a_quote_in_utf16_code_units() {
        assert_eq!(quoted(11, 18, "🌙 alle").validate(), Ok(()));
    }

    #[test]
    fn refuses_a_quote_shorter_than_its_span() {
        assert_eq!(
            quoted(0, 5, "Hund").validate(),
            Err(AlignmentError::QuoteLengthMismatch {
                chapter_index: 0,
                paragraph_index: 1,
                start: 0,
                end: 5,
                quote_length: 4,
                span_length: 5,
            })
        );
    }

    #[test]
    fn refuses_a_quote_counted_in_code_points_instead_of_utf16_code_units() {
        assert!(matches!(
            quoted(0, 6, "🌙 alle").validate(),
            Err(AlignmentError::QuoteLengthMismatch { .. })
        ));
    }

    #[test]
    fn refuses_a_segment_whose_quote_does_not_match_its_span() {
        let content = audio(vec![TimedSpan {
            span: quoted(0, 2, "Hund"),
            start_ms: 0,
            end_ms: 10,
        }]);
        assert!(matches!(
            content.validate(),
            Err(AlignmentError::QuoteLengthMismatch { .. })
        ));
    }

    #[test]
    fn refuses_a_translation_span_whose_quote_does_not_match_its_span() {
        let content = translation(vec![TranslationLink {
            spans: vec![quoted(0, 4, "Hund")],
            translation_spans: vec![quoted(0, 3, "Hund")],
        }]);
        assert!(matches!(
            content.validate(),
            Err(AlignmentError::QuoteLengthMismatch { .. })
        ));
    }

    #[test]
    fn accepts_a_translation_link_with_one_empty_side() {
        let content = translation(vec![TranslationLink {
            spans: vec![],
            translation_spans: vec![quoted(0, 4, "Hund")],
        }]);
        assert_eq!(content.validate(), Ok(()));
    }

    #[test]
    fn refuses_a_translation_link_with_both_sides_empty() {
        let content = translation(vec![TranslationLink {
            spans: vec![],
            translation_spans: vec![],
        }]);
        assert_eq!(
            content.validate(),
            Err(AlignmentError::EmptyTranslationLink)
        );
    }

    fn text_at(document: &crate::document::Document, span: &TextSpan) -> String {
        let paragraph = &document.chapters[span.chapter_index as usize].paragraphs
            [span.paragraph_index as usize];
        let units: Vec<u16> = paragraph.encode_utf16().collect();
        String::from_utf16(&units[span.start as usize..span.end as usize]).unwrap()
    }

    fn read_fixture_request(name: &str) -> AddAlignmentRequest {
        serde_json::from_str(&read_fixture_text(name)).unwrap()
    }

    #[test]
    fn the_audio_alignment_fixture_quotes_the_text_at_each_span() {
        let book = parse_epub(&read_fixture_bytes("sample.epub")).unwrap();
        let AlignmentContent::Audio { segments, .. } =
            read_fixture_request("sample-audio-alignment.json").content
        else {
            panic!("the fixture should hold an audio alignment");
        };
        let mismatches: Vec<&TextSpan> = segments
            .iter()
            .map(|segment| &segment.span)
            .filter(|span| span.quote.as_deref() != Some(text_at(&book, span).as_str()))
            .collect();
        assert_eq!(mismatches, Vec::<&TextSpan>::new());
    }

    #[test]
    fn the_translation_alignment_fixture_quotes_the_text_at_each_span() {
        let book = parse_epub(&read_fixture_bytes("sample.epub")).unwrap();
        let translation = parse_plain_text(&read_fixture_text("sample-translation.txt"));
        let AlignmentContent::Translation { links, .. } =
            read_fixture_request("sample-translation-alignment.json").content
        else {
            panic!("the fixture should hold a translation alignment");
        };
        let quoted_spans = links.iter().flat_map(|link| {
            link.spans.iter().map(|span| (&book, span)).chain(
                link.translation_spans
                    .iter()
                    .map(|span| (&translation, span)),
            )
        });
        let mismatches: Vec<&TextSpan> = quoted_spans
            .filter(|(document, span)| {
                span.quote.as_deref() != Some(text_at(document, span).as_str())
            })
            .map(|(_, span)| span)
            .collect();
        assert_eq!(mismatches, Vec::<&TextSpan>::new());
    }

    #[test]
    fn accepts_the_alignment_fixtures() {
        let results: Vec<Result<(), AlignmentError>> = [
            "sample-audio-alignment.json",
            "sample-translation-alignment.json",
        ]
        .iter()
        .map(|name| read_fixture_request(name).content.validate())
        .collect();
        assert_eq!(results, vec![Ok(()), Ok(())]);
    }
}
