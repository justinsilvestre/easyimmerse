//! Runs the ffmpeg and ffprobe binaries as subprocesses. Desktop and server only.

pub mod error;
pub mod ffprobe_output;
mod ffprobe_timeline;
mod ffprobe_track;
pub mod keyframe_index;
pub mod locate;
pub mod probe;
mod run_ffprobe;

pub use error::FfmpegError;
pub use keyframe_index::{KeyframeIndexError, audio_timeline, keyframe_index};
pub use locate::{BinaryName, FfmpegPaths, locate_binary};
pub use probe::probe_file;
