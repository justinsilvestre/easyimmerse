//! Planning how a browser will play a media file: directly, or through a converted stream.

pub mod engine;
pub mod environment;
pub mod plan;
pub mod plan_playback;
pub mod selection;

mod track_planner;

#[cfg(test)]
mod test_containers;

pub use engine::{ContainerSupport, WebEngine, container_support};
pub use environment::{AudioTarget, PlaybackEnvironment};
pub use plan::{
    ConversionPlan, ConversionReason, PlaybackPlan, TrackAction, TrackConversion, UnsupportedReason,
};
pub use plan_playback::plan_playback;
pub use selection::{TrackSelection, default_selection};
