use super::found_rows::{FoundKanji, FoundKanjiMeta};
use super::lookup_result::{DictionaryFrequency, KanjiResult};

/// Reports whether a character is a CJK ideograph, which kanji dictionaries describe.
pub fn is_kanji(character: char) -> bool {
    matches!(
        character,
        '\u{3400}'..='\u{4DBF}' | '\u{4E00}'..='\u{9FFF}' | '\u{F900}'..='\u{FAFF}' | '\u{20000}'..='\u{3134F}'
    )
}

/// Pairs each found kanji entry with every frequency stored for its character,
/// both in dictionary import order.
pub fn build_kanji_results(
    mut found_kanji: Vec<FoundKanji>,
    kanji_meta: &[FoundKanjiMeta],
) -> Vec<KanjiResult> {
    found_kanji.sort_by_key(|found| found.dictionary.rank);
    found_kanji
        .into_iter()
        .map(|found| KanjiResult {
            frequencies: frequencies(kanji_meta, &found.entry.character),
            dictionary_id: found.dictionary.id,
            dictionary_title: found.dictionary.title,
            entry: found.entry,
            tags: found.tags,
        })
        .collect()
}

fn frequencies(kanji_meta: &[FoundKanjiMeta], character: &str) -> Vec<DictionaryFrequency> {
    let mut applicable: Vec<&FoundKanjiMeta> = kanji_meta
        .iter()
        .filter(|found| found.meta.character == character)
        .collect();
    applicable.sort_by_key(|found| found.dictionary.rank);
    applicable
        .into_iter()
        .map(|found| DictionaryFrequency {
            dictionary_id: found.dictionary.id.clone(),
            dictionary_title: found.dictionary.title.clone(),
            reading: None,
            frequency: found.meta.frequency.clone(),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::*;
    use crate::dictionary::{DictionaryFormatKind, Frequency, KanjiEntry, KanjiMeta};
    use crate::lookup::found_rows::DictionaryOrigin;

    fn dictionary(rank: i64) -> DictionaryOrigin {
        DictionaryOrigin {
            id: format!("dictionary-{rank}"),
            title: format!("Dictionary {rank}"),
            format: DictionaryFormatKind::Yomitan,
            rank,
            frequency_mode: None,
        }
    }

    fn kanji(rank: i64, character: &str) -> FoundKanji {
        FoundKanji {
            dictionary: dictionary(rank),
            entry: KanjiEntry {
                character: character.to_string(),
                onyomi: Vec::new(),
                kunyomi: Vec::new(),
                tags: Vec::new(),
                meanings: Vec::new(),
                stats: BTreeMap::new(),
            },
            tags: Vec::new(),
        }
    }

    fn kanji_frequency(character: &str) -> FoundKanjiMeta {
        FoundKanjiMeta {
            dictionary: dictionary(5),
            meta: KanjiMeta {
                character: character.to_string(),
                frequency: Frequency {
                    value: Some(3.0),
                    display: None,
                },
            },
        }
    }

    #[test]
    fn recognizes_a_kanji() {
        assert!(is_kanji('猫'));
    }

    #[test]
    fn does_not_take_kana_for_a_kanji() {
        assert!(!is_kanji('ね'));
    }

    #[test]
    fn orders_kanji_entries_by_dictionary_import_order() {
        let results = build_kanji_results(vec![kanji(2, "猫"), kanji(1, "猫")], &[]);
        assert_eq!(results[0].dictionary_id, "dictionary-1");
    }

    #[test]
    fn attaches_the_frequencies_of_the_character() {
        let meta = vec![kanji_frequency("猫"), kanji_frequency("犬")];
        let results = build_kanji_results(vec![kanji(1, "猫")], &meta);
        assert_eq!(results[0].frequencies.len(), 1);
    }
}
