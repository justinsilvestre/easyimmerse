//! Waveform peaks for drawing an audio overview.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

pub const PEAKS_PER_SECOND: u32 = 100;
const FULL_SCALE: f32 = 255.0;

/// One window of waveform peaks: 100 per second from `start_ms`, each the loudest sample of the
/// loudest channel in its hundredth of a second, from 0 (silence) to 255 (full scale).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct WaveformResponse {
    pub start_ms: u64,
    pub peaks: Vec<u8>,
}

/// Computes peaks from interleaved floating-point samples in the range -1 to 1.
/// A trailing partial hundredth of a second yields one more peak.
pub fn compute_peaks(samples: &[f32], channels: usize, sample_rate: u32) -> Vec<u8> {
    let channels = channels.max(1);
    let frame_count = samples.len() / channels;
    if frame_count == 0 || sample_rate == 0 {
        return Vec::new();
    }
    let peak_count = (frame_count * PEAKS_PER_SECOND as usize).div_ceil(sample_rate as usize);
    (0..peak_count)
        .map(|peak| {
            let first_frame = peak * sample_rate as usize / PEAKS_PER_SECOND as usize;
            let end_frame =
                ((peak + 1) * sample_rate as usize / PEAKS_PER_SECOND as usize).min(frame_count);
            to_byte(loudest(
                &samples[first_frame * channels..end_frame * channels],
            ))
        })
        .collect()
}

fn loudest(samples: &[f32]) -> f32 {
    samples
        .iter()
        .fold(0.0, |peak, sample| peak.max(sample.abs()))
}

fn to_byte(amplitude: f32) -> u8 {
    (amplitude.min(1.0) * FULL_SCALE).round() as u8
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn yields_100_peaks_per_second() {
        assert_eq!(compute_peaks(&vec![0.0; 44100], 1, 44100).len(), 100);
    }

    #[test]
    fn rounds_a_partial_hundredth_up_to_one_more_peak() {
        assert_eq!(compute_peaks(&vec![0.0; 44100 + 1], 1, 44100).len(), 101);
    }

    #[test]
    fn maps_full_scale_to_255() {
        assert_eq!(compute_peaks(&[1.0, -1.0], 1, 200), [255]);
    }

    #[test]
    fn maps_silence_to_0() {
        assert_eq!(compute_peaks(&[0.0; 10], 1, 1000), [0]);
    }

    #[test]
    fn takes_the_loudest_channel() {
        assert_eq!(compute_peaks(&[0.2, -0.8], 2, 100), [204]);
    }

    #[test]
    fn keeps_peaks_in_their_own_hundredth_of_a_second() {
        let mut samples = vec![0.0; 20];
        samples[15] = 0.5;
        assert_eq!(compute_peaks(&samples, 1, 1000), [0, 128]);
    }

    #[test]
    fn clamps_samples_beyond_full_scale() {
        assert_eq!(compute_peaks(&[1.7], 1, 100), [255]);
    }

    #[test]
    fn returns_no_peaks_for_no_samples() {
        assert_eq!(compute_peaks(&[], 2, 48000), Vec::<u8>::new());
    }
}
