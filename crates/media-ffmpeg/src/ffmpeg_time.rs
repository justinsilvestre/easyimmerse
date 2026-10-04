//! Formatting of times for ffmpeg's command line.

const MICROS_PER_SECOND: i64 = 1_000_000;

/// Formats microseconds as seconds with six decimals, such as `4.000000` or `-0.021333`.
pub fn format_micros_as_seconds(micros: i64) -> String {
    let sign = if micros < 0 { "-" } else { "" };
    let magnitude = micros.unsigned_abs();
    format!(
        "{sign}{}.{:06}",
        magnitude / MICROS_PER_SECOND as u64,
        magnitude % MICROS_PER_SECOND as u64
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_whole_seconds_with_six_decimals() {
        assert_eq!(format_micros_as_seconds(4_000_000), "4.000000");
    }

    #[test]
    fn keeps_every_microsecond() {
        assert_eq!(format_micros_as_seconds(1_458_667), "1.458667");
    }

    #[test]
    fn formats_a_negative_time() {
        assert_eq!(format_micros_as_seconds(-21_333), "-0.021333");
    }
}
