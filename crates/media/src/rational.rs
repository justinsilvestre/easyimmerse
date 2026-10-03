//! Exact ratios for stream timebases and frame rates.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// A positive ratio of two integers, such as a timebase of `1/90000` or a frame rate of `30000/1001`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct Rational {
    pub num: u64,
    pub den: u64,
}

const MICROS_PER_SECOND: i128 = 1_000_000;

impl Rational {
    pub const fn new(num: u64, den: u64) -> Self {
        Self { num, den }
    }

    /// Parses ffprobe's `num/den` spelling. Ratios with a zero term, such as `0/0`, parse as `None`.
    pub fn parse(text: &str) -> Option<Self> {
        let (num, den) = text.split_once('/')?;
        let ratio = Self::new(num.trim().parse().ok()?, den.trim().parse().ok()?);
        (ratio.num > 0 && ratio.den > 0).then_some(ratio)
    }

    pub fn reduced(self) -> Self {
        let divisor = gcd(self.num, self.den);
        Self::new(self.num / divisor, self.den / divisor)
    }

    pub fn as_f64(self) -> f64 {
        self.num as f64 / self.den as f64
    }

    pub fn is_greater_than(self, other: Rational) -> bool {
        u128::from(self.num) * u128::from(other.den) > u128::from(other.num) * u128::from(self.den)
    }

    /// Converts a tick count in this timebase to microseconds, rounding to the nearest.
    pub fn ticks_to_micros(self, ticks: i64) -> i64 {
        divide_rounding(
            i128::from(ticks) * i128::from(self.num) * MICROS_PER_SECOND,
            i128::from(self.den),
        )
    }

    /// Converts microseconds to a tick count in this timebase, rounding to the nearest.
    pub fn ticks_from_micros(self, micros: i64) -> i64 {
        divide_rounding(
            i128::from(micros) * i128::from(self.den),
            i128::from(self.num) * MICROS_PER_SECOND,
        )
    }

    /// The number of ticks in the given number of whole seconds, rounded to the nearest.
    pub fn ticks_per_seconds(self, seconds: u64) -> i64 {
        divide_rounding(
            i128::from(seconds) * i128::from(self.den),
            i128::from(self.num),
        )
    }
}

/// Divides, rounding halves away from zero. The divisor is positive and the result fits in i64.
fn divide_rounding(dividend: i128, divisor: i128) -> i64 {
    let half = divisor / 2;
    let rounded = if dividend >= 0 {
        (dividend + half) / divisor
    } else {
        (dividend - half) / divisor
    };
    rounded as i64
}

fn gcd(a: u64, b: u64) -> u64 {
    if b == 0 { a.max(1) } else { gcd(b, a % b) }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_a_frame_rate() {
        assert_eq!(
            Rational::parse("30000/1001"),
            Some(Rational::new(30000, 1001))
        );
    }

    #[test]
    fn treats_zero_over_zero_as_absent() {
        assert_eq!(Rational::parse("0/0"), None);
    }

    #[test]
    fn reduces_by_the_common_divisor() {
        assert_eq!(Rational::new(48, 2).reduced(), Rational::new(24, 1));
    }

    #[test]
    fn compares_without_floating_point() {
        assert!(Rational::new(30000, 1001).is_greater_than(Rational::new(29, 1)));
    }

    #[test]
    fn converts_ticks_to_microseconds() {
        assert_eq!(
            Rational::new(1, 12288).ticks_to_micros(12288 * 5),
            5_000_000
        );
    }

    #[test]
    fn rounds_microseconds_to_the_nearest_tick() {
        assert_eq!(Rational::new(1, 1000).ticks_from_micros(2_500), 3);
    }

    #[test]
    fn rounds_negative_microseconds_away_from_zero() {
        assert_eq!(Rational::new(1, 1000).ticks_from_micros(-2_500), -3);
    }

    #[test]
    fn counts_the_ticks_in_four_seconds() {
        assert_eq!(Rational::new(1, 44100).ticks_per_seconds(4), 176_400);
    }
}
