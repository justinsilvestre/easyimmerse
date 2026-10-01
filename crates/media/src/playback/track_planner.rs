//! Decides how each selected track goes into a converted stream.

use super::environment::{AudioTarget, PlaybackEnvironment};
use super::plan::{
    ConversionPlan, ConversionReason, TrackAction, TrackConversion, UnsupportedReason,
};
use super::selection::TrackSelection;
use crate::container::ContainerInfo;
use crate::track_info::{TrackInfo, TrackKind};

/// Plans each selected track of a file that cannot be played directly.
pub(super) struct TrackPlanner<'a> {
    pub(super) container: &'a ContainerInfo,
    pub(super) environment: &'a PlaybackEnvironment,
    pub(super) target: AudioTarget,
    /// The reasons that apply to every track in the conversion.
    pub(super) reasons: Vec<ConversionReason>,
}

impl TrackPlanner<'_> {
    pub(super) fn plan(
        &self,
        selection: &TrackSelection,
    ) -> Result<ConversionPlan, UnsupportedReason> {
        let video = selection.video.map(|id| self.plan_video(id)).transpose()?;
        let audio = selection.audio.map(|id| self.plan_audio(id)).transpose()?;
        Ok(ConversionPlan { video, audio })
    }

    fn plan_video(&self, id: u32) -> Result<TrackConversion, UnsupportedReason> {
        let track = self.find_track(id, TrackKind::Video)?;
        if !self.is_streamable(track) {
            return Err(UnsupportedReason::VideoCodecUnsupported);
        }
        Ok(self.conversion(id, TrackAction::Copy, vec![]))
    }

    fn plan_audio(&self, id: u32) -> Result<TrackConversion, UnsupportedReason> {
        let track = self.find_track(id, TrackKind::Audio)?;
        if self.is_streamable(track) {
            Ok(self.conversion(id, TrackAction::Copy, vec![]))
        } else if self.accepts_target() {
            let action = TrackAction::Transcode {
                target: self.target,
            };
            Ok(self.conversion(id, action, vec![ConversionReason::CodecUnsupported]))
        } else {
            Err(UnsupportedReason::AudioCodecUnsupported)
        }
    }

    fn find_track(&self, id: u32, kind: TrackKind) -> Result<&TrackInfo, UnsupportedReason> {
        let tracks = &self.container.tracks;
        let found = tracks
            .iter()
            .find(|track| track.id == id && track.kind == kind);
        found.ok_or(UnsupportedReason::TrackNotFound)
    }

    fn accepts_target(&self) -> bool {
        let codec_string = self.target.codec_string();
        self.environment.accepts_fmp4_codec(codec_string)
    }

    fn is_streamable(&self, track: &TrackInfo) -> bool {
        let codec_string = track.codec_string.as_deref();
        codec_string.is_some_and(|codec| self.environment.accepts_fmp4_codec(codec))
    }

    fn conversion(
        &self,
        track_id: u32,
        action: TrackAction,
        track_reasons: Vec<ConversionReason>,
    ) -> TrackConversion {
        let reasons = [self.reasons.clone(), track_reasons].concat();
        TrackConversion {
            track_id,
            action,
            reasons,
        }
    }
}
