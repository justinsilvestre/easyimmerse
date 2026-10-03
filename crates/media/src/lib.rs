//! Pure-Rust media handling that runs on every platform, including WebAssembly.

pub mod codec_string;
pub mod container;
pub mod conversion_settings;
pub mod direct_playback;
pub mod error;
pub mod mov_text;
pub mod playback_environment;
pub mod playback_plan;
pub mod playback_planner;
pub mod rational;
pub mod track_selection;
pub mod transcode_video;
pub mod waveform;

mod avc_codec;
mod container_signature;
mod hevc_codec;
mod mkv_codec;
mod mkv_container;
mod mov_text_sample;
mod mov_text_style;
mod mp3_container;
mod mp3_frame_header;
mod mp4_container;
mod mp4_track;
mod track_actions;

#[cfg(test)]
mod test_support;

pub use codec_string::rfc6381_codec_string;
pub use container::{
    ContainerFormat, ContainerInfo, TrackInfo, TrackKind, parse_language_tag, probe_container,
};
pub use container_signature::detect_container_format;
pub use conversion_settings::{AudioTarget, ConversionSettings, VideoTarget};
pub use direct_playback::direct_mime_type;
pub use error::MediaError;
pub use mov_text::extract_mov_text_cues;
pub use playback_environment::{CanPlayAnswer, PlaybackEngine, PlaybackEnvironment};
pub use playback_plan::{
    AudioAction, ConversionPlan, ConversionReason, PlaybackPlan, UnsupportedReason, VideoAction,
};
pub use playback_planner::plan_playback;
pub use rational::Rational;
pub use track_selection::{TrackSelection, default_track_selection};
pub use transcode_video::PictureSize;
pub use waveform::{PEAKS_PER_SECOND, WaveformResponse, compute_peaks};
