//! Pure-Rust media handling that runs on every platform, including WebAssembly.

pub mod codec_string;
pub mod codec_string_avc;
pub mod container;
pub mod error;
pub mod hls_playlist;
pub mod media_timeline;
pub mod mov_text;
pub mod peaks;
pub mod playback;
pub mod segment_plan;
pub mod track_info;

mod codec_string_hevc;
mod mkv_codec_string;
mod mkv_container;
mod mov_text_sample;
mod mov_text_style;
mod mp3_container;
mod mp4_codec_string;
mod mp4_container;

#[cfg(test)]
mod test_support;

pub use codec_string::{aac_codec_string, codec_string};
pub use codec_string_avc::{avc_codec_string, normalize_avc_codec_string};
pub use container::{
    ContainerFormat, ContainerInfo, detect_container_format, parse_language_tag, probe_container,
};
pub use error::MediaError;
pub use hls_playlist::{INIT_SEGMENT_URI, render_hls_playlist, segment_uri};
pub use media_timeline::{KeyframeIndex, MediaTimeline, Timebase};
pub use mov_text::extract_mov_text_cues;
pub use peaks::{WaveformPeaks, compute_peaks};
pub use segment_plan::{Segment, SegmentPlan};
pub use track_info::{AudioDetails, FrameRate, TrackInfo, TrackKind, VideoDetails};
