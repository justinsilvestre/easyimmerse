//! Fits the FSRS parameters to the user's own answers, as Anki's "Optimize" does.

use std::collections::BTreeMap;

use easyimmerse_core::review::{ReviewLogEntry, ReviewRating};
use fsrs::{ComputeParametersInput, FSRSItem, FSRSReview, compute_parameters};

use crate::error::SrsError;
use crate::review_moment::ReviewMoment;
use crate::settings::DAY_MS;

/// The answers given a day or more after a card's previous one that a fit needs.
/// With fewer, `fsrs::compute_parameters` adjusts only the first four parameters, the initial stabilities, and leaves the rest at their defaults.
pub const MIN_FIT_ANSWERS: usize = 64;
/// How long fitted parameters serve before they are fitted again, with the answers given since.
pub const REFIT_AFTER_MS: u64 = 30 * DAY_MS;

/// Whether parameters fitted at `fitted_at_ms`, or never, are due to be fitted again at `now_ms`.
pub fn is_fit_due(fitted_at_ms: Option<u64>, now_ms: u64) -> bool {
    fitted_at_ms.is_none_or(|fitted_at_ms| now_ms.saturating_sub(fitted_at_ms) >= REFIT_AFTER_MS)
}

/// Whether the log holds enough answers given on a later day than the card's previous one for a fit.
pub fn has_enough_to_fit(log: &[ReviewLogEntry], moment: ReviewMoment) -> bool {
    training_items(log, moment).len() >= MIN_FIT_ANSWERS
}

/// Fits the parameters to the answers of the log, from every project, or returns None when there are too few for a fit.
/// Days are local days at `moment`'s offset. A fit takes a few seconds for a few thousand answers.
pub fn fit_parameters(
    log: &[ReviewLogEntry],
    moment: ReviewMoment,
) -> Result<Option<Vec<f32>>, SrsError> {
    let items = training_items(log, moment);
    if items.len() < MIN_FIT_ANSWERS {
        return Ok(None);
    }
    let weights = compute_parameters(ComputeParametersInput {
        train_set: items,
        ..Default::default()
    })?;
    Ok(Some(weights))
}

/// The answers the log gives to fit with, as FSRS counts them: each answer given a day or more after the card's previous one,
/// together with every earlier answer to the card.
fn training_items(log: &[ReviewLogEntry], moment: ReviewMoment) -> Vec<FSRSItem> {
    let mut by_card: BTreeMap<&str, Vec<&ReviewLogEntry>> = BTreeMap::new();
    for entry in log {
        by_card
            .entry(&entry.flashcard_id.0)
            .or_default()
            .push(entry);
    }
    by_card
        .into_values()
        .flat_map(|entries| card_items(&entries, moment))
        .collect()
}

/// The items of one card, whose entries are in the order they were answered.
fn card_items(entries: &[&ReviewLogEntry], moment: ReviewMoment) -> Vec<FSRSItem> {
    let mut previous_ms = None;
    let reviews: Vec<FSRSReview> = entries
        .iter()
        .map(|entry| {
            let delta_t = previous_ms.map_or(0, |previous_ms| {
                moment.at(entry.answered_at_ms).days_since(previous_ms)
            });
            previous_ms = Some(entry.answered_at_ms);
            FSRSReview {
                rating: rating_number(entry.rating),
                delta_t,
            }
        })
        .collect();
    (1..reviews.len())
        .filter(|&last| reviews[last].delta_t > 0)
        .map(|last| FSRSItem {
            reviews: reviews[..=last].to_vec(),
        })
        .collect()
}

fn rating_number(rating: ReviewRating) -> u32 {
    match rating {
        ReviewRating::Again => 1,
        ReviewRating::Hard => 2,
        ReviewRating::Good => 3,
        ReviewRating::Easy => 4,
    }
}

#[cfg(test)]
mod tests {
    use easyimmerse_core::flashcard::FlashcardId;
    use easyimmerse_core::review::{ReviewAnswerId, ReviewPhase};

    use super::*;

    /// 2026-10-19 12:00 UTC.
    const NOON_MS: u64 = 1_792_411_200_000;
    const MINUTE_MS: u64 = 60_000;

    fn entry(card: &str, rating: ReviewRating, answered_at_ms: u64) -> ReviewLogEntry {
        ReviewLogEntry {
            id: ReviewAnswerId(format!("{card}-{answered_at_ms}")),
            flashcard_id: FlashcardId(card.to_owned()),
            answered_at_ms,
            rating,
            kind: ReviewPhase::Review,
            state: ReviewPhase::Review,
            elapsed_ms: 0,
            duration_ms: 0,
            stability: 1.0,
            difficulty: 5.0,
            interval_ms_before: 0,
            interval_ms_after: 0,
            desired_retention: 0.9,
        }
    }

    fn utc() -> ReviewMoment {
        ReviewMoment {
            at_ms: NOON_MS + 10 * DAY_MS,
            utc_offset_min: 0,
        }
    }

    /// A card answered Again, Good ten minutes later, then Good two days later and Hard five days after that.
    fn sample_log() -> Vec<ReviewLogEntry> {
        vec![
            entry("a", ReviewRating::Again, NOON_MS),
            entry("a", ReviewRating::Good, NOON_MS + 10 * MINUTE_MS),
            entry("a", ReviewRating::Good, NOON_MS + 2 * DAY_MS),
            entry("a", ReviewRating::Hard, NOON_MS + 7 * DAY_MS),
        ]
    }

    #[test]
    fn makes_an_item_of_each_answer_given_on_a_later_day() {
        assert_eq!(training_items(&sample_log(), utc()).len(), 2);
    }

    #[test]
    fn an_item_holds_every_earlier_answer_with_the_days_between_them() {
        let items = training_items(&sample_log(), utc());
        let days: Vec<u32> = items[0]
            .reviews
            .iter()
            .map(|review| review.delta_t)
            .collect();
        assert_eq!(days, [0, 0, 2]);
    }

    #[test]
    fn numbers_the_ratings_as_fsrs_does() {
        let items = training_items(&sample_log(), utc());
        let ratings: Vec<u32> = items[1]
            .reviews
            .iter()
            .map(|review| review.rating)
            .collect();
        assert_eq!(ratings, [1, 3, 3, 2]);
    }

    #[test]
    fn keeps_the_cards_apart() {
        let log = [
            entry("a", ReviewRating::Good, NOON_MS),
            entry("b", ReviewRating::Good, NOON_MS + DAY_MS),
        ];
        assert!(training_items(&log, utc()).is_empty());
    }

    #[test]
    fn leaves_the_defaults_with_too_few_answers() {
        assert_eq!(fit_parameters(&sample_log(), utc()).unwrap(), None);
    }

    #[test]
    fn sixty_four_answers_on_later_days_are_enough() {
        let log: Vec<ReviewLogEntry> = (0..32)
            .flat_map(|card| {
                let card = card.to_string();
                [0, 2, 7].map(|day| entry(&card, ReviewRating::Good, NOON_MS + day * DAY_MS))
            })
            .collect();
        assert!(has_enough_to_fit(&log, utc()));
    }

    #[test]
    fn a_first_fit_is_due() {
        assert!(is_fit_due(None, NOON_MS));
    }

    #[test]
    fn a_fit_serves_for_thirty_days() {
        assert!(!is_fit_due(Some(NOON_MS), NOON_MS + 29 * DAY_MS));
    }

    #[test]
    fn a_fit_thirty_days_old_is_due_again() {
        assert!(is_fit_due(Some(NOON_MS), NOON_MS + 30 * DAY_MS));
    }
}
