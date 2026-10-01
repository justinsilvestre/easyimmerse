//! Converts media files into HTTP Live Streaming (HLS) segments on demand with ffmpeg, and caches the segments on disk.
//! Desktop and server only.

pub mod entry_paths;
pub mod error;
pub mod key;
pub mod manifest;
pub mod service;

mod cache_cleanup;
mod cache_disk;
mod cache_eviction;
mod cache_files;
mod cache_limit;
mod cache_trash;
mod collector;
mod conversion;
mod produced_segment;
mod registration;
mod run;
mod run_control;
mod run_decision;
mod select_evictions;
mod spawn_ffmpeg;
mod stored_entry;
#[cfg(test)]
mod test_support;
mod wait_until_cached;

pub use entry_paths::EntryPaths;
pub use error::ConversionError;
pub use key::{CONVERTER_VERSION, ConversionKey};
pub use manifest::Manifest;
pub use service::ConversionService;
