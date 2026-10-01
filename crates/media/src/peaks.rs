//! Waveform summaries for drawing an audio overview.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// The largest absolute sample value in each of `bucket_count` equal time spans.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct WaveformPeaks {
    pub bucket_count: u32,
    pub peaks: Vec<f32>,
}

/// Splits the samples into `bucket_count` equal spans and records each span's peak.
/// Spans that receive no samples have a peak of zero.
pub fn compute_peaks(samples: &[f32], bucket_count: u32) -> WaveformPeaks {
    let peaks = (0..bucket_count as usize)
        .map(|bucket| peak_of(bucket_samples(samples, bucket, bucket_count as usize)))
        .collect();
    WaveformPeaks {
        bucket_count,
        peaks,
    }
}

fn bucket_samples(samples: &[f32], bucket: usize, bucket_count: usize) -> &[f32] {
    let start = bucket * samples.len() / bucket_count;
    let end = (bucket + 1) * samples.len() / bucket_count;
    &samples[start..end]
}

fn peak_of(samples: &[f32]) -> f32 {
    samples
        .iter()
        .fold(0.0, |peak, sample| peak.max(sample.abs()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sine(cycles: u32, samples_per_cycle: u32) -> Vec<f32> {
        (0..cycles * samples_per_cycle)
            .map(|i| (i as f32 / samples_per_cycle as f32 * std::f32::consts::TAU).sin())
            .collect()
    }

    #[test]
    fn keeps_the_requested_bucket_count() {
        assert_eq!(compute_peaks(&sine(8, 100), 16).peaks.len(), 16);
    }

    #[test]
    fn finds_the_sine_amplitude_in_every_bucket() {
        let peaks = compute_peaks(&sine(8, 100), 8).peaks;
        assert!(
            peaks.iter().all(|peak| (peak - 1.0).abs() < 0.01),
            "{peaks:?}"
        );
    }

    #[test]
    fn follows_a_fading_signal() {
        let fading: Vec<f32> = sine(2, 100)
            .iter()
            .enumerate()
            .map(|(i, sample)| if i < 100 { *sample } else { sample * 0.5 })
            .collect();
        assert_eq!(compute_peaks(&fading, 2).peaks, [1.0, 0.5]);
    }

    #[test]
    fn reports_zero_for_silence() {
        assert_eq!(compute_peaks(&[0.0; 40], 4).peaks, [0.0; 4]);
    }

    #[test]
    fn reports_zero_for_buckets_without_samples() {
        assert_eq!(compute_peaks(&[0.7], 3).peaks, [0.0, 0.0, 0.7]);
    }

    #[test]
    fn returns_no_peaks_for_zero_buckets() {
        assert_eq!(compute_peaks(&sine(1, 10), 0).peaks, Vec::<f32>::new());
    }
}
