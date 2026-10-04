use std::cmp::Ordering;
use std::collections::BTreeMap;

use super::found_rows::DictionaryOrigin;
use crate::dictionary::FrequencyMode;

/// What lookup results are ranked by, most significant first.
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
    /// Orders keys from the best result to the worst.
    pub fn compare(&self, other: &Self) -> Ordering {
        other
            .matched_length
            .cmp(&self.matched_length)
            .then_with(|| self.inflection_count.cmp(&other.inflection_count))
            .then_with(|| self.commonness.compare(&other.commonness))
            .then_with(|| self.first_dictionary_rank.cmp(&other.first_dictionary_rank))
            .then_with(|| other.best_score.cmp(&self.best_score))
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

    /// Compares by the earliest imported frequency dictionary that knows either result.
    /// A result that the dictionary lists comes before one it does not.
    pub fn compare(&self, other: &Self) -> Ordering {
        let earliest = self.0.keys().chain(other.0.keys()).min();
        match earliest.map(|rank| (self.0.get(rank), other.0.get(rank))) {
            Some((Some(mine), Some(theirs))) => mine.total_cmp(theirs),
            Some((Some(_), None)) => Ordering::Less,
            Some((None, Some(_))) => Ordering::Greater,
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

    #[test]
    fn ranks_a_lower_rank_as_more_common() {
        let common = commonness(&[(1, Some(FrequencyMode::RankBased), 10.0)]);
        let rare = commonness(&[(1, Some(FrequencyMode::RankBased), 900.0)]);
        assert_eq!(common.compare(&rare), Ordering::Less);
    }

    #[test]
    fn ranks_a_higher_occurrence_count_as_more_common() {
        let common = commonness(&[(1, Some(FrequencyMode::OccurrenceBased), 900.0)]);
        let rare = commonness(&[(1, Some(FrequencyMode::OccurrenceBased), 10.0)]);
        assert_eq!(common.compare(&rare), Ordering::Less);
    }

    #[test]
    fn treats_an_unstated_mode_as_ranks() {
        let common = commonness(&[(1, None, 10.0)]);
        let rare = commonness(&[(1, None, 900.0)]);
        assert_eq!(common.compare(&rare), Ordering::Less);
    }

    #[test]
    fn keeps_the_most_common_value_per_dictionary() {
        let common = commonness(&[(1, None, 900.0), (1, None, 5.0)]);
        let rare = commonness(&[(1, None, 10.0)]);
        assert_eq!(common.compare(&rare), Ordering::Less);
    }

    #[test]
    fn ranks_a_listed_result_before_an_unlisted_one() {
        let listed = commonness(&[(1, None, 50_000.0)]);
        assert_eq!(listed.compare(&Commonness::default()), Ordering::Less);
    }

    #[test]
    fn follows_the_earliest_imported_frequency_dictionary() {
        let first = commonness(&[(1, None, 10.0), (2, None, 900.0)]);
        let second = commonness(&[(1, None, 20.0), (2, None, 1.0)]);
        assert_eq!(first.compare(&second), Ordering::Less);
    }

    #[test]
    fn ranks_a_longer_match_first() {
        let longer = ResultSortKey {
            matched_length: 3,
            inflection_count: 2,
            ..ResultSortKey::default()
        };
        let shorter = ResultSortKey {
            matched_length: 2,
            ..ResultSortKey::default()
        };
        assert_eq!(longer.compare(&shorter), Ordering::Less);
    }

    #[test]
    fn ranks_fewer_inflections_before_commonness() {
        let plain = ResultSortKey::default();
        let inflected = ResultSortKey {
            inflection_count: 1,
            commonness: commonness(&[(1, None, 1.0)]),
            ..ResultSortKey::default()
        };
        assert_eq!(plain.compare(&inflected), Ordering::Less);
    }

    #[test]
    fn ranks_commonness_before_dictionary_order() {
        let common = ResultSortKey {
            commonness: commonness(&[(1, None, 1.0)]),
            first_dictionary_rank: 5,
            ..ResultSortKey::default()
        };
        let early = ResultSortKey {
            first_dictionary_rank: 1,
            ..ResultSortKey::default()
        };
        assert_eq!(common.compare(&early), Ordering::Less);
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
