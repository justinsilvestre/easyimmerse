//! Tests that run ffmpeg against the conversion fixtures. They skip when no binary is found,
//! since CI runners have no ffmpeg. Set `EASYIMMERSE_FFMPEG_DIR` to test a particular build.

mod accuracy;
mod cache;
mod runs;
mod support;
mod waveform;
