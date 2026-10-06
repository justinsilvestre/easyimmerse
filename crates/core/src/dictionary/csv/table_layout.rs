use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use super::columns::Column;
use super::frequency::guess_frequency_mode;
use super::layout::column_numbers;

/// What a column of a table holds, as a person choosing the columns of a table sees it.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum ColumnRole {
    Term,
    Reading,
    Definition,
    /// Other spellings or forms of the term, under which the entry can also be found.
    Alternates,
    Tags,
    Frequency,
    Ignored,
}

/// What each column of a table holds, and whether its first row is a header.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TableLayout {
    pub columns: Vec<ColumnRole>,
    pub has_header: bool,
}

/// The layout detected in a table, with its first rows, for a person to check before importing.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, ToSchema)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TablePreview {
    pub layout: TableLayout,
    /// The first rows of the table, including any header row, split into cells.
    pub rows: Vec<Vec<String>>,
}

impl ColumnRole {
    pub fn of(column: &Column) -> Self {
        match column {
            Column::Term => Self::Term,
            Column::Alternates => Self::Alternates,
            Column::Reading => Self::Reading,
            Column::Definition | Column::Labelled(_) => Self::Definition,
            Column::Tags => Self::Tags,
            Column::Frequency(_) => Self::Frequency,
            Column::Ignored => Self::Ignored,
        }
    }
}

/// Turns the chosen roles into columns.
/// Where a role agrees with the detected column, the detected column is kept with its details, such as its label.
pub fn chosen_columns(
    roles: &[ColumnRole],
    detected: &[Column],
    data: &[Vec<String>],
) -> Vec<Column> {
    let choose = |(index, role): (usize, &ColumnRole)| match detected.get(index) {
        Some(column) if ColumnRole::of(column) == *role => column.clone(),
        _ => role_column(*role, index, data),
    };
    roles.iter().enumerate().map(choose).collect()
}

fn role_column(role: ColumnRole, index: usize, data: &[Vec<String>]) -> Column {
    match role {
        ColumnRole::Term => Column::Term,
        ColumnRole::Reading => Column::Reading,
        ColumnRole::Definition => Column::Definition,
        ColumnRole::Alternates => Column::Alternates,
        ColumnRole::Tags => Column::Tags,
        ColumnRole::Frequency => {
            Column::Frequency(guess_frequency_mode(column_numbers(data, index)))
        }
        ColumnRole::Ignored => Column::Ignored,
    }
}

#[cfg(test)]
mod tests {
    use super::super::super::metadata::FrequencyMode;
    use super::*;

    fn rows(lines: &[&[&str]]) -> Vec<Vec<String>> {
        lines
            .iter()
            .map(|cells| cells.iter().map(|cell| cell.to_string()).collect())
            .collect()
    }

    #[test]
    fn keeps_the_label_of_a_detected_column_chosen_as_a_definition() {
        let detected = [Column::Term, Column::Labelled("Example".into())];
        assert_eq!(
            chosen_columns(&[ColumnRole::Term, ColumnRole::Definition], &detected, &[])[1],
            Column::Labelled("Example".into())
        );
    }

    #[test]
    fn replaces_a_detected_column_with_a_different_role() {
        let detected = [Column::Term, Column::Reading];
        assert_eq!(
            chosen_columns(&[ColumnRole::Term, ColumnRole::Ignored], &detected, &[])[1],
            Column::Ignored
        );
    }

    #[test]
    fn guesses_the_mode_of_a_column_chosen_as_a_frequency() {
        let data = rows(&[&["の", "1"], &["に", "2"], &["は", "3"]]);
        assert_eq!(
            chosen_columns(
                &[ColumnRole::Term, ColumnRole::Frequency],
                &[Column::Term, Column::Definition],
                &data
            )[1],
            Column::Frequency(FrequencyMode::RankBased)
        );
    }
}
