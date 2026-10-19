//! Schedules flashcard reviews with FSRS-6, as pure functions of a card's state and the time of the answer.
//!
//! The defaults follow Anki and the FSRS authors: one learning step and one relearning step of ten minutes,
//! desired retention 0.90, the default FSRS parameters, Anki's fuzz, and days that end at 4 a.m. local time.

mod error;
mod fuzz;
mod queue_limits;
mod review_moment;
mod schedule;
mod settings;

pub use error::SrsError;
pub use queue_limits::{learn_ahead_cutoff_ms, new_cards_available};
pub use review_moment::ReviewMoment;
pub use schedule::{Answered, ReviewedCard, answer, candidate_intervals};
pub use settings::{DESIRED_RETENTION, MAX_ANSWER_DURATION_MS, NEW_CARDS_PER_DAY};
