//! Which roles the subtitle tracks found with a media file take when the file is added by path:
//! the tracks of the subtitle files beside it and the text tracks inside it.

use crate::sidecar_subtitles::{select_sidecar_tracks, select_tracks_by_language};
use crate::subtitle_track::{SubtitleSelection, SubtitleTrackId};

/// A subtitle track just added, with the language tag it was found with.
pub type FoundTrack = (SubtitleTrackId, Option<String>);

/// Chooses the roles of the tracks found with a media file, given the project's languages as
/// BCP 47 tags. The tracks of the subtitle files take roles first, as [`select_sidecar_tracks`]
/// chooses them, since a file the user placed beside the media file is the likelier choice.
/// An embedded track then takes a role still unset when it is the one embedded track in that
/// role's language.
pub fn select_found_tracks(
    sidecar_tracks: &[FoundTrack],
    embedded_tracks: &[FoundTrack],
    target_language: &str,
    translation_language: &str,
) -> SubtitleSelection {
    let embedded =
        select_tracks_by_language(embedded_tracks, target_language, translation_language);
    select_sidecar_tracks(sidecar_tracks, target_language, translation_language)
        .with_unset_roles_from(embedded)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn track(id: &str, language: Option<&str>) -> FoundTrack {
        (
            SubtitleTrackId(id.to_string()),
            language.map(str::to_string),
        )
    }

    fn id(id: &str) -> Option<SubtitleTrackId> {
        Some(SubtitleTrackId(id.to_string()))
    }

    #[test]
    fn gives_the_translation_role_to_the_embedded_track_in_the_translation_language() {
        let selection = select_found_tracks(
            &[track("sidecar", Some("ja"))],
            &[track("embedded", Some("eng"))],
            "ja",
            "en",
        );
        assert_eq!(selection.translation_track_id, id("embedded"));
    }

    #[test]
    fn prefers_a_sidecar_track_to_an_embedded_track_in_the_same_language() {
        let selection = select_found_tracks(
            &[track("sidecar", Some("ja"))],
            &[track("embedded", Some("jpn"))],
            "ja",
            "en",
        );
        assert_eq!(selection.target_track_id, id("sidecar"));
    }

    #[test]
    fn gives_no_role_to_a_lone_embedded_track_without_a_language() {
        let selection = select_found_tracks(&[], &[track("embedded", None)], "ja", "en");
        assert_eq!(selection, SubtitleSelection::default());
    }
}
