use super::found_rows::{FoundEntry, FoundTermMeta};
use super::lookup_candidate::LookupCandidate;
use super::lookup_result::{DictionaryDefinitions, LookupResult};
use super::result_group::{ResultGroup, group_matches};
use super::result_sort_key::{Commonness, ResultSortKey};
use super::term_meta_matching::{applicable_term_meta, frequencies, pronunciations};
use crate::dictionary::TermMetaData;

/// Matches what storage found against the candidates, groups the matches by term and reading,
/// and ranks the groups from the best result to the worst.
///
/// `found_entries` are the entries stored under the candidates' headwords,
/// and `term_meta` the frequencies and pronunciations stored for the terms of those entries.
pub fn build_lookup_results(
    candidates: &[LookupCandidate],
    found_entries: Vec<FoundEntry>,
    term_meta: &[FoundTermMeta],
) -> Vec<LookupResult> {
    let mut ranked: Vec<(ResultSortKey, LookupResult)> = group_matches(candidates, found_entries)
        .into_iter()
        .map(|group| rank_group(group, term_meta))
        .collect();
    ranked.sort_by(|(left, _), (right, _)| left.compare(right));
    ranked.into_iter().map(|(_, result)| result).collect()
}

fn rank_group(
    mut group: ResultGroup,
    term_meta: &[FoundTermMeta],
) -> (ResultSortKey, LookupResult) {
    group.entries.sort_by(|left, right| {
        (left.dictionary.rank.cmp(&right.dictionary.rank))
            .then_with(|| right.entry.score.cmp(&left.entry.score))
    });
    let applicable = applicable_term_meta(term_meta, &group.term, group.reading.as_deref());
    let sort_key = sort_key(&group, &applicable);
    let result = LookupResult {
        matched_text: group.candidate.matched_text.clone(),
        term: group.term,
        reading: group.reading,
        inflections: group.candidate.deinflection.inflections.clone(),
        definitions: group.entries.into_iter().map(definitions).collect(),
        frequencies: frequencies(&applicable),
        pronunciations: pronunciations(&applicable),
    };
    (sort_key, result)
}

fn sort_key(group: &ResultGroup, term_meta: &[&FoundTermMeta]) -> ResultSortKey {
    let entries = group.entries.iter();
    ResultSortKey {
        matched_length: group.candidate.matched_length(),
        inflection_count: group.candidate.inflection_count(),
        commonness: commonness(term_meta),
        first_dictionary_rank: entries
            .clone()
            .map(|found| found.dictionary.rank)
            .min()
            .unwrap_or(0),
        best_score: entries.map(|found| found.entry.score).max().unwrap_or(0),
    }
}

fn commonness(term_meta: &[&FoundTermMeta]) -> Commonness {
    let mut commonness = Commonness::default();
    for found in term_meta {
        if let TermMetaData::Frequency(frequency) = &found.meta.data {
            if let Some(value) = frequency.value {
                commonness.record(&found.dictionary, value);
            }
        }
    }
    commonness
}

fn definitions(found: FoundEntry) -> DictionaryDefinitions {
    DictionaryDefinitions {
        dictionary_id: found.dictionary.id,
        dictionary_title: found.dictionary.title,
        entry: found.entry,
        tags: found.tags,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::deinflection::Deinflection;
    use crate::dictionary::{DictionaryFormatKind, Frequency, FrequencyMode, TermEntry, TermMeta};
    use crate::lookup::found_rows::DictionaryOrigin;
    use crate::lookup::lookup_candidate::lookup_candidates;

    fn dictionary(rank: i64) -> DictionaryOrigin {
        DictionaryOrigin {
            id: format!("dictionary-{rank}"),
            title: format!("Dictionary {rank}"),
            format: DictionaryFormatKind::Yomitan,
            rank,
            frequency_mode: Some(FrequencyMode::RankBased),
        }
    }

    fn found(rank: i64, term: &str, reading: &str) -> FoundEntry {
        let mut entry = TermEntry::new(term, Vec::new());
        entry.reading = Some(reading.to_string());
        FoundEntry {
            dictionary: dictionary(rank),
            entry_id: rank,
            headword: term.to_string(),
            entry,
            tags: Vec::new(),
        }
    }

    fn scored(mut found: FoundEntry, entry_id: i64, score: i64) -> FoundEntry {
        found.entry_id = entry_id;
        found.entry.score = score;
        found
    }

    fn frequency(rank: i64, term: &str, reading: &str, value: f64) -> FoundTermMeta {
        FoundTermMeta {
            dictionary: dictionary(rank),
            meta: TermMeta {
                term: term.to_string(),
                reading: Some(reading.to_string()),
                data: TermMetaData::Frequency(Frequency {
                    value: Some(value),
                    display: None,
                }),
            },
        }
    }

    fn readings(results: &[LookupResult]) -> Vec<Option<String>> {
        results
            .iter()
            .map(|result| result.reading.clone())
            .collect()
    }

    fn eaten() -> LookupCandidate {
        LookupCandidate {
            matched_text: "食べた".to_string(),
            deinflection: Deinflection {
                term: "食べる".to_string(),
                word_classes: vec!["v1".to_string()],
                inflections: vec!["past".to_string()],
            },
        }
    }

    fn verb(word_class: &str) -> FoundEntry {
        let mut found = found(1, "食べる", "たべる");
        found.entry.word_classes = vec![word_class.to_string()];
        found
    }

    #[test]
    fn ranks_the_longest_match_first() {
        let candidates = lookup_candidates("猫舌だ", "ja");
        let entries = vec![found(1, "猫", "ねこ"), found(1, "猫舌", "ねこじた")];
        let results = build_lookup_results(&candidates, entries, &[]);
        assert_eq!(results[0].term, "猫舌");
    }

    #[test]
    fn ranks_a_more_common_reading_first() {
        let candidates = lookup_candidates("角", "ja");
        let entries = vec![found(1, "角", "かど"), found(1, "角", "つの")];
        let meta = vec![
            frequency(9, "角", "かど", 500.0),
            frequency(9, "角", "つの", 10.0),
        ];
        let results = build_lookup_results(&candidates, entries, &meta);
        assert_eq!(readings(&results)[0].as_deref(), Some("つの"));
    }

    #[test]
    fn ranks_by_dictionary_import_order_without_frequencies() {
        let candidates = lookup_candidates("角", "ja");
        let entries = vec![found(2, "角", "かど"), found(1, "角", "つの")];
        let results = build_lookup_results(&candidates, entries, &[]);
        assert_eq!(readings(&results)[0].as_deref(), Some("つの"));
    }

    #[test]
    fn ranks_a_higher_score_first_within_one_dictionary() {
        let candidates = lookup_candidates("角", "ja");
        let entries = vec![
            scored(found(1, "角", "かど"), 1, 0),
            scored(found(1, "角", "つの"), 2, 5),
        ];
        let results = build_lookup_results(&candidates, entries, &[]);
        assert_eq!(readings(&results)[0].as_deref(), Some("つの"));
    }

    #[test]
    fn orders_the_definitions_of_a_result_by_dictionary_import_order() {
        let candidates = lookup_candidates("猫", "ja");
        let entries = vec![found(2, "猫", "ねこ"), found(1, "猫", "ねこ")];
        let results = build_lookup_results(&candidates, entries, &[]);
        assert_eq!(results[0].definitions[0].dictionary_id, "dictionary-1");
    }

    #[test]
    fn attaches_the_frequencies_of_the_reading() {
        let candidates = lookup_candidates("猫", "ja");
        let meta = vec![frequency(9, "猫", "ねこ", 10.0)];
        let results = build_lookup_results(&candidates, vec![found(1, "猫", "ねこ")], &meta);
        assert_eq!(results[0].frequencies.len(), 1);
    }

    #[test]
    fn reports_the_inflections_undone() {
        let results = build_lookup_results(&[eaten()], vec![verb("v1")], &[]);
        assert_eq!(results[0].inflections, vec!["past"]);
    }

    #[test]
    fn reports_the_matched_text() {
        let results = build_lookup_results(&[eaten()], vec![verb("v1")], &[]);
        assert_eq!(results[0].matched_text, "食べた");
    }

    #[test]
    fn leaves_out_an_entry_of_the_wrong_word_class() {
        let results = build_lookup_results(&[eaten()], vec![verb("v5")], &[]);
        assert!(results.is_empty());
    }
}
