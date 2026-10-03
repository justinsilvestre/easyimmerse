//! Runs the ffmpeg and ffprobe binaries as subprocesses. Desktop and server only.

pub mod error;
pub mod ffprobe_output;
pub mod ffprobe_timing_output;
pub mod keyframes;
pub mod locate;
pub mod probe;

mod ffprobe_command;
mod ffprobe_time;
mod probe_track;

pub use error::FfmpegError;
pub use keyframes::list_keyframes;
pub use locate::{BinaryName, FfmpegPaths, locate_binary};
pub use probe::probe_file;
