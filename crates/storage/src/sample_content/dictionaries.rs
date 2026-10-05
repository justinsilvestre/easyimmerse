//! The sample dictionaries: a Yomitan fixture and two word lists that cover the sample subtitles.

use easyimmerse_core::dictionary::DictionarySource;

use crate::{Storage, StorageError};

/// The name of the Yomitan dictionary among the repository's fixtures.
pub const FIXTURE_DICTIONARY: &str = "sample-yomitan.zip";
const FIXTURE_DICTIONARY_TITLE: &str = "Sample Dictionary";

pub const WORD_LISTS: [(&str, &[u8]); 2] = [
    ("spanish-english.tsv", include_bytes!("spanish-english.tsv")),
    (
        "japanese-english.tsv",
        include_bytes!("japanese-english.tsv"),
    ),
];

/// Imports each sample dictionary whose title no stored dictionary has yet.
pub fn import_sample_dictionaries(
    storage: &Storage,
    fixture_dictionary: Vec<u8>,
) -> Result<(), StorageError> {
    let mut dictionaries = vec![(
        FIXTURE_DICTIONARY_TITLE.to_string(),
        FIXTURE_DICTIONARY,
        fixture_dictionary,
    )];
    for (name, bytes) in WORD_LISTS {
        dictionaries.push((title_of(bytes), name, bytes.to_vec()));
    }
    let stored = storage.list_dictionaries()?;
    for (title, name, bytes) in dictionaries {
        if !stored
            .iter()
            .any(|dictionary| dictionary.metadata.title == title)
        {
            storage.import_dictionary(&mut DictionarySource::single(name, bytes)?)?;
        }
    }
    Ok(())
}

/// Reads the `#title:` line at the top of a word list.
fn title_of(word_list: &[u8]) -> String {
    let text = String::from_utf8_lossy(word_list);
    let title = text.lines().find_map(|line| line.strip_prefix("#title:"));
    title.unwrap_or_default().to_string()
}
