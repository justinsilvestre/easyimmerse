use super::error::TimedTextError;

/// Parses `HH:MM:SS,mmm`, `HH:MM:SS.mmm`, or `MM:SS.mmm` into milliseconds.
pub fn parse_timestamp(text: &str) -> Result<u64, TimedTextError> {
    let invalid = || TimedTextError::InvalidTimestamp(text.to_string());
    let (clock, fraction) = text.rsplit_once([',', '.']).ok_or_else(invalid)?;
    let millis = parse_millis(fraction).ok_or_else(invalid)?;
    let seconds = parse_clock(clock).ok_or_else(invalid)?;
    seconds
        .checked_mul(1_000)
        .and_then(|value| value.checked_add(millis))
        .ok_or_else(invalid)
}

/// Returns `None` when a field is not a number or the total does not fit in a `u64`.
fn parse_clock(clock: &str) -> Option<u64> {
    let parts: Vec<u64> = clock
        .split(':')
        .map(|part| part.parse().ok())
        .collect::<Option<_>>()?;
    match parts[..] {
        [minutes, seconds] => minutes.checked_mul(60)?.checked_add(seconds),
        [hours, minutes, seconds] => hours
            .checked_mul(60)?
            .checked_add(minutes)?
            .checked_mul(60)?
            .checked_add(seconds),
        _ => None,
    }
}

/// Reads up to three fraction digits as milliseconds, so `5` means 500 and `05` means 50.
fn parse_millis(fraction: &str) -> Option<u64> {
    if fraction.is_empty() || !fraction.bytes().all(|byte| byte.is_ascii_digit()) {
        return None;
    }
    let padded = format!("{fraction:0<3}");
    padded.get(..3)?.parse().ok()
}

/// Parses a line of the form `start --> end`, ignoring anything after the end timestamp.
pub fn parse_timing_line(line: &str) -> Result<(u64, u64), TimedTextError> {
    let mut parts = line.split_whitespace();
    match (parts.next(), parts.next(), parts.next()) {
        (Some(start), Some("-->"), Some(end)) => {
            Ok((parse_timestamp(start)?, parse_timestamp(end)?))
        }
        _ => Err(TimedTextError::InvalidTimingLine(line.trim().to_string())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_an_srt_timestamp_with_a_comma() {
        assert_eq!(parse_timestamp("00:00:01,500"), Ok(1_500));
    }

    #[test]
    fn parses_a_vtt_timestamp_without_hours() {
        assert_eq!(parse_timestamp("00:01.500"), Ok(1_500));
    }

    #[test]
    fn parses_a_vtt_timestamp_with_hours() {
        assert_eq!(parse_timestamp("01:02:03.004"), Ok(3_723_004));
    }

    #[test]
    fn rejects_a_timestamp_without_a_fraction() {
        assert_eq!(
            parse_timestamp("00:00:01"),
            Err(TimedTextError::InvalidTimestamp("00:00:01".into()))
        );
    }

    #[test]
    fn rejects_a_timestamp_with_non_numeric_parts() {
        assert!(parse_timestamp("00:xx:01.000").is_err());
    }

    #[test]
    fn rejects_a_timestamp_whose_hours_overflow() {
        let text = format!("{}:00:00.000", u64::MAX);
        assert_eq!(
            parse_timestamp(&text),
            Err(TimedTextError::InvalidTimestamp(text.clone()))
        );
    }

    #[test]
    fn parses_a_timing_line_with_cue_settings() {
        assert_eq!(
            parse_timing_line("00:00:03.250 --> 00:00:04.000 line:90% align:center"),
            Ok((3_250, 4_000))
        );
    }

    #[test]
    fn rejects_a_timing_line_without_an_arrow() {
        assert!(parse_timing_line("00:00:03.250 00:00:04.000").is_err());
    }
}
