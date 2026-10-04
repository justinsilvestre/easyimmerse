use super::super::metadata::FrequencyMode;

/// What a column of a table holds.
#[derive(Debug, Clone, PartialEq)]
pub enum Column {
    Term,
    Alternates,
    Reading,
    Definition,
    Tags,
    Frequency(FrequencyMode),
    /// A column whose cells become definition lines prefixed with the label, such as `Example: …`.
    Labelled(String),
    Ignored,
}

const TERM_NAMES: &[&str] = &[
    "term",
    "word",
    "headword",
    "expression",
    "entry",
    "lemma",
    "vocab",
    "vocabulary",
    "front",
];
const ALTERNATE_NAMES: &[&str] = &[
    "alternates",
    "alternate",
    "alt",
    "altterm",
    "variants",
    "variant",
    "forms",
    "inflections",
];
const READING_NAMES: &[&str] = &[
    "reading",
    "kana",
    "pronunciation",
    "pinyin",
    "ipa",
    "transcription",
    "furigana",
];
const DEFINITION_NAMES: &[&str] = &[
    "definition",
    "definitions",
    "meaning",
    "meanings",
    "gloss",
    "glosses",
    "translation",
    "sense",
    "back",
    "english",
];
const TAG_NAMES: &[&str] = &["tags", "tag", "pos", "part of speech", "partofspeech"];
const RANK_NAMES: &[&str] = &["rank", "frequency rank", "freq rank"];
const COUNT_NAMES: &[&str] = &["frequency", "freq", "count", "occurrences"];
const LABELLED_NAMES: &[&str] = &[
    "notes",
    "note",
    "comment",
    "usage",
    "example",
    "examples",
    "sentence",
    "example sentence",
];

/// Recognises a column name, ignoring case, `_` or `-` in place of spaces, and a trailing number as in `definition 2`.
pub fn recognise_column(name: &str) -> Option<Column> {
    let normalized = normalize_name(name);
    let is_one_of = |names: &[&str]| names.contains(&normalized.as_str());
    match () {
        _ if normalized.is_empty() => Some(Column::Definition),
        _ if is_one_of(TERM_NAMES) => Some(Column::Term),
        _ if is_one_of(ALTERNATE_NAMES) => Some(Column::Alternates),
        _ if is_one_of(READING_NAMES) => Some(Column::Reading),
        _ if is_one_of(DEFINITION_NAMES) => Some(Column::Definition),
        _ if is_one_of(TAG_NAMES) => Some(Column::Tags),
        _ if is_one_of(RANK_NAMES) => Some(Column::Frequency(FrequencyMode::RankBased)),
        _ if is_one_of(COUNT_NAMES) => Some(Column::Frequency(FrequencyMode::OccurrenceBased)),
        _ if is_one_of(LABELLED_NAMES) => Some(Column::Labelled(name.trim().to_string())),
        _ => None,
    }
}

/// Reads a column name given by the file's author, keeping an unrecognised name as a label.
pub fn name_column(name: &str) -> Column {
    recognise_column(name).unwrap_or_else(|| Column::Labelled(name.trim().to_string()))
}

fn normalize_name(name: &str) -> String {
    let lowercase = name.to_lowercase().replace(['_', '-'], " ");
    let without_number = lowercase
        .trim()
        .trim_end_matches(|character: char| character.is_ascii_digit());
    without_number.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recognises_a_synonym_for_the_term_regardless_of_case() {
        assert_eq!(recognise_column(" Headword "), Some(Column::Term));
    }

    #[test]
    fn recognises_a_numbered_definition_column() {
        assert_eq!(recognise_column("Definition 2"), Some(Column::Definition));
    }

    #[test]
    fn recognises_a_part_of_speech_column_written_with_underscores() {
        assert_eq!(recognise_column("part_of_speech"), Some(Column::Tags));
    }

    #[test]
    fn recognises_a_rank_column_as_a_rank_based_frequency() {
        assert_eq!(
            recognise_column("rank"),
            Some(Column::Frequency(FrequencyMode::RankBased))
        );
    }

    #[test]
    fn recognises_a_count_column_as_an_occurrence_based_frequency() {
        assert_eq!(
            recognise_column("Count"),
            Some(Column::Frequency(FrequencyMode::OccurrenceBased))
        );
    }

    #[test]
    fn labels_an_example_column_with_its_own_name() {
        assert_eq!(
            recognise_column("Example"),
            Some(Column::Labelled("Example".into()))
        );
    }

    #[test]
    fn does_not_recognise_an_ordinary_word() {
        assert_eq!(recognise_column("a unit of language"), None);
    }

    #[test]
    fn keeps_an_unrecognised_name_as_a_label() {
        assert_eq!(
            name_column("Etymology"),
            Column::Labelled("Etymology".into())
        );
    }
}
