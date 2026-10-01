//! Planning how a browser will play a media file: directly, or through a converted stream.

pub mod conversion_settings;
pub mod direct_type;
pub mod engine;
pub mod environment;
pub mod http;
pub mod plan;
pub mod plan_playback;
pub mod selection;

mod track_planner;

#[cfg(test)]
mod test_containers;

pub use conversion_settings::{AudioTarget, ConversionSettings, VideoTarget};
pub use direct_type::direct_type;
pub use engine::{ContainerSupport, WebEngine, container_support};
pub use environment::PlaybackEnvironment;
pub use http::{MediaTracks, PlaybackRequest, PlaybackResponse};
pub use plan::{
    ConversionPlan, ConversionReason, PlaybackPlan, TrackAction, TrackConversion, UnsupportedReason,
};
pub use plan_playback::plan_playback;
pub use selection::{TrackSelection, default_selection};
