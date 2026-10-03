//! Conversion of ffprobe's decimal time strings.

const MICROS_PER_SECOND: i64 = 1_000_000;
const MICRO_DIGITS: usize = 6;

/// Parses a time such as `-0.007000` or `10.021333` to whole microseconds, truncating further
/// digits. ffprobe prints six decimals, so nothing is lost in practice.
pub fn parse_seconds_to_micros(text: &str) -> Option<i64> {
    let (negative, unsigned) = match text.strip_prefix('-') {
        Some(rest) => (true, rest),
        None => (false, text),
    };
    let (whole, fraction) = unsigned.split_once('.').unwrap_or((unsigned, ""));
    let whole: i64 = whole.parse().ok()?;
    let fraction_digits: String = fraction.chars().take(MICRO_DIGITS).collect();
    if !fraction_digits.chars().all(|digit| digit.is_ascii_digit()) {
        return None;
    }
    let micros = if fraction_digits.is_empty() {
        0
    } else {
        fraction_digits.parse::<i64>().ok()?
            * 10i64.pow((MICRO_DIGITS - fraction_digits.len()) as u32)
    };
    let total = whole * MICROS_PER_SECOND + micros;
    Some(if negative { -total } else { total })
}

/// Parses a time in seconds to whole milliseconds, rounding to the nearest and clamping
/// negative times to zero, for the millisecond fields that cross HTTP.
pub fn parse_seconds_to_millis(text: &str) -> Option<u64> {
    let micros = parse_seconds_to_micros(text)?;
    Some(u64::try_from((micros + 500) / 1000).unwrap_or(0))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_six_decimals_exactly() {
        assert_eq!(parse_seconds_to_micros("10.021333"), Some(10_021_333));
    }

    #[test]
    fn parses_a_negative_time() {
        assert_eq!(parse_seconds_to_micros("-0.007000"), Some(-7_000));
    }

    #[test]
    fn parses_a_whole_number() {
        assert_eq!(parse_seconds_to_micros("5"), Some(5_000_000));
    }

    #[test]
    fn rejects_text_that_is_not_a_time() {
        assert_eq!(parse_seconds_to_micros("N/A"), None);
    }

    #[test]
    fn rounds_to_milliseconds() {
        assert_eq!(parse_seconds_to_millis("1.458667"), Some(1_459));
    }

    #[test]
    fn clamps_negative_times_to_zero_milliseconds() {
        assert_eq!(parse_seconds_to_millis("-0.5"), Some(0));
    }
}
