//! Checking that the keys and ids a synced row carries are plain identifiers.
//! A device chooses them, and some, such as a media file's id, become part of a file name.

use serde_json::Value;

use super::apply_pushed::parents_of;
use super::codec::RowData;
use super::tables::SyncTable;

/// The most bytes a synced key or id may have.
const MAX_KEY_BYTES: usize = 256;

/// Whether the key is a plain identifier: non-empty, at most 256 bytes,
/// and free of path separators, control characters and the path segments `.` and `..`.
/// Colons are allowed, since keys such as `readingLocation:<id>` contain them.
pub fn is_plain_key(key: &str) -> bool {
    !key.is_empty()
        && key.len() <= MAX_KEY_BYTES
        && key != "."
        && key != ".."
        && !key.chars().any(|c| c == '/' || c == '\\' || c.is_control())
}

/// Why the row cannot be stored when its key, its own id, or an id of a row it refers to is not plain.
/// Only text values are checked; a value of another type is refused elsewhere.
pub(crate) fn unplain_key_reason(
    table: SyncTable,
    key: &str,
    data: Option<&RowData>,
) -> Option<String> {
    if !is_plain_key(key) {
        return Some("the key is not a plain identifier".to_string());
    }
    let data = data?;
    let parent_columns = parents_of(table).iter().map(|(_, column, _)| *column);
    key_column_of(table)
        .into_iter()
        .chain(parent_columns)
        .find(|column| matches!(data.get(*column), Some(Value::String(id)) if !is_plain_key(id)))
        .map(|column| format!("the column {column} is not a plain identifier"))
}

/// The column of the row's data that holds its key, or None when the key is a constant.
fn key_column_of(table: SyncTable) -> Option<&'static str> {
    match table {
        SyncTable::ReviewHolds | SyncTable::AnkiPendingDeletions => Some("flashcard_id"),
        SyncTable::Preferences => Some("key"),
        SyncTable::ReviewParameters => None,
        SyncTable::ReviewDayAllowances => Some("project_id"),
        _ => Some("id"),
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn data_of(value: Value) -> RowData {
        match value {
            Value::Object(map) => map,
            _ => RowData::new(),
        }
    }

    #[test]
    fn a_generated_id_is_plain() {
        assert!(is_plain_key("0f3a9c2e-1b7d-4e8a-9c3f-2d6b5a4e1f00"));
    }

    #[test]
    fn a_preference_key_with_a_colon_is_plain() {
        assert!(is_plain_key("readingLocation:0f3a9c2e"));
    }

    #[test]
    fn an_allowance_key_with_a_colon_is_plain() {
        assert!(is_plain_key("p1:20261022"));
    }

    #[test]
    fn an_empty_key_is_not_plain() {
        assert!(!is_plain_key(""));
    }

    #[test]
    fn a_key_longer_than_256_bytes_is_not_plain() {
        assert!(!is_plain_key(&"a".repeat(257)));
    }

    #[test]
    fn a_key_with_a_slash_is_not_plain() {
        assert!(!is_plain_key("../../etc/x"));
    }

    #[test]
    fn a_key_with_a_backslash_is_not_plain() {
        assert!(!is_plain_key("a\\b"));
    }

    #[test]
    fn a_key_with_a_nul_is_not_plain() {
        assert!(!is_plain_key("a\0b"));
    }

    #[test]
    fn a_key_with_a_newline_is_not_plain() {
        assert!(!is_plain_key("a\nb"));
    }

    #[test]
    fn a_single_dot_is_not_plain() {
        assert!(!is_plain_key("."));
    }

    #[test]
    fn two_dots_are_not_plain() {
        assert!(!is_plain_key(".."));
    }

    #[test]
    fn a_row_with_plain_ids_has_no_reason_to_be_refused() {
        let data =
            data_of(json!({"id": "m1", "project_id": "p1", "translation_media_file_id": null}));
        assert_eq!(
            unplain_key_reason(SyncTable::MediaFiles, "m1", Some(&data)),
            None
        );
    }

    #[test]
    fn a_row_whose_parent_id_climbs_out_is_refused_for_that_column() {
        let data = data_of(json!({"id": "s1", "media_file_id": "../x"}));
        assert_eq!(
            unplain_key_reason(SyncTable::SubtitleTracks, "s1", Some(&data)),
            Some("the column media_file_id is not a plain identifier".to_string())
        );
    }

    #[test]
    fn a_row_whose_own_id_climbs_out_is_refused_for_that_column() {
        let data = data_of(json!({"id": "../x", "project_id": "p1"}));
        assert_eq!(
            unplain_key_reason(SyncTable::MediaFiles, "m1", Some(&data)),
            Some("the column id is not a plain identifier".to_string())
        );
    }

    #[test]
    fn a_deleted_row_whose_key_climbs_out_is_refused() {
        assert_eq!(
            unplain_key_reason(SyncTable::MediaFiles, "..", None),
            Some("the key is not a plain identifier".to_string())
        );
    }
}
