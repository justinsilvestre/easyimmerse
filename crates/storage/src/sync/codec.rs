//! Reading a synced row as a JSON object of its columns, and writing such an object back.
#![cfg_attr(
    not(test),
    allow(
        dead_code,
        reason = "the sync engine, which applies pulled and pushed rows, writes them through this codec"
    )
)]

use rusqlite::types::{Value as SqlValue, ValueRef};
use rusqlite::{Connection, OptionalExtension, params_from_iter};
use serde_json::{Map, Number, Value};

use super::tables::{SyncTable, SyncTableSpec};
use crate::error::StorageError;
use crate::owners::OwnerId;
use crate::stored_integer::to_stored_integer;

/// The synced columns of a row, by column name.
pub type RowData = Map<String, Value>;

/// Reads the synced columns of the row with the key, or None when there is no such row.
pub fn read_row(
    conn: &Connection,
    owner: &OwnerId,
    spec: &SyncTableSpec,
    key: &str,
) -> Result<Option<RowData>, StorageError> {
    let sql = format!(
        "SELECT {} FROM {} WHERE {}",
        spec.columns.join(", "),
        spec.sql_table,
        key_condition(spec)
    );
    let row = conn
        .query_row(
            &sql,
            params_from_iter(key_values(owner, spec, key)),
            |row| {
                (0..spec.columns.len())
                    .map(|index| Ok(json_value(row.get_ref(index)?)))
                    .collect::<rusqlite::Result<Vec<Value>>>()
            },
        )
        .optional()?;
    Ok(row.map(|values| {
        let names = spec.columns.iter().map(|name| name.to_string());
        names.zip(values).collect()
    }))
}

/// Inserts the row the data describes, or updates the row with the same key.
/// The data must hold every synced column of the table.
/// A row of a table with an owner column is written as the owner's.
pub fn write_row(
    conn: &Connection,
    owner: &OwnerId,
    spec: &SyncTableSpec,
    data: &RowData,
) -> Result<(), StorageError> {
    let mut columns: Vec<&str> = spec.columns.to_vec();
    let mut values = spec
        .columns
        .iter()
        .map(|column| column_value(spec, data, column))
        .collect::<Result<Vec<SqlValue>, StorageError>>()?;
    for (column, source) in spec.copied_on_insert {
        columns.push(column);
        values.push(column_value(spec, data, source)?);
    }
    if spec.owner_column {
        columns.push("owner_id");
        values.push(SqlValue::Text(owner.0.clone()));
    }
    conn.execute(&upsert_sql(spec, &columns), params_from_iter(values))?;
    Ok(())
}

/// Deletes the row with the key, together with whatever its foreign keys cascade to.
pub fn delete_row(
    conn: &Connection,
    owner: &OwnerId,
    spec: &SyncTableSpec,
    key: &str,
) -> Result<(), StorageError> {
    let sql = format!(
        "DELETE FROM {} WHERE {}",
        spec.sql_table,
        key_condition(spec)
    );
    conn.execute(&sql, params_from_iter(key_values(owner, spec, key)))?;
    Ok(())
}

/// Gives the registry entry of a row the modification time it has on another server,
/// after the codec wrote or deleted the row there. The entry keeps the change sequence its write took.
pub fn stamp(
    conn: &Connection,
    owner: &OwnerId,
    table: SyncTable,
    key: &str,
    updated_at_ms: u64,
) -> Result<(), StorageError> {
    conn.execute(
        "UPDATE sync_rows SET updated_at_ms = ?1 \
         WHERE table_name = ?2 AND row_key = ?3 AND owner_id = ?4",
        rusqlite::params![
            to_stored_integer(updated_at_ms),
            table.as_str(),
            key,
            owner.0
        ],
    )?;
    Ok(())
}

fn key_condition(spec: &SyncTableSpec) -> String {
    if spec.owner_column {
        format!("{} = ?1 AND owner_id = ?2", spec.key_sql)
    } else {
        format!("{} = ?1", spec.key_sql)
    }
}

fn key_values(owner: &OwnerId, spec: &SyncTableSpec, key: &str) -> Vec<String> {
    let mut values = vec![key.to_string()];
    if spec.owner_column {
        values.push(owner.0.clone());
    }
    values
}

fn upsert_sql(spec: &SyncTableSpec, columns: &[&str]) -> String {
    let placeholders: Vec<String> = (1..=columns.len())
        .map(|index| format!("?{index}"))
        .collect();
    let updates: Vec<String> = spec
        .columns
        .iter()
        .filter(|column| !spec.conflict_columns.contains(column))
        .map(|column| format!("{column} = excluded.{column}"))
        .collect();
    let conflict = spec.conflict_columns.join(", ");
    let action = if updates.is_empty() {
        "NOTHING".to_string()
    } else {
        format!("UPDATE SET {}", updates.join(", "))
    };
    format!(
        "INSERT INTO {} ({}) VALUES ({}) ON CONFLICT ({conflict}) DO {action}",
        spec.sql_table,
        columns.join(", "),
        placeholders.join(", ")
    )
}

/// Synced tables hold no blobs, so a blob, which cannot occur, reads as null.
fn json_value(value: ValueRef) -> Value {
    match value {
        ValueRef::Null | ValueRef::Blob(_) => Value::Null,
        ValueRef::Integer(integer) => Value::from(integer),
        ValueRef::Real(real) => Number::from_f64(real).map_or(Value::Null, Value::Number),
        ValueRef::Text(text) => Value::String(String::from_utf8_lossy(text).into_owned()),
    }
}

fn column_value(
    spec: &SyncTableSpec,
    data: &RowData,
    column: &str,
) -> Result<SqlValue, StorageError> {
    let missing = || StorageError::SyncColumnMissing {
        table: spec.sql_table.to_string(),
        column: column.to_string(),
    };
    match data.get(column).ok_or_else(missing)? {
        Value::Null => Ok(SqlValue::Null),
        Value::Bool(flag) => Ok(SqlValue::Integer(i64::from(*flag))),
        Value::Number(number) => Ok(number.as_i64().map_or_else(
            || SqlValue::Real(number.as_f64().unwrap_or(0.0)),
            SqlValue::Integer,
        )),
        Value::String(text) => Ok(SqlValue::Text(text.clone())),
        Value::Array(_) | Value::Object(_) => Err(StorageError::SyncValueUnsupported {
            table: spec.sql_table.to_string(),
            column: column.to_string(),
        }),
    }
}
