use super::columns::Column;

/// Settings given by `#key:value` (Anki) and `##key<TAB>value` (Tabfile) lines at the top of a file.
#[derive(Debug, Default, PartialEq)]
pub struct Directives {
    pub title: Option<String>,
    pub revision: Option<String>,
    pub description: Option<String>,
    pub author: Option<String>,
    pub source_language: Option<String>,
    pub target_language: Option<String>,
    pub separator: Option<u8>,
    /// Names of the columns, separated by the delimiter, standing in for a header row.
    pub columns: Option<String>,
    pub html: bool,
    pub kind: Option<TableKind>,
    /// Roles that Anki assigns to columns by their position from 0, as in `#tags column:3`.
    pub column_roles: Vec<(usize, Column)>,
}

/// Whether a table holds dictionary entries or a frequency list.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TableKind {
    Terms,
    Frequency,
}

/// Reads the directives at the top of the text and returns them with the rest of the text.
pub fn read_directives(text: &str) -> (Directives, &str) {
    let mut directives = Directives::default();
    let mut body_start = 0;
    for line in text.split_inclusive('\n') {
        let content = line.trim_end_matches(['\r', '\n']);
        if !content.starts_with('#') && !content.trim().is_empty() {
            break;
        }
        if let Some((key, value)) = split_directive(content) {
            directives.apply(&key, value);
        }
        body_start += line.len();
    }
    (directives, &text[body_start..])
}

fn split_directive(line: &str) -> Option<(String, &str)> {
    let (key, value) = match line.strip_prefix("##") {
        Some(rest) => rest.split_once('\t').or_else(|| rest.split_once(':'))?,
        None => line.strip_prefix('#')?.split_once(':')?,
    };
    let key = key.to_lowercase().replace(['-', '_', ' '], "");
    Some((key, value))
}

impl Directives {
    fn apply(&mut self, key: &str, value: &str) {
        let text = non_empty(value);
        match key {
            "title" | "name" | "bookname" => self.title = text,
            "revision" | "version" => self.revision = text,
            "description" => self.description = text,
            "author" => self.author = text,
            "sourcelanguage" | "indexlanguage" | "sourcelang" => self.source_language = text,
            "targetlanguage" | "contentslanguage" | "targetlang" => self.target_language = text,
            "separator" => self.separator = parse_separator(value),
            "columns" => self.columns = text,
            "html" => {
                self.html = matches!(value.trim().to_lowercase().as_str(), "true" | "yes" | "1")
            }
            "kind" => self.kind = parse_kind(value),
            "tagscolumn" => self.assign_column(value, Column::Tags),
            "deckcolumn" | "notetypecolumn" | "guidcolumn" => {
                self.assign_column(value, Column::Ignored)
            }
            _ => {}
        }
    }

    fn assign_column(&mut self, position: &str, column: Column) {
        if let Some(index) = position
            .trim()
            .parse::<usize>()
            .ok()
            .and_then(|n| n.checked_sub(1))
        {
            self.column_roles.push((index, column));
        }
    }
}

fn non_empty(value: &str) -> Option<String> {
    Some(value.trim().to_string()).filter(|value| !value.is_empty())
}

fn parse_separator(value: &str) -> Option<u8> {
    if let [byte] = value.as_bytes() {
        return Some(*byte);
    }
    match value.trim().to_lowercase().as_str() {
        "comma" => Some(b','),
        "semicolon" => Some(b';'),
        "tab" => Some(b'\t'),
        "space" => Some(b' '),
        "pipe" => Some(b'|'),
        "colon" => Some(b':'),
        literal => literal
            .as_bytes()
            .first()
            .copied()
            .filter(|_| literal.len() == 1),
    }
}

fn parse_kind(value: &str) -> Option<TableKind> {
    match value.trim().to_lowercase().as_str() {
        "terms" | "definitions" => Some(TableKind::Terms),
        "frequency" | "frequencies" => Some(TableKind::Frequency),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn directives(text: &str) -> Directives {
        read_directives(text).0
    }

    #[test]
    fn reads_an_anki_style_title() {
        assert_eq!(
            directives("#title:Animals\ncat,neko\n").title,
            Some("Animals".into())
        );
    }

    #[test]
    fn reads_a_tabfile_style_name() {
        assert_eq!(
            directives("##name\tAnimals\ncat\tneko\n").title,
            Some("Animals".into())
        );
    }

    #[test]
    fn reads_a_language_with_a_hyphenated_key() {
        assert_eq!(
            directives("#source-language:ja\n").source_language,
            Some("ja".into())
        );
    }

    #[test]
    fn reads_a_named_separator() {
        assert_eq!(directives("#separator:Semicolon\n").separator, Some(b';'));
    }

    #[test]
    fn reads_a_literal_separator() {
        assert_eq!(directives("#separator:|\n").separator, Some(b'|'));
    }

    #[test]
    fn turns_on_html() {
        assert!(directives("#html:true\n").html);
    }

    #[test]
    fn reads_the_frequency_kind() {
        assert_eq!(
            directives("#kind:frequency\n").kind,
            Some(TableKind::Frequency)
        );
    }

    #[test]
    fn assigns_the_tags_role_to_an_anki_column_counted_from_one() {
        assert_eq!(
            directives("#tags column:3\n").column_roles,
            vec![(2, Column::Tags)]
        );
    }

    #[test]
    fn ignores_unknown_keys() {
        assert_eq!(directives("#deck:Japanese\n"), Directives::default());
    }

    #[test]
    fn returns_the_text_after_the_directives() {
        assert_eq!(
            read_directives("#html:true\n# note\ncat,neko\n").1,
            "cat,neko\n"
        );
    }

    #[test]
    fn stops_at_the_first_row() {
        assert_eq!(directives("cat,neko\n#title:Late\n").title, None);
    }
}
