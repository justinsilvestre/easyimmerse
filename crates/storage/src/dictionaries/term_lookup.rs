use std::collections::HashSet;

use easyimmerse_core::dictionary::{TermEntry, TermMeta};
use easyimmerse_core::lookup::{FoundEntry, FoundTermMeta, fold_case};
use rusqlite::{Connection, Row, params_from_iter};

use super::columns::{get_deflated_json, get_json, split_words};
use super::origin::{
    AFTER_ORIGIN, ORIGIN_COLUMNS, TagDefinitions, distinct_numbers, placeholders, query_in_chunks,
    read_origin,
};
use crate::error::StorageError;

/// Finds the entries of every dictionary stored under any of the headwords, ignoring case,
/// with the definitions of the tags they use.
pub fn find_entries(
    conn: &Connection,
    headwords: &[String],
) -> Result<Vec<FoundEntry>, StorageError> {
    let folded_headwords = fold_distinct(headwords);
    let mut found = query_in_chunks(&folded_headwords, |chunk| find_entry_rows(conn, chunk))?;
    // The rows of separate chunks are put back in the order that one query would return them in.
    found.sort_by_key(|found| (found.dictionary.rank, found.entry_id));
    attach_tags(conn, found)
}

/// Finds the frequencies and pronunciations that every dictionary stores for any of the terms.
pub fn find_term_meta(
    conn: &Connection,
    terms: &[String],
) -> Result<Vec<FoundTermMeta>, StorageError> {
    query_in_chunks(terms, |chunk| find_term_meta_rows(conn, chunk))
}

fn find_entry_rows(
    conn: &Connection,
    folded_headwords: &[String],
) -> Result<Vec<FoundEntry>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT {ORIGIN_COLUMNS}, h.folded_headword, e.id, e.term, e.reading, e.alternates, e.word_classes, e.score,
             e.sequence, e.term_tags, e.definition_tags, e.definitions
         FROM dictionary_headwords h
         JOIN dictionary_entries e ON e.id = h.entry_id
         JOIN dictionaries d ON d.number = h.dictionary_number
         WHERE h.folded_headword IN ({})
         ORDER BY d.number, e.id",
        placeholders(folded_headwords.len())
    ))?;
    let rows = statement.query_map(params_from_iter(folded_headwords), read_found_entry)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

fn find_term_meta_rows(
    conn: &Connection,
    terms: &[String],
) -> Result<Vec<FoundTermMeta>, StorageError> {
    let mut statement = conn.prepare(&format!(
        "SELECT {ORIGIN_COLUMNS}, m.term, m.reading, m.data
         FROM dictionary_term_meta m
         JOIN dictionaries d ON d.number = m.dictionary_number
         WHERE m.term IN ({})
         ORDER BY d.number, m.rowid",
        placeholders(terms.len())
    ))?;
    let rows = statement.query_map(params_from_iter(terms), |row| {
        Ok(FoundTermMeta {
            dictionary: read_origin(row)?,
            meta: TermMeta {
                term: row.get(AFTER_ORIGIN)?,
                reading: row.get(AFTER_ORIGIN + 1)?,
                data: get_json(row, AFTER_ORIGIN + 2)?,
            },
        })
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}

fn fold_distinct(headwords: &[String]) -> Vec<String> {
    let mut seen: HashSet<String> = HashSet::new();
    (headwords.iter())
        .map(|headword| fold_case(headword))
        .filter(|folded| seen.insert(folded.clone()))
        .collect()
}

fn read_found_entry(row: &Row) -> rusqlite::Result<FoundEntry> {
    let column = |offset: usize| AFTER_ORIGIN + offset;
    Ok(FoundEntry {
        dictionary: read_origin(row)?,
        folded_headword: row.get(column(0))?,
        entry_id: row.get(column(1))?,
        entry: TermEntry {
            term: row.get(column(2))?,
            reading: row.get(column(3))?,
            alternates: get_json(row, column(4))?,
            word_classes: split_words(&row.get::<_, String>(column(5))?),
            score: row.get(column(6))?,
            sequence: row.get(column(7))?,
            term_tags: split_words(&row.get::<_, String>(column(8))?),
            definition_tags: split_words(&row.get::<_, String>(column(9))?),
            definitions: get_deflated_json(row, column(10))?,
        },
        tags: Vec::new(),
    })
}

fn attach_tags(
    conn: &Connection,
    mut found: Vec<FoundEntry>,
) -> Result<Vec<FoundEntry>, StorageError> {
    let numbers = distinct_numbers(found.iter().map(|found| found.dictionary.rank));
    let tags = TagDefinitions::load(conn, &numbers)?;
    for found in &mut found {
        let names = found
            .entry
            .term_tags
            .iter()
            .chain(&found.entry.definition_tags);
        found.tags = tags.select(found.dictionary.rank, names);
    }
    Ok(found)
}
