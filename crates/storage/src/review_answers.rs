//! Answering a card, undoing the latest answer, and raising the day's allowance of new cards.

use easyimmerse_core::flashcard::FlashcardId;
use easyimmerse_core::project::ProjectId;
use easyimmerse_core::review::{
    ReviewAllowanceRequest, ReviewAnswerId, ReviewAnswerRequest, ReviewAnswerResponse,
    ReviewAnswerUndone, ReviewCardState,
};
use easyimmerse_srs::{GivenAnswer, ReviewMoment, ReviewedCard, Scheduler};
use rusqlite::{Connection, OptionalExtension, params};

use crate::error::StorageError;
use crate::flashcards::get_flashcard;
use crate::new_row::generate_id;
use crate::projects::{ensure_project_exists, project_owner};
use crate::review_holds::forget_ended_burials;
use crate::review_parameters::load_scheduler;
use crate::review_rows::{get_review_card, insert_log_row, latest_log_row, save_review_card};

/// Answers a flashcard of the project in one transaction, adding the answer to the log and saving the card's new schedule.
/// The answer is stamped at `now_ms`, or just after the project's latest answer when that is later,
/// so that every answer of a project has its own time.
pub fn answer_review(
    conn: &mut Connection,
    project_id: &ProjectId,
    request: &ReviewAnswerRequest,
    now_ms: u64,
) -> Result<ReviewAnswerResponse, StorageError> {
    let transaction = conn.transaction()?;
    ensure_flashcard_in_project(&transaction, project_id, &request.flashcard_id)?;
    forget_ended_burials(&transaction, now_ms)?;
    let moment = ReviewMoment {
        at_ms: now_ms.max(after_latest_answer_ms(&transaction, project_id)?),
        utc_offset_min: request.utc_offset_min,
    };
    let previous = get_review_card(&transaction, &request.flashcard_id)?;
    let card = ReviewedCard {
        flashcard_id: &request.flashcard_id,
        state: previous.as_ref(),
    };
    let scheduler = load_scheduler(&transaction, &project_owner(&transaction, project_id)?)?;
    let answer = GivenAnswer {
        id: &ReviewAnswerId(generate_id()),
        rating: request.rating,
        duration_ms: request.duration_ms,
    };
    let answered = scheduler.answer(card, answer, moment)?;
    insert_log_row(&transaction, project_id, &answered.entry, &answered.state)?;
    save_review_card(
        &transaction,
        project_id,
        &request.flashcard_id,
        &answered.state,
    )?;
    transaction.commit()?;
    let intervals = intervals_at(
        &scheduler,
        &request.flashcard_id,
        Some(&answered.state),
        moment,
    )?;
    Ok(ReviewAnswerResponse {
        state: answered.state,
        entry: answered.entry,
        intervals,
    })
}

/// Undoes the project's latest answer, which must be the answer with the id,
/// and restores the card's schedule from its previous answer, or makes it new again when there was none.
pub fn undo_review_answer(
    conn: &mut Connection,
    project_id: &ProjectId,
    answer_id: &ReviewAnswerId,
    moment: ReviewMoment,
) -> Result<ReviewAnswerUndone, StorageError> {
    let transaction = conn.transaction()?;
    let flashcard_id = latest_answer(&transaction, project_id, answer_id)?;
    transaction.execute("DELETE FROM review_log WHERE id = ?1", params![answer_id.0])?;
    let restored = latest_log_row(&transaction, &flashcard_id)?.map(|(_, state)| state);
    restore_review_card(&transaction, project_id, &flashcard_id, restored.as_ref())?;
    let scheduler = load_scheduler(&transaction, &project_owner(&transaction, project_id)?)?;
    transaction.commit()?;
    let intervals = intervals_at(&scheduler, &flashcard_id, restored.as_ref(), moment)?;
    Ok(ReviewAnswerUndone {
        flashcard_id,
        state: restored,
        intervals,
    })
}

/// Raises the number of new cards and of reviews the project's review shows on the request's local day.
pub fn raise_review_allowance(
    conn: &Connection,
    project_id: &ProjectId,
    request: &ReviewAllowanceRequest,
    now_ms: u64,
) -> Result<(), StorageError> {
    ensure_project_exists(conn, project_id)?;
    let moment = ReviewMoment {
        at_ms: now_ms,
        utc_offset_min: request.utc_offset_min,
    };
    conn.execute(
        "INSERT INTO review_day_allowances (project_id, day_key, extra_new_cards, extra_reviews) \
         VALUES (?1, ?2, ?3, ?4) ON CONFLICT (project_id, day_key) DO UPDATE \
         SET extra_new_cards = extra_new_cards + excluded.extra_new_cards, \
         extra_reviews = extra_reviews + excluded.extra_reviews",
        params![
            project_id.0,
            moment.day(),
            request.extra_new_cards,
            request.extra_reviews
        ],
    )?;
    Ok(())
}

pub(crate) fn ensure_flashcard_in_project(
    conn: &Connection,
    project_id: &ProjectId,
    flashcard_id: &FlashcardId,
) -> Result<(), StorageError> {
    ensure_project_exists(conn, project_id)?;
    let flashcard = get_flashcard(conn, flashcard_id)?;
    if flashcard.project_id == *project_id {
        Ok(())
    } else {
        Err(StorageError::FlashcardNotFound(flashcard_id.0.clone()))
    }
}

/// One millisecond after the project's latest answer, or zero when it has none.
fn after_latest_answer_ms(conn: &Connection, project_id: &ProjectId) -> Result<u64, StorageError> {
    let latest: Option<i64> = conn.query_row(
        "SELECT MAX(answered_at_ms) FROM review_log WHERE project_id = ?1",
        params![project_id.0],
        |row| row.get(0),
    )?;
    Ok(latest.map_or(0, |latest| u64::try_from(latest).unwrap_or(0) + 1))
}

/// The flashcard of the project's latest answer, when that answer has the id.
/// The latest answer is the one with the greatest time, and of those the greatest id.
fn latest_answer(
    conn: &Connection,
    project_id: &ProjectId,
    answer_id: &ReviewAnswerId,
) -> Result<FlashcardId, StorageError> {
    ensure_project_exists(conn, project_id)?;
    let latest: Option<(String, String)> = conn
        .query_row(
            "SELECT id, flashcard_id FROM review_log WHERE project_id = ?1 \
             ORDER BY answered_at_ms DESC, id DESC LIMIT 1",
            params![project_id.0],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()?;
    match latest {
        Some((id, flashcard_id)) if id == answer_id.0 => Ok(FlashcardId(flashcard_id)),
        Some(_) if is_answer_of_project(conn, project_id, answer_id)? => {
            Err(StorageError::ReviewAnswerNotLatest(answer_id.0.clone()))
        }
        _ => Err(StorageError::ReviewAnswerNotFound(answer_id.0.clone())),
    }
}

fn is_answer_of_project(
    conn: &Connection,
    project_id: &ProjectId,
    answer_id: &ReviewAnswerId,
) -> Result<bool, StorageError> {
    Ok(conn.query_row(
        "SELECT EXISTS (SELECT 1 FROM review_log WHERE project_id = ?1 AND id = ?2)",
        params![project_id.0, answer_id.0],
        |row| row.get(0),
    )?)
}

fn restore_review_card(
    conn: &Connection,
    project_id: &ProjectId,
    flashcard_id: &FlashcardId,
    restored: Option<&ReviewCardState>,
) -> Result<(), StorageError> {
    match restored {
        Some(state) => save_review_card(conn, project_id, flashcard_id, state),
        None => {
            conn.execute(
                "DELETE FROM review_cards WHERE flashcard_id = ?1",
                params![flashcard_id.0],
            )?;
            Ok(())
        }
    }
}

fn intervals_at(
    scheduler: &Scheduler,
    flashcard_id: &FlashcardId,
    state: Option<&ReviewCardState>,
    moment: ReviewMoment,
) -> Result<easyimmerse_core::review::ReviewIntervals, StorageError> {
    let card = ReviewedCard {
        flashcard_id,
        state,
    };
    Ok(scheduler.candidate_intervals(card, moment)?)
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::review::{ReviewPhase, ReviewRating};

    use super::*;
    use crate::review_test_support::*;

    fn request(flashcard_id: &FlashcardId) -> ReviewAnswerRequest {
        ReviewAnswerRequest {
            flashcard_id: flashcard_id.clone(),
            rating: ReviewRating::Good,
            utc_offset_min: 0,
            duration_ms: 1_000,
        }
    }

    fn queued_state(storage: &crate::Storage, at_ms: u64) -> Option<ReviewCardState> {
        storage.review_queue(&project(), at(at_ms)).unwrap().cards[0]
            .state
            .clone()
    }

    #[test]
    fn saves_the_state_the_answer_gives() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        let answered = rate(&storage, &ids[0], ReviewRating::Again, NOON_MS);
        assert_eq!(queued_state(&storage, NOON_MS), Some(answered.state));
    }

    #[test]
    fn stamps_the_answer_at_the_time_given() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        let answered = rate(&storage, &ids[0], ReviewRating::Good, NOON_MS);
        assert_eq!(answered.entry.answered_at_ms, NOON_MS);
    }

    #[test]
    fn stamps_answers_of_the_same_millisecond_apart() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 2);
        rate(&storage, &ids[0], ReviewRating::Good, NOON_MS);
        let second = rate(&storage, &ids[1], ReviewRating::Good, NOON_MS);
        assert_eq!(second.entry.answered_at_ms, NOON_MS + 1);
    }

    #[test]
    fn returns_the_intervals_of_the_next_answer() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        let answered = rate(&storage, &ids[0], ReviewRating::Again, NOON_MS);
        assert_eq!(answered.intervals.again_ms, 10 * MINUTE_MS);
    }

    #[test]
    fn refuses_a_flashcard_of_another_project() {
        let storage = seeded_storage();
        let id = make_flashcard(&storage, &other_project(), "Haus");
        let result = storage.answer_review(&project(), &request(&id), NOON_MS);
        assert!(matches!(result, Err(StorageError::FlashcardNotFound(_))));
    }

    #[test]
    fn undoing_the_only_answer_makes_the_card_new_again() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        let answered = rate(&storage, &ids[0], ReviewRating::Good, NOON_MS);
        storage
            .undo_review_answer(&project(), &answered.entry.id, at(NOON_MS))
            .unwrap();
        assert_eq!(queued_state(&storage, NOON_MS), None);
    }

    #[test]
    fn undoing_an_answer_restores_the_previous_state() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        let first = rate(&storage, &ids[0], ReviewRating::Again, NOON_MS);
        let second = rate(
            &storage,
            &ids[0],
            ReviewRating::Again,
            NOON_MS + 10 * MINUTE_MS,
        );
        let undone = storage
            .undo_review_answer(&project(), &second.entry.id, at(NOON_MS))
            .unwrap();
        assert_eq!(undone.state, Some(first.state));
    }

    #[test]
    fn undoing_an_answer_saves_the_restored_state() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        rate(&storage, &ids[0], ReviewRating::Again, NOON_MS);
        let second = rate(
            &storage,
            &ids[0],
            ReviewRating::Good,
            NOON_MS + 10 * MINUTE_MS,
        );
        storage
            .undo_review_answer(&project(), &second.entry.id, at(NOON_MS))
            .unwrap();
        let state = queued_state(&storage, NOON_MS + 10 * MINUTE_MS);
        assert_eq!(state.map(|state| state.state), Some(ReviewPhase::Learning));
    }

    #[test]
    fn undoing_the_first_answer_of_the_day_lets_the_card_count_as_new_again() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 21);
        let answered = rate(&storage, &ids[0], ReviewRating::Good, NOON_MS);
        storage
            .undo_review_answer(&project(), &answered.entry.id, at(NOON_MS))
            .unwrap();
        let queue = storage.review_queue(&project(), at(NOON_MS)).unwrap();
        assert_eq!(queue.cards.len(), 20);
    }

    #[test]
    fn refuses_to_undo_an_answer_that_is_not_the_latest() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 2);
        let first = rate(&storage, &ids[0], ReviewRating::Good, NOON_MS);
        rate(&storage, &ids[1], ReviewRating::Good, NOON_MS + 1_000);
        let result = storage.undo_review_answer(&project(), &first.entry.id, at(NOON_MS));
        assert!(matches!(
            result,
            Err(StorageError::ReviewAnswerNotLatest(_))
        ));
    }

    #[test]
    fn refuses_to_undo_an_answer_never_given() {
        let storage = seeded_storage();
        let missing = ReviewAnswerId("missing".to_owned());
        let result = storage.undo_review_answer(&project(), &missing, at(NOON_MS));
        assert!(matches!(result, Err(StorageError::ReviewAnswerNotFound(_))));
    }

    #[test]
    fn refuses_to_undo_an_answer_of_another_project() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        let answered = rate(&storage, &ids[0], ReviewRating::Good, NOON_MS);
        let result = storage.undo_review_answer(&other_project(), &answered.entry.id, at(NOON_MS));
        assert!(matches!(result, Err(StorageError::ReviewAnswerNotFound(_))));
    }

    #[test]
    fn keeps_two_answers_of_a_project_given_in_the_same_millisecond() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        let answered = rate(&storage, &ids[0], ReviewRating::Good, NOON_MS);
        copy_answer(&storage, &answered.entry.id, "f".repeat(32).as_str());
        let progress = storage.list_review_progress(&project(), NOON_MS).unwrap();
        assert_eq!(progress[&ids[0]].log.len(), 2);
    }

    #[test]
    fn takes_the_greater_id_as_the_latest_of_two_answers_in_the_same_millisecond() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        let answered = rate(&storage, &ids[0], ReviewRating::Good, NOON_MS);
        copy_answer(&storage, &answered.entry.id, "f".repeat(32).as_str());
        let result = storage.undo_review_answer(&project(), &answered.entry.id, at(NOON_MS));
        assert!(matches!(
            result,
            Err(StorageError::ReviewAnswerNotLatest(_))
        ));
    }

    #[test]
    fn raising_the_allowance_twice_adds_up() {
        let storage = seeded_storage();
        make_flashcards(&storage, 70);
        let request = ReviewAllowanceRequest {
            utc_offset_min: 0,
            extra_new_cards: 20,
            extra_reviews: 0,
        };
        for _ in 0..2 {
            storage
                .raise_review_allowance(&project(), &request, NOON_MS)
                .unwrap();
        }
        let queue = storage.review_queue(&project(), at(NOON_MS)).unwrap();
        assert_eq!(queue.cards.len(), 60);
    }
}
