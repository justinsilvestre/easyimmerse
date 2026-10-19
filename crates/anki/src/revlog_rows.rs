//! The rows of the `revlog` table: one for each answer given in easyImmerse's review, which Anki imports with the card
//! and from which it recomputes the card's FSRS memory state.

use easyimmerse_core::review::{ReviewLogEntry, ReviewPhase, ReviewRating};
use rusqlite::{Connection, params};

use crate::card_scheduling::{DEFAULT_FACTOR, interval_days};
use crate::note_rows::sql_int;

/// Anki caps the time an answer took at one minute by default.
const MAX_ANSWER_MS: u64 = 60_000;

/// Inserts a row for each answer given to the card, its id the time of the answer in milliseconds.
pub(crate) fn insert_revlog_rows(
    connection: &Connection,
    card_id: i64,
    log: &[ReviewLogEntry],
) -> rusqlite::Result<()> {
    let mut statement = connection
        .prepare_cached("INSERT INTO revlog VALUES (?1, ?2, -1, ?3, ?4, ?5, ?6, ?7, ?8)")?;
    for entry in log {
        statement.execute(params![
            sql_int(entry.answered_at_ms)?,
            card_id,
            ease(entry.rating),
            revlog_interval(entry.interval_ms_after, entry.state),
            revlog_interval(entry.interval_ms_before, entry.kind),
            DEFAULT_FACTOR,
            sql_int(entry.duration_ms.min(MAX_ANSWER_MS))?,
            revlog_type(entry.kind),
        ])?;
    }
    Ok(())
}

fn ease(rating: ReviewRating) -> i64 {
    match rating {
        ReviewRating::Again => 1,
        ReviewRating::Hard => 2,
        ReviewRating::Good => 3,
        ReviewRating::Easy => 4,
    }
}

/// Anki's review kinds: learning 0, review 1, relearning 2.
fn revlog_type(kind: ReviewPhase) -> i64 {
    match kind {
        ReviewPhase::Learning => 0,
        ReviewPhase::Review => 1,
        ReviewPhase::Relearning => 2,
    }
}

/// An interval as Anki's review log keeps it: negative seconds for a learning or relearning step, days once graduated.
/// The interval before a card's first answer is zero.
fn revlog_interval(interval_ms: u64, phase: ReviewPhase) -> i64 {
    match phase {
        _ if interval_ms == 0 => 0,
        ReviewPhase::Learning | ReviewPhase::Relearning => {
            -i64::try_from(interval_ms / 1000).unwrap_or(i64::MAX)
        }
        ReviewPhase::Review => interval_days(interval_ms),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_a_learning_step_as_negative_seconds() {
        assert_eq!(revlog_interval(600_000, ReviewPhase::Learning), -600);
    }

    #[test]
    fn writes_a_review_interval_in_days() {
        assert_eq!(revlog_interval(3 * 86_400_000, ReviewPhase::Review), 3);
    }

    #[test]
    fn writes_no_interval_before_the_first_answer() {
        assert_eq!(revlog_interval(0, ReviewPhase::Learning), 0);
    }
}
