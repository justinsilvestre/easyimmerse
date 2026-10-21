//! Reading and writing the rows of `review_cards` and `review_log`.

use std::collections::HashMap;

use easyimmerse_core::flashcard::FlashcardId;
use easyimmerse_core::project::ProjectId;
use easyimmerse_core::review::{ReviewCardState, ReviewLogEntry, ReviewPhase, ReviewRating};
use easyimmerse_srs::is_leech;
use rusqlite::{Connection, OptionalExtension, Row, params};

use crate::error::StorageError;
use crate::stored_integer::{read_unsigned, to_stored_integer};

const CARD_COLUMNS: &str = "state, due_at_ms, stability, difficulty, interval_ms, reps, lapses, \
     learning_step, last_reviewed_at_ms";

/// The log columns, in the order `read_log_row` reads them.
/// The card's schedule after the answer follows the entry, with `answered_at_ms` as its last review.
const LOG_COLUMNS: &str = "flashcard_id, answered_at_ms, rating, kind, state, elapsed_ms, duration_ms, \
     stability, difficulty, interval_ms_before, interval_ms_after, desired_retention, due_at_ms, reps, \
     lapses, learning_step";

/// The schedule of a flashcard, or None when it is a new card.
pub fn get_review_card(
    conn: &Connection,
    flashcard_id: &FlashcardId,
) -> Result<Option<ReviewCardState>, StorageError> {
    let state = conn
        .query_row(
            &format!("SELECT {CARD_COLUMNS} FROM review_cards WHERE flashcard_id = ?1"),
            params![flashcard_id.0],
            read_card_row,
        )
        .optional()?;
    Ok(state)
}

/// The schedules of a project's answered flashcards.
pub fn list_review_cards(
    conn: &Connection,
    project_id: &ProjectId,
) -> Result<HashMap<FlashcardId, ReviewCardState>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT flashcard_id, {CARD_COLUMNS} FROM review_cards WHERE project_id = ?1"
    ))?;
    let cards = statement
        .query_map(params![project_id.0], |row| {
            Ok((FlashcardId(row.get(0)?), read_card_row_from(row, 1)?))
        })?
        .collect::<Result<_, _>>()?;
    Ok(cards)
}

pub fn save_review_card(
    conn: &Connection,
    project_id: &ProjectId,
    flashcard_id: &FlashcardId,
    state: &ReviewCardState,
) -> Result<(), StorageError> {
    conn.execute(
        &format!(
            "INSERT OR REPLACE INTO review_cards (flashcard_id, project_id, {CARD_COLUMNS}) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)"
        ),
        params![
            flashcard_id.0,
            project_id.0,
            phase_text(state.state),
            to_stored_integer(state.due_at_ms),
            state.stability,
            state.difficulty,
            to_stored_integer(state.interval_ms),
            state.reps,
            state.lapses,
            state.learning_step,
            to_stored_integer(state.last_reviewed_at_ms),
        ],
    )?;
    Ok(())
}

/// Adds an answer to the log together with the schedule it gave the card.
pub fn insert_log_row(
    conn: &Connection,
    project_id: &ProjectId,
    entry: &ReviewLogEntry,
    state: &ReviewCardState,
) -> Result<(), StorageError> {
    conn.execute(
        &format!(
            "INSERT INTO review_log (project_id, {LOG_COLUMNS}) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)"
        ),
        params![
            project_id.0,
            entry.flashcard_id.0,
            to_stored_integer(entry.answered_at_ms),
            rating_text(entry.rating),
            phase_text(entry.kind),
            phase_text(entry.state),
            to_stored_integer(entry.elapsed_ms),
            to_stored_integer(entry.duration_ms),
            entry.stability,
            entry.difficulty,
            to_stored_integer(entry.interval_ms_before),
            to_stored_integer(entry.interval_ms_after),
            entry.desired_retention,
            to_stored_integer(state.due_at_ms),
            state.reps,
            state.lapses,
            state.learning_step,
        ],
    )?;
    Ok(())
}

/// The latest answer given to the flashcard, with the schedule it gave the card.
pub fn latest_log_row(
    conn: &Connection,
    flashcard_id: &FlashcardId,
) -> Result<Option<(ReviewLogEntry, ReviewCardState)>, StorageError> {
    let row = conn
        .query_row(
            &format!(
                "SELECT {LOG_COLUMNS} FROM review_log WHERE flashcard_id = ?1 \
                 ORDER BY answered_at_ms DESC LIMIT 1"
            ),
            params![flashcard_id.0],
            read_log_row,
        )
        .optional()?;
    Ok(row)
}

/// Every answer given in any project, oldest first.
pub fn list_all_log_entries(conn: &Connection) -> Result<Vec<ReviewLogEntry>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT {LOG_COLUMNS} FROM review_log ORDER BY answered_at_ms"
    ))?;
    let entries = statement
        .query_map([], |row| Ok(read_log_row(row)?.0))?
        .collect::<Result<_, _>>()?;
    Ok(entries)
}

/// Every answer given to the project's flashcards, oldest first.
pub fn list_log_entries(
    conn: &Connection,
    project_id: &ProjectId,
) -> Result<Vec<ReviewLogEntry>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT {LOG_COLUMNS} FROM review_log WHERE project_id = ?1 ORDER BY answered_at_ms"
    ))?;
    let entries = statement
        .query_map(params![project_id.0], |row| Ok(read_log_row(row)?.0))?
        .collect::<Result<_, _>>()?;
    Ok(entries)
}

fn read_card_row(row: &Row) -> rusqlite::Result<ReviewCardState> {
    read_card_row_from(row, 0)
}

fn read_card_row_from(row: &Row, first: usize) -> rusqlite::Result<ReviewCardState> {
    let lapses = row.get(first + 6)?;
    Ok(ReviewCardState {
        state: read_phase(row, first)?,
        due_at_ms: read_unsigned(row, first + 1)?,
        stability: row.get(first + 2)?,
        difficulty: row.get(first + 3)?,
        interval_ms: read_unsigned(row, first + 4)?,
        reps: row.get(first + 5)?,
        lapses,
        learning_step: row.get(first + 7)?,
        last_reviewed_at_ms: read_unsigned(row, first + 8)?,
        is_leech: is_leech(lapses),
    })
}

fn read_log_row(row: &Row) -> rusqlite::Result<(ReviewLogEntry, ReviewCardState)> {
    let entry = ReviewLogEntry {
        flashcard_id: FlashcardId(row.get(0)?),
        answered_at_ms: read_unsigned(row, 1)?,
        rating: read_rating(row, 2)?,
        kind: read_phase(row, 3)?,
        state: read_phase(row, 4)?,
        elapsed_ms: read_unsigned(row, 5)?,
        duration_ms: read_unsigned(row, 6)?,
        stability: row.get(7)?,
        difficulty: row.get(8)?,
        interval_ms_before: read_unsigned(row, 9)?,
        interval_ms_after: read_unsigned(row, 10)?,
        desired_retention: row.get(11)?,
    };
    let lapses = row.get(14)?;
    let state = ReviewCardState {
        state: entry.state,
        due_at_ms: read_unsigned(row, 12)?,
        stability: entry.stability,
        difficulty: entry.difficulty,
        interval_ms: entry.interval_ms_after,
        reps: row.get(13)?,
        lapses,
        learning_step: row.get(15)?,
        last_reviewed_at_ms: entry.answered_at_ms,
        is_leech: is_leech(lapses),
    };
    Ok((entry, state))
}

fn phase_text(phase: ReviewPhase) -> &'static str {
    match phase {
        ReviewPhase::Learning => "learning",
        ReviewPhase::Review => "review",
        ReviewPhase::Relearning => "relearning",
    }
}

fn read_phase(row: &Row, index: usize) -> rusqlite::Result<ReviewPhase> {
    match row.get_ref(index)?.as_str()? {
        "learning" => Ok(ReviewPhase::Learning),
        "review" => Ok(ReviewPhase::Review),
        "relearning" => Ok(ReviewPhase::Relearning),
        other => Err(unknown_text(index, other)),
    }
}

fn rating_text(rating: ReviewRating) -> &'static str {
    match rating {
        ReviewRating::Again => "again",
        ReviewRating::Hard => "hard",
        ReviewRating::Good => "good",
        ReviewRating::Easy => "easy",
    }
}

fn read_rating(row: &Row, index: usize) -> rusqlite::Result<ReviewRating> {
    match row.get_ref(index)?.as_str()? {
        "again" => Ok(ReviewRating::Again),
        "hard" => Ok(ReviewRating::Hard),
        "good" => Ok(ReviewRating::Good),
        "easy" => Ok(ReviewRating::Easy),
        other => Err(unknown_text(index, other)),
    }
}

fn unknown_text(index: usize, text: &str) -> rusqlite::Error {
    rusqlite::Error::FromSqlConversionFailure(
        index,
        rusqlite::types::Type::Text,
        format!("unknown value {text:?}").into(),
    )
}
