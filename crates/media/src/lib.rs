//! Pure-Rust media handling that runs on every platform, including WebAssembly.

pub mod container;
pub mod error;
pub mod mov_text;
pub mod peaks;

mod mkv_container;
mod mov_text_sample;
mod mov_text_style;
mod mp3_container;
mod mp4_container;

#[cfg(test)]
mod test_support;

pub use container::{
    ContainerFormat, ContainerInfo, TrackInfo, TrackKind, detect_container_format,
    parse_language_tag, probe_container,
};
pub use error::MediaError;
pub use mov_text::extract_mov_text_cues;
pub use peaks::{WaveformPeaks, compute_peaks};
