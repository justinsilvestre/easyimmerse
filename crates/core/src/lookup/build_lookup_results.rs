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
        inflection_chains: group.inflection_chains,
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
        matches_exactly: matches_exactly(group),
        inflection_count: group.candidate.inflection_count(),
        is_bare_form: group.candidate.is_bare_form,
        is_fallback: group.candidate.is_fallback(),
        commonness: commonness(term_meta),
        first_dictionary_rank: entries
            .clone()
            .map(|found| found.dictionary.rank)
            .min()
            .unwrap_or(0),
        best_score: entries.map(|found| found.entry.score).max().unwrap_or(0),
    }
}

fn matches_exactly(group: &ResultGroup) -> bool {
    let searched = group.candidate.deinflection.term.as_str();
    group
        .entries
        .iter()
        .any(|found| found.entry.headwords().contains(&searched))
}

fn commonness(term_meta: &[&FoundTermMeta]) -> Commonness {
    let mut commonness = Commonness::default();
    for found in term_meta {
        if let TermMetaData::Frequency(frequency) = &found.meta.data
            && let Some(value) = frequency.value
        {
            commonness.record(&found.dictionary, value);
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
    use crate::lookup::fold_case;
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
            folded_headword: fold_case(term),
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
            is_bare_form: false,
        }
    }

    fn verb(word_class: &str) -> FoundEntry {
        let mut found = found(1, "食べる", "たべる");
        found.entry.word_classes = vec![word_class.to_string()];
        found
    }

    fn classed(word_class: &str, mut found: FoundEntry) -> FoundEntry {
        found.entry.word_classes = vec![word_class.to_string()];
        found
    }

    fn terms(results: &[LookupResult]) -> Vec<&str> {
        results.iter().map(|result| result.term.as_str()).collect()
    }

    /// The noun 書き and the verb 書く, either of which 書きながら may begin with.
    fn kaki_entries() -> Vec<FoundEntry> {
        vec![
            classed("n", found(1, "書き", "かき")),
            classed("v5", found(1, "書く", "かく")),
        ]
    }

    #[test]
    fn ranks_the_more_common_of_two_matches_of_equal_length_first() {
        let candidates = lookup_candidates("書きながら", "ja");
        let meta = vec![
            frequency(9, "書き", "かき", 20_000.0),
            frequency(9, "書く", "かく", 800.0),
        ];
        let results = build_lookup_results(&candidates, kaki_entries(), &meta);
        assert_eq!(terms(&results), vec!["書く", "書き"]);
    }

    #[test]
    fn ranks_fewer_inflections_first_without_frequencies() {
        let candidates = lookup_candidates("書きながら", "ja");
        let results = build_lookup_results(&candidates, kaki_entries(), &[]);
        assert_eq!(terms(&results), vec!["書き", "書く"]);
    }

    #[test]
    fn ranks_fewer_inflections_first_when_only_one_match_has_a_frequency() {
        let candidates = lookup_candidates("書きながら", "ja");
        let meta = vec![frequency(9, "書く", "かく", 800.0)];
        let results = build_lookup_results(&candidates, kaki_entries(), &meta);
        assert_eq!(terms(&results), vec!["書き", "書く"]);
    }

    #[test]
    fn ranks_a_listed_verb_before_the_more_common_verb_it_may_be_the_causative_of() {
        let candidates = lookup_candidates("動かす", "ja");
        let entries = vec![
            classed("v5", found(1, "動く", "うごく")),
            classed("v5", found(1, "動かす", "うごかす")),
        ];
        let meta = vec![
            frequency(9, "動く", "うごく", 300.0),
            frequency(9, "動かす", "うごかす", 2_000.0),
        ];
        let results = build_lookup_results(&candidates, entries, &meta);
        assert_eq!(terms(&results), vec!["動かす", "動く"]);
    }

    #[test]
    fn ranks_a_listed_verb_before_the_more_common_verb_it_may_be_the_potential_of() {
        let candidates = lookup_candidates("切れる", "ja");
        let entries = vec![
            classed("v5", found(1, "切る", "きる")),
            classed("v1", found(1, "切れる", "きれる")),
        ];
        let meta = vec![
            frequency(9, "切る", "きる", 400.0),
            frequency(9, "切れる", "きれる", 3_000.0),
        ];
        let results = build_lookup_results(&candidates, entries, &meta);
        assert_eq!(terms(&results), vec!["切れる", "切る"]);
    }

    /// The verbs 行く and 行ける, whose imperative and continuative are both 行け.
    fn ike_entries(iku_rank: i64, ikeru_rank: i64) -> Vec<FoundEntry> {
        vec![
            classed("v1", scored(found(ikeru_rank, "行ける", "いける"), 1, 0)),
            classed("v5", scored(found(iku_rank, "行く", "いく"), 2, 0)),
        ]
    }

    #[test]
    fn ranks_the_more_common_of_an_imperative_and_a_continuative_first() {
        let candidates = lookup_candidates("行け", "ja");
        let meta = vec![
            frequency(9, "行く", "いく", 50.0),
            frequency(9, "行ける", "いける", 3_000.0),
        ];
        let results = build_lookup_results(&candidates, ike_entries(1, 1), &meta);
        assert_eq!(terms(&results), vec!["行く", "行ける"]);
    }

    #[test]
    fn reports_the_imperative_of_iku_for_ike() {
        let candidates = lookup_candidates("行け", "ja");
        let meta = vec![
            frequency(9, "行く", "いく", 50.0),
            frequency(9, "行ける", "いける", 3_000.0),
        ];
        let results = build_lookup_results(&candidates, ike_entries(1, 1), &meta);
        assert_eq!(results[0].inflection_chains, vec![vec!["imperative"]]);
    }

    #[test]
    fn ranks_an_imperative_and_a_continuative_by_dictionary_order_without_frequencies() {
        let candidates = lookup_candidates("行け", "ja");
        let results = build_lookup_results(&candidates, ike_entries(1, 2), &[]);
        assert_eq!(terms(&results), vec!["行く", "行ける"]);
    }

    #[test]
    fn ranks_a_continuative_from_an_earlier_dictionary_first_without_frequencies() {
        let candidates = lookup_candidates("行け", "ja");
        let results = build_lookup_results(&candidates, ike_entries(2, 1), &[]);
        assert_eq!(terms(&results), vec!["行ける", "行く"]);
    }

    /// Two entries that fold to the same headword, as ß folds to ss.
    fn masse_entries() -> Vec<FoundEntry> {
        vec![
            scored(found(1, "Masse", "Masse"), 1, 0),
            scored(found(1, "Maße", "Maße"), 2, 0),
        ]
    }

    #[test]
    fn ranks_the_exact_spelling_first_for_eszett() {
        let candidates = lookup_candidates("Maße", "de");
        let results = build_lookup_results(&candidates, masse_entries(), &[]);
        assert_eq!(terms(&results), vec!["Maße", "Masse"]);
    }

    #[test]
    fn ranks_the_exact_spelling_first_for_double_s() {
        let candidates = lookup_candidates("Masse", "de");
        let mut entries = masse_entries();
        entries.reverse();
        let results = build_lookup_results(&candidates, entries, &[]);
        assert_eq!(terms(&results), vec!["Masse", "Maße"]);
    }

    #[test]
    fn ranks_the_exact_spelling_before_a_more_common_folded_one() {
        let candidates = lookup_candidates("Maße", "de");
        let meta = vec![
            frequency(9, "Masse", "Masse", 10.0),
            frequency(9, "Maße", "Maße", 5_000.0),
        ];
        let results = build_lookup_results(&candidates, masse_entries(), &meta);
        assert_eq!(terms(&results), vec!["Maße", "Masse"]);
    }

    /// The noun Essen and the verb essen, which differ only in case.
    fn essen_entries() -> Vec<FoundEntry> {
        vec![
            scored(found(1, "essen", "essen"), 1, 0),
            scored(found(1, "Essen", "Essen"), 2, 0),
        ]
    }

    #[test]
    fn ranks_the_noun_spelled_as_matched_before_the_verb() {
        let candidates = lookup_candidates("Essen", "de");
        let results = build_lookup_results(&candidates, essen_entries(), &[]);
        assert_eq!(terms(&results), vec!["Essen", "essen"]);
    }

    #[test]
    fn finds_a_capitalized_noun_from_a_lowercase_sentence_start() {
        let candidates = lookup_candidates("hund", "de");
        let entries = vec![found(1, "Hund", "Hund")];
        let results = build_lookup_results(&candidates, entries, &[]);
        assert_eq!(terms(&results), vec!["Hund"]);
    }

    #[test]
    fn ranks_the_verb_spelled_as_matched_before_the_noun() {
        let candidates = lookup_candidates("essen", "de");
        let results = build_lookup_results(&candidates, essen_entries(), &[]);
        assert_eq!(terms(&results), vec!["essen", "Essen"]);
    }

    /// The pointer on し in 雨だし looks up the text し.
    #[test]
    fn ranks_the_particle_shi_in_ame_da_shi_before_the_more_common_suru() {
        let candidates = lookup_candidates("し", "ja");
        let entries = vec![
            classed("vs", found(1, "する", "する")),
            classed("prt", found(1, "し", "し")),
        ];
        let meta = vec![
            frequency(9, "する", "する", 10.0),
            frequency(9, "し", "し", 5_000.0),
        ];
        let results = build_lookup_results(&candidates, entries, &meta);
        assert_eq!(terms(&results), vec!["し", "する"]);
    }

    #[test]
    fn ranks_the_longest_match_first() {
        let candidates = lookup_candidates("猫舌だ", "ja");
        let entries = vec![found(1, "猫", "ねこ"), found(1, "猫舌", "ねこじた")];
        let results = build_lookup_results(&candidates, entries, &[]);
        assert_eq!(results[0].term, "猫舌");
    }

    /// 日本 read にほん and にっぽん, with a frequency and a pitch accent for each reading.
    fn nihon_results() -> Vec<LookupResult> {
        let candidates = lookup_candidates("日本", "ja");
        let entries = vec![
            scored(found(1, "日本", "にっぽん"), 1, 0),
            scored(found(1, "日本", "にほん"), 2, 0),
        ];
        let mut pitch = frequency(8, "日本", "にっぽん", 0.0);
        pitch.meta.data = TermMetaData::Pitch {
            pitches: Vec::new(),
        };
        let meta = vec![
            frequency(9, "日本", "にっぽん", 9_000.0),
            frequency(9, "日本", "にほん", 40.0),
            pitch,
        ];
        build_lookup_results(&candidates, entries, &meta)
    }

    fn frequency_values(result: &LookupResult) -> Vec<Option<f64>> {
        result
            .frequencies
            .iter()
            .map(|found| found.frequency.value)
            .collect()
    }

    #[test]
    fn ranks_the_more_common_reading_of_a_term_first() {
        assert_eq!(
            readings(&nihon_results()),
            vec![Some("にほん".to_string()), Some("にっぽん".to_string())]
        );
    }

    #[test]
    fn attaches_only_the_frequency_of_the_first_reading() {
        assert_eq!(frequency_values(&nihon_results()[0]), vec![Some(40.0)]);
    }

    #[test]
    fn attaches_only_the_frequency_of_the_second_reading() {
        assert_eq!(frequency_values(&nihon_results()[1]), vec![Some(9_000.0)]);
    }

    #[test]
    fn leaves_out_the_pitch_accent_of_another_reading() {
        assert!(nihon_results()[0].pronunciations.is_empty());
    }

    #[test]
    fn attaches_the_pitch_accent_of_the_reading() {
        assert_eq!(nihon_results()[1].pronunciations.len(), 1);
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
        assert_eq!(results[0].inflection_chains, vec![vec!["past"]]);
    }

    #[test]
    fn reports_both_the_passive_and_the_potential_after_a_causative() {
        let candidates = lookup_candidates("食べさせられなかった", "ja");
        let results = build_lookup_results(&candidates, vec![verb("v1")], &[]);
        assert_eq!(
            results[0].inflection_chains,
            vec![
                vec!["past", "negative", "passive", "causative"],
                vec!["past", "negative", "potential", "causative"],
            ]
        );
    }

    #[test]
    fn reports_a_single_chain_when_only_one_analysis_fits() {
        let candidates = lookup_candidates("食べさせた", "ja");
        let results = build_lookup_results(&candidates, vec![verb("v1")], &[]);
        assert_eq!(
            results[0].inflection_chains,
            vec![vec!["past", "causative"]]
        );
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
