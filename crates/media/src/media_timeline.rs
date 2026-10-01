//! Timing facts about a media stream, measured in the stream's own time units.

use std::num::NonZeroU64;

use serde::{Deserialize, Serialize};

/// The length of one tick as a fraction of a second, for example 1/1000 for Matroska.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Timebase {
    pub numerator: NonZeroU64,
    pub denominator: NonZeroU64,
}

/// The time span of a stream in ticks of its timebase.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct MediaTimeline {
    pub timebase: Timebase,
    /// The presentation timestamp (pts) that corresponds to playback time 0.
    pub start_pts: i64,
    pub duration_ticks: u64,
}

/// The presentation timestamps of a video stream's keyframes, which are the frames a decoder can start from.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct KeyframeIndex {
    pub timeline: MediaTimeline,
    /// Sorted in ascending order.
    pub keyframe_pts: Vec<i64>,
}

impl Timebase {
    /// Returns `None` when either part is zero.
    pub fn new(numerator: u64, denominator: u64) -> Option<Self> {
        Some(Timebase {
            numerator: NonZeroU64::new(numerator)?,
            denominator: NonZeroU64::new(denominator)?,
        })
    }

    /// Converts ticks to the nearest whole number of units, where one unit is `1 / units_per_second` seconds.
    pub fn ticks_to_units(self, ticks: i64, units_per_second: u64) -> i128 {
        let numerator = i128::from(self.numerator.get()) * i128::from(units_per_second);
        round_div(
            i128::from(ticks) * numerator,
            i128::from(self.denominator.get()),
        )
    }

    /// Converts a number of units, where one unit is `1 / units_per_second` seconds, to the nearest whole tick.
    pub fn units_to_ticks(self, units: i128, units_per_second: u64) -> i128 {
        let divisor = i128::from(self.numerator.get()) * i128::from(units_per_second);
        round_div(units * i128::from(self.denominator.get()), divisor)
    }

    /// Converts ticks to whole seconds, rounding up.
    pub fn ticks_to_seconds_ceil(self, ticks: u64) -> u128 {
        (u128::from(ticks) * u128::from(self.numerator.get()))
            .div_ceil(u128::from(self.denominator.get()))
    }
}

impl MediaTimeline {
    /// The presentation timestamp at which the stream ends.
    pub fn end_pts(&self) -> i64 {
        self.start_pts.saturating_add_unsigned(self.duration_ticks)
    }
}

/// Divides and rounds to the nearest integer, with halves rounded up. The divisor must be positive.
fn round_div(dividend: i128, divisor: i128) -> i128 {
    (2 * dividend + divisor).div_euclid(2 * divisor)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn timebase(numerator: u64, denominator: u64) -> Timebase {
        Timebase::new(numerator, denominator).expect("nonzero timebase")
    }

    #[test]
    fn rejects_a_zero_denominator() {
        assert_eq!(Timebase::new(1, 0), None);
    }

    #[test]
    fn converts_ticks_to_milliseconds() {
        assert_eq!(timebase(1, 90_000).ticks_to_units(135_000, 1000), 1500);
    }

    #[test]
    fn rounds_ticks_to_the_nearest_unit() {
        assert_eq!(timebase(1001, 24_000).ticks_to_units(1, 1000), 42);
    }

    #[test]
    fn rounds_negative_ticks_to_the_nearest_unit() {
        assert_eq!(timebase(1001, 24_000).ticks_to_units(-1, 1000), -42);
    }

    #[test]
    fn converts_units_to_ticks() {
        assert_eq!(
            timebase(1, 14_112_000).units_to_ticks(23_021, 1_000_000),
            324_872
        );
    }

    #[test]
    fn rounds_seconds_up() {
        assert_eq!(timebase(1, 1000).ticks_to_seconds_ceil(4001), 5);
    }
}
