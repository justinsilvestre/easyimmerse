//! Pure-Rust media handling that runs on every platform, including WebAssembly.

pub mod codec_string;
pub mod codec_string_avc;
pub mod container;
pub mod error;
pub mod mov_text;
pub mod peaks;
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
pub use mov_text::extract_mov_text_cues;
pub use peaks::{WaveformPeaks, compute_peaks};
pub use track_info::{AudioDetails, FrameRate, TrackInfo, TrackKind, VideoDetails};
