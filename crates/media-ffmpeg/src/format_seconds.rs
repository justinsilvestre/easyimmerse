//! Formatting a stream time as the decimal seconds that ffmpeg accepts in time options such as `-ss`.

use easyimmerse_media::Timebase;

const MICROSECONDS_PER_SECOND: u64 = 1_000_000;

/// Formats a time in ticks of the timebase as seconds with six decimal places, rounded to the nearest microsecond.
pub fn format_seconds(ticks: i64, timebase: Timebase) -> String {
    let microseconds = timebase.ticks_to_units(ticks, MICROSECONDS_PER_SECOND);
    let sign = if microseconds < 0 { "-" } else { "" };
    let magnitude = microseconds.unsigned_abs();
    let per_second = u128::from(MICROSECONDS_PER_SECOND);
    format!(
        "{sign}{}.{:06}",
        magnitude / per_second,
        magnitude % per_second
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn timebase(numerator: u64, denominator: u64) -> Timebase {
        Timebase::new(numerator, denominator).expect("nonzero timebase")
    }

    #[test]
    fn formats_whole_milliseconds() {
        assert_eq!(format_seconds(1502, timebase(1, 1000)), "1.502000");
    }

    #[test]
    fn rounds_to_the_nearest_microsecond() {
        assert_eq!(format_seconds(1, timebase(1001, 24_000)), "0.041708");
    }

    #[test]
    fn formats_a_time_before_zero() {
        assert_eq!(format_seconds(-500, timebase(1, 1000)), "-0.500000");
    }
}
