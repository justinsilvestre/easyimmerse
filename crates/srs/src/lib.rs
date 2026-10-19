//! Schedules flashcard reviews with FSRS-6, as pure functions of a card's state and the time of the answer.
//!
//! The defaults follow Anki and the FSRS authors: one learning step and one relearning step of ten minutes,
//! desired retention 0.90, the default FSRS parameters until enough answers fit the user's own, Anki's fuzz, and days that end at 4 a.m. local time.

mod error;
mod fuzz;
mod parameter_fit;
mod queue_limits;
mod review_moment;
mod schedule;
mod settings;

pub use error::SrsError;
/// The FSRS-6 parameters that fit the average learner, which schedule reviews until a fit gives the user's own.
pub use fsrs::DEFAULT_PARAMETERS as DEFAULT_WEIGHTS;
pub use parameter_fit::{fit_parameters, has_enough_to_fit, is_fit_due};
pub use queue_limits::{learn_ahead_cutoff_ms, new_cards_available, reviews_available};
pub use review_moment::ReviewMoment;
pub use schedule::{Answered, ReviewedCard, Scheduler, is_leech};
pub use settings::{DESIRED_RETENTION, MAX_ANSWER_DURATION_MS, NEW_CARDS_PER_DAY, REVIEWS_PER_DAY};
