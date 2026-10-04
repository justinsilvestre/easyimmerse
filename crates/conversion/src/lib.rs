//! Converts media files into HLS segments with ffmpeg while they play, keeps the converted
//! segments in a bounded cache, discovers a hardware video encoder, decodes waveform peaks, and
//! extracts embedded text subtitles.
//! Desktop and server only.

pub mod cache_budget;
pub mod error;
pub mod key;
pub mod manifest;
pub mod probe_cache;
pub mod run_policy;
pub mod service;
pub mod source_identity;
pub mod waveform;

mod cache_eviction;
mod cache_layout;
mod encoder_discovery;
mod entry;
mod run;
mod run_monitor;
mod segment_files;
mod service_cache;
mod service_segments;
mod subtitle_extraction;

pub use error::ConversionError;
pub use key::{CONVERTER_VERSION, ConversionKey};
pub use probe_cache::ProbeCache;
pub use segment_files::{INIT_SEGMENT_FILE_NAME, parse_segment_file_name, segment_file_name};
pub use service::ConversionService;
pub use service_segments::SEGMENT_WAIT_TIMEOUT;
pub use waveform::MAX_WAVEFORM_WINDOW;
