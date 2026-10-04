//! Pieces shared by the queries that find dictionary rows for a lookup.

use std::collections::HashMap;

use easyimmerse_core::dictionary::TagDefinition;
use easyimmerse_core::lookup::DictionaryOrigin;
use rusqlite::{Connection, Row, params_from_iter};

use super::columns::{get_enum, get_optional_enum};
use crate::error::StorageError;

/// The columns of `dictionaries d` that `read_origin` reads, to be selected first.
pub const ORIGIN_COLUMNS: &str = "d.id, d.title, d.format, d.number, d.frequency_mode";

/// The index of the first column after `ORIGIN_COLUMNS`.
pub const AFTER_ORIGIN: usize = 5;

pub fn read_origin(row: &Row) -> rusqlite::Result<DictionaryOrigin> {
    Ok(DictionaryOrigin {
        id: row.get(0)?,
        title: row.get(1)?,
        format: get_enum(row, 2)?,
        rank: row.get(3)?,
        frequency_mode: get_optional_enum(row, 4)?,
    })
}

/// Writes one `?` placeholder per value, for an `IN (...)` list.
pub fn placeholders(count: usize) -> String {
    vec!["?"; count].join(", ")
}

/// The tag definitions of several dictionaries, keyed by dictionary number and tag name.
pub struct TagDefinitions(HashMap<(i64, String), TagDefinition>);

impl TagDefinitions {
    /// Loads every tag definition of the given dictionaries in one query.
    pub fn load(conn: &Connection, numbers: &[i64]) -> Result<Self, StorageError> {
        let mut statement = conn.prepare(&format!(
            "SELECT dictionary_number, name, category, sort_order, notes, score
             FROM dictionary_tags WHERE dictionary_number IN ({})",
            placeholders(numbers.len())
        ))?;
        let rows = statement.query_map(params_from_iter(numbers), |row| {
            let tag = TagDefinition {
                name: row.get(1)?,
                category: row.get(2)?,
                order: row.get(3)?,
                notes: row.get(4)?,
                score: row.get(5)?,
            };
            Ok(((row.get(0)?, tag.name.clone()), tag))
        })?;
        Ok(Self(rows.collect::<Result<_, _>>()?))
    }

    /// Returns the definitions of the named tags that the dictionary defines, each once, in the order named.
    pub fn select<'a>(
        &self,
        number: i64,
        names: impl IntoIterator<Item = &'a String>,
    ) -> Vec<TagDefinition> {
        let mut selected: Vec<TagDefinition> = Vec::new();
        for name in names {
            if let Some(tag) = self.0.get(&(number, name.clone()))
                && !selected.contains(tag)
            {
                selected.push(tag.clone());
            }
        }
        selected
    }
}

/// Lists each dictionary number once.
pub fn distinct_numbers(origins: impl Iterator<Item = i64>) -> Vec<i64> {
    let mut numbers: Vec<i64> = origins.collect();
    numbers.sort_unstable();
    numbers.dedup();
    numbers
}
