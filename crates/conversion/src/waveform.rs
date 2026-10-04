//! Waveform peaks of one window of an audio track, decoded by ffmpeg on demand.

use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;

use easyimmerse_media::{TrackInfo, WaveformResponse, compute_peaks};
use easyimmerse_media_ffmpeg::{
    BinaryName, FfmpegError, WaveformDecode, background_command, waveform_decode_args,
};
use tokio::process::Command;
use tokio::sync::Semaphore;

use crate::error::ConversionError;

pub const MAX_WAVEFORM_WINDOW: Duration = Duration::from_secs(5 * 60);
const MAX_CONCURRENT_DECODES: usize = 3;
/// Used when the track does not state its layout.
const FALLBACK_SAMPLE_RATE: u32 = 48_000;
const FALLBACK_CHANNELS: u32 = 2;

pub struct WaveformDecoder {
    ffmpeg: PathBuf,
    decodes: Semaphore,
}

impl WaveformDecoder {
    pub fn new(ffmpeg: PathBuf) -> Self {
        Self {
            ffmpeg,
            decodes: Semaphore::new(MAX_CONCURRENT_DECODES),
        }
    }

    /// Decodes the window `start_ms..end_ms` of the track and returns its peaks. A window past
    /// the end of the file yields fewer peaks.
    pub async fn peaks(
        &self,
        source: &Path,
        track: &TrackInfo,
        start_ms: u64,
        end_ms: u64,
    ) -> Result<WaveformResponse, ConversionError> {
        let duration_ms = validate_window(start_ms, end_ms)?;
        let sample_rate = track.sample_rate.unwrap_or(FALLBACK_SAMPLE_RATE);
        let channels = track.channels.unwrap_or(FALLBACK_CHANNELS).max(1);
        let args = waveform_decode_args(&WaveformDecode {
            source,
            stream_index: track.index,
            start_micros: i64::try_from(start_ms * 1000).unwrap_or(i64::MAX),
            duration_micros: i64::try_from(duration_ms * 1000).unwrap_or(i64::MAX),
            sample_rate,
            channels,
        });
        let _permit = self.decodes.acquire().await;
        let mut command = background_command(&self.ffmpeg);
        command.args(args);
        let output = Command::from(command)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true)
            .output()
            .await
            .map_err(|source| FfmpegError::Spawn {
                binary: BinaryName::Ffmpeg,
                source,
            })?;
        if !output.status.success() {
            return Err(FfmpegError::Failed {
                binary: BinaryName::Ffmpeg,
                status: output.status,
                stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
            }
            .into());
        }
        Ok(WaveformResponse {
            start_ms,
            peaks: compute_peaks(&to_samples(&output.stdout), channels as usize, sample_rate),
        })
    }
}

fn validate_window(start_ms: u64, end_ms: u64) -> Result<u64, ConversionError> {
    let duration_ms = end_ms.saturating_sub(start_ms);
    let max_ms = u64::try_from(MAX_WAVEFORM_WINDOW.as_millis()).unwrap_or(u64::MAX);
    if end_ms <= start_ms || duration_ms > max_ms {
        return Err(ConversionError::InvalidWaveformWindow(MAX_WAVEFORM_WINDOW));
    }
    Ok(duration_ms)
}

fn to_samples(bytes: &[u8]) -> Vec<f32> {
    bytes
        .as_chunks::<4>()
        .0
        .iter()
        .map(|chunk| f32::from_le_bytes(*chunk))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_an_inverted_window() {
        assert!(validate_window(2000, 1000).is_err());
    }

    #[test]
    fn rejects_a_window_over_five_minutes() {
        assert!(validate_window(0, 5 * 60 * 1000 + 1).is_err());
    }

    #[test]
    fn accepts_a_window_of_exactly_five_minutes() {
        assert_eq!(validate_window(0, 5 * 60 * 1000).ok(), Some(5 * 60 * 1000));
    }

    #[test]
    fn reads_little_endian_floats() {
        assert_eq!(to_samples(&0.5f32.to_le_bytes()), [0.5]);
    }
}
