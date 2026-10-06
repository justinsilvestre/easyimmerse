use easyimmerse_core::lookup::DictionaryStylesheet;
use rusqlite::{Connection, params_from_iter};

use super::origin::placeholders;
use crate::error::StorageError;

/// Returns the stylesheets of the given dictionaries in import order, leaving out dictionaries that have none.
pub fn find_stylesheets(
    conn: &Connection,
    dictionary_ids: &[String],
) -> Result<Vec<DictionaryStylesheet>, StorageError> {
    if dictionary_ids.is_empty() {
        return Ok(Vec::new());
    }
    let mut statement = conn.prepare(&format!(
        "SELECT id, stylesheet FROM dictionaries
         WHERE id IN ({}) AND stylesheet IS NOT NULL AND stylesheet != ''
         ORDER BY number",
        placeholders(dictionary_ids.len())
    ))?;
    let stylesheets = statement
        .query_map(params_from_iter(dictionary_ids), |row| {
            Ok(DictionaryStylesheet {
                dictionary_id: row.get(0)?,
                css: row.get(1)?,
            })
        })?
        .collect::<Result<_, _>>()?;
    Ok(stylesheets)
}
