//! Setting cards aside from the review: burying one until the next local day, suspending one until the user unsuspends it.

use std::collections::HashMap;

use easyimmerse_core::flashcard::FlashcardId;
use easyimmerse_core::project::ProjectId;
use easyimmerse_core::review::{ReviewHoldKind, ReviewHoldRequest};
use easyimmerse_srs::ReviewMoment;
use rusqlite::{Connection, params};

use crate::error::StorageError;
use crate::review_answers::ensure_flashcard_in_project;
use crate::stored_integer::to_stored_integer;

/// Sets a flashcard of the project aside, replacing any hold it had. A buried card comes back when the local day of `moment` ends.
pub fn hold_review_card(
    conn: &Connection,
    project_id: &ProjectId,
    flashcard_id: &FlashcardId,
    request: &ReviewHoldRequest,
    now_ms: u64,
) -> Result<(), StorageError> {
    ensure_flashcard_in_project(conn, project_id, flashcard_id)?;
    forget_ended_burials(conn, now_ms)?;
    let moment = ReviewMoment {
        at_ms: now_ms,
        utc_offset_min: request.utc_offset_min,
    };
    let until_ms = match request.kind {
        ReviewHoldKind::Buried => Some(to_stored_integer(moment.day_end_ms())),
        ReviewHoldKind::Suspended => None,
    };
    conn.execute(
        "INSERT OR REPLACE INTO review_holds (flashcard_id, project_id, kind, until_ms) \
         VALUES (?1, ?2, ?3, ?4)",
        params![
            flashcard_id.0,
            project_id.0,
            hold_text(request.kind),
            until_ms
        ],
    )?;
    Ok(())
}

/// Brings a flashcard of the project back into the review, as unburying or unsuspending it does. A card without a hold stays as it is.
pub fn lift_review_hold(
    conn: &Connection,
    project_id: &ProjectId,
    flashcard_id: &FlashcardId,
) -> Result<(), StorageError> {
    ensure_flashcard_in_project(conn, project_id, flashcard_id)?;
    conn.execute(
        "DELETE FROM review_holds WHERE flashcard_id = ?1",
        params![flashcard_id.0],
    )?;
    Ok(())
}

/// Removes the rows of buried cards whose day ended by `now_ms`, which no longer hold them.
pub fn forget_ended_burials(conn: &Connection, now_ms: u64) -> Result<(), StorageError> {
    conn.execute(
        "DELETE FROM review_holds WHERE until_ms IS NOT NULL AND until_ms <= ?1",
        params![to_stored_integer(now_ms)],
    )?;
    Ok(())
}

/// The holds on the project's flashcards that still hold at `at_ms`.
pub fn list_review_holds(
    conn: &Connection,
    project_id: &ProjectId,
    at_ms: u64,
) -> Result<HashMap<FlashcardId, ReviewHoldKind>, StorageError> {
    let mut statement = conn.prepare(
        "SELECT flashcard_id, kind FROM review_holds \
         WHERE project_id = ?1 AND (until_ms IS NULL OR until_ms > ?2)",
    )?;
    let holds = statement
        .query_map(params![project_id.0, to_stored_integer(at_ms)], |row| {
            let kind = match row.get_ref(1)?.as_str()? {
                "buried" => ReviewHoldKind::Buried,
                _ => ReviewHoldKind::Suspended,
            };
            Ok((FlashcardId(row.get(0)?), kind))
        })?
        .collect::<Result<_, _>>()?;
    Ok(holds)
}

fn hold_text(kind: ReviewHoldKind) -> &'static str {
    match kind {
        ReviewHoldKind::Buried => "buried",
        ReviewHoldKind::Suspended => "suspended",
    }
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::review::ReviewRating;

    use super::*;
    use crate::review_test_support::*;

    fn hold(storage: &crate::Storage, id: &FlashcardId, kind: ReviewHoldKind) {
        let request = ReviewHoldRequest {
            kind,
            utc_offset_min: 0,
        };
        storage
            .hold_review_card(&project(), id, &request, NOON_MS)
            .unwrap();
    }

    fn queue_length(storage: &crate::Storage, at_ms: u64) -> usize {
        storage
            .review_queue(&project(), at(at_ms))
            .unwrap()
            .cards
            .len()
    }

    #[test]
    fn a_buried_card_leaves_the_queue() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        hold(&storage, &ids[0], ReviewHoldKind::Buried);
        assert_eq!(queue_length(&storage, NOON_MS), 0);
    }

    #[test]
    fn a_buried_card_comes_back_when_the_next_day_begins_at_4_am() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        hold(&storage, &ids[0], ReviewHoldKind::Buried);
        let four_am_tomorrow = NOON_MS + DAY_MS - 8 * 60 * MINUTE_MS;
        assert_eq!(queue_length(&storage, four_am_tomorrow), 1);
    }

    #[test]
    fn a_buried_card_stays_out_until_4_am() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        hold(&storage, &ids[0], ReviewHoldKind::Buried);
        let three_am_tomorrow = NOON_MS + DAY_MS - 9 * 60 * MINUTE_MS;
        assert_eq!(queue_length(&storage, three_am_tomorrow), 0);
    }

    #[test]
    fn a_suspended_card_stays_out_on_later_days() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        hold(&storage, &ids[0], ReviewHoldKind::Suspended);
        assert_eq!(queue_length(&storage, NOON_MS + 30 * DAY_MS), 0);
    }

    #[test]
    fn unsuspending_brings_a_card_back() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        hold(&storage, &ids[0], ReviewHoldKind::Suspended);
        storage.lift_review_hold(&project(), &ids[0]).unwrap();
        assert_eq!(queue_length(&storage, NOON_MS), 1);
    }

    #[test]
    fn a_held_new_card_makes_room_for_the_next_new_card() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 21);
        hold(&storage, &ids[0], ReviewHoldKind::Buried);
        assert_eq!(queue_length(&storage, NOON_MS), 20);
    }

    #[test]
    fn a_suspended_flashcard_says_so() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        hold(&storage, &ids[0], ReviewHoldKind::Suspended);
        assert!(storage.get_flashcard(&ids[0]).unwrap().is_suspended);
    }

    #[test]
    fn a_buried_flashcard_is_not_suspended() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        hold(&storage, &ids[0], ReviewHoldKind::Buried);
        assert!(!storage.get_flashcard(&ids[0]).unwrap().is_suspended);
    }

    #[test]
    fn the_summary_leaves_a_suspended_card_out_of_the_next_due_time() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 1);
        rate(&storage, &ids[0], ReviewRating::Again, NOON_MS);
        hold(&storage, &ids[0], ReviewHoldKind::Suspended);
        let summary = storage.review_summary(&project(), at(NOON_MS)).unwrap();
        assert_eq!(summary.next_due_at_ms, None);
    }

    #[test]
    fn a_later_write_removes_the_row_of_a_burial_that_ended() {
        let storage = seeded_storage();
        let ids = make_flashcards(&storage, 2);
        hold(&storage, &ids[0], ReviewHoldKind::Buried);
        rate(&storage, &ids[1], ReviewRating::Good, NOON_MS + 2 * DAY_MS);
        let rows: i64 = storage
            .read(|conn| {
                Ok(conn.query_row("SELECT COUNT(*) FROM review_holds", [], |row| row.get(0))?)
            })
            .unwrap();
        assert_eq!(rows, 0);
    }

    #[test]
    fn refuses_a_flashcard_of_another_project() {
        let storage = seeded_storage();
        let id = make_flashcard(&storage, &other_project(), "Haus");
        let request = ReviewHoldRequest {
            kind: ReviewHoldKind::Suspended,
            utc_offset_min: 0,
        };
        let result = storage.hold_review_card(&project(), &id, &request, NOON_MS);
        assert!(matches!(result, Err(StorageError::FlashcardNotFound(_))));
    }
}
