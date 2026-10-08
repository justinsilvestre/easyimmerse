//! Subtitle tracks a user has added to a media file from a file of their own,
//! and which of them show as the target-language and translation subtitles.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::media_file::MediaFileId;
use crate::text_source::TextSource;
use crate::timed_text::TimedTextFormat;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(transparent)]
#[ts(export)]
pub struct SubtitleTrackId(pub String);

/// A subtitles file added to a media file. Its cues are read through their own route.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SubtitleTrack {
    pub id: SubtitleTrackId,
    pub media_file_id: MediaFileId,
    /// The name shown in the track list, usually the file name.
    pub name: String,
    pub format: TimedTextFormat,
    /// The text of the first cue, for telling tracks apart.
    pub sample: Option<String>,
    /// Milliseconds since the Unix epoch.
    pub created_at_ms: u64,
}

/// Which role a subtitle track plays for its media file.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum SubtitleRole {
    Target,
    Translation,
}

/// The subtitle tracks a media file shows: one in the language being learned, one translation.
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SubtitleSelection {
    pub target_track_id: Option<SubtitleTrackId>,
    pub translation_track_id: Option<SubtitleTrackId>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct AddSubtitleTrackRequest {
    /// The name shown in the track list, usually the file name.
    pub name: String,
    pub source: TextSource,
    /// The format of the text, detected from the text when absent.
    pub format: Option<TimedTextFormat>,
    /// The role the new track takes at once, when given.
    pub role: Option<SubtitleRole>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct SubtitleTracksResponse {
    pub tracks: Vec<SubtitleTrack>,
    pub selection: SubtitleSelection,
}

impl SubtitleSelection {
    /// Fills each role this selection leaves unset with the track `other` gives it.
    pub fn with_unset_roles_from(self, other: SubtitleSelection) -> Self {
        SubtitleSelection {
            target_track_id: self.target_track_id.or(other.target_track_id),
            translation_track_id: self.translation_track_id.or(other.translation_track_id),
        }
    }

    /// Gives the track the role, replacing whichever track had it.
    pub fn with_role(mut self, role: SubtitleRole, track_id: SubtitleTrackId) -> Self {
        match role {
            SubtitleRole::Target => self.target_track_id = Some(track_id),
            SubtitleRole::Translation => self.translation_track_id = Some(track_id),
        }
        self
    }

    /// Removes the track from whichever roles it holds.
    pub fn without_track(mut self, track_id: &SubtitleTrackId) -> Self {
        if self.target_track_id.as_ref() == Some(track_id) {
            self.target_track_id = None;
        }
        if self.translation_track_id.as_ref() == Some(track_id) {
            self.translation_track_id = None;
        }
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn track(id: &str) -> SubtitleTrackId {
        SubtitleTrackId(id.to_string())
    }

    #[test]
    fn giving_a_track_the_target_role_replaces_the_earlier_target() {
        let selection = SubtitleSelection::default()
            .with_role(SubtitleRole::Target, track("a"))
            .with_role(SubtitleRole::Target, track("b"));
        assert_eq!(selection.target_track_id, Some(track("b")));
    }

    #[test]
    fn removing_a_track_clears_every_role_it_held() {
        let selection = SubtitleSelection::default()
            .with_role(SubtitleRole::Target, track("a"))
            .with_role(SubtitleRole::Translation, track("a"))
            .without_track(&track("a"));
        assert_eq!(selection, SubtitleSelection::default());
    }

    #[test]
    fn removing_an_unrelated_track_changes_nothing() {
        let selection = SubtitleSelection::default().with_role(SubtitleRole::Target, track("a"));
        assert_eq!(selection.clone().without_track(&track("b")), selection);
    }

    #[test]
    fn filling_unset_roles_keeps_the_roles_already_set() {
        let selection = SubtitleSelection::default()
            .with_role(SubtitleRole::Target, track("a"))
            .with_unset_roles_from(
                SubtitleSelection::default()
                    .with_role(SubtitleRole::Target, track("b"))
                    .with_role(SubtitleRole::Translation, track("c")),
            );
        assert_eq!(
            selection,
            SubtitleSelection::default()
                .with_role(SubtitleRole::Target, track("a"))
                .with_role(SubtitleRole::Translation, track("c"))
        );
    }
}
