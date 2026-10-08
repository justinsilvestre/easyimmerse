//! Turning the subtitle files a media-source plugin fetched into tracks for a media file.

use std::path::Path;

use easyimmerse_core::project::ProjectSettings;
use easyimmerse_core::providers::media_source::{ResolvedSubtitle, SkippedSubtitle};
use easyimmerse_core::subtitle_track::{SubtitleRole, SubtitleSelection, SubtitleTrackId};
use easyimmerse_core::text_source::TextSource;
use easyimmerse_core::timed_text::{detect_format, parse_timed_text};
use easyimmerse_storage::NewSubtitleTrack;

/// The tracks to add, each with the role it takes, and the fetched tracks that were not.
pub(crate) struct FetchedTracks {
    pub tracks: Vec<(NewSubtitleTrack, Option<SubtitleRole>)>,
    pub skipped: Vec<SkippedSubtitle>,
}

/// Parses each subtitle file once, as adding a subtitle track by hand does, and gives the
/// first file in each of the project's languages that language's role, unless `taken`
/// already fills it. A track whose file cannot be read or parsed is reported as skipped.
pub(crate) async fn read_fetched_subtitles(
    fetched: &[ResolvedSubtitle],
    settings: &ProjectSettings,
    taken: SubtitleSelection,
) -> FetchedTracks {
    let mut tracks = Vec::new();
    let mut skipped = Vec::new();
    let mut selection = taken;
    for subtitle in fetched {
        let track = match read_subtitle(subtitle).await {
            Ok(track) => track,
            Err(reason) => {
                tracing::warn!("skipping the subtitles at {}: {reason}", subtitle.path);
                skipped.push(SkippedSubtitle {
                    id: subtitle.id.clone(),
                    reason,
                });
                continue;
            }
        };
        let role = role_for(subtitle.language.as_deref(), settings, &selection);
        if let Some(role) = role {
            selection = selection.with_role(role, placeholder_track_id());
        }
        tracks.push((track, role));
    }
    FetchedTracks { tracks, skipped }
}

/// Stands in for the ids of the tracks that will be added, while roles are chosen.
fn placeholder_track_id() -> SubtitleTrackId {
    SubtitleTrackId(String::new())
}

async fn read_subtitle(subtitle: &ResolvedSubtitle) -> Result<NewSubtitleTrack, String> {
    let text = tokio::fs::read_to_string(&subtitle.path)
        .await
        .map_err(|error| format!("its file could not be read: {error}"))?;
    let format = detect_format(&text);
    let parsed = parse_timed_text(&text, Some(format))
        .map_err(|error| format!("its file could not be parsed: {error}"))?;
    Ok(NewSubtitleTrack {
        name: track_name(subtitle),
        format,
        source: TextSource::Path {
            path: subtitle.path.clone(),
        },
        sample: parsed.cues.first().map(|cue| cue.text.clone()),
    })
}

/// What the source calls the track, or its file name when the source gave no name.
fn track_name(subtitle: &ResolvedSubtitle) -> String {
    let name = subtitle.name.trim();
    if !name.is_empty() {
        return name.to_string();
    }
    Path::new(&subtitle.path)
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_default()
}

/// The role a subtitle file in `language` takes: target when it is the first in the
/// project's target language, translation when it is the first in the translation language.
fn role_for(
    language: Option<&str>,
    settings: &ProjectSettings,
    selection: &SubtitleSelection,
) -> Option<SubtitleRole> {
    let language = language?;
    if selection.target_track_id.is_none() && same_language(language, &settings.target_language) {
        Some(SubtitleRole::Target)
    } else if selection.translation_track_id.is_none()
        && same_language(language, &settings.translation_language)
    {
        Some(SubtitleRole::Translation)
    } else {
        None
    }
}

/// Compares the primary subtags of two language tags, so that `ja-JP` matches `ja`.
fn same_language(a: &str, b: &str) -> bool {
    primary_subtag(a).eq_ignore_ascii_case(primary_subtag(b))
}

fn primary_subtag(tag: &str) -> &str {
    tag.split(['-', '_']).next().unwrap_or(tag)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings() -> ProjectSettings {
        ProjectSettings {
            name: "Japanese".to_string(),
            target_language: "ja".to_string(),
            translation_language: "en".to_string(),
            flashcard_fields: Vec::new(),
            default_tags: Vec::new(),
            tags_media_name: false,
            fills_audio_with_tts: false,
        }
    }

    fn subtitle(name: &str, path: &str) -> ResolvedSubtitle {
        ResolvedSubtitle {
            id: "en".to_string(),
            path: path.to_string(),
            language: Some("en".to_string()),
            name: name.to_string(),
        }
    }

    async fn read(fetched: &[ResolvedSubtitle]) -> FetchedTracks {
        read_fetched_subtitles(fetched, &settings(), SubtitleSelection::default()).await
    }

    #[test]
    fn gives_the_target_role_to_the_target_language() {
        let role = role_for(Some("ja-JP"), &settings(), &SubtitleSelection::default());
        assert_eq!(role, Some(SubtitleRole::Target));
    }

    #[test]
    fn gives_the_translation_role_to_the_translation_language() {
        let role = role_for(Some("EN"), &settings(), &SubtitleSelection::default());
        assert_eq!(role, Some(SubtitleRole::Translation));
    }

    #[test]
    fn gives_no_role_to_another_language() {
        let role = role_for(Some("fr"), &settings(), &SubtitleSelection::default());
        assert_eq!(role, None);
    }

    #[test]
    fn gives_no_role_to_a_second_file_in_the_target_language() {
        let taken =
            SubtitleSelection::default().with_role(SubtitleRole::Target, placeholder_track_id());
        assert_eq!(role_for(Some("ja"), &settings(), &taken), None);
    }

    #[test]
    fn gives_no_role_without_a_language() {
        assert_eq!(
            role_for(None, &settings(), &SubtitleSelection::default()),
            None
        );
    }

    #[test]
    fn names_a_track_as_the_source_does() {
        assert_eq!(
            track_name(&subtitle("English", "/out/media.en.vtt")),
            "English"
        );
    }

    #[test]
    fn names_a_track_after_its_file_when_the_source_gave_no_name() {
        assert_eq!(
            track_name(&subtitle(" ", "/out/media.en.vtt")),
            "media.en.vtt"
        );
    }

    #[tokio::test]
    async fn adds_a_fetched_track_that_parses() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("media.en.vtt");
        std::fs::write(&path, "WEBVTT\n\n00:00.000 --> 00:01.000\nHello\n").unwrap();
        let fetched = [subtitle("English", &path.to_string_lossy())];
        assert_eq!(read(&fetched).await.tracks.len(), 1);
    }

    #[tokio::test]
    async fn skips_a_fetched_track_whose_file_does_not_parse() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("media.en.vtt");
        std::fs::write(&path, "WEBVTT\n\nHello\n").unwrap();
        let fetched = [subtitle("English", &path.to_string_lossy())];
        let skipped = read(&fetched).await.skipped;
        assert_eq!(
            skipped
                .iter()
                .map(|skip| skip.id.as_str())
                .collect::<Vec<_>>(),
            vec!["en"]
        );
    }
}
