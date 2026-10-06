use std::collections::HashMap;

use super::idx::IdxRecord;
use super::syn::SynRecord;

/// Groups the `.idx` records that share one entry, so that each entry is imported once with its other headwords as alternates.
///
/// Records that point at the same offset and size share an entry, and so do `.syn` synonyms of any of them.
/// The first record of a group in index order supplies the entry's term.
pub struct HeadwordGroups {
    first_record_of: Vec<usize>,
    alternates: HashMap<usize, Vec<String>>,
}

impl HeadwordGroups {
    /// Groups the records. Synonyms that point past the end of the index are ignored.
    pub fn new(records: &[IdxRecord], synonyms: Vec<SynRecord>) -> Self {
        let mut groups = Self {
            first_record_of: first_records_by_location(records),
            alternates: HashMap::new(),
        };
        for (index, record) in records.iter().enumerate() {
            groups.add_alternate(records, index, record.word.clone());
        }
        for synonym in synonyms {
            groups.add_alternate(records, synonym.index, synonym.word);
        }
        groups
    }

    pub fn is_first_of_group(&self, index: usize) -> bool {
        self.first_record_of.get(index) == Some(&index)
    }

    /// Removes and returns the alternates of the group whose first record is at this index.
    pub fn take_alternates(&mut self, index: usize) -> Vec<String> {
        self.alternates.remove(&index).unwrap_or_default()
    }

    fn add_alternate(&mut self, records: &[IdxRecord], index: usize, word: String) {
        let Some(&first) = self.first_record_of.get(index) else {
            return;
        };
        let alternates = self.alternates.entry(first).or_default();
        if word != records[first].word && !alternates.contains(&word) {
            alternates.push(word);
        }
    }
}

fn first_records_by_location(records: &[IdxRecord]) -> Vec<usize> {
    let mut first_by_location = HashMap::new();
    records
        .iter()
        .enumerate()
        .map(|(index, record)| {
            *first_by_location
                .entry((record.offset, record.size))
                .or_insert(index)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn record(word: &str, offset: u64) -> IdxRecord {
        IdxRecord {
            word: word.to_string(),
            offset,
            size: 4,
        }
    }

    fn synonym(word: &str, index: usize) -> SynRecord {
        SynRecord {
            word: word.to_string(),
            index,
        }
    }

    fn records() -> Vec<IdxRecord> {
        vec![record("Apple", 0), record("apple", 0), record("cat", 4)]
    }

    #[test]
    fn makes_records_sharing_data_alternates_of_the_first() {
        let mut groups = HeadwordGroups::new(&records(), vec![]);
        assert_eq!(groups.take_alternates(0), vec!["apple"]);
    }

    #[test]
    fn leaves_a_record_sharing_earlier_data_out_of_the_entries() {
        let groups = HeadwordGroups::new(&records(), vec![]);
        assert!(!groups.is_first_of_group(1));
    }

    #[test]
    fn adds_synonyms_to_the_group_of_the_record_they_point_at() {
        let synonyms = vec![synonym("apples", 1)];
        let mut groups = HeadwordGroups::new(&records(), synonyms);
        assert_eq!(groups.take_alternates(0), vec!["apple", "apples"]);
    }

    #[test]
    fn skips_a_synonym_equal_to_the_term() {
        let mut groups = HeadwordGroups::new(&records(), vec![synonym("cat", 2)]);
        assert!(groups.take_alternates(2).is_empty());
    }

    #[test]
    fn ignores_a_synonym_pointing_past_the_index() {
        let mut groups = HeadwordGroups::new(&records(), vec![synonym("dog", 9)]);
        assert!(groups.take_alternates(2).is_empty());
    }
}
