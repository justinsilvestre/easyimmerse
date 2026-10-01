use jiff::Timestamp;

/// Returns the current time as an RFC 3339 timestamp in UTC with millisecond precision.
///
/// The fixed precision keeps timestamps the same length, so they sort correctly as text.
pub fn now_rfc3339() -> String {
    format!("{:.3}", Timestamp::now())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_the_time_in_utc() {
        assert!(now_rfc3339().ends_with('Z'));
    }

    #[test]
    fn formats_the_time_with_exactly_three_fractional_digits() {
        assert_eq!(now_rfc3339().len(), "2026-10-01T10:00:00.000Z".len());
    }

    #[test]
    fn produces_a_timestamp_jiff_can_parse() {
        assert!(now_rfc3339().parse::<Timestamp>().is_ok());
    }
}
