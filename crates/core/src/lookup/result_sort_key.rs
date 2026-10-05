use std::cmp::Ordering;
use std::collections::BTreeMap;

use super::found_rows::DictionaryOrigin;
use crate::dictionary::FrequencyMode;

/// What lookup results are ranked by.
#[derive(Debug, Clone, PartialEq, Default)]
pub struct ResultSortKey {
    pub matched_length: usize,
    pub inflection_count: usize,
    pub commonness: Commonness,
    /// The import position of the earliest imported dictionary with an entry in the result.
    pub first_dictionary_rank: i64,
    /// The highest score that a dictionary gives an entry in the result.
    pub best_score: i64,
}

impl ResultSortKey {
    /// Orders keys from the best result to the worst: longer matches first,
    /// then the more common result where one frequency dictionary lists both,
    /// then fewer inflections, then a result that a frequency dictionary lists before one it does not,
    /// then earlier imported dictionaries, then higher scores.
    ///
    /// A one-character match with inflections undone, such as し reached from する,
    /// ranks below an unchanged match of the same length however common it is.
    pub fn compare(&self, other: &Self) -> Ordering {
        other
            .matched_length
            .cmp(&self.matched_length)
            .then_with(|| {
                self.is_one_character_stem()
                    .cmp(&other.is_one_character_stem())
            })
            .then_with(|| self.commonness.compare_shared(&other.commonness))
            .then_with(|| self.inflection_count.cmp(&other.inflection_count))
            .then_with(|| self.commonness.compare_coverage(&other.commonness))
            .then_with(|| self.first_dictionary_rank.cmp(&other.first_dictionary_rank))
            .then_with(|| other.best_score.cmp(&self.best_score))
    }

    fn is_one_character_stem(&self) -> bool {
        self.matched_length == 1 && self.inflection_count > 0
    }
}

/// How common a result is according to each frequency dictionary, keyed by the dictionary's import position.
/// Each value is a rank, so lower means more common whatever the dictionary's `FrequencyMode`.
#[derive(Debug, Clone, PartialEq, Default)]
pub struct Commonness(BTreeMap<i64, f64>);

impl Commonness {
    /// Records one frequency, keeping the most common value per dictionary.
    /// A dictionary that does not state its mode is taken to list ranks, as most frequency lists do.
    pub fn record(&mut self, dictionary: &DictionaryOrigin, value: f64) {
        let rank = match dictionary.frequency_mode {
            Some(FrequencyMode::OccurrenceBased) => -value,
            Some(FrequencyMode::RankBased) | None => value,
        };
        let best = self.0.entry(dictionary.rank).or_insert(rank);
        *best = best.min(rank);
    }

    /// Compares by the earliest imported frequency dictionary that lists both results.
    /// Results that no one frequency dictionary lists together compare as equal.
    pub fn compare_shared(&self, other: &Self) -> Ordering {
        let shared = self
            .0
            .iter()
            .find_map(|(rank, mine)| Some((mine, other.0.get(rank)?)));
        shared.map_or(Ordering::Equal, |(mine, theirs)| mine.total_cmp(theirs))
    }

    /// Ranks a result that the earliest imported frequency dictionary listing either result lists
    /// before one it does not.
    pub fn compare_coverage(&self, other: &Self) -> Ordering {
        let earliest = self.0.keys().chain(other.0.keys()).min();
        match earliest.map(|rank| (self.0.contains_key(rank), other.0.contains_key(rank))) {
            Some((true, false)) => Ordering::Less,
            Some((false, true)) => Ordering::Greater,
            _ => Ordering::Equal,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::DictionaryFormatKind;

    fn dictionary(rank: i64, frequency_mode: Option<FrequencyMode>) -> DictionaryOrigin {
        DictionaryOrigin {
            id: rank.to_string(),
            title: "Frequencies".to_string(),
            format: DictionaryFormatKind::Yomitan,
            rank,
            frequency_mode,
        }
    }

    fn commonness(entries: &[(i64, Option<FrequencyMode>, f64)]) -> Commonness {
        let mut commonness = Commonness::default();
        for (rank, mode, value) in entries {
            commonness.record(&dictionary(*rank, *mode), *value);
        }
        commonness
    }

    mod commonness {
        use super::*;

        #[test]
        fn ranks_a_lower_rank_as_more_common() {
            let common = commonness(&[(1, Some(FrequencyMode::RankBased), 10.0)]);
            let rare = commonness(&[(1, Some(FrequencyMode::RankBased), 900.0)]);
            assert_eq!(common.compare_shared(&rare), Ordering::Less);
        }

        #[test]
        fn ranks_a_higher_occurrence_count_as_more_common() {
            let common = commonness(&[(1, Some(FrequencyMode::OccurrenceBased), 900.0)]);
            let rare = commonness(&[(1, Some(FrequencyMode::OccurrenceBased), 10.0)]);
            assert_eq!(common.compare_shared(&rare), Ordering::Less);
        }

        #[test]
        fn treats_an_unstated_mode_as_ranks() {
            let common = commonness(&[(1, None, 10.0)]);
            let rare = commonness(&[(1, None, 900.0)]);
            assert_eq!(common.compare_shared(&rare), Ordering::Less);
        }

        #[test]
        fn keeps_the_most_common_value_per_dictionary() {
            let common = commonness(&[(1, None, 900.0), (1, None, 5.0)]);
            let rare = commonness(&[(1, None, 10.0)]);
            assert_eq!(common.compare_shared(&rare), Ordering::Less);
        }

        #[test]
        fn follows_the_earliest_imported_frequency_dictionary_that_lists_both() {
            let first = commonness(&[(1, None, 10.0), (2, None, 900.0)]);
            let second = commonness(&[(1, None, 20.0), (2, None, 1.0)]);
            assert_eq!(first.compare_shared(&second), Ordering::Less);
        }

        #[test]
        fn skips_a_frequency_dictionary_that_lists_only_one_result() {
            let first = commonness(&[(1, None, 1.0), (2, None, 900.0)]);
            let second = commonness(&[(2, None, 10.0)]);
            assert_eq!(first.compare_shared(&second), Ordering::Greater);
        }

        #[test]
        fn finds_no_shared_order_for_results_in_different_dictionaries() {
            let first = commonness(&[(1, None, 1.0)]);
            let second = commonness(&[(2, None, 900.0)]);
            assert_eq!(first.compare_shared(&second), Ordering::Equal);
        }

        #[test]
        fn finds_no_shared_order_for_an_unlisted_result() {
            let listed = commonness(&[(1, None, 1.0)]);
            assert_eq!(
                listed.compare_shared(&Commonness::default()),
                Ordering::Equal
            );
        }

        #[test]
        fn covers_a_listed_result_before_an_unlisted_one() {
            let listed = commonness(&[(1, None, 50_000.0)]);
            assert_eq!(
                listed.compare_coverage(&Commonness::default()),
                Ordering::Less
            );
        }

        #[test]
        fn covers_by_the_earliest_imported_frequency_dictionary() {
            let first = commonness(&[(1, None, 900.0)]);
            let second = commonness(&[(2, None, 1.0)]);
            assert_eq!(first.compare_coverage(&second), Ordering::Less);
        }
    }

    mod result_sort_key {
        use super::*;

        fn key(
            matched_length: usize,
            inflection_count: usize,
            frequency: Option<f64>,
        ) -> ResultSortKey {
            ResultSortKey {
                matched_length,
                inflection_count,
                commonness: frequency
                    .map_or_else(Commonness::default, |value| commonness(&[(1, None, value)])),
                ..ResultSortKey::default()
            }
        }

        #[test]
        fn ranks_a_longer_match_first() {
            assert_eq!(
                key(3, 2, Some(900.0)).compare(&key(2, 0, Some(1.0))),
                Ordering::Less
            );
        }

        #[test]
        fn ranks_a_more_common_result_before_one_with_fewer_inflections() {
            assert_eq!(
                key(2, 1, Some(1.0)).compare(&key(2, 0, Some(900.0))),
                Ordering::Less
            );
        }

        #[test]
        fn ranks_fewer_inflections_first_without_shared_frequencies() {
            assert_eq!(
                key(2, 0, None).compare(&key(2, 1, Some(1.0))),
                Ordering::Less
            );
        }

        #[test]
        fn ranks_an_unchanged_character_before_a_more_common_stem() {
            assert_eq!(
                key(1, 0, Some(900.0)).compare(&key(1, 1, Some(1.0))),
                Ordering::Less
            );
        }

        #[test]
        fn ranks_a_listed_result_before_dictionary_order() {
            let listed = ResultSortKey {
                first_dictionary_rank: 5,
                ..key(2, 0, Some(1.0))
            };
            let early = ResultSortKey {
                first_dictionary_rank: 1,
                ..key(2, 0, None)
            };
            assert_eq!(listed.compare(&early), Ordering::Less);
        }

        #[test]
        fn ranks_an_earlier_dictionary_before_a_higher_score() {
            let early = ResultSortKey {
                first_dictionary_rank: 1,
                ..ResultSortKey::default()
            };
            let scored = ResultSortKey {
                first_dictionary_rank: 2,
                best_score: 100,
                ..ResultSortKey::default()
            };
            assert_eq!(early.compare(&scored), Ordering::Less);
        }

        #[test]
        fn ranks_a_higher_score_last() {
            let scored = ResultSortKey {
                best_score: 100,
                ..ResultSortKey::default()
            };
            assert_eq!(scored.compare(&ResultSortKey::default()), Ordering::Less);
        }
    }
}
