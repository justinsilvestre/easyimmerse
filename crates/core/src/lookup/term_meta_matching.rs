use super::found_rows::FoundTermMeta;
use super::lookup_result::{DictionaryFrequency, DictionaryPronunciation};
use crate::dictionary::TermMetaData;

/// Lists the term meta that applies to a term and reading, in dictionary import order.
///
/// Meta without a reading applies to every reading.
/// An entry without a reading is written in kana, so meta whose reading equals the term applies to it too.
pub fn applicable_term_meta<'a>(
    term_meta: &'a [FoundTermMeta],
    term: &str,
    reading: Option<&str>,
) -> Vec<&'a FoundTermMeta> {
    let mut applicable: Vec<&FoundTermMeta> = term_meta
        .iter()
        .filter(|found| found.meta.term == term)
        .filter(|found| match found.meta.reading.as_deref() {
            None => true,
            Some(meta_reading) => Some(meta_reading) == reading.or(Some(term)),
        })
        .collect();
    applicable.sort_by_key(|found| found.dictionary.rank);
    applicable
}

pub fn frequencies(term_meta: &[&FoundTermMeta]) -> Vec<DictionaryFrequency> {
    term_meta
        .iter()
        .filter_map(|found| match &found.meta.data {
            TermMetaData::Frequency(frequency) => Some(DictionaryFrequency {
                dictionary_id: found.dictionary.id.clone(),
                dictionary_title: found.dictionary.title.clone(),
                reading: found.meta.reading.clone(),
                frequency: frequency.clone(),
            }),
            _ => None,
        })
        .collect()
}

pub fn pronunciations(term_meta: &[&FoundTermMeta]) -> Vec<DictionaryPronunciation> {
    term_meta
        .iter()
        .filter(|found| !matches!(found.meta.data, TermMetaData::Frequency(_)))
        .map(|found| DictionaryPronunciation {
            dictionary_id: found.dictionary.id.clone(),
            dictionary_title: found.dictionary.title.clone(),
            reading: found.meta.reading.clone(),
            data: found.meta.data.clone(),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::{DictionaryFormatKind, Frequency, TermMeta};
    use crate::lookup::found_rows::DictionaryOrigin;

    fn frequency_meta(rank: i64, term: &str, reading: Option<&str>) -> FoundTermMeta {
        FoundTermMeta {
            dictionary: DictionaryOrigin {
                id: rank.to_string(),
                title: "Frequencies".to_string(),
                format: DictionaryFormatKind::Yomitan,
                rank,
                frequency_mode: None,
            },
            meta: TermMeta {
                term: term.to_string(),
                reading: reading.map(String::from),
                data: TermMetaData::Frequency(Frequency {
                    value: Some(1.0),
                    display: None,
                }),
            },
        }
    }

    fn pitch_meta(term: &str) -> FoundTermMeta {
        let mut found = frequency_meta(1, term, None);
        found.meta.data = TermMetaData::Pitch {
            pitches: Vec::new(),
        };
        found
    }

    #[test]
    fn applies_meta_without_a_reading_to_every_reading() {
        let meta = vec![frequency_meta(1, "角", None)];
        assert_eq!(applicable_term_meta(&meta, "角", Some("かど")).len(), 1);
    }

    #[test]
    fn applies_meta_for_the_same_reading() {
        let meta = vec![frequency_meta(1, "角", Some("かど"))];
        assert_eq!(applicable_term_meta(&meta, "角", Some("かど")).len(), 1);
    }

    #[test]
    fn skips_meta_for_another_reading() {
        let meta = vec![frequency_meta(1, "角", Some("つの"))];
        assert!(applicable_term_meta(&meta, "角", Some("かど")).is_empty());
    }

    #[test]
    fn skips_meta_for_another_term() {
        let meta = vec![frequency_meta(1, "犬", None)];
        assert!(applicable_term_meta(&meta, "角", None).is_empty());
    }

    #[test]
    fn applies_meta_read_as_the_term_to_an_entry_without_a_reading() {
        let meta = vec![frequency_meta(1, "ねこ", Some("ねこ"))];
        assert_eq!(applicable_term_meta(&meta, "ねこ", None).len(), 1);
    }

    #[test]
    fn orders_meta_by_dictionary_import_order() {
        let meta = vec![frequency_meta(2, "猫", None), frequency_meta(1, "猫", None)];
        assert_eq!(
            applicable_term_meta(&meta, "猫", None)[0].dictionary.rank,
            1
        );
    }

    #[test]
    fn keeps_only_frequencies_as_frequencies() {
        let meta = [frequency_meta(1, "猫", None), pitch_meta("猫")];
        assert_eq!(frequencies(&meta.iter().collect::<Vec<_>>()).len(), 1);
    }

    #[test]
    fn keeps_pitch_accents_as_pronunciations() {
        let meta = [frequency_meta(1, "猫", None), pitch_meta("猫")];
        let pronunciations = pronunciations(&meta.iter().collect::<Vec<_>>());
        assert_eq!(pronunciations[0].data, pitch_meta("猫").meta.data);
    }
}
