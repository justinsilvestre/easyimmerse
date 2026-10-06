//! Readers for the columns of bank rows whose layout depends on the format version.

use serde_json::Value;

/// Returns the column as a string, or `None` when it is missing or not a string.
pub fn text_at(row: &[Value], column: usize) -> Option<&str> {
    row.get(column).and_then(Value::as_str)
}

/// Splits a column of space-separated names. A missing or null column has no names.
pub fn names_at(row: &[Value], column: usize) -> Vec<String> {
    text_at(row, column)
        .unwrap_or_default()
        .split_whitespace()
        .map(String::from)
        .collect()
}

/// Returns the column as a whole number, dropping any fraction.
pub fn integer_at(row: &[Value], column: usize) -> Option<i64> {
    row.get(column).and_then(integer)
}

pub fn integer(value: &Value) -> Option<i64> {
    value
        .as_i64()
        .or_else(|| value.as_f64().map(|number| number as i64))
}

/// Returns the column as a list of strings, leaving out items that are not strings.
pub fn strings_at(row: &[Value], column: usize) -> Vec<String> {
    row.get(column)
        .and_then(Value::as_array)
        .map(|items| strings(items))
        .unwrap_or_default()
}

pub fn strings(items: &[Value]) -> Vec<String> {
    items
        .iter()
        .filter_map(Value::as_str)
        .map(String::from)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn splits_names_on_whitespace() {
        assert_eq!(names_at(&[json!("n  vs")], 0), vec!["n", "vs"]);
    }

    #[test]
    fn reads_a_null_column_as_no_names() {
        assert!(names_at(&[Value::Null], 0).is_empty());
    }

    #[test]
    fn drops_the_fraction_of_a_number() {
        assert_eq!(integer_at(&[json!(-2.5)], 0), Some(-2));
    }

    #[test]
    fn keeps_only_the_strings_of_a_list() {
        assert_eq!(strings_at(&[json!(["cat", 1])], 0), vec!["cat"]);
    }
}
