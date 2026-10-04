use std::collections::HashMap;

use super::super::term_entry::TermEntry;

/// Collects entries in file order, merging those that share a term and a reading.
#[derive(Default)]
pub struct EntryMerger {
    entries: Vec<TermEntry>,
    positions: HashMap<(String, Option<String>), usize>,
}

impl EntryMerger {
    pub fn add(&mut self, entry: TermEntry) {
        let key = (entry.term.clone(), entry.reading.clone());
        match self.positions.get(&key) {
            Some(&position) => merge_into(&mut self.entries[position], entry),
            None => {
                self.positions.insert(key, self.entries.len());
                self.entries.push(entry);
            }
        }
    }

    pub fn into_entries(self) -> Vec<TermEntry> {
        self.entries
    }
}

fn merge_into(existing: &mut TermEntry, entry: TermEntry) {
    existing.definitions.extend(entry.definitions);
    extend_distinct(&mut existing.alternates, entry.alternates);
    extend_distinct(&mut existing.definition_tags, entry.definition_tags);
}

fn extend_distinct(items: &mut Vec<String>, new_items: Vec<String>) {
    for item in new_items {
        if !items.contains(&item) {
            items.push(item);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::super::super::term_entry::Definition;
    use super::*;

    #[test]
    fn merges_entries_with_the_same_term_and_reading() {
        let mut merger = EntryMerger::default();
        merger.add(TermEntry::new("cat", vec![Definition::text("a pet")]));
        merger.add(TermEntry::new("dog", vec![Definition::text("a pet")]));
        merger.add(TermEntry::new(
            "cat",
            vec![Definition::text("a lion's cousin")],
        ));
        assert_eq!(
            merger.into_entries()[0].definitions,
            vec![
                Definition::text("a pet"),
                Definition::text("a lion's cousin")
            ]
        );
    }

    #[test]
    fn keeps_entries_with_different_readings_apart() {
        let mut merger = EntryMerger::default();
        let reading = |text: &str| TermEntry {
            reading: Some(text.into()),
            ..TermEntry::new("生", vec![Definition::text("x")])
        };
        merger.add(reading("せい"));
        merger.add(reading("なま"));
        assert_eq!(merger.into_entries().len(), 2);
    }
}
