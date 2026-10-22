//! The tables whose rows sync between servers, and how the codec reads and writes each.

use std::str::FromStr;

use crate::error::StorageError;

/// A table whose rows sync between servers.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum SyncTable {
    Projects,
    MediaFiles,
    SubtitleTracks,
    Alignments,
    Flashcards,
    ReviewLog,
    ReviewHolds,
    ReviewDayAllowances,
    AnkiPendingDeletions,
    Dictionaries,
    Preferences,
    ReviewParameters,
}

impl SyncTable {
    pub const ALL: [SyncTable; 12] = [
        SyncTable::Projects,
        SyncTable::MediaFiles,
        SyncTable::SubtitleTracks,
        SyncTable::Alignments,
        SyncTable::Flashcards,
        SyncTable::ReviewLog,
        SyncTable::ReviewHolds,
        SyncTable::ReviewDayAllowances,
        SyncTable::AnkiPendingDeletions,
        SyncTable::Dictionaries,
        SyncTable::Preferences,
        SyncTable::ReviewParameters,
    ];

    /// The name of the SQL table, which is also the table's name in `sync_rows`.
    pub fn as_str(self) -> &'static str {
        self.spec().sql_table
    }

    pub fn spec(self) -> &'static SyncTableSpec {
        &SPECS[self as usize]
    }
}

impl FromStr for SyncTable {
    type Err = StorageError;

    fn from_str(name: &str) -> Result<Self, Self::Err> {
        SyncTable::ALL
            .into_iter()
            .find(|table| table.as_str() == name)
            .ok_or_else(|| StorageError::UnknownSyncTable(name.to_string()))
    }
}

impl From<easyimmerse_core::sync::SyncTable> for SyncTable {
    fn from(table: easyimmerse_core::sync::SyncTable) -> Self {
        use easyimmerse_core::sync::SyncTable as Wire;
        match table {
            Wire::Projects => SyncTable::Projects,
            Wire::MediaFiles => SyncTable::MediaFiles,
            Wire::SubtitleTracks => SyncTable::SubtitleTracks,
            Wire::Alignments => SyncTable::Alignments,
            Wire::Flashcards => SyncTable::Flashcards,
            Wire::ReviewLog => SyncTable::ReviewLog,
            Wire::ReviewHolds => SyncTable::ReviewHolds,
            Wire::ReviewDayAllowances => SyncTable::ReviewDayAllowances,
            Wire::AnkiPendingDeletions => SyncTable::AnkiPendingDeletions,
            Wire::Dictionaries => SyncTable::Dictionaries,
            Wire::Preferences => SyncTable::Preferences,
            Wire::ReviewParameters => SyncTable::ReviewParameters,
        }
    }
}

impl From<SyncTable> for easyimmerse_core::sync::SyncTable {
    fn from(table: SyncTable) -> Self {
        use easyimmerse_core::sync::SyncTable as Wire;
        match table {
            SyncTable::Projects => Wire::Projects,
            SyncTable::MediaFiles => Wire::MediaFiles,
            SyncTable::SubtitleTracks => Wire::SubtitleTracks,
            SyncTable::Alignments => Wire::Alignments,
            SyncTable::Flashcards => Wire::Flashcards,
            SyncTable::ReviewLog => Wire::ReviewLog,
            SyncTable::ReviewHolds => Wire::ReviewHolds,
            SyncTable::ReviewDayAllowances => Wire::ReviewDayAllowances,
            SyncTable::AnkiPendingDeletions => Wire::AnkiPendingDeletions,
            SyncTable::Dictionaries => Wire::Dictionaries,
            SyncTable::Preferences => Wire::Preferences,
            SyncTable::ReviewParameters => Wire::ReviewParameters,
        }
    }
}

/// How the codec reads and writes the rows of one synced table.
#[derive(Debug)]
pub struct SyncTableSpec {
    pub table: SyncTable,
    pub sql_table: &'static str,
    /// The SQL expression that gives a row's key in `sync_rows`, as the table's triggers write it.
    pub key_sql: &'static str,
    /// The columns of the table's primary key or unique key, which an upsert conflicts on.
    pub conflict_columns: &'static [&'static str],
    /// Whether the table has an `owner_id` column, which the codec sets from the owner rather than from the data.
    pub owner_column: bool,
    /// The columns that sync. Device-bound columns, such as when a project was last opened, are left out.
    pub columns: &'static [&'static str],
    /// Columns that a new row takes from another column of the data, as (column, source column).
    pub copied_on_insert: &'static [(&'static str, &'static str)],
    /// The order in which rows are applied: a row's parents have a lower rank.
    pub rank: u8,
}

/// One spec per table, in the order of `SyncTable`'s variants.
const SPECS: [SyncTableSpec; 12] = [
    SyncTableSpec {
        table: SyncTable::Projects,
        sql_table: "projects",
        key_sql: "id",
        conflict_columns: &["id"],
        owner_column: true,
        columns: &[
            "id",
            "name",
            "target_language",
            "translation_language",
            "flashcard_fields_json",
            "default_tags_json",
            "tags_media_name",
            "fills_audio_with_tts",
            "flashcard_front_fields_json",
            "lists_anki_deletions",
            "created_at_ms",
        ],
        copied_on_insert: &[("last_opened_at_ms", "created_at_ms")],
        rank: 0,
    },
    SyncTableSpec {
        table: SyncTable::MediaFiles,
        sql_table: "media_files",
        key_sql: "id",
        conflict_columns: &["id"],
        owner_column: false,
        columns: &[
            "id",
            "project_id",
            "name",
            "source_kind",
            "source_path",
            "browser_file_size",
            "browser_file_last_modified_ms",
            "created_at_ms",
            "track_selection_json",
            "origin_plugin",
            "origin_locator",
            "target_subtitle_track_id",
            "translation_subtitle_track_id",
            "translation_media_file_id",
            "is_upload_chosen",
        ],
        copied_on_insert: &[],
        rank: 1,
    },
    SyncTableSpec {
        table: SyncTable::SubtitleTracks,
        sql_table: "subtitle_tracks",
        key_sql: "id",
        conflict_columns: &["id"],
        owner_column: false,
        columns: &[
            "id",
            "media_file_id",
            "name",
            "format",
            "source_json",
            "sample",
            "created_at_ms",
        ],
        copied_on_insert: &[],
        rank: 2,
    },
    SyncTableSpec {
        table: SyncTable::Alignments,
        sql_table: "alignments",
        key_sql: "id",
        conflict_columns: &["id"],
        owner_column: false,
        columns: &[
            "id",
            "media_file_id",
            "counterpart_media_file_id",
            "kind",
            "provider",
            "content_json",
            "created_at_ms",
        ],
        copied_on_insert: &[],
        rank: 2,
    },
    SyncTableSpec {
        table: SyncTable::Flashcards,
        sql_table: "flashcards",
        key_sql: "id",
        conflict_columns: &["id"],
        owner_column: false,
        columns: &[
            "id",
            "project_id",
            "media_file_id",
            "cue_index",
            "word_start",
            "content_json",
            "included_fields_json",
            "created_at_ms",
            "updated_at_ms",
            "exported_at_ms",
            "was_packaged",
            "sent_at_ms",
        ],
        copied_on_insert: &[],
        rank: 3,
    },
    SyncTableSpec {
        table: SyncTable::ReviewLog,
        sql_table: "review_log",
        key_sql: "id",
        conflict_columns: &["id"],
        owner_column: false,
        columns: &[
            "id",
            "answered_at_ms",
            "flashcard_id",
            "project_id",
            "rating",
            "kind",
            "elapsed_ms",
            "duration_ms",
            "stability",
            "difficulty",
            "interval_ms_before",
            "interval_ms_after",
            "desired_retention",
            "state",
            "due_at_ms",
            "reps",
            "lapses",
            "learning_step",
        ],
        copied_on_insert: &[],
        rank: 4,
    },
    SyncTableSpec {
        table: SyncTable::ReviewHolds,
        sql_table: "review_holds",
        key_sql: "flashcard_id",
        conflict_columns: &["flashcard_id"],
        owner_column: false,
        columns: &["flashcard_id", "project_id", "kind", "until_ms"],
        copied_on_insert: &[],
        rank: 4,
    },
    SyncTableSpec {
        table: SyncTable::ReviewDayAllowances,
        sql_table: "review_day_allowances",
        key_sql: "project_id || ':' || day_key",
        conflict_columns: &["project_id", "day_key"],
        owner_column: false,
        columns: &["project_id", "day_key", "extra_new_cards", "extra_reviews"],
        copied_on_insert: &[],
        rank: 4,
    },
    SyncTableSpec {
        table: SyncTable::AnkiPendingDeletions,
        sql_table: "anki_pending_deletions",
        key_sql: "flashcard_id",
        conflict_columns: &["flashcard_id"],
        owner_column: false,
        columns: &["flashcard_id", "project_id", "word", "requested_at_ms"],
        copied_on_insert: &[],
        rank: 4,
    },
    SyncTableSpec {
        table: SyncTable::Dictionaries,
        sql_table: "dictionaries",
        key_sql: "id",
        conflict_columns: &["id"],
        owner_column: true,
        columns: &[
            "id",
            "title",
            "revision",
            "format",
            "description",
            "author",
            "attribution",
            "url",
            "source_language",
            "target_language",
            "frequency_mode",
            "stylesheet",
            "imported_at",
        ],
        copied_on_insert: &[],
        rank: 0,
    },
    SyncTableSpec {
        table: SyncTable::Preferences,
        sql_table: "preferences",
        key_sql: "key",
        conflict_columns: &["owner_id", "key"],
        owner_column: true,
        columns: &["key", "value"],
        copied_on_insert: &[],
        rank: 0,
    },
    SyncTableSpec {
        table: SyncTable::ReviewParameters,
        sql_table: "review_parameters",
        key_sql: "'review_parameters'",
        conflict_columns: &["owner_id"],
        owner_column: true,
        columns: &["weights_json", "fitted_at_ms"],
        copied_on_insert: &[],
        rank: 0,
    },
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gives_each_table_its_own_spec() {
        let mismatched: Vec<SyncTable> = SyncTable::ALL
            .into_iter()
            .filter(|table| table.spec().table != *table)
            .collect();
        assert_eq!(mismatched, vec![]);
    }

    #[test]
    fn reads_a_table_back_from_its_name() {
        assert_eq!(
            "review_day_allowances".parse::<SyncTable>().unwrap(),
            SyncTable::ReviewDayAllowances
        );
    }

    #[test]
    fn names_each_table_on_the_wire_as_in_the_database() {
        let mismatched: Vec<SyncTable> = SyncTable::ALL
            .into_iter()
            .filter(|table| {
                let wire = easyimmerse_core::sync::SyncTable::from(*table);
                serde_json::to_value(wire).unwrap() != table.as_str()
            })
            .collect();
        assert_eq!(mismatched, vec![]);
    }

    #[test]
    fn refuses_a_table_that_does_not_sync() {
        assert!(matches!(
            "users".parse::<SyncTable>(),
            Err(StorageError::UnknownSyncTable(_))
        ));
    }
}
