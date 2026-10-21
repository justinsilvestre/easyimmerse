use easyimmerse_core::review::{ReviewCardState, ReviewHoldKind, ReviewLogEntry, ReviewPhase};
use serde_json::json;

/// Anki's default starting ease, in permille. Anki keeps the column for cards it schedules with FSRS too.
pub(crate) const DEFAULT_FACTOR: i64 = 2500;
const SECONDS_PER_DAY: u64 = 86_400;
const MILLIS_PER_DAY: u64 = SECONDS_PER_DAY * 1000;
/// The learning steps, and the relearning steps, of easyImmerse's review. A card in either phase has them all still to pass.
const STEPS_LEFT: i64 = 1;

/// Scheduling of an exported card: new, or as easyImmerse's review left it, with the answers given to it.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) enum CardScheduling<'a> {
    New,
    Reviewed(&'a ReviewCardState, &'a [ReviewLogEntry]),
}

/// The scheduling columns of a row in the `cards` table.
pub(crate) struct CardColumns {
    pub(crate) kind: i64,
    pub(crate) queue: i64,
    pub(crate) due: i64,
    pub(crate) interval: i64,
    pub(crate) factor: i64,
    pub(crate) reps: i64,
    pub(crate) lapses: i64,
    pub(crate) left: i64,
    pub(crate) data: String,
}

impl CardScheduling<'_> {
    /// The columns of a card at `position`, counted from 1 in export order, which is the order Anki shows new cards in.
    /// A review card's due day is counted from `collection_created_secs`, the collection's creation time.
    pub(crate) fn columns(self, position: i64, collection_created_secs: u64) -> CardColumns {
        match self {
            CardScheduling::New => new_card_columns(position),
            CardScheduling::Reviewed(state, log) => {
                reviewed_card_columns(state, log, collection_created_secs)
            }
        }
    }
}

/// The queue Anki keeps a card the user set aside in: -1 for a suspended card, -3 for one the user buried.
pub(crate) fn held_queue(hold: ReviewHoldKind) -> i64 {
    match hold {
        ReviewHoldKind::Suspended => -1,
        ReviewHoldKind::Buried => -3,
    }
}

fn new_card_columns(position: i64) -> CardColumns {
    CardColumns {
        kind: 0,
        queue: 0,
        due: position,
        interval: 0,
        factor: 0,
        reps: 0,
        lapses: 0,
        left: 0,
        data: "{}".to_owned(),
    }
}

/// Learning and relearning cards are due at a time in seconds; review cards on a day counted from the collection's creation.
/// A relearning card keeps the interval in days it returns to when it graduates, which FSRS puts near its stability.
fn reviewed_card_columns(
    state: &ReviewCardState,
    log: &[ReviewLogEntry],
    collection_created_secs: u64,
) -> CardColumns {
    let due_secs = state.due_at_ms / 1000;
    let (kind, queue, due, interval, factor, left) = match state.state {
        ReviewPhase::Learning => (1, 1, due_secs, 0, 0, STEPS_LEFT),
        ReviewPhase::Relearning => {
            let interval = (state.stability.round() as i64).max(1);
            (3, 1, due_secs, interval, DEFAULT_FACTOR, STEPS_LEFT)
        }
        ReviewPhase::Review => {
            let due_day = due_secs.saturating_sub(collection_created_secs) / SECONDS_PER_DAY;
            (
                2,
                2,
                due_day,
                interval_days(state.interval_ms),
                DEFAULT_FACTOR,
                0,
            )
        }
    };
    CardColumns {
        kind,
        queue,
        due: i64::try_from(due).unwrap_or(i64::MAX),
        interval,
        factor,
        reps: i64::from(state.reps),
        lapses: i64::from(state.lapses),
        left,
        data: memory_data(state, log),
    }
}

/// A whole number of days, at least one, as Anki keeps the interval of a graduated card.
pub(crate) fn interval_days(interval_ms: u64) -> i64 {
    let days = (interval_ms as f64 / MILLIS_PER_DAY as f64).round() as i64;
    days.max(1)
}

/// The FSRS memory state in the `data` column, rounded as Anki rounds it, which Anki schedules the card by until it recomputes it from the review log.
fn memory_data(state: &ReviewCardState, log: &[ReviewLogEntry]) -> String {
    let desired_retention = log.last().map_or(0.9, |entry| entry.desired_retention);
    json!({
        "s": rounded(state.stability, 4),
        "d": rounded(state.difficulty, 3),
        "dr": rounded(desired_retention, 2),
    })
    .to_string()
}

fn rounded(value: f64, decimals: i32) -> f64 {
    let scale = 10f64.powi(decimals);
    (value * scale).round() / scale
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 2025-10-10 00:00 UTC.
    const CREATED_SECS: u64 = 1_760_054_400;

    fn card_state(state: ReviewPhase) -> ReviewCardState {
        ReviewCardState {
            state,
            due_at_ms: (CREATED_SECS + 3 * SECONDS_PER_DAY + 3600) * 1000,
            stability: 2.306_54,
            difficulty: 2.118_14,
            interval_ms: 2 * MILLIS_PER_DAY,
            reps: 3,
            lapses: 1,
            learning_step: 0,
            last_reviewed_at_ms: (CREATED_SECS + SECONDS_PER_DAY) * 1000,
            is_leech: false,
        }
    }

    fn columns(state: ReviewPhase) -> CardColumns {
        CardScheduling::Reviewed(&card_state(state), &[]).columns(1, CREATED_SECS)
    }

    #[test]
    fn a_suspended_card_is_in_queue_minus_one() {
        assert_eq!(held_queue(ReviewHoldKind::Suspended), -1);
    }

    #[test]
    fn a_buried_card_is_in_the_queue_of_cards_the_user_buried() {
        assert_eq!(held_queue(ReviewHoldKind::Buried), -3);
    }

    #[test]
    fn a_review_card_is_due_on_a_day_counted_from_the_collection_creation() {
        assert_eq!(columns(ReviewPhase::Review).due, 3);
    }

    #[test]
    fn a_review_card_has_its_interval_in_days() {
        assert_eq!(columns(ReviewPhase::Review).interval, 2);
    }

    #[test]
    fn a_review_card_has_type_and_queue_two() {
        let columns = columns(ReviewPhase::Review);
        assert_eq!((columns.kind, columns.queue), (2, 2));
    }

    #[test]
    fn a_learning_card_is_due_at_a_time_in_seconds() {
        assert_eq!(
            columns(ReviewPhase::Learning).due,
            (CREATED_SECS + 3 * SECONDS_PER_DAY + 3600) as i64
        );
    }

    #[test]
    fn a_learning_card_has_its_step_left() {
        assert_eq!(columns(ReviewPhase::Learning).left, 1);
    }

    #[test]
    fn a_relearning_card_has_type_three_in_the_learning_queue() {
        let columns = columns(ReviewPhase::Relearning);
        assert_eq!((columns.kind, columns.queue), (3, 1));
    }

    #[test]
    fn keeps_the_reps_and_lapses() {
        let columns = columns(ReviewPhase::Review);
        assert_eq!((columns.reps, columns.lapses), (3, 1));
    }

    #[test]
    fn writes_the_memory_state_rounded_as_anki_rounds_it() {
        assert_eq!(
            columns(ReviewPhase::Review).data,
            r#"{"d":2.118,"dr":0.9,"s":2.3065}"#
        );
    }
}
