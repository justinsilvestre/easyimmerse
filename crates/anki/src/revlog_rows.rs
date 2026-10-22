//! The rows of the `revlog` table: one for each answer given in easyImmerse's review, which Anki imports with the card
//! and from which it recomputes the card's FSRS memory state.

use easyimmerse_core::review::{MAX_ANSWER_DURATION_MS, ReviewLogEntry, ReviewPhase, ReviewRating};
use rusqlite::{Connection, params};

use crate::card_scheduling::{DEFAULT_FACTOR, interval_days};
use crate::note_rows::{sql_int, unique_ids};

/// Inserts a row for each answer given to each card, as (card id, answer) pairs.
/// A row's id is the time of the answer in milliseconds, raised until it is free within the package, as Anki raises an id on insert.
pub(crate) fn insert_revlog_rows(
    connection: &Connection,
    answers: &[(i64, &ReviewLogEntry)],
) -> rusqlite::Result<()> {
    let mut statement = connection
        .prepare_cached("INSERT INTO revlog VALUES (?1, ?2, -1, ?3, ?4, ?5, ?6, ?7, ?8)")?;
    let ids = unique_ids(answers.iter().map(|(_, entry)| entry.answered_at_ms));
    for ((card_id, entry), id) in answers.iter().zip(ids) {
        statement.execute(params![
            sql_int(id)?,
            card_id,
            ease(entry.rating),
            revlog_interval(entry.interval_ms_after, entry.state),
            revlog_interval(entry.interval_ms_before, entry.kind),
            DEFAULT_FACTOR,
            sql_int(entry.duration_ms.min(MAX_ANSWER_DURATION_MS))?,
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

    fn entry(answered_at_ms: u64) -> ReviewLogEntry {
        ReviewLogEntry {
            id: easyimmerse_core::review::ReviewAnswerId(answered_at_ms.to_string()),
            flashcard_id: easyimmerse_core::flashcard::FlashcardId("f".to_owned()),
            answered_at_ms,
            rating: ReviewRating::Good,
            kind: ReviewPhase::Learning,
            state: ReviewPhase::Review,
            elapsed_ms: 0,
            duration_ms: 1_000,
            stability: 1.0,
            difficulty: 5.0,
            interval_ms_before: 0,
            interval_ms_after: 86_400_000,
            desired_retention: 0.9,
        }
    }

    #[test]
    fn gives_answers_of_the_same_millisecond_their_own_ids() {
        let connection = Connection::open_in_memory().unwrap();
        connection.execute_batch(crate::schema::SCHEMA_11).unwrap();
        let (first, second) = (entry(7_000), entry(7_000));
        insert_revlog_rows(&connection, &[(1, &first), (2, &second)]).unwrap();
        let ids: Vec<i64> = connection
            .prepare("SELECT id FROM revlog ORDER BY id")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        assert_eq!(ids, [7_000, 7_001]);
    }
}
