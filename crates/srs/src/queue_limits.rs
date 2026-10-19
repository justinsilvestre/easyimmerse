//! How many new cards a day introduces, and how far ahead a learning card may be shown.

use crate::review_moment::ReviewMoment;
use crate::settings::{BACKLOG_REVIEW_COUNT, LEARN_AHEAD_MS, NEW_CARDS_PER_DAY};

/// The number of new cards that may still be introduced today.
/// While more reviews are due than `BACKLOG_REVIEW_COUNT`, only the extra cards the user asked for are introduced.
pub fn new_cards_available(introduced_today: u64, extra_today: u64, due_review_count: u64) -> u64 {
    let base = if due_review_count > BACKLOG_REVIEW_COUNT {
        0
    } else {
        NEW_CARDS_PER_DAY
    };
    (base + extra_today).saturating_sub(introduced_today)
}

/// Milliseconds since the Unix epoch up to which a learning card is shown, though not yet due.
pub fn learn_ahead_cutoff_ms(moment: ReviewMoment) -> u64 {
    moment.at_ms + LEARN_AHEAD_MS
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn introduces_twenty_new_cards_a_day() {
        assert_eq!(new_cards_available(0, 0, 0), 20);
    }

    #[test]
    fn counts_the_cards_introduced_today() {
        assert_eq!(new_cards_available(15, 0, 0), 5);
    }

    #[test]
    fn adds_the_extra_cards_asked_for() {
        assert_eq!(new_cards_available(20, 20, 0), 20);
    }

    #[test]
    fn introduces_only_the_extra_cards_during_a_backlog() {
        assert_eq!(new_cards_available(0, 20, 201), 20);
    }

    #[test]
    fn never_goes_below_zero() {
        assert_eq!(new_cards_available(25, 0, 0), 0);
    }
}
