//! Decides how each selected track goes into a converted stream.

use super::conversion_settings::{AudioTarget, ConversionSettings, VideoTarget};
use super::environment::PlaybackEnvironment;
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
    pub(super) settings: ConversionSettings,
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

    fn plan_video(&self, id: u32) -> Result<TrackConversion<VideoTarget>, UnsupportedReason> {
        let track = self.find_track(id, TrackKind::Video)?;
        let target = self
            .settings
            .video_target
            .filter(|target| self.environment.accepts_fmp4_codec(target.codec_string()));
        let conversion = self.copy_or_transcode(track, target);
        conversion.ok_or(UnsupportedReason::VideoCodecUnsupported)
    }

    fn plan_audio(&self, id: u32) -> Result<TrackConversion<AudioTarget>, UnsupportedReason> {
        let track = self.find_track(id, TrackKind::Audio)?;
        let target = Some(self.settings.audio_target)
            .filter(|target| self.environment.accepts_fmp4_codec(target.codec_string()));
        let conversion = self.copy_or_transcode(track, target);
        conversion.ok_or(UnsupportedReason::AudioCodecUnsupported)
    }

    fn find_track(&self, id: u32, kind: TrackKind) -> Result<&TrackInfo, UnsupportedReason> {
        let tracks = &self.container.tracks;
        let found = tracks
            .iter()
            .find(|track| track.id == id && track.kind == kind);
        found.ok_or(UnsupportedReason::TrackNotFound)
    }

    /// Copies a streamable track, or else transcodes it to a target that the browser accepts.
    /// Returns `None` when the track is not streamable and there is no such target.
    fn copy_or_transcode<Target>(
        &self,
        track: &TrackInfo,
        accepted_target: Option<Target>,
    ) -> Option<TrackConversion<Target>> {
        if self.is_streamable(track) {
            return Some(self.conversion(track.id, TrackAction::Copy, vec![]));
        }
        let action = TrackAction::Transcode {
            target: accepted_target?,
        };
        let reasons = vec![ConversionReason::CodecUnsupported];
        Some(self.conversion(track.id, action, reasons))
    }

    fn is_streamable(&self, track: &TrackInfo) -> bool {
        let codec_string = track.codec_string.as_deref();
        codec_string.is_some_and(|codec| self.environment.accepts_fmp4_codec(codec))
    }

    fn conversion<Target>(
        &self,
        track_id: u32,
        action: TrackAction<Target>,
        track_reasons: Vec<ConversionReason>,
    ) -> TrackConversion<Target> {
        let reasons = [self.reasons.clone(), track_reasons].concat();
        TrackConversion {
            track_id,
            action,
            reasons,
        }
    }
}
