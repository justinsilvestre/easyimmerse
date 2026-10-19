//! The FSRS parameters fitted to the user's answers across every project, which schedule every review once there are some.

use easyimmerse_core::review::ReviewLogEntry;
use easyimmerse_srs::{ReviewMoment, Scheduler, has_enough_to_fit, is_fit_due};
use rusqlite::{Connection, OptionalExtension, params};

use crate::error::StorageError;
use crate::review_rows::list_all_log_entries;
use crate::stored_integer::{read_unsigned, to_stored_integer};

/// The scheduler of every review: the fitted parameters, or the defaults until a fit has given some.
pub fn load_scheduler(conn: &Connection) -> Result<Scheduler, StorageError> {
    let weights: Option<Option<String>> = conn
        .query_row(
            "SELECT weights_json FROM review_parameters WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .optional()?;
    match weights.flatten() {
        Some(json) => Ok(Scheduler::new(&serde_json::from_str::<Vec<f32>>(&json)?)?),
        None => Ok(Scheduler::default()),
    }
}

/// Claims the next fit when one is due at `moment` and the log holds enough answers for it, and returns the log to fit to.
/// The claim dates the fit at `moment`, so that no other fit starts in the next thirty days, even when this one fails.
pub fn claim_parameter_fit(
    conn: &Connection,
    moment: ReviewMoment,
) -> Result<Option<Vec<ReviewLogEntry>>, StorageError> {
    if !is_fit_due(fitted_at_ms(conn)?, moment.at_ms) {
        return Ok(None);
    }
    let log = list_all_log_entries(conn)?;
    if !has_enough_to_fit(&log, moment) {
        return Ok(None);
    }
    conn.execute(
        "INSERT INTO review_parameters (id, weights_json, fitted_at_ms) VALUES (1, NULL, ?1) \
         ON CONFLICT (id) DO UPDATE SET fitted_at_ms = excluded.fitted_at_ms",
        params![to_stored_integer(moment.at_ms)],
    )?;
    Ok(Some(log))
}

/// Keeps the parameters a fit gave, which schedule every review from now on.
pub fn save_review_parameters(conn: &Connection, weights: &[f32]) -> Result<(), StorageError> {
    conn.execute(
        "UPDATE review_parameters SET weights_json = ?1 WHERE id = 1",
        params![serde_json::to_string(weights)?],
    )?;
    Ok(())
}

fn fitted_at_ms(conn: &Connection) -> Result<Option<u64>, StorageError> {
    let fitted_at_ms = conn
        .query_row(
            "SELECT fitted_at_ms FROM review_parameters WHERE id = 1",
            [],
            |row| read_unsigned(row, 0),
        )
        .optional()?;
    Ok(fitted_at_ms)
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::review::ReviewRating;

    use super::*;
    use crate::review_test_support::*;

    /// Answers 32 cards on three days each, which gives the 64 answers on later days a fit needs.
    fn storage_with_enough_answers() -> crate::Storage {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 32);
        for day in [0, 2, 7] {
            for id in &ids {
                rate(&storage, id, ReviewRating::Good, NOON_MS + day * DAY_MS);
            }
        }
        storage
    }

    fn claim(storage: &crate::Storage, at_ms: u64) -> bool {
        storage.claim_parameter_fit(at(at_ms)).unwrap().is_some()
    }

    #[test]
    fn claims_no_fit_with_too_few_answers() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        rate(&storage, &ids[0], ReviewRating::Good, NOON_MS);
        assert!(!claim(&storage, NOON_MS + 10 * DAY_MS));
    }

    #[test]
    fn claims_the_first_fit_once_there_are_enough_answers() {
        let storage = storage_with_enough_answers();
        assert!(claim(&storage, NOON_MS + 10 * DAY_MS));
    }

    #[test]
    fn claims_no_second_fit_within_thirty_days() {
        let storage = storage_with_enough_answers();
        claim(&storage, NOON_MS + 10 * DAY_MS);
        assert!(!claim(&storage, NOON_MS + 20 * DAY_MS));
    }

    #[test]
    fn claims_a_fit_again_after_thirty_days() {
        let storage = storage_with_enough_answers();
        claim(&storage, NOON_MS + 10 * DAY_MS);
        assert!(claim(&storage, NOON_MS + 40 * DAY_MS));
    }

    fn first_good_ms(storage: &crate::Storage) -> u64 {
        storage.review_queue(&project(), at(NOON_MS)).unwrap().cards[0]
            .intervals
            .good_ms
    }

    #[test]
    fn schedules_with_the_saved_parameters() {
        let storage = seeded_storage();
        make_flashcards(&storage, 1);
        let default_good_ms = first_good_ms(&storage);
        let mut weights = easyimmerse_srs::DEFAULT_WEIGHTS.to_vec();
        weights[2] = 10.0;
        save_parameters(&storage, &weights);
        assert_ne!(first_good_ms(&storage), default_good_ms);
    }

    fn save_parameters(storage: &crate::Storage, weights: &[f32]) {
        storage
            .write(|conn| {
                conn.execute(
                    "INSERT OR REPLACE INTO review_parameters (id, weights_json, fitted_at_ms) VALUES (1, NULL, 0)",
                    [],
                )?;
                save_review_parameters(conn, weights)
            })
            .unwrap();
    }
}
