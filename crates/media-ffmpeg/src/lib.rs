//! Runs the ffmpeg and ffprobe binaries as subprocesses. Desktop and server only.

pub mod conversion_command;
pub mod encoders;
pub mod error;
pub mod ffprobe_output;
pub mod ffprobe_timing_output;
pub mod keyframes;
pub mod locate;
pub mod probe;
pub mod waveform_command;

mod ffmpeg_time;
mod ffprobe_command;
mod ffprobe_time;
mod probe_track;

pub use conversion_command::{
    AAC_ENCODER, ConversionJob, INIT_SEGMENT_FILE_NAME, OUTPUT_TS_OFFSET_SECONDS,
    RUN_PLAYLIST_FILE_NAME, RUN_SEGMENT_FILE_PATTERN, conversion_args,
};
pub use encoders::{H264_HARDWARE_ENCODERS, find_working_h264_encoder, list_encoders};
pub use error::FfmpegError;
pub use keyframes::list_keyframes;
pub use locate::{BinaryName, FfmpegPaths, locate_binary};
pub use probe::probe_file;
pub use waveform_command::{WaveformDecode, waveform_decode_args};
