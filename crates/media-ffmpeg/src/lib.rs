//! Runs the ffmpeg and ffprobe binaries as subprocesses. Desktop and server only.

pub mod background_command;
pub mod clip_command;
pub mod conversion_command;
pub mod encoders;
pub mod error;
pub mod ffmpeg_version;
pub mod ffprobe_output;
pub mod ffprobe_timing_output;
pub mod frame_command;
pub mod keyframes;
pub mod locate;
pub mod probe;
pub mod subtitle_command;
pub mod waveform_command;

mod ffmpeg_time;
mod ffprobe_command;
mod ffprobe_time;
mod probe_track;
mod timed_output;

pub use background_command::background_command;
pub use clip_command::{AudioClipExtract, audio_clip_args};
pub use conversion_command::{
    AAC_ENCODER, ConversionJob, INIT_SEGMENT_FILE_NAME, OUTPUT_TS_OFFSET_SECONDS,
    RUN_PLAYLIST_FILE_NAME, RUN_SEGMENT_FILE_PATTERN, conversion_args,
};
pub use encoders::{
    H264_HARDWARE_ENCODERS, H264_SOFTWARE_ENCODERS, find_working_h264_encoder,
    h264_encoder_candidates, is_software_encoder, list_encoders,
};
pub use error::FfmpegError;
pub use ffmpeg_version::read_ffmpeg_version;
pub use frame_command::{FrameGrab, frame_grab_args};
pub use keyframes::list_keyframes;
pub use locate::{BinaryName, FfmpegPaths, locate_binary};
pub use probe::probe_file;
pub use subtitle_command::subtitle_extraction_args;
pub use waveform_command::{WaveformDecode, waveform_decode_args};
