//! The built-in spaced-repetition review: how a flashcard's card stands, the answers given to it, and what the review screen sends and receives.
//!
//! A flashcard that has never been answered is a new card and has no `ReviewCardState`.

use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::flashcard::{Flashcard, FlashcardId};
use crate::project::ProjectId;

/// The longest time an answer is logged as taking, as Anki caps it, since a longer one means the user stepped away.
pub const MAX_ANSWER_DURATION_MS: u64 = 60_000;

/// The button the user pressed after seeing the answer.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum ReviewRating {
    Again,
    Hard,
    Good,
    Easy,
}

/// Where a card stands in its schedule.
/// A card is learning from its first answer until it graduates, under review once it has graduated,
/// and relearning after the user forgot it under review, until it graduates again.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum ReviewPhase {
    Learning,
    Review,
    Relearning,
}

/// The schedule of a card that has been answered at least once.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ReviewCardState {
    pub state: ReviewPhase,
    /// Milliseconds since the Unix epoch.
    pub due_at_ms: u64,
    /// The FSRS stability in days: how long until the chance of remembering the card falls to 90%.
    pub stability: f64,
    /// The FSRS difficulty, from 1 to 10.
    pub difficulty: f64,
    /// The time from the latest answer to `due_at_ms`.
    pub interval_ms: u64,
    /// The number of answers given.
    pub reps: u32,
    /// The number of times the user forgot the card under review.
    pub lapses: u32,
    /// The number of learning or relearning steps passed in the current phase. Zero under review.
    pub learning_step: u32,
    /// Milliseconds since the Unix epoch.
    pub last_reviewed_at_ms: u64,
    /// Whether the user has forgotten the card under review so often that it is a leech: a card worth rewording, or suspending.
    pub is_leech: bool,
}

/// One answer, as kept in the review log, with what Anki's review log needs to carry the card's history across.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ReviewLogEntry {
    pub flashcard_id: FlashcardId,
    /// Milliseconds since the Unix epoch, stamped by the server. Unique within a project, and the entry's id.
    pub answered_at_ms: u64,
    pub rating: ReviewRating,
    /// The phase the card was in when answered. A new card's first answer is a learning answer.
    pub kind: ReviewPhase,
    /// The phase the answer put the card in.
    pub state: ReviewPhase,
    /// The time since the card's previous answer. Zero for its first answer.
    pub elapsed_ms: u64,
    /// The time from the card appearing to the answer, at most one minute.
    pub duration_ms: u64,
    /// The FSRS stability after the answer, in days.
    pub stability: f64,
    /// The FSRS difficulty after the answer, from 1 to 10.
    pub difficulty: f64,
    /// The interval the card had before the answer. Zero for its first answer.
    pub interval_ms_before: u64,
    /// The interval the answer gave the card.
    pub interval_ms_after: u64,
    /// The chance of remembering the card when it comes due that its interval was chosen for, from 0 to 1.
    pub desired_retention: f64,
}

/// How the user set a card aside from the review.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum ReviewHoldKind {
    /// Left out until the next local day begins.
    Buried,
    /// Left out until the user unsuspends it.
    Suspended,
}

/// A flashcard's place in the review, as the Anki export carries it across:
/// its schedule and every answer given to it, oldest first, and whether the user set it aside.
#[derive(Debug, Clone, PartialEq)]
pub struct ReviewProgress {
    /// None for a new card.
    pub state: Option<ReviewCardState>,
    pub log: Vec<ReviewLogEntry>,
    pub hold: Option<ReviewHoldKind>,
}

/// The interval each rating would give a card if it were answered now.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ReviewIntervals {
    pub again_ms: u64,
    pub hard_ms: u64,
    pub good_ms: u64,
    pub easy_ms: u64,
}

/// What waits in a project's review, as the flashcards panel shows it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ReviewSummary {
    /// Cards under review that are due today.
    pub due_count: u64,
    /// Cards in learning or relearning that are due now or within the learn-ahead time.
    pub learning_count: u64,
    /// New cards that may still be introduced today.
    pub new_count: u64,
    /// Cards under review that are due today but left for later days, because more are due than a day's limit.
    /// While any are, no new cards are introduced.
    pub held_back_count: u64,
    /// Milliseconds since the Unix epoch at which the earliest answered card is due. Null when no card has been answered.
    pub next_due_at_ms: Option<u64>,
    /// The flashcard the review would show first. Null when nothing waits.
    pub next_card: Option<Flashcard>,
    /// Whether any flashcard of the project has been answered.
    pub has_progress: bool,
}

/// What waits in each project's review, as the list of projects shows it. Each count is that of the cards the review would show.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ReviewCounts {
    pub project_id: ProjectId,
    /// Cards under review that are due today, up to the day's limit.
    pub due_count: u64,
    /// Cards in learning or relearning that are due now or within the learn-ahead time.
    pub learning_count: u64,
    /// New cards that may still be introduced today.
    pub new_count: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ListReviewCountsResponse {
    pub projects: Vec<ReviewCounts>,
}

/// The cards of a review session, in the order they are shown.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ReviewQueue {
    pub cards: Vec<ReviewQueueCard>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ReviewQueueCard {
    pub flashcard: Flashcard,
    /// Null for a new card.
    pub state: Option<ReviewCardState>,
    pub intervals: ReviewIntervals,
}

/// What the review screen sends when the user rates a card.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ReviewAnswerRequest {
    pub flashcard_id: FlashcardId,
    pub rating: ReviewRating,
    /// Local time minus UTC, in minutes, as on the user's device: 120 in Central European Summer Time.
    pub utc_offset_min: i32,
    /// The time from the card appearing to the answer, as measured by the client.
    pub duration_ms: u64,
}

/// A card after an answer.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ReviewAnswerResponse {
    pub state: ReviewCardState,
    pub entry: ReviewLogEntry,
    /// The intervals of the card's next answer, were it given now.
    pub intervals: ReviewIntervals,
}

/// A card after its latest answer was undone.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ReviewAnswerUndone {
    pub flashcard_id: FlashcardId,
    /// The state before the undone answer. Null when the card is new again.
    pub state: Option<ReviewCardState>,
    pub intervals: ReviewIntervals,
}

/// Raises the number of new cards, or of reviews, the project's review shows today.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ReviewAllowanceRequest {
    /// Local time minus UTC, in minutes, as on the user's device.
    pub utc_offset_min: i32,
    pub extra_new_cards: u32,
    pub extra_reviews: u32,
}

/// Sets a card aside from the review: buries it until the next local day, or suspends it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS, ToSchema)]
#[ts(export)]
pub struct ReviewHoldRequest {
    pub kind: ReviewHoldKind,
    /// Local time minus UTC, in minutes, as on the user's device, which places the end of a buried card's day.
    pub utc_offset_min: i32,
}

/// The FSRS parameters fitted to the user's own answers across every project, which schedule their reviews in place of the defaults.
#[derive(Debug, Clone, PartialEq)]
pub struct ReviewParameters {
    pub weights: Vec<f32>,
    /// Milliseconds since the Unix epoch at which the fit began.
    pub fitted_at_ms: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_a_rating_in_snake_case() {
        assert_eq!(
            serde_json::to_string(&ReviewRating::Again).unwrap(),
            "\"again\""
        );
    }

    #[test]
    fn serializes_a_phase_in_snake_case() {
        assert_eq!(
            serde_json::to_string(&ReviewPhase::Relearning).unwrap(),
            "\"relearning\""
        );
    }
}
