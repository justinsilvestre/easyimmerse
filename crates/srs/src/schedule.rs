//! What an answer does to a card: its next phase, its FSRS memory state, its interval, and the log entry that records it.
//!
//! Again starts the learning or relearning step; Hard, Good and Easy graduate a learning or relearning card,
//! since there is only one step, and keep a card under review.

use easyimmerse_core::flashcard::FlashcardId;
use easyimmerse_core::review::{
    ReviewCardState, ReviewIntervals, ReviewLogEntry, ReviewPhase, ReviewRating,
};
use fsrs::{FSRS, MemoryState, NextStates};

use crate::error::SrsError;
use crate::fuzz::{fuzz_fraction, fuzzed_days};
use crate::review_moment::ReviewMoment;
use crate::settings::{
    DAY_MS, DESIRED_RETENTION, LEECH_LAPSES, MAX_ANSWER_DURATION_MS, MAX_INTERVAL_DAYS, STEP_MS,
};

/// A flashcard as it stands before an answer.
#[derive(Debug, Clone, Copy)]
pub struct ReviewedCard<'a> {
    pub flashcard_id: &'a FlashcardId,
    /// None for a new card.
    pub state: Option<&'a ReviewCardState>,
}

/// A card after an answer, and the log entry recording the answer.
#[derive(Debug, Clone, PartialEq)]
pub struct Answered {
    pub state: ReviewCardState,
    pub entry: ReviewLogEntry,
}

/// Schedules cards with a set of FSRS parameters: the defaults, or those fitted to the user's own answers.
#[derive(Debug, Clone, Default)]
pub struct Scheduler {
    fsrs: FSRS,
}

impl Scheduler {
    /// A scheduler with fitted parameters, or the default ones when `weights` is empty.
    pub fn new(weights: &[f32]) -> Result<Self, SrsError> {
        Ok(Self {
            fsrs: FSRS::new(weights)?,
        })
    }

    /// Answers the card at `moment`, which the caller stamps.
    pub fn answer(
        &self,
        card: ReviewedCard,
        rating: ReviewRating,
        moment: ReviewMoment,
        duration_ms: u64,
    ) -> Result<Answered, SrsError> {
        let outcome = outcome(card, rating, &self.next_states(card, moment)?);
        let state = next_state(card, rating, moment, &outcome);
        let entry = log_entry(card, rating, &state, duration_ms);
        Ok(Answered { state, entry })
    }

    /// The interval each rating would give the card if it were answered at `moment`.
    pub fn candidate_intervals(
        &self,
        card: ReviewedCard,
        moment: ReviewMoment,
    ) -> Result<ReviewIntervals, SrsError> {
        let states = self.next_states(card, moment)?;
        let interval_ms = |rating| outcome(card, rating, &states).interval_ms;
        Ok(ReviewIntervals {
            again_ms: interval_ms(ReviewRating::Again),
            hard_ms: interval_ms(ReviewRating::Hard),
            good_ms: interval_ms(ReviewRating::Good),
            easy_ms: interval_ms(ReviewRating::Easy),
        })
    }

    fn next_states(
        &self,
        card: ReviewedCard,
        moment: ReviewMoment,
    ) -> Result<NextStates, SrsError> {
        let memory = card.state.map(|state| MemoryState {
            stability: state.stability as f32,
            difficulty: state.difficulty as f32,
        });
        let states =
            self.fsrs
                .next_states(memory, DESIRED_RETENTION as f32, elapsed_days(card, moment))?;
        Ok(states)
    }
}

/// Whether a card forgotten under review this many times is a leech.
pub fn is_leech(lapses: u32) -> bool {
    lapses >= LEECH_LAPSES
}

/// What an answer changes in the schedule.
struct Outcome {
    phase: ReviewPhase,
    memory: MemoryState,
    interval_ms: u64,
}

fn outcome(card: ReviewedCard, rating: ReviewRating, states: &NextStates) -> Outcome {
    let phase = next_phase(phase_of(card), rating);
    let interval_ms = match phase {
        ReviewPhase::Learning | ReviewPhase::Relearning => STEP_MS,
        ReviewPhase::Review => u64::from(review_days(card, rating, states)) * DAY_MS,
    };
    Outcome {
        phase,
        memory: chosen(states, rating).memory,
        interval_ms,
    }
}

fn next_phase(current: Option<ReviewPhase>, rating: ReviewRating) -> ReviewPhase {
    match (current, rating) {
        (None | Some(ReviewPhase::Learning), ReviewRating::Again) => ReviewPhase::Learning,
        (Some(_), ReviewRating::Again) => ReviewPhase::Relearning,
        _ => ReviewPhase::Review,
    }
}

/// The interval in days of a passing answer: rounded, fuzzed and at most `MAX_INTERVAL_DAYS`.
/// Under review, Good gives a longer interval than Hard, and Easy than Good, as Anki keeps them.
fn review_days(card: ReviewedCard, rating: ReviewRating, states: &NextStates) -> u32 {
    let fraction = fuzz_fraction(&card.flashcard_id.0, reps_of(card));
    let days = |state: &fsrs::ItemState| fuzzed_days(f64::from(state.interval), fraction).max(1);
    let is_review = phase_of(card) == Some(ReviewPhase::Review);
    let hard = days(&states.hard);
    let good = days(&states.good).max(if is_review { hard + 1 } else { 1 });
    let easy = days(&states.easy).max(if is_review { good + 1 } else { 1 });
    let chosen = match rating {
        ReviewRating::Hard => hard,
        ReviewRating::Easy => easy,
        ReviewRating::Again | ReviewRating::Good => good,
    };
    chosen.min(MAX_INTERVAL_DAYS)
}

/// The number of local days between the card's previous answer and `moment`. Answers on the same day are zero days apart.
fn elapsed_days(card: ReviewedCard, moment: ReviewMoment) -> u32 {
    card.state
        .map_or(0, |state| moment.days_since(state.last_reviewed_at_ms))
}

fn chosen(states: &NextStates, rating: ReviewRating) -> &fsrs::ItemState {
    match rating {
        ReviewRating::Again => &states.again,
        ReviewRating::Hard => &states.hard,
        ReviewRating::Good => &states.good,
        ReviewRating::Easy => &states.easy,
    }
}

fn next_state(
    card: ReviewedCard,
    rating: ReviewRating,
    moment: ReviewMoment,
    outcome: &Outcome,
) -> ReviewCardState {
    let is_lapse = phase_of(card) == Some(ReviewPhase::Review) && rating == ReviewRating::Again;
    let lapses = card.state.map_or(0, |state| state.lapses) + u32::from(is_lapse);
    ReviewCardState {
        state: outcome.phase,
        due_at_ms: moment.at_ms + outcome.interval_ms,
        stability: f64::from(outcome.memory.stability),
        difficulty: f64::from(outcome.memory.difficulty),
        interval_ms: outcome.interval_ms,
        reps: reps_of(card) + 1,
        lapses,
        // With one step, a card in learning or relearning has passed none.
        learning_step: 0,
        last_reviewed_at_ms: moment.at_ms,
        is_leech: is_leech(lapses),
    }
}

fn log_entry(
    card: ReviewedCard,
    rating: ReviewRating,
    state: &ReviewCardState,
    duration_ms: u64,
) -> ReviewLogEntry {
    let previous = card.state;
    ReviewLogEntry {
        flashcard_id: card.flashcard_id.clone(),
        answered_at_ms: state.last_reviewed_at_ms,
        rating,
        kind: phase_of(card).unwrap_or(ReviewPhase::Learning),
        state: state.state,
        elapsed_ms: previous.map_or(0, |previous| {
            state
                .last_reviewed_at_ms
                .saturating_sub(previous.last_reviewed_at_ms)
        }),
        duration_ms: duration_ms.min(MAX_ANSWER_DURATION_MS),
        stability: state.stability,
        difficulty: state.difficulty,
        interval_ms_before: previous.map_or(0, |previous| previous.interval_ms),
        interval_ms_after: state.interval_ms,
        desired_retention: DESIRED_RETENTION,
    }
}

fn phase_of(card: ReviewedCard) -> Option<ReviewPhase> {
    card.state.map(|state| state.state)
}

fn reps_of(card: ReviewedCard) -> u32 {
    card.state.map_or(0, |state| state.reps)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::MINUTE_MS;

    /// 2026-10-19 12:00 UTC.
    const NOON_MS: u64 = 1_792_411_200_000;

    fn id() -> FlashcardId {
        FlashcardId("0123456789abcdef0123456789abcdef".to_owned())
    }

    fn at(at_ms: u64) -> ReviewMoment {
        ReviewMoment {
            at_ms,
            utc_offset_min: 0,
        }
    }

    fn new_card(id: &FlashcardId) -> ReviewedCard<'_> {
        ReviewedCard {
            flashcard_id: id,
            state: None,
        }
    }

    fn first_intervals() -> ReviewIntervals {
        Scheduler::default()
            .candidate_intervals(new_card(&id()), at(NOON_MS))
            .unwrap()
    }

    fn answer(
        card: ReviewedCard,
        rating: ReviewRating,
        moment: ReviewMoment,
        duration_ms: u64,
    ) -> Result<Answered, SrsError> {
        Scheduler::default().answer(card, rating, moment, duration_ms)
    }

    /// Answers a new card at noon, then answers it again `later_ms` after.
    fn answered_twice(first: ReviewRating, second: ReviewRating, later_ms: u64) -> Answered {
        let id = id();
        let once = answer(new_card(&id), first, at(NOON_MS), 3_000).unwrap();
        let card = ReviewedCard {
            flashcard_id: &id,
            state: Some(&once.state),
        };
        answer(card, second, at(NOON_MS + later_ms), 3_000).unwrap()
    }

    #[test]
    fn again_on_a_new_card_brings_it_back_in_ten_minutes() {
        assert_eq!(first_intervals().again_ms, 10 * MINUTE_MS);
    }

    #[test]
    fn hard_on_a_new_card_gives_one_day() {
        assert_eq!(first_intervals().hard_ms, DAY_MS);
    }

    #[test]
    fn good_on_a_new_card_gives_two_days() {
        assert_eq!(first_intervals().good_ms, 2 * DAY_MS);
    }

    #[test]
    fn easy_on_a_new_card_gives_about_eight_days() {
        assert!((6 * DAY_MS..=10 * DAY_MS).contains(&first_intervals().easy_ms));
    }

    #[test]
    fn the_default_parameters_give_easy_eight_days_before_fuzz() {
        let states = FSRS::default().next_states(None, 0.9, 0).unwrap();
        assert_eq!(states.easy.interval.round(), 8.0);
    }

    #[test]
    fn the_buttons_show_the_interval_the_answer_gives() {
        let answered = answer(new_card(&id()), ReviewRating::Easy, at(NOON_MS), 0).unwrap();
        assert_eq!(answered.state.interval_ms, first_intervals().easy_ms);
    }

    #[test]
    fn again_on_a_new_card_puts_it_in_learning() {
        let answered = answer(new_card(&id()), ReviewRating::Again, at(NOON_MS), 0).unwrap();
        assert_eq!(answered.state.state, ReviewPhase::Learning);
    }

    #[test]
    fn a_learning_card_is_due_after_its_step() {
        let answered = answer(new_card(&id()), ReviewRating::Again, at(NOON_MS), 0).unwrap();
        assert_eq!(answered.state.due_at_ms, NOON_MS + 10 * MINUTE_MS);
    }

    #[test]
    fn good_on_a_new_card_graduates_it() {
        let answered = answer(new_card(&id()), ReviewRating::Good, at(NOON_MS), 0).unwrap();
        assert_eq!(answered.state.state, ReviewPhase::Review);
    }

    #[test]
    fn good_on_a_learning_card_the_same_day_graduates_it() {
        let answered = answered_twice(ReviewRating::Again, ReviewRating::Good, 10 * MINUTE_MS);
        assert_eq!(answered.state.state, ReviewPhase::Review);
    }

    #[test]
    fn good_on_a_learning_card_the_same_day_gives_one_day() {
        let answered = answered_twice(ReviewRating::Again, ReviewRating::Good, 10 * MINUTE_MS);
        assert_eq!(answered.state.interval_ms, DAY_MS);
    }

    #[test]
    fn again_on_a_review_card_puts_it_in_relearning() {
        let answered = answered_twice(ReviewRating::Good, ReviewRating::Again, 2 * DAY_MS);
        assert_eq!(answered.state.state, ReviewPhase::Relearning);
    }

    #[test]
    fn again_on_a_review_card_counts_a_lapse() {
        let answered = answered_twice(ReviewRating::Good, ReviewRating::Again, 2 * DAY_MS);
        assert_eq!(answered.state.lapses, 1);
    }

    #[test]
    fn again_on_a_review_card_brings_it_back_in_ten_minutes() {
        let answered = answered_twice(ReviewRating::Good, ReviewRating::Again, 2 * DAY_MS);
        assert_eq!(answered.state.interval_ms, 10 * MINUTE_MS);
    }

    #[test]
    fn again_on_a_learning_card_counts_no_lapse() {
        let answered = answered_twice(ReviewRating::Again, ReviewRating::Again, 10 * MINUTE_MS);
        assert_eq!(answered.state.lapses, 0);
    }

    #[test]
    fn good_on_a_review_card_lengthens_its_interval() {
        let answered = answered_twice(ReviewRating::Good, ReviewRating::Good, 2 * DAY_MS);
        assert!(answered.state.interval_ms > 2 * DAY_MS);
    }

    #[test]
    fn counts_every_answer() {
        let answered = answered_twice(ReviewRating::Again, ReviewRating::Good, 10 * MINUTE_MS);
        assert_eq!(answered.state.reps, 2);
    }

    #[test]
    fn logs_the_first_answer_as_a_learning_answer() {
        let answered = answer(new_card(&id()), ReviewRating::Good, at(NOON_MS), 0).unwrap();
        assert_eq!(answered.entry.kind, ReviewPhase::Learning);
    }

    #[test]
    fn logs_an_answer_to_a_review_card_as_a_review() {
        let answered = answered_twice(ReviewRating::Good, ReviewRating::Good, 2 * DAY_MS);
        assert_eq!(answered.entry.kind, ReviewPhase::Review);
    }

    #[test]
    fn logs_the_time_since_the_previous_answer() {
        let answered = answered_twice(ReviewRating::Again, ReviewRating::Good, 10 * MINUTE_MS);
        assert_eq!(answered.entry.elapsed_ms, 10 * MINUTE_MS);
    }

    #[test]
    fn logs_the_interval_before_the_answer() {
        let answered = answered_twice(ReviewRating::Again, ReviewRating::Good, 10 * MINUTE_MS);
        assert_eq!(answered.entry.interval_ms_before, 10 * MINUTE_MS);
    }

    #[test]
    fn caps_the_logged_duration_at_one_minute() {
        let answered = answer(
            new_card(&id()),
            ReviewRating::Good,
            at(NOON_MS),
            5 * MINUTE_MS,
        )
        .unwrap();
        assert_eq!(answered.entry.duration_ms, MINUTE_MS);
    }

    #[test]
    fn a_card_is_no_leech_before_its_eighth_lapse() {
        assert!(!is_leech(7));
    }

    #[test]
    fn the_eighth_lapse_makes_a_card_a_leech() {
        assert!(is_leech(8));
    }

    #[test]
    fn an_answer_flags_a_card_forgotten_eight_times_as_a_leech() {
        let id = id();
        let mut state = answer(new_card(&id), ReviewRating::Good, at(NOON_MS), 0)
            .unwrap()
            .state;
        state.lapses = 7;
        let card = ReviewedCard {
            flashcard_id: &id,
            state: Some(&state),
        };
        let answered = answer(card, ReviewRating::Again, at(NOON_MS + 2 * DAY_MS), 0).unwrap();
        assert!(answered.state.is_leech);
    }

    #[test]
    fn fitted_parameters_change_the_intervals() {
        let mut weights = fsrs::DEFAULT_PARAMETERS.to_vec();
        weights[2] = 10.0;
        let fitted = Scheduler::new(&weights)
            .unwrap()
            .candidate_intervals(new_card(&id()), at(NOON_MS))
            .unwrap();
        assert_ne!(fitted.good_ms, first_intervals().good_ms);
    }

    #[test]
    fn logs_the_answer_at_the_moment_given() {
        let answered = answer(new_card(&id()), ReviewRating::Good, at(NOON_MS), 0).unwrap();
        assert_eq!(answered.entry.answered_at_ms, NOON_MS);
    }
}
