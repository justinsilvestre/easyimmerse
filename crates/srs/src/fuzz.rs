//! Anki's interval fuzz, which spreads cards learned together over neighbouring days so that they do not keep coming due together.

/// Intervals under this many days are not fuzzed.
const SMALLEST_FUZZED_DAYS: f64 = 2.5;

/// Each band of an interval widens the fuzz range by its share of the days that fall in it, as in Anki's `fuzz.rs`.
const FUZZ_BANDS: [FuzzBand; 3] = [
    FuzzBand {
        start: 2.5,
        end: 7.0,
        factor: 0.15,
    },
    FuzzBand {
        start: 7.0,
        end: 20.0,
        factor: 0.1,
    },
    FuzzBand {
        start: 20.0,
        end: f64::MAX,
        factor: 0.05,
    },
];

struct FuzzBand {
    start: f64,
    end: f64,
    factor: f64,
}

/// Picks a whole number of days within the fuzz range around `days`, at `fraction` (from 0 to 1) of the way through it.
pub fn fuzzed_days(days: f64, fraction: f64) -> u32 {
    if days < SMALLEST_FUZZED_DAYS {
        return days.round() as u32;
    }
    let (lower, upper) = fuzz_bounds(days);
    let picked = (lower + fraction * (1.0 + upper - lower)).floor();
    picked.min(upper) as u32
}

/// The lowest and highest day of the range, never under two days.
fn fuzz_bounds(days: f64) -> (f64, f64) {
    let delta = fuzz_delta(days);
    ((days - delta).round().max(2.0), (days + delta).round())
}

fn fuzz_delta(days: f64) -> f64 {
    FUZZ_BANDS.iter().fold(1.0, |delta, band| {
        delta + band.factor * (days.min(band.end) - band.start).max(0.0)
    })
}

/// A number from 0 to 1 that depends only on the flashcard and the number of answers it has had,
/// so that the interval shown on a button is the one the answer gives.
pub fn fuzz_fraction(flashcard_id: &str, reps: u32) -> f64 {
    let seed = flashcard_id
        .bytes()
        .chain(reps.to_le_bytes())
        .fold(FNV_OFFSET, |hash, byte| {
            (hash ^ u64::from(byte)).wrapping_mul(FNV_PRIME)
        });
    (mixed(seed) >> 11) as f64 / (1u64 << 53) as f64
}

const FNV_OFFSET: u64 = 0xcbf2_9ce4_8422_2325;
const FNV_PRIME: u64 = 0x0000_0100_0000_01b3;

/// The SplitMix64 finalizer, which spreads similar seeds across the whole range.
fn mixed(seed: u64) -> u64 {
    let mut value = seed.wrapping_add(0x9e37_79b9_7f4a_7c15);
    value = (value ^ (value >> 30)).wrapping_mul(0xbf58_476d_1ce4_e5b9);
    value = (value ^ (value >> 27)).wrapping_mul(0x94d0_49bb_1331_11eb);
    value ^ (value >> 31)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn leaves_an_interval_under_two_and_a_half_days_unfuzzed() {
        assert_eq!(fuzzed_days(2.3, 0.99), 2);
    }

    #[test]
    fn the_range_of_an_eight_day_interval_starts_at_six_days() {
        assert_eq!(fuzzed_days(8.3, 0.0), 6);
    }

    #[test]
    fn the_range_of_an_eight_day_interval_ends_at_ten_days() {
        assert_eq!(fuzzed_days(8.3, 0.999), 10);
    }

    #[test]
    fn widens_the_range_by_five_percent_beyond_twenty_days() {
        // 1 + 0.15 × 4.5 + 0.1 × 13 + 0.05 × 80 = 6.975 days on either side of 100.
        assert_eq!(fuzz_bounds(100.0), (93.0, 107.0));
    }

    #[test]
    fn the_fraction_is_the_same_for_the_same_card_and_answer_count() {
        assert_eq!(fuzz_fraction("abc", 3), fuzz_fraction("abc", 3));
    }

    #[test]
    fn the_fraction_changes_with_the_answer_count() {
        assert_ne!(fuzz_fraction("abc", 3), fuzz_fraction("abc", 4));
    }

    #[test]
    fn the_fraction_is_below_one() {
        let fractions = (0..1000).map(|reps| fuzz_fraction("abc", reps));
        assert!(
            fractions
                .into_iter()
                .all(|fraction| (0.0..1.0).contains(&fraction))
        );
    }
}
