//! Runs the ffmpeg and ffprobe binaries as subprocesses. Desktop and server only.

mod discover;
mod encoder_list;
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
mod video_encoder;

pub use discover::discover_video_encoders;
pub use error::FfmpegError;
pub use format_seconds::format_seconds;
pub use hls_arguments::{HlsSource, HlsTracks, TIMESTAMP_OFFSET_SECONDS, hls_arguments};
pub use hls_track_arguments::{AAC_BIT_RATE, AacEncoder};
pub use keyframe_index::{KeyframeIndexError, audio_timeline, keyframe_index};
pub use locate::{BinaryName, FfmpegPaths, locate_binary};
pub use probe::probe_file;
pub use video_encoder::VideoEncoder;
