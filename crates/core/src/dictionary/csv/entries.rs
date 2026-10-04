use super::super::term_entry::{Definition, TermEntry};
use super::columns::Column;
use super::layout::Layout;

/// Builds the entry for one row, or nothing when the row lacks a term or a definition.
/// With `html`, definitions are kept as HTML and tags are removed from the term and reading.
pub fn row_entry(row: &[String], layout: &Layout, html: bool) -> Option<TermEntry> {
    let mut entry = TermEntry::new("", Vec::new());
    for (index, cell) in row.iter().enumerate().filter(|(_, cell)| !cell.is_empty()) {
        add_cell(&mut entry, layout.column(index), cell, html);
    }
    let is_complete = !entry.term.is_empty() && !entry.definitions.is_empty();
    is_complete.then_some(entry)
}

fn add_cell(entry: &mut TermEntry, column: &Column, cell: &str, html: bool) {
    let definition = |text: String| match html {
        true => Definition::Html { html: text },
        false => Definition::Text { text },
    };
    match column {
        Column::Term => add_headwords(entry, &plain(cell, html)),
        Column::Alternates => entry.alternates.extend(split_list(cell, &['|', ','])),
        Column::Reading => {
            entry.reading = Some(plain(cell, html)).filter(|reading| !reading.is_empty())
        }
        Column::Definition => entry.definitions.push(definition(cell.to_string())),
        Column::Labelled(label) => entry
            .definitions
            .push(definition(format!("{label}: {cell}"))),
        Column::Tags => entry
            .definition_tags
            .extend(split_list(cell, &[' ', '\t', '\n', ','])),
        Column::Frequency(_) | Column::Ignored => {}
    }
}

/// Splits a term cell on `|` into the term and its alternates; `\|` stands for a literal `|`.
fn add_headwords(entry: &mut TermEntry, cell: &str) {
    let placeholder = '\u{0}';
    let headwords = cell.replace("\\|", &placeholder.to_string());
    let mut headwords = headwords
        .split('|')
        .map(|headword| headword.trim().replace(placeholder, "|"));
    entry.term = headwords.next().unwrap_or_default();
    entry
        .alternates
        .extend(headwords.filter(|headword| !headword.is_empty()));
}

fn split_list(cell: &str, separators: &[char]) -> Vec<String> {
    let items = cell
        .split(separators)
        .map(str::trim)
        .filter(|item| !item.is_empty());
    items.map(String::from).collect()
}

/// Removes HTML tags from a cell when the table holds HTML.
fn plain(cell: &str, html: bool) -> String {
    if !html {
        return cell.to_string();
    }
    let mut text = String::with_capacity(cell.len());
    let mut is_in_tag = false;
    for character in cell.chars() {
        match character {
            '<' => is_in_tag = true,
            '>' if is_in_tag => is_in_tag = false,
            _ if !is_in_tag => text.push(character),
            _ => {}
        }
    }
    text.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::super::directives::TableKind;
    use super::*;

    fn layout(columns: Vec<Column>) -> Layout {
        Layout::new(columns, TableKind::Terms)
    }

    fn row(cells: &[&str]) -> Vec<String> {
        cells.iter().map(|cell| cell.to_string()).collect()
    }

    fn entry(cells: &[&str], columns: Vec<Column>) -> TermEntry {
        row_entry(&row(cells), &layout(columns), false).unwrap()
    }

    fn term_and_definition() -> Vec<Column> {
        vec![Column::Term, Column::Definition]
    }

    #[test]
    fn splits_alternate_headwords_from_the_term() {
        let entry = entry(&["colour|color", "a hue"], term_and_definition());
        assert_eq!(
            (entry.term, entry.alternates),
            ("colour".into(), vec!["color".into()])
        );
    }

    #[test]
    fn keeps_an_escaped_pipe_in_the_term() {
        assert_eq!(
            entry(&[r"a\|b", "a pipe"], term_and_definition()).term,
            "a|b"
        );
    }

    #[test]
    fn keeps_line_breaks_in_a_definition() {
        assert_eq!(
            entry(&["cat", "a pet\nthat purrs"], term_and_definition()).definitions,
            vec![Definition::text("a pet\nthat purrs")]
        );
    }

    #[test]
    fn labels_a_labelled_column() {
        let columns = vec![Column::Term, Column::Labelled("Example".into())];
        assert_eq!(
            entry(&["cat", "The cat sleeps."], columns).definitions,
            vec![Definition::text("Example: The cat sleeps.")]
        );
    }

    #[test]
    fn splits_tags_on_spaces_and_commas() {
        let columns = vec![Column::Term, Column::Definition, Column::Tags];
        assert_eq!(
            entry(&["cat", "a pet", "noun, animal common"], columns).definition_tags,
            vec!["noun", "animal", "common"]
        );
    }

    #[test]
    fn leaves_an_empty_reading_out() {
        let columns = vec![Column::Term, Column::Reading, Column::Definition];
        assert_eq!(entry(&["cat", "", "a pet"], columns).reading, None);
    }

    #[test]
    fn keeps_html_definitions_as_html() {
        let entry = row_entry(
            &row(&["<b>猫</b>", "cat<br>pet"]),
            &layout(term_and_definition()),
            true,
        )
        .unwrap();
        assert_eq!(
            (entry.term, entry.definitions),
            (
                "猫".into(),
                vec![Definition::Html {
                    html: "cat<br>pet".into()
                }]
            )
        );
    }

    #[test]
    fn skips_a_row_without_a_definition() {
        assert_eq!(
            row_entry(&row(&["cat", ""]), &layout(term_and_definition()), false),
            None
        );
    }
}
