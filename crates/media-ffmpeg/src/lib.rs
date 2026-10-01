//! Runs the ffmpeg and ffprobe binaries as subprocesses. Desktop and server only.

pub mod error;
pub mod ffprobe_output;
mod ffprobe_timeline;
mod ffprobe_track;
pub mod format_seconds;
pub mod hls_arguments;
pub mod hls_track_arguments;
pub mod keyframe_index;
pub mod locate;
pub mod probe;
mod run_ffprobe;

pub use error::FfmpegError;
pub use format_seconds::format_seconds;
pub use hls_arguments::{HlsSource, HlsTracks, hls_arguments};
pub use hls_track_arguments::{AAC_BIT_RATE, AacEncoder};
pub use keyframe_index::{KeyframeIndexError, audio_timeline, keyframe_index};
pub use locate::{BinaryName, FfmpegPaths, locate_binary};
pub use probe::probe_file;
