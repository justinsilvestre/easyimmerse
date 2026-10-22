//! The FSRS parameters fitted to an owner's answers across all of its projects, which schedule its reviews once there are some.

use easyimmerse_core::review::ReviewLogEntry;
use easyimmerse_srs::{MIN_FIT_ANSWERS, ReviewMoment, Scheduler, has_enough_to_fit, is_fit_due};
use rusqlite::{Connection, OptionalExtension, params};

use crate::error::StorageError;
use crate::owners::OwnerId;
use crate::review_rows::list_all_log_entries;
use crate::stored_integer::{read_unsigned, to_stored_integer};

/// The scheduler of the owner's reviews: the fitted parameters, or the defaults until a fit has given some.
pub fn load_scheduler(conn: &Connection, owner: &OwnerId) -> Result<Scheduler, StorageError> {
    let weights: Option<String> = conn
        .query_row(
            "SELECT weights_json FROM review_parameters WHERE owner_id = ?1",
            params![owner.0],
            |row| row.get(0),
        )
        .optional()?;
    match weights {
        Some(json) => Ok(Scheduler::new(&serde_json::from_str::<Vec<f32>>(&json)?)?),
        None => Ok(Scheduler::default()),
    }
}

/// Every answer of the owner to fit the parameters to, when a fit is due at `moment` and the log holds enough answers for one.
/// A count of the log decides first whether it could, so that the log is read only when a fit may follow.
pub fn log_to_fit(
    conn: &Connection,
    owner: &OwnerId,
    moment: ReviewMoment,
) -> Result<Option<Vec<ReviewLogEntry>>, StorageError> {
    if !is_fit_due(fitted_at_ms(conn, owner)?, moment.at_ms)
        || log_length(conn, owner)? < MIN_FIT_ANSWERS
    {
        return Ok(None);
    }
    let log = list_all_log_entries(conn, owner)?;
    Ok(has_enough_to_fit(&log, moment).then_some(log))
}

/// Keeps the parameters of a fit begun at `fitted_at_ms`, which schedule the owner's reviews from now on.
pub fn save_review_parameters(
    conn: &Connection,
    owner: &OwnerId,
    weights: &[f32],
    fitted_at_ms: u64,
) -> Result<(), StorageError> {
    conn.execute(
        "INSERT INTO review_parameters (owner_id, weights_json, fitted_at_ms) VALUES (?1, ?2, ?3) \
         ON CONFLICT (owner_id) DO UPDATE SET weights_json = excluded.weights_json, \
         fitted_at_ms = excluded.fitted_at_ms",
        params![
            owner.0,
            serde_json::to_string(weights)?,
            to_stored_integer(fitted_at_ms)
        ],
    )?;
    Ok(())
}

fn log_length(conn: &Connection, owner: &OwnerId) -> Result<usize, StorageError> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM review_log l JOIN projects p ON p.id = l.project_id \
         WHERE p.owner_id = ?1",
        params![owner.0],
        |row| row.get(0),
    )?;
    Ok(usize::try_from(count).unwrap_or(0))
}

fn fitted_at_ms(conn: &Connection, owner: &OwnerId) -> Result<Option<u64>, StorageError> {
    let fitted_at_ms = conn
        .query_row(
            "SELECT fitted_at_ms FROM review_parameters WHERE owner_id = ?1",
            params![owner.0],
            |row| read_unsigned(row, 0),
        )
        .optional()?;
    Ok(fitted_at_ms)
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::review::ReviewRating;

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

    fn is_fit_due_at(storage: &crate::Storage, at_ms: u64) -> bool {
        storage.log_to_fit(&launch(), at(at_ms)).unwrap().is_some()
    }

    fn save_fit(storage: &crate::Storage, at_ms: u64) {
        storage
            .save_review_parameters(&launch(), &easyimmerse_srs::DEFAULT_WEIGHTS, at_ms)
            .unwrap();
    }

    #[test]
    fn no_fit_is_due_with_too_few_answers() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        rate(&storage, &ids[0], ReviewRating::Good, NOON_MS);
        assert!(!is_fit_due_at(&storage, NOON_MS + 10 * DAY_MS));
    }

    #[test]
    fn the_first_fit_is_due_once_there_are_enough_answers() {
        let storage = storage_with_enough_answers();
        assert!(is_fit_due_at(&storage, NOON_MS + 10 * DAY_MS));
    }

    #[test]
    fn a_fit_stays_due_until_one_is_saved() {
        let storage = storage_with_enough_answers();
        is_fit_due_at(&storage, NOON_MS + 10 * DAY_MS);
        assert!(is_fit_due_at(&storage, NOON_MS + 11 * DAY_MS));
    }

    #[test]
    fn no_second_fit_is_due_within_thirty_days() {
        let storage = storage_with_enough_answers();
        save_fit(&storage, NOON_MS + 10 * DAY_MS);
        assert!(!is_fit_due_at(&storage, NOON_MS + 20 * DAY_MS));
    }

    #[test]
    fn a_fit_is_due_again_after_thirty_days() {
        let storage = storage_with_enough_answers();
        save_fit(&storage, NOON_MS + 10 * DAY_MS);
        assert!(is_fit_due_at(&storage, NOON_MS + 40 * DAY_MS));
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
            .save_review_parameters(&launch(), weights, NOON_MS)
            .unwrap();
    }

    #[test]
    fn no_fit_is_due_for_an_owner_whose_projects_have_no_answers() {
        let storage = storage_with_enough_answers();
        let account = account_owner(&storage);
        let fit = storage.log_to_fit(&account, at(NOON_MS + 10 * DAY_MS));
        assert!(fit.unwrap().is_none());
    }

    #[test]
    fn schedules_with_the_default_parameters_when_another_owner_saved_some() {
        let storage = seeded_storage();
        make_flashcards(&storage, 1);
        let default_good_ms = first_good_ms(&storage);
        let mut weights = easyimmerse_srs::DEFAULT_WEIGHTS.to_vec();
        weights[2] = 10.0;
        let account = account_owner(&storage);
        storage
            .save_review_parameters(&account, &weights, NOON_MS)
            .unwrap();
        assert_eq!(first_good_ms(&storage), default_good_ms);
    }
}
