//! Turning an uploaded document or subtitle files into the segments of a library item, before any words are set.

use easyimmerse_core::document::Document;
use easyimmerse_core::library::{LibrarySegment, LibraryText};
use easyimmerse_core::timed_text::Cue;

use crate::library_covers::midpoint;

/// One segment per paragraph of the document, in order, with the titles of its chapters.
pub fn text_of_document(document: &Document) -> LibraryText {
    let paragraphs = document
        .chapters
        .iter()
        .enumerate()
        .flat_map(|(chapter, content)| {
            content
                .paragraphs
                .iter()
                .map(move |paragraph| (chapter as u32, paragraph))
        });
    let segments = paragraphs
        .enumerate()
        .map(|(index, (chapter_index, paragraph))| LibrarySegment {
            index: index as u32,
            chapter_index: Some(chapter_index),
            start_ms: None,
            end_ms: None,
            screenshot_at_ms: None,
            text: paragraph.clone(),
            translation: None,
            words: Vec::new(),
        })
        .collect();
    LibraryText {
        segments,
        chapter_titles: document
            .chapters
            .iter()
            .map(|chapter| chapter.title.clone())
            .collect(),
    }
}

/// One segment per target cue, without its markup. Each translation cue is joined to the target cue it overlaps most;
/// a target cue that several translation cues overlap most takes all of them, one per line.
pub fn text_of_subtitles(target: &[Cue], translation: &[Cue]) -> LibraryText {
    let mut translations: Vec<Vec<String>> = vec![Vec::new(); target.len()];
    for cue in translation {
        if let Some(index) = most_overlapped(target, cue) {
            translations[index].push(strip_markup(&cue.text));
        }
    }
    let segments = target
        .iter()
        .zip(translations)
        .enumerate()
        .map(|(index, (cue, lines))| LibrarySegment {
            index: index as u32,
            chapter_index: None,
            start_ms: Some(cue.start_ms),
            end_ms: Some(cue.end_ms),
            screenshot_at_ms: None,
            text: strip_markup(&cue.text),
            translation: (!lines.is_empty()).then(|| lines.join("\n")),
            words: Vec::new(),
        })
        .collect();
    LibraryText {
        segments,
        chapter_titles: Vec::new(),
    }
}

/// Gives every cue with a time window its screenshot time, the midpoint of the window.
pub fn with_screenshot_times(segments: Vec<LibrarySegment>) -> Vec<LibrarySegment> {
    segments
        .into_iter()
        .map(|segment| LibrarySegment {
            screenshot_at_ms: segment.start_ms.zip(segment.end_ms).map(midpoint),
            ..segment
        })
        .collect()
}

/// Gives each new segment the words of the old segment it repeats: one with the same text at the same times.
/// A change of translation alone thus keeps the words set so far.
pub fn with_words_kept(mut text: LibraryText, old: &[LibrarySegment]) -> LibraryText {
    for segment in &mut text.segments {
        let repeated = old.iter().find(|previous| {
            previous.text == segment.text
                && previous.start_ms == segment.start_ms
                && previous.end_ms == segment.end_ms
        });
        if let Some(previous) = repeated {
            segment.words = previous.words.clone();
        }
    }
    text
}

/// The index of the target cue that shares the most time with the cue, when any shares some. The first wins a tie.
fn most_overlapped(target: &[Cue], cue: &Cue) -> Option<usize> {
    let overlaps = target.iter().map(|candidate| {
        let start = candidate.start_ms.max(cue.start_ms);
        let end = candidate.end_ms.min(cue.end_ms);
        end.saturating_sub(start)
    });
    let (index, overlap) = overlaps.enumerate().fold((0, 0), |best, (index, overlap)| {
        if overlap > best.1 {
            (index, overlap)
        } else {
            best
        }
    });
    (overlap > 0).then_some(index)
}

/// Removes inline tags such as `<i>`, as the media screen shows cue text.
pub fn strip_markup(text: &str) -> String {
    let mut plain = String::with_capacity(text.len());
    let mut in_tag = false;
    for character in text.chars() {
        match character {
            '<' => in_tag = true,
            '>' if in_tag => in_tag = false,
            _ if !in_tag => plain.push(character),
            _ => {}
        }
    }
    plain
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::document::Chapter;
    use easyimmerse_core::library::{LibraryEntry, LibraryWord};

    use super::*;

    fn cue(index: u32, start_ms: u64, end_ms: u64, text: &str) -> Cue {
        Cue {
            index,
            start_ms,
            end_ms,
            text: text.to_string(),
        }
    }

    fn document() -> Document {
        Document {
            title: "Book".to_string(),
            language: None,
            chapters: vec![
                Chapter {
                    title: Some("One".to_string()),
                    paragraphs: vec!["First.".to_string(), "Second.".to_string()],
                },
                Chapter {
                    title: None,
                    paragraphs: vec!["Third.".to_string()],
                },
            ],
            provenance: None,
        }
    }

    #[test]
    fn makes_one_segment_per_paragraph() {
        assert_eq!(text_of_document(&document()).segments.len(), 3);
    }

    #[test]
    fn numbers_the_chapter_of_each_paragraph() {
        let chapters: Vec<_> = (text_of_document(&document()).segments.iter())
            .map(|segment| segment.chapter_index)
            .collect();
        assert_eq!(chapters, [Some(0), Some(0), Some(1)]);
    }

    #[test]
    fn keeps_the_chapter_titles() {
        assert_eq!(
            text_of_document(&document()).chapter_titles,
            [Some("One".to_string()), None]
        );
    }

    #[test]
    fn joins_a_translation_cue_to_the_target_cue_it_overlaps_most() {
        let target = [cue(1, 0, 1_000, "Hallo."), cue(2, 1_000, 2_000, "Tschüss.")];
        let translation = [cue(1, 900, 2_100, "Bye.")];
        let text = text_of_subtitles(&target, &translation);
        assert_eq!(text.segments[1].translation.as_deref(), Some("Bye."));
    }

    #[test]
    fn leaves_a_cue_that_no_translation_overlaps_untranslated() {
        let target = [cue(1, 0, 1_000, "Hallo.")];
        let translation = [cue(1, 1_000, 2_000, "Bye.")];
        assert_eq!(
            text_of_subtitles(&target, &translation).segments[0].translation,
            None
        );
    }

    #[test]
    fn puts_each_translation_a_cue_takes_on_its_own_line() {
        let target = [cue(1, 0, 2_000, "Hallo, du.")];
        let translation = [cue(1, 0, 1_000, "Hello,"), cue(2, 1_000, 2_000, "you.")];
        let text = text_of_subtitles(&target, &translation);
        assert_eq!(
            text.segments[0].translation.as_deref(),
            Some("Hello,\nyou.")
        );
    }

    fn worded(segment: &LibrarySegment) -> LibrarySegment {
        LibrarySegment {
            words: vec![LibraryWord {
                start: 0,
                end: 5,
                entry: LibraryEntry {
                    term: "Hallo".to_string(),
                    reading: None,
                    l1_definition: "hello".to_string(),
                    l2_definition: String::new(),
                },
            }],
            ..segment.clone()
        }
    }

    #[test]
    fn keeps_the_words_of_a_segment_whose_text_and_times_stay() {
        let old = text_of_subtitles(&[cue(1, 0, 1_000, "Hallo.")], &[]);
        let new = text_of_subtitles(&[cue(1, 0, 1_000, "Hallo.")], &[cue(1, 0, 1_000, "Hi.")]);
        let kept = with_words_kept(new, &[worded(&old.segments[0])]);
        assert_eq!(kept.segments[0].words.len(), 1);
    }

    #[test]
    fn drops_the_words_of_a_segment_whose_times_move() {
        let old = text_of_subtitles(&[cue(1, 0, 1_000, "Hallo.")], &[]);
        let new = text_of_subtitles(&[cue(1, 500, 1_000, "Hallo.")], &[]);
        let kept = with_words_kept(new, &[worded(&old.segments[0])]);
        assert!(kept.segments[0].words.is_empty());
    }

    #[test]
    fn takes_the_screenshot_at_the_midpoint_of_the_cue() {
        let text = text_of_subtitles(&[cue(1, 1_000, 2_001, "Hallo.")], &[]);
        assert_eq!(
            with_screenshot_times(text.segments)[0].screenshot_at_ms,
            Some(1_500)
        );
    }

    #[test]
    fn takes_no_screenshot_of_a_segment_without_times() {
        let segments = text_of_document(&document()).segments;
        assert_eq!(with_screenshot_times(segments)[0].screenshot_at_ms, None);
    }

    #[test]
    fn strips_the_markup_of_cue_text() {
        let text = text_of_subtitles(&[cue(1, 0, 1_000, "<i>Alles</i> ist still.")], &[]);
        assert_eq!(text.segments[0].text, "Alles ist still.");
    }
}
