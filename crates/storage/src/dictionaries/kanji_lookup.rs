use easyimmerse_core::dictionary::{KanjiEntry, KanjiMeta};
use easyimmerse_core::lookup::{FoundKanji, FoundKanjiMeta};
use rusqlite::{Connection, params_from_iter};

use super::columns::get_json;
use super::origin::{
    AFTER_ORIGIN, ORIGIN_COLUMNS, TagDefinitions, distinct_numbers, placeholders, query_in_chunks,
    read_origin,
};
use crate::error::StorageError;

/// Finds the entries of every kanji dictionary for any of the characters,
/// with the definitions of the tags they use and of the tags that name their stats.
pub fn find_kanji(
    conn: &Connection,
    characters: &[String],
) -> Result<Vec<FoundKanji>, StorageError> {
    let found = query_in_chunks(characters, |chunk| find_kanji_rows(conn, chunk))?;
    attach_tags(conn, found)
}

/// Finds the frequencies that every dictionary stores for any of the characters.
pub fn find_kanji_meta(
    conn: &Connection,
    characters: &[String],
) -> Result<Vec<FoundKanjiMeta>, StorageError> {
    query_in_chunks(characters, |chunk| find_kanji_meta_rows(conn, chunk))
}

fn find_kanji_rows(
    conn: &Connection,
    characters: &[String],
) -> Result<Vec<FoundKanji>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT {ORIGIN_COLUMNS}, k.data
         FROM dictionary_kanji k JOIN dictionaries d ON d.number = k.dictionary_number
         WHERE k.character IN ({}) ORDER BY d.number, k.rowid",
        placeholders(characters.len())
    ))?;
    let rows = statement.query_map(params_from_iter(characters), |row| {
        Ok(FoundKanji {
            dictionary: read_origin(row)?,
            entry: get_json::<KanjiEntry>(row, AFTER_ORIGIN)?,
            tags: Vec::new(),
        })
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}

fn find_kanji_meta_rows(
    conn: &Connection,
    characters: &[String],
) -> Result<Vec<FoundKanjiMeta>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT {ORIGIN_COLUMNS}, m.character, m.data
         FROM dictionary_kanji_meta m JOIN dictionaries d ON d.number = m.dictionary_number
         WHERE m.character IN ({}) ORDER BY d.number, m.rowid",
        placeholders(characters.len())
    ))?;
    let rows = statement.query_map(params_from_iter(characters), |row| {
        Ok(FoundKanjiMeta {
            dictionary: read_origin(row)?,
            meta: KanjiMeta {
                character: row.get(AFTER_ORIGIN)?,
                frequency: get_json(row, AFTER_ORIGIN + 1)?,
            },
        })
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}

fn attach_tags(
    conn: &Connection,
    mut found: Vec<FoundKanji>,
) -> Result<Vec<FoundKanji>, StorageError> {
    let numbers = distinct_numbers(found.iter().map(|found| found.dictionary.rank));
    let tags = TagDefinitions::load(conn, &numbers)?;
    for found in &mut found {
        let names = found.entry.tags.iter().chain(found.entry.stats.keys());
        found.tags = tags.select(found.dictionary.rank, names);
    }
    Ok(found)
}
