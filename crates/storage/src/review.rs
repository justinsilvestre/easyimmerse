//! A project's review: what waits today, and the cards of a session in the order they are shown.

use std::collections::HashMap;

use easyimmerse_core::flashcard::{Flashcard, FlashcardId};
use easyimmerse_core::project::ProjectId;
use easyimmerse_core::review::{
    ReviewCardState, ReviewPhase, ReviewProgress, ReviewQueue, ReviewQueueCard, ReviewSummary,
};
use easyimmerse_srs::{
    ReviewMoment, ReviewedCard, candidate_intervals, learn_ahead_cutoff_ms, new_cards_available,
};
use rusqlite::{Connection, params};

use crate::error::StorageError;
use crate::flashcards::list_flashcards;
use crate::projects::ensure_project_exists;
use crate::review_rows::{list_log_entries, list_review_cards};
use crate::stored_integer::to_stored_integer;

/// The session's cards: reviews due today, most overdue first; then learning cards due now or within the learn-ahead time;
/// then the new cards still allowed today, in the order they were made.
pub fn review_queue(
    conn: &Connection,
    project_id: &ProjectId,
    moment: ReviewMoment,
) -> Result<ReviewQueue, StorageError> {
    let sections = queue_sections(conn, project_id, moment)?;
    let cards = sections
        .into_ordered()
        .into_iter()
        .map(|(flashcard, state)| queue_card(flashcard, state, moment))
        .collect::<Result<_, _>>()?;
    Ok(ReviewQueue { cards })
}

pub fn review_summary(
    conn: &Connection,
    project_id: &ProjectId,
    moment: ReviewMoment,
) -> Result<ReviewSummary, StorageError> {
    let sections = queue_sections(conn, project_id, moment)?;
    let next_due_at_ms = sections.states.values().map(|state| state.due_at_ms).min();
    let has_progress = !sections.states.is_empty();
    Ok(ReviewSummary {
        due_count: sections.reviews.len() as u64,
        learning_count: sections.learning.len() as u64,
        new_count: sections.new.len() as u64,
        next_due_at_ms,
        next_card: sections
            .into_ordered()
            .into_iter()
            .next()
            .map(|(flashcard, _)| flashcard),
        has_progress,
    })
}

/// The schedule and the answers of each of the project's answered flashcards.
pub fn list_review_progress(
    conn: &Connection,
    project_id: &ProjectId,
) -> Result<HashMap<FlashcardId, ReviewProgress>, StorageError> {
    let mut progress: HashMap<FlashcardId, ReviewProgress> = list_review_cards(conn, project_id)?
        .into_iter()
        .map(|(id, state)| {
            (
                id,
                ReviewProgress {
                    state,
                    log: Vec::new(),
                },
            )
        })
        .collect();
    for entry in list_log_entries(conn, project_id)? {
        if let Some(card) = progress.get_mut(&entry.flashcard_id) {
            card.log.push(entry);
        }
    }
    Ok(progress)
}

/// The project's flashcards sorted into the parts of a session, with the schedules of the answered ones.
struct QueueSections {
    reviews: Vec<(Flashcard, ReviewCardState)>,
    learning: Vec<(Flashcard, ReviewCardState)>,
    new: Vec<Flashcard>,
    states: HashMap<FlashcardId, ReviewCardState>,
}

impl QueueSections {
    fn into_ordered(self) -> Vec<(Flashcard, Option<ReviewCardState>)> {
        let answered = self.reviews.into_iter().chain(self.learning);
        answered
            .map(|(flashcard, state)| (flashcard, Some(state)))
            .chain(self.new.into_iter().map(|flashcard| (flashcard, None)))
            .collect()
    }
}

fn queue_sections(
    conn: &Connection,
    project_id: &ProjectId,
    moment: ReviewMoment,
) -> Result<QueueSections, StorageError> {
    ensure_project_exists(conn, project_id)?;
    let states = list_review_cards(conn, project_id)?;
    let mut reviews = Vec::new();
    let mut learning = Vec::new();
    let mut new = Vec::new();
    for flashcard in list_flashcards(conn, project_id)? {
        match states.get(&flashcard.id) {
            None => new.push(flashcard),
            Some(state) if is_review_due(state, moment) => reviews.push((flashcard, state.clone())),
            Some(state) if is_learning_due(state, moment) => {
                learning.push((flashcard, state.clone()))
            }
            Some(_) => {}
        }
    }
    reviews.sort_by_key(|(_, state)| state.due_at_ms);
    learning.sort_by_key(|(_, state)| state.due_at_ms);
    new.truncate(new_cards_allowed(conn, project_id, moment, reviews.len() as u64)? as usize);
    Ok(QueueSections {
        reviews,
        learning,
        new,
        states,
    })
}

/// A card under review is due on the day it falls due, from the start of that day.
fn is_review_due(state: &ReviewCardState, moment: ReviewMoment) -> bool {
    state.state == ReviewPhase::Review && state.due_at_ms < moment.day_end_ms()
}

fn is_learning_due(state: &ReviewCardState, moment: ReviewMoment) -> bool {
    state.state != ReviewPhase::Review && state.due_at_ms <= learn_ahead_cutoff_ms(moment)
}

fn new_cards_allowed(
    conn: &Connection,
    project_id: &ProjectId,
    moment: ReviewMoment,
    due_review_count: u64,
) -> Result<u64, StorageError> {
    let introduced = introduced_on_day(conn, project_id, moment)?;
    let extra = extra_new_cards(conn, project_id, moment)?;
    Ok(new_cards_available(introduced, extra, due_review_count))
}

/// The number of flashcards whose first answer fell on the moment's local day.
fn introduced_on_day(
    conn: &Connection,
    project_id: &ProjectId,
    moment: ReviewMoment,
) -> Result<u64, StorageError> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM (SELECT MIN(answered_at_ms) AS first_ms FROM review_log \
         WHERE project_id = ?1 GROUP BY flashcard_id) WHERE first_ms >= ?2 AND first_ms < ?3",
        params![
            project_id.0,
            to_stored_integer(moment.day_start_ms()),
            to_stored_integer(moment.day_end_ms()),
        ],
        |row| row.get(0),
    )?;
    Ok(u64::try_from(count).unwrap_or(0))
}

fn extra_new_cards(
    conn: &Connection,
    project_id: &ProjectId,
    moment: ReviewMoment,
) -> Result<u64, StorageError> {
    let extra: Option<i64> = conn.query_row(
        "SELECT SUM(extra_new_cards) FROM review_day_allowances WHERE project_id = ?1 AND day_key = ?2",
        params![project_id.0, moment.day()],
        |row| row.get(0),
    )?;
    Ok(extra.map_or(0, |extra| u64::try_from(extra).unwrap_or(0)))
}

fn queue_card(
    flashcard: Flashcard,
    state: Option<ReviewCardState>,
    moment: ReviewMoment,
) -> Result<ReviewQueueCard, StorageError> {
    let card = ReviewedCard {
        flashcard_id: &flashcard.id,
        state: state.as_ref(),
    };
    let intervals = candidate_intervals(card, moment)?;
    Ok(ReviewQueueCard {
        flashcard,
        state,
        intervals,
    })
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::review::{ReviewAllowanceRequest, ReviewRating};

    use super::*;
    use crate::review_test_support::*;

    fn queued_words(queue: &ReviewQueue) -> Vec<String> {
        queue
            .cards
            .iter()
            .map(|card| card.flashcard.content.word.clone())
            .collect()
    }

    fn queue_at(storage: &crate::Storage, at_ms: u64) -> ReviewQueue {
        storage.review_queue(&project(), at(at_ms)).unwrap()
    }

    #[test]
    fn queues_new_cards_in_the_order_they_were_made() {
        let storage = seeded_storage();
        make_flashcards(&storage, 3);
        assert_eq!(queued_words(&queue_at(&storage, NOON_MS)), ["0", "1", "2"]);
    }

    #[test]
    fn queues_twenty_new_cards_a_day() {
        let storage = seeded_storage();
        make_flashcards(&storage, 21);
        assert_eq!(queue_at(&storage, NOON_MS).cards.len(), 20);
    }

    #[test]
    fn counts_the_cards_introduced_today_against_the_twenty() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 22);
        rate(&storage, &ids[0], ReviewRating::Good, NOON_MS);
        assert_eq!(queue_at(&storage, NOON_MS).cards.len(), 19);
    }

    #[test]
    fn introduces_twenty_more_new_cards_the_next_day() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 22);
        rate(&storage, &ids[0], ReviewRating::Good, NOON_MS);
        assert_eq!(queue_at(&storage, NOON_MS + DAY_MS).cards.len(), 20);
    }

    #[test]
    fn a_raised_allowance_introduces_more_new_cards() {
        let storage = seeded_storage();
        make_flashcards(&storage, 30);
        let request = ReviewAllowanceRequest {
            utc_offset_min: 0,
            extra_new_cards: 20,
        };
        storage
            .raise_review_allowance(&project(), &request, NOON_MS)
            .unwrap();
        assert_eq!(queue_at(&storage, NOON_MS).cards.len(), 30);
    }

    #[test]
    fn queues_a_learning_card_within_the_learn_ahead_time() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        rate(&storage, &ids[0], ReviewRating::Again, NOON_MS);
        assert_eq!(queue_at(&storage, NOON_MS + MINUTE_MS).cards.len(), 1);
    }

    #[test]
    fn leaves_a_graduated_card_out_until_its_day() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        rate(&storage, &ids[0], ReviewRating::Good, NOON_MS);
        assert_eq!(queue_at(&storage, NOON_MS + DAY_MS).cards.len(), 0);
    }

    #[test]
    fn queues_a_review_card_from_the_start_of_its_day() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        rate(&storage, &ids[0], ReviewRating::Good, NOON_MS);
        let early_on_due_day = NOON_MS + 2 * DAY_MS - 7 * 60 * MINUTE_MS;
        assert_eq!(queue_at(&storage, early_on_due_day).cards.len(), 1);
    }

    #[test]
    fn queues_due_reviews_then_learning_cards_then_new_cards() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 3);
        rate(&storage, &ids[1], ReviewRating::Good, NOON_MS - 2 * DAY_MS);
        rate(&storage, &ids[0], ReviewRating::Again, NOON_MS);
        let words = queued_words(&queue_at(&storage, NOON_MS + MINUTE_MS));
        assert_eq!(words, ["1", "0", "2"]);
    }

    #[test]
    fn queues_the_most_overdue_review_first() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 2);
        rate(&storage, &ids[1], ReviewRating::Good, NOON_MS - 3 * DAY_MS);
        rate(&storage, &ids[0], ReviewRating::Good, NOON_MS - 2 * DAY_MS);
        let words = queued_words(&queue_at(&storage, NOON_MS));
        assert_eq!(words, ["1", "0"]);
    }

    #[test]
    fn gives_a_new_card_no_state() {
        let storage = seeded_storage();
        make_flashcards(&storage, 1);
        assert_eq!(queue_at(&storage, NOON_MS).cards[0].state, None);
    }

    #[test]
    fn gives_each_queued_card_its_intervals() {
        let storage = seeded_storage();
        make_flashcards(&storage, 1);
        assert_eq!(
            queue_at(&storage, NOON_MS).cards[0].intervals.again_ms,
            10 * MINUTE_MS
        );
    }

    #[test]
    fn refuses_the_queue_of_an_unknown_project() {
        let storage = seeded_storage();
        let result = storage.review_queue(&ProjectId("missing".to_owned()), at(NOON_MS));
        assert!(matches!(result, Err(StorageError::ProjectNotFound(_))));
    }

    #[test]
    fn summarizes_the_waiting_cards() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 4);
        rate(&storage, &ids[1], ReviewRating::Good, NOON_MS - 2 * DAY_MS);
        rate(&storage, &ids[0], ReviewRating::Again, NOON_MS);
        let summary = storage
            .review_summary(&project(), at(NOON_MS + MINUTE_MS))
            .unwrap();
        let counts = (summary.due_count, summary.learning_count, summary.new_count);
        assert_eq!(counts, (1, 1, 2));
    }

    #[test]
    fn the_summary_names_the_card_shown_first() {
        let storage = seeded_storage();
        make_flashcards(&storage, 2);
        let summary = storage.review_summary(&project(), at(NOON_MS)).unwrap();
        assert_eq!(
            summary.next_card.map(|card| card.content.word).as_deref(),
            Some("0")
        );
    }

    #[test]
    fn the_summary_tells_when_the_next_card_is_due() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        rate(&storage, &ids[0], ReviewRating::Again, NOON_MS);
        let summary = storage.review_summary(&project(), at(NOON_MS)).unwrap();
        assert_eq!(summary.next_due_at_ms, Some(NOON_MS + 10 * MINUTE_MS));
    }

    #[test]
    fn a_project_without_answers_has_no_progress() {
        let storage = seeded_storage();
        make_flashcards(&storage, 1);
        let summary = storage.review_summary(&project(), at(NOON_MS)).unwrap();
        assert!(!summary.has_progress);
    }

    #[test]
    fn an_answer_gives_the_project_progress() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        rate(&storage, &ids[0], ReviewRating::Good, NOON_MS);
        let summary = storage.review_summary(&project(), at(NOON_MS)).unwrap();
        assert!(summary.has_progress);
    }

    #[test]
    fn the_progress_holds_every_answer_of_a_card() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        rate(&storage, &ids[0], ReviewRating::Again, NOON_MS);
        rate(
            &storage,
            &ids[0],
            ReviewRating::Good,
            NOON_MS + 10 * MINUTE_MS,
        );
        let progress = storage.list_review_progress(&project()).unwrap();
        assert_eq!(progress[&ids[0]].log.len(), 2);
    }

    #[test]
    fn the_progress_holds_the_card_state() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        let answered = rate(&storage, &ids[0], ReviewRating::Good, NOON_MS);
        let progress = storage.list_review_progress(&project()).unwrap();
        assert_eq!(progress[&ids[0]].state, answered.state);
    }
}
