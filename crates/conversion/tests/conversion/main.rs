//! Tests that run ffmpeg against the conversion fixtures. They skip when no binary is found.
//! Set `EASYIMMERSE_FFMPEG_DIR` to `apps/native/src-tauri/binaries` to test the bundled build.

mod accuracy;
mod cache;
mod restarts;
mod runs;
mod support;
mod waveform;
