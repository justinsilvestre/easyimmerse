use crate::settings::{DAY_MS, MINUTE_MS};

/// A day begins at 4 a.m. local time, as in Anki, so that a late session counts towards the day it began in.
const DAY_STARTS_AFTER_MIDNIGHT_MS: i64 = 4 * 60 * MINUTE_MS as i64;
const DAY_MS_SIGNED: i64 = DAY_MS as i64;

/// A point in time together with the user's UTC offset, which places it in a local day.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ReviewMoment {
    /// Milliseconds since the Unix epoch.
    pub at_ms: u64,
    /// Local time minus UTC, in minutes.
    pub utc_offset_min: i32,
}

impl ReviewMoment {
    /// The local day the moment falls in, counted from the day that began at 4 a.m. on 1 January 1970.
    pub fn day(self) -> i64 {
        (self.local_ms() - DAY_STARTS_AFTER_MIDNIGHT_MS).div_euclid(DAY_MS_SIGNED)
    }

    /// Milliseconds since the Unix epoch at which the moment's local day began.
    pub fn day_start_ms(self) -> u64 {
        let local_start = self.day() * DAY_MS_SIGNED + DAY_STARTS_AFTER_MIDNIGHT_MS;
        u64::try_from(local_start - self.offset_ms()).unwrap_or(0)
    }

    /// Milliseconds since the Unix epoch at which the moment's local day ends.
    pub fn day_end_ms(self) -> u64 {
        self.day_start_ms() + DAY_MS
    }

    /// The number of local days from the day of `earlier_ms` to the moment's day. Zero for a time on the same day or later.
    pub fn days_since(self, earlier_ms: u64) -> u32 {
        u32::try_from(self.day() - self.at(earlier_ms).day()).unwrap_or(0)
    }

    /// The same offset at another time.
    pub fn at(self, at_ms: u64) -> Self {
        Self { at_ms, ..self }
    }

    fn local_ms(self) -> i64 {
        i64::try_from(self.at_ms).unwrap_or(i64::MAX) + self.offset_ms()
    }

    fn offset_ms(self) -> i64 {
        i64::from(self.utc_offset_min) * MINUTE_MS as i64
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 2026-10-19 00:00 UTC.
    const MIDNIGHT_UTC: u64 = 1_792_368_000_000;
    const HOUR_MS: u64 = 3_600_000;

    fn utc(at_ms: u64) -> ReviewMoment {
        ReviewMoment {
            at_ms,
            utc_offset_min: 0,
        }
    }

    #[test]
    fn a_moment_before_4_am_belongs_to_the_previous_day() {
        assert_eq!(
            utc(MIDNIGHT_UTC + 3 * HOUR_MS).day(),
            utc(MIDNIGHT_UTC - HOUR_MS).day()
        );
    }

    #[test]
    fn a_new_day_begins_at_4_am() {
        assert_eq!(
            utc(MIDNIGHT_UTC + 4 * HOUR_MS).day(),
            utc(MIDNIGHT_UTC + 3 * HOUR_MS).day() + 1
        );
    }

    #[test]
    fn the_day_starts_at_4_am_local_time() {
        let tokyo = ReviewMoment {
            at_ms: MIDNIGHT_UTC,
            utc_offset_min: 9 * 60,
        };
        assert_eq!(tokyo.day_start_ms(), MIDNIGHT_UTC - 5 * HOUR_MS);
    }

    #[test]
    fn a_negative_offset_moves_the_day_start_later() {
        let new_york = ReviewMoment {
            at_ms: MIDNIGHT_UTC + 12 * HOUR_MS,
            utc_offset_min: -4 * 60,
        };
        assert_eq!(new_york.day_start_ms(), MIDNIGHT_UTC + 8 * HOUR_MS);
    }

    #[test]
    fn the_day_ends_a_day_after_it_starts() {
        let moment = utc(MIDNIGHT_UTC + 12 * HOUR_MS);
        assert_eq!(moment.day_end_ms(), MIDNIGHT_UTC + 28 * HOUR_MS);
    }
}
