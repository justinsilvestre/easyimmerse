//! How many reviews and new cards a day shows, and how far ahead a learning card may be shown.

use crate::review_moment::ReviewMoment;
use crate::settings::{LEARN_AHEAD_MS, NEW_CARDS_PER_DAY, REVIEWS_PER_DAY};

/// The number of reviews that may still be shown today, given the reviews answered today and the extra ones the user asked for.
pub fn reviews_available(reviewed_today: u64, extra_today: u64) -> u64 {
    (REVIEWS_PER_DAY + extra_today).saturating_sub(reviewed_today)
}

/// The number of new cards that may still be introduced today.
/// While due reviews are held back for later days, only the extra cards the user asked for are introduced.
pub fn new_cards_available(introduced_today: u64, extra_today: u64, is_holding_back: bool) -> u64 {
    let base = if is_holding_back {
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
    fn shows_two_hundred_reviews_a_day() {
        assert_eq!(reviews_available(0, 0), 200);
    }

    #[test]
    fn counts_the_reviews_answered_today() {
        assert_eq!(reviews_available(150, 0), 50);
    }

    #[test]
    fn adds_the_extra_reviews_asked_for() {
        assert_eq!(reviews_available(200, 100), 100);
    }

    #[test]
    fn introduces_twenty_new_cards_a_day() {
        assert_eq!(new_cards_available(0, 0, false), 20);
    }

    #[test]
    fn counts_the_cards_introduced_today() {
        assert_eq!(new_cards_available(15, 0, false), 5);
    }

    #[test]
    fn adds_the_extra_cards_asked_for() {
        assert_eq!(new_cards_available(20, 20, false), 20);
    }

    #[test]
    fn introduces_only_the_extra_cards_while_reviews_are_held_back() {
        assert_eq!(new_cards_available(0, 20, true), 20);
    }

    #[test]
    fn never_goes_below_zero() {
        assert_eq!(new_cards_available(25, 0, false), 0);
    }
}
