//! Checks that lookups on a database file run while an import holds the writer.

use std::sync::mpsc::{Receiver, Sender, channel};
use std::thread;
use std::time::Duration;

use easyimmerse_core::dictionary::{
    Definition, DictionaryError, DictionaryFormatKind, DictionaryMetadata, DictionarySink,
    TermEntry,
};
use easyimmerse_core::lookup::FoundEntry;

use super::importer::import_with;
use crate::{Storage, StorageError};

/// How long a lookup may take before the test takes it to be waiting for the import.
const LOOKUP_DEADLINE: Duration = Duration::from_secs(5);

fn open_file_storage(dir: &tempfile::TempDir) -> Storage {
    Storage::open(&dir.path().join("test.sqlite")).unwrap()
}

/// Imports one entry for `term`, then ends the import with the outcome sent through `finish`.
fn import_paused(
    storage: &Storage,
    term: &str,
    started: Sender<()>,
    finish: Receiver<Result<(), DictionaryError>>,
) -> Result<(), StorageError> {
    let read = |sink: &mut dyn DictionarySink| {
        sink.begin(DictionaryMetadata::new(
            term,
            DictionaryFormatKind::Stardict,
        ))?;
        sink.term_entry(TermEntry::new(term, vec![Definition::text("a word")]))?;
        let _ = started.send(());
        finish.recv().unwrap_or(Ok(()))
    };
    storage
        .write(|conn| import_with(conn, 1_000, read))
        .map(|_| ())
}

/// Looks up `term` while an import of it is paused, and returns what the lookup found in time,
/// before letting the import end with `outcome`.
fn look_up_during_import(
    storage: &Storage,
    term: &str,
    outcome: Result<(), DictionaryError>,
) -> Option<Vec<FoundEntry>> {
    let (started_sender, started) = channel();
    let (finish, finish_receiver) = channel();
    thread::scope(|scope| {
        scope.spawn(|| import_paused(storage, term, started_sender, finish_receiver));
        started.recv().unwrap();
        let (found_sender, found) = channel();
        scope.spawn(move || {
            let _ = found_sender.send(storage.find_dictionary_entries(&[term.to_string()]));
        });
        let in_time = found.recv_timeout(LOOKUP_DEADLINE).ok();
        finish.send(outcome).unwrap();
        in_time.map(Result::unwrap)
    })
}

#[test]
fn completes_a_lookup_while_an_import_is_in_progress() {
    let dir = tempfile::tempdir().unwrap();
    let storage = open_file_storage(&dir);
    assert!(look_up_during_import(&storage, "cat", Ok(())).is_some());
}

#[test]
fn hides_the_entries_of_an_unfinished_import_from_lookups() {
    let dir = tempfile::tempdir().unwrap();
    let storage = open_file_storage(&dir);
    assert_eq!(
        look_up_during_import(&storage, "cat", Ok(())),
        Some(Vec::new())
    );
}

#[test]
fn finds_the_entries_of_an_import_once_it_finishes() {
    let dir = tempfile::tempdir().unwrap();
    let storage = open_file_storage(&dir);
    look_up_during_import(&storage, "cat", Ok(()));
    let found = storage
        .find_dictionary_entries(&["cat".to_string()])
        .unwrap();
    assert_eq!(found.len(), 1);
}

#[test]
fn stores_nothing_from_an_import_that_fails_while_a_lookup_runs() {
    let dir = tempfile::tempdir().unwrap();
    let storage = open_file_storage(&dir);
    let failure = Err(DictionaryError::MissingFile("rest.csv".to_string()));
    look_up_during_import(&storage, "cat", failure);
    assert!(storage.list_dictionaries().unwrap().is_empty());
}
