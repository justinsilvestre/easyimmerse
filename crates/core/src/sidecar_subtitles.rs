//! Subtitle files that sit beside a media file and share its name, such as `Show.ja.srt`
//! beside `Show.mkv`, and which roles they take when they are added with it.

use crate::language_code::is_same_language;
use crate::subtitle_track::{SubtitleSelection, SubtitleTrackId};
use crate::timed_text::TimedTextFormat;

/// Name parts that mark a variant of a subtitles file rather than its language.
const VARIANT_SUFFIXES: [&str; 4] = ["forced", "sdh", "cc", "default"];

/// A subtitles file found beside a media file.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SidecarSubtitle {
    pub file_name: String,
    pub format: TimedTextFormat,
    /// The language tag in the file name, such as `ja` in `Show.ja.srt`.
    pub language: Option<String>,
}

/// Picks out the subtitle files among `sibling_file_names` that belong to the media file:
/// those named after its stem, then optionally a language tag and variant suffixes such as
/// `forced`, then the extension of a supported subtitles format.
pub fn find_sidecar_subtitles(
    media_file_name: &str,
    sibling_file_names: &[String],
) -> Vec<SidecarSubtitle> {
    let stem = media_file_name
        .rsplit_once('.')
        .map_or(media_file_name, |(stem, _)| stem);
    sibling_file_names
        .iter()
        .filter_map(|name| match_sidecar(stem, name))
        .collect()
}

/// Chooses the roles of subtitle tracks just added from sidecar files, given each track's
/// language tag and the project's languages as BCP 47 tags.
/// A role goes to the one track whose language matches it; a lone track without a language
/// becomes the target track. Roles that several tracks could take stay unset.
pub fn select_sidecar_tracks(
    tracks: &[(SubtitleTrackId, Option<String>)],
    target_language: &str,
    translation_language: &str,
) -> SubtitleSelection {
    if let [(track_id, None)] = tracks {
        return SubtitleSelection {
            target_track_id: Some(track_id.clone()),
            translation_track_id: None,
        };
    }
    select_tracks_by_language(tracks, target_language, translation_language)
}

/// Gives each role to the one track whose language matches it, leaving a role unset when no
/// track or several tracks match it. A three-letter code such as `jpn` matches its two-letter
/// equivalent `ja`.
pub fn select_tracks_by_language(
    tracks: &[(SubtitleTrackId, Option<String>)],
    target_language: &str,
    translation_language: &str,
) -> SubtitleSelection {
    SubtitleSelection {
        target_track_id: only_track_in(tracks, target_language),
        translation_track_id: only_track_in(tracks, translation_language),
    }
}

fn match_sidecar(stem: &str, file_name: &str) -> Option<SidecarSubtitle> {
    let rest = file_name.strip_prefix(stem)?.strip_prefix('.')?;
    let (tags, extension) = rest.rsplit_once('.').unwrap_or(("", rest));
    let format = format_for_extension(extension)?;
    let mut language = None;
    for tag in tags.split('.').filter(|tag| !tag.is_empty()) {
        if is_variant_suffix(tag) {
            continue;
        }
        if language.is_some() || !is_language_tag(tag) {
            return None;
        }
        language = Some(tag.to_string());
    }
    Some(SidecarSubtitle {
        file_name: file_name.to_string(),
        format,
        language,
    })
}

fn format_for_extension(extension: &str) -> Option<TimedTextFormat> {
    match extension.to_ascii_lowercase().as_str() {
        "srt" => Some(TimedTextFormat::Srt),
        "vtt" => Some(TimedTextFormat::Vtt),
        _ => None,
    }
}

fn is_variant_suffix(tag: &str) -> bool {
    VARIANT_SUFFIXES
        .iter()
        .any(|suffix| suffix.eq_ignore_ascii_case(tag))
}

/// Checks the shape of a BCP 47 tag: a primary language subtag of two or three letters,
/// then any number of hyphenated alphanumeric subtags.
fn is_language_tag(tag: &str) -> bool {
    let mut subtags = tag.split('-');
    let primary = subtags.next().unwrap_or_default();
    (2..=3).contains(&primary.len())
        && primary.chars().all(|c| c.is_ascii_alphabetic())
        && subtags.all(|subtag| {
            !subtag.is_empty()
                && subtag.len() <= 8
                && subtag.chars().all(|c| c.is_ascii_alphanumeric())
        })
}

fn only_track_in(
    tracks: &[(SubtitleTrackId, Option<String>)],
    language: &str,
) -> Option<SubtitleTrackId> {
    let mut matching = tracks.iter().filter(|(_, track_language)| {
        track_language
            .as_deref()
            .is_some_and(|track_language| is_same_language(track_language, language))
    });
    match (matching.next(), matching.next()) {
        (Some((track_id, _)), None) => Some(track_id.clone()),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn find(media_file_name: &str, siblings: &[&str]) -> Vec<SidecarSubtitle> {
        let siblings: Vec<String> = siblings.iter().map(|name| name.to_string()).collect();
        find_sidecar_subtitles(media_file_name, &siblings)
    }

    fn found_names(media_file_name: &str, siblings: &[&str]) -> Vec<String> {
        find(media_file_name, siblings)
            .into_iter()
            .map(|sidecar| sidecar.file_name)
            .collect()
    }

    fn language_of(sibling: &str) -> Option<String> {
        find("Show.S01E01.mkv", &[sibling])
            .into_iter()
            .next()
            .and_then(|sidecar| sidecar.language)
    }

    fn track(id: &str, language: Option<&str>) -> (SubtitleTrackId, Option<String>) {
        (
            SubtitleTrackId(id.to_string()),
            language.map(str::to_string),
        )
    }

    fn id(id: &str) -> Option<SubtitleTrackId> {
        Some(SubtitleTrackId(id.to_string()))
    }

    mod find_sidecar_subtitles {
        use super::*;

        #[test]
        fn finds_a_file_with_the_same_stem() {
            assert_eq!(
                found_names("Show.S01E01.mkv", &["Show.S01E01.srt"]),
                ["Show.S01E01.srt"]
            );
        }

        #[test]
        fn finds_files_with_a_language_tag() {
            assert_eq!(
                found_names(
                    "Show.S01E01.mkv",
                    &["Show.S01E01.ja.srt", "Show.S01E01.en.vtt"]
                ),
                ["Show.S01E01.ja.srt", "Show.S01E01.en.vtt"]
            );
        }

        #[test]
        fn takes_the_format_from_the_extension() {
            assert_eq!(
                find("Show.mkv", &["Show.en.VTT"])[0].format,
                TimedTextFormat::Vtt
            );
        }

        #[test]
        fn ignores_the_media_file_itself() {
            assert_eq!(found_names("Show.mkv", &["Show.mkv"]), Vec::<String>::new());
        }

        #[test]
        fn ignores_unsupported_extensions() {
            assert_eq!(found_names("Show.mkv", &["Show.ass"]), Vec::<String>::new());
        }

        #[test]
        fn ignores_files_of_another_episode() {
            assert_eq!(
                found_names("Show.S01E01.mkv", &["Show.S01E02.srt"]),
                Vec::<String>::new()
            );
        }

        #[test]
        fn ignores_files_whose_stem_only_begins_like_the_media_file() {
            assert_eq!(
                found_names("Show.mkv", &["Show.S01E01.srt"]),
                Vec::<String>::new()
            );
        }

        #[test]
        fn ignores_a_stem_without_a_separating_dot() {
            assert_eq!(
                found_names("Show.mkv", &["Shows.srt"]),
                Vec::<String>::new()
            );
        }

        #[test]
        fn ignores_files_with_two_language_tags() {
            assert_eq!(
                found_names("Show.mkv", &["Show.ja.en.srt"]),
                Vec::<String>::new()
            );
        }

        #[test]
        fn finds_a_file_for_a_media_file_without_an_extension() {
            assert_eq!(found_names("Show", &["Show.srt"]), ["Show.srt"]);
        }
    }

    mod language_tags {
        use super::*;

        #[test]
        fn reads_no_language_without_a_tag() {
            assert_eq!(language_of("Show.S01E01.srt"), None);
        }

        #[test]
        fn reads_a_two_letter_tag() {
            assert_eq!(language_of("Show.S01E01.ja.srt").as_deref(), Some("ja"));
        }

        #[test]
        fn reads_a_tag_with_a_region() {
            assert_eq!(
                language_of("Show.S01E01.pt-BR.srt").as_deref(),
                Some("pt-BR")
            );
        }

        #[test]
        fn reads_a_tag_followed_by_a_variant_suffix() {
            assert_eq!(
                language_of("Show.S01E01.en.forced.srt").as_deref(),
                Some("en")
            );
        }

        #[test]
        fn reads_no_language_from_a_variant_suffix_alone() {
            assert_eq!(language_of("Show.S01E01.sdh.srt"), None);
        }
    }

    mod select_sidecar_tracks {
        use super::*;

        #[test]
        fn makes_the_target_language_track_the_target() {
            let tracks = [track("a", Some("en")), track("b", Some("ja-JP"))];
            assert_eq!(
                select_sidecar_tracks(&tracks, "ja", "en").target_track_id,
                id("b")
            );
        }

        #[test]
        fn makes_the_translation_language_track_the_translation() {
            let tracks = [track("a", Some("EN")), track("b", Some("ja"))];
            assert_eq!(
                select_sidecar_tracks(&tracks, "ja", "en-US").translation_track_id,
                id("a")
            );
        }

        #[test]
        fn makes_a_track_tagged_with_a_three_letter_code_the_target() {
            let tracks = [track("a", Some("en")), track("b", Some("jpn"))];
            assert_eq!(
                select_sidecar_tracks(&tracks, "ja", "en").target_track_id,
                id("b")
            );
        }

        #[test]
        fn makes_a_lone_track_without_a_language_the_target() {
            let tracks = [track("a", None)];
            assert_eq!(
                select_sidecar_tracks(&tracks, "ja", "en").target_track_id,
                id("a")
            );
        }

        #[test]
        fn leaves_the_roles_unset_for_several_tracks_without_a_language() {
            let tracks = [track("a", None), track("b", None)];
            assert_eq!(
                select_sidecar_tracks(&tracks, "ja", "en"),
                SubtitleSelection::default()
            );
        }

        #[test]
        fn leaves_a_role_unset_when_several_tracks_match_it() {
            let tracks = [track("a", Some("ja")), track("b", Some("ja"))];
            assert_eq!(
                select_sidecar_tracks(&tracks, "ja", "en").target_track_id,
                None
            );
        }

        #[test]
        fn leaves_the_roles_unset_for_a_lone_track_in_another_language() {
            let tracks = [track("a", Some("fr"))];
            assert_eq!(
                select_sidecar_tracks(&tracks, "ja", "en"),
                SubtitleSelection::default()
            );
        }
    }
}
