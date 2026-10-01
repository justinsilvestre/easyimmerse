//! Runs the ffmpeg and ffprobe binaries as subprocesses. Desktop and server only.

pub mod error;
pub mod ffprobe_output;
mod ffprobe_track;
pub mod locate;
pub mod probe;

pub use error::FfmpegError;
pub use locate::{BinaryName, FfmpegPaths, locate_binary};
pub use probe::probe_file;
