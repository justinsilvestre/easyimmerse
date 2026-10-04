//! Imports each CSV fixture through `parse_dictionary`.

use super::super::metadata::FrequencyMode;
use super::super::term_entry::{Definition, TermEntry};
use super::super::term_meta::{Frequency, TermMetaData};
use super::super::{Dictionary, DictionaryFormatKind, DictionarySource, parse_dictionary};
use crate::test_support::read_fixture_bytes;

fn parse_fixture(name: &str) -> Dictionary {
    let path = format!("sample-csv/{name}");
    let mut source = DictionarySource::single(path.clone(), read_fixture_bytes(&path)).unwrap();
    parse_dictionary(&mut source).unwrap()
}

fn entry<'a>(dictionary: &'a Dictionary, term: &str) -> &'a TermEntry {
    dictionary
        .entries
        .iter()
        .find(|entry| entry.term == term)
        .unwrap()
}

mod tabfile {
    use super::*;

    #[test]
    fn imports_as_a_csv_dictionary() {
        assert_eq!(
            parse_fixture("tabfile.txt").metadata.format,
            DictionaryFormatKind::Csv
        );
    }

    #[test]
    fn takes_the_title_from_the_name_directive() {
        assert_eq!(parse_fixture("tabfile.txt").metadata.title, "German Basics");
    }

    #[test]
    fn takes_the_source_language_from_a_directive() {
        assert_eq!(
            parse_fixture("tabfile.txt").metadata.source_language,
            Some("de".into())
        );
    }

    #[test]
    fn unescapes_line_breaks() {
        let dictionary = parse_fixture("tabfile.txt");
        assert_eq!(
            entry(&dictionary, "Rechner").definitions,
            vec![Definition::text("computer\nmachine that calculates")]
        );
    }

    #[test]
    fn unescapes_backslashes() {
        let dictionary = parse_fixture("tabfile.txt");
        assert_eq!(
            entry(&dictionary, "Schrägstrich").definitions,
            vec![Definition::text("slash (/), not backslash (\\)")]
        );
    }

    #[test]
    fn splits_alternates_on_pipes() {
        let dictionary = parse_fixture("tabfile.txt");
        assert_eq!(
            entry(&dictionary, "Rechner").alternates,
            vec!["Computer", "PC"]
        );
    }

    #[test]
    fn keeps_an_escaped_pipe_in_the_headword() {
        assert!(
            parse_fixture("tabfile.txt")
                .entries
                .iter()
                .any(|entry| entry.term == "Pfeife|Rohr")
        );
    }

    #[test]
    fn merges_rows_with_the_same_term() {
        assert_eq!(
            entry(&parse_fixture("tabfile.txt"), "Haus")
                .definitions
                .len(),
            2
        );
    }
}

mod anki_export {
    use super::*;

    #[test]
    fn keeps_definitions_as_html() {
        let dictionary = parse_fixture("anki-export.txt");
        assert_eq!(
            entry(&dictionary, "comer").definitions,
            vec![Definition::Html {
                html: "to eat<br>to have lunch".into()
            }]
        );
    }

    #[test]
    fn removes_html_tags_from_the_term() {
        assert!(
            parse_fixture("anki-export.txt")
                .entries
                .iter()
                .any(|entry| entry.term == "casa")
        );
    }

    #[test]
    fn reads_tags_from_the_tags_column() {
        assert_eq!(
            entry(&parse_fixture("anki-export.txt"), "gato").definition_tags,
            vec!["noun", "animal"]
        );
    }

    #[test]
    fn ignores_the_deck_column() {
        assert_eq!(
            entry(&parse_fixture("anki-export.txt"), "gato")
                .definitions
                .len(),
            1
        );
    }

    #[test]
    fn keeps_a_line_break_in_a_quoted_cell() {
        assert_eq!(
            entry(&parse_fixture("anki-export.txt"), "hablar").definitions,
            vec![Definition::Html {
                html: "to speak\nto talk".into()
            }]
        );
    }
}

mod excel_semicolon {
    use super::*;

    #[test]
    fn reads_the_header_after_the_byte_order_mark() {
        assert_eq!(parse_fixture("excel-semicolon.csv").entries.len(), 3);
    }

    #[test]
    fn labels_the_example_column() {
        let dictionary = parse_fixture("excel-semicolon.csv");
        assert_eq!(
            entry(&dictionary, "chien").definitions,
            vec![
                Definition::text("dog"),
                Definition::text("Example: Le chien aboie; il a faim.")
            ]
        );
    }

    #[test]
    fn reads_tags_from_the_part_of_speech_column() {
        assert_eq!(
            entry(&parse_fixture("excel-semicolon.csv"), "manger").definition_tags,
            vec!["verb"]
        );
    }

    #[test]
    fn keeps_a_line_break_in_a_quoted_cell() {
        let dictionary = parse_fixture("excel-semicolon.csv");
        assert_eq!(
            entry(&dictionary, "manger").definitions[0],
            Definition::text("to eat\nto have a meal")
        );
    }

    #[test]
    fn merges_rows_with_the_same_term() {
        assert_eq!(
            entry(&parse_fixture("excel-semicolon.csv"), "chat")
                .definitions
                .len(),
            3
        );
    }

    #[test]
    fn takes_the_title_from_the_file_name() {
        assert_eq!(
            parse_fixture("excel-semicolon.csv").metadata.title,
            "excel-semicolon"
        );
    }
}

mod unicode_text {
    use super::*;

    #[test]
    fn decodes_utf16_and_reads_the_pinyin_as_the_reading() {
        assert_eq!(
            entry(&parse_fixture("unicode-text.txt"), "谢谢").reading,
            Some("xiè xie".into())
        );
    }

    #[test]
    fn keeps_a_line_break_in_a_quoted_cell() {
        assert_eq!(
            entry(&parse_fixture("unicode-text.txt"), "学习").definitions,
            vec![Definition::text("to study\nto learn")]
        );
    }
}

mod jmdict_style {
    use super::*;

    #[test]
    fn reads_the_second_column_as_the_reading() {
        assert_eq!(
            entry(&parse_fixture("jmdict-style.csv"), "猫").reading,
            Some("ねこ".into())
        );
    }

    #[test]
    fn keeps_entries_with_different_readings_apart() {
        let dictionary = parse_fixture("jmdict-style.csv");
        assert_eq!(
            dictionary
                .entries
                .iter()
                .filter(|entry| entry.term == "生")
                .count(),
            2
        );
    }

    #[test]
    fn merges_rows_with_the_same_term_and_reading() {
        assert_eq!(
            entry(&parse_fixture("jmdict-style.csv"), "見る")
                .definitions
                .len(),
            2
        );
    }
}

mod shift_jis {
    use super::*;

    #[test]
    fn decodes_the_legacy_encoding() {
        assert_eq!(
            entry(&parse_fixture("shift-jis.csv"), "勉強").definitions,
            vec![Definition::text("学問や技術を学ぶこと。")]
        );
    }
}

mod frequency_words {
    use super::*;

    #[test]
    fn imports_no_term_entries() {
        assert!(parse_fixture("frequency-words.txt").entries.is_empty());
    }

    #[test]
    fn reads_counts_as_occurrence_based() {
        assert_eq!(
            parse_fixture("frequency-words.txt").metadata.frequency_mode,
            Some(FrequencyMode::OccurrenceBased)
        );
    }

    #[test]
    fn imports_a_frequency_for_each_line() {
        assert_eq!(parse_fixture("frequency-words.txt").term_meta.len(), 20);
    }

    #[test]
    fn keeps_the_count_as_the_value() {
        assert_eq!(
            parse_fixture("frequency-words.txt").term_meta[0].data,
            TermMetaData::Frequency(Frequency {
                value: Some(22484400.0),
                display: None
            })
        );
    }
}
