//! Checks alternates that a format adds to entries it has already stored, as MDict does for redirects.

use easyimmerse_core::dictionary::{
    Definition, DictionaryError, DictionaryFormatKind, DictionaryMetadata, DictionarySink,
    TermEntry,
};
use easyimmerse_core::lookup::FoundEntry;

use super::importer::import_with;
use crate::Storage;

/// Imports a dictionary titled `title` with one entry for `term`, then adds `alternate` to it.
fn import_with_alternate(storage: &Storage, title: &str, term: &str, alternate: Option<&str>) {
    let read = |sink: &mut dyn DictionarySink| -> Result<(), DictionaryError> {
        sink.begin(DictionaryMetadata::new(title, DictionaryFormatKind::Mdict))?;
        sink.term_entry(TermEntry::new(term, vec![Definition::text("a feline")]))?;
        if let Some(alternate) = alternate {
            sink.term_alternates(term.to_string(), vec![alternate.to_string()])?;
        }
        Ok(())
    };
    storage
        .write(|conn| import_with(conn, 1_000, read))
        .unwrap();
}

fn find(storage: &Storage, headword: &str) -> Vec<FoundEntry> {
    storage
        .find_dictionary_entries(&[headword.to_string()])
        .unwrap()
}

#[test]
fn finds_an_entry_by_an_alternate_added_after_it() {
    let storage = Storage::open_in_memory().unwrap();
    import_with_alternate(&storage, "Cats", "Cat", Some("puss"));
    assert_eq!(find(&storage, "Puss")[0].entry.term, "Cat");
}

#[test]
fn stores_an_alternate_added_after_the_entry_with_the_entry() {
    let storage = Storage::open_in_memory().unwrap();
    import_with_alternate(&storage, "Cats", "Cat", Some("puss"));
    assert_eq!(find(&storage, "cat")[0].entry.alternates, ["puss"]);
}

#[test]
fn adds_alternates_only_to_the_entries_of_the_dictionary_being_imported() {
    let storage = Storage::open_in_memory().unwrap();
    import_with_alternate(&storage, "Earlier", "Cat", None);
    import_with_alternate(&storage, "Later", "Cat", Some("puss"));
    let titles: Vec<String> = find(&storage, "puss")
        .into_iter()
        .map(|found| found.dictionary.title)
        .collect();
    assert_eq!(titles, ["Later"]);
}
