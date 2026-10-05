use std::fs;
use std::path::Path;

use super::*;
use crate::dictionary::media_collector::MediaCollector;
use crate::dictionary::{
    Definition, Dictionary, MarkupDialect, SourceFile, TermEntry, import_dictionary,
    parse_dictionary,
};
use crate::test_support::{fixture_path, read_fixture_bytes};

/// Reads a fixture directory as loose files, named by their paths relative to the fixtures directory.
fn directory_source(directory: &str) -> DictionarySource {
    let mut files = Vec::new();
    collect_files(&fixture_path(directory), directory, &mut files);
    DictionarySource::new(files).unwrap()
}

fn collect_files(path: &Path, name: &str, files: &mut Vec<SourceFile>) {
    if path.is_dir() {
        for child in fs::read_dir(path).unwrap() {
            let child = child.unwrap();
            let child_name = format!("{name}/{}", child.file_name().to_string_lossy());
            collect_files(&child.path(), &child_name, files);
        }
    } else {
        let bytes = fs::read(path).unwrap();
        files.push(SourceFile {
            name: name.to_string(),
            bytes,
        });
    }
}

fn sample() -> Dictionary {
    parse_dictionary(&mut directory_source("sample-stardict")).unwrap()
}

fn sample_entry(term: &str) -> TermEntry {
    sample()
        .entries
        .into_iter()
        .find(|entry| entry.term == term)
        .unwrap()
}

#[test]
fn matches_a_source_with_an_ifo_file() {
    assert!(StardictFormat.matches(&directory_source("sample-stardict")));
}

#[test]
fn imports_the_sample_as_a_stardict_dictionary() {
    let kind = import_dictionary(
        &mut directory_source("sample-stardict"),
        &mut MediaCollector::default(),
    );
    assert_eq!(kind.unwrap(), DictionaryFormatKind::Stardict);
}

#[test]
fn reads_the_title() {
    assert_eq!(sample().metadata.title, "Sample StarDict Dictionary");
}

#[test]
fn reads_the_stylesheet_beside_the_ifo() {
    assert_eq!(
        sample().metadata.stylesheet.as_deref(),
        Some("b { color: teal; }\n")
    );
}

#[test]
fn imports_one_entry_per_block_of_data_in_index_order() {
    let terms: Vec<String> = sample()
        .entries
        .into_iter()
        .map(|entry| entry.term)
        .collect();
    assert_eq!(terms, vec!["Apple", "cat", "dog", "猫"]);
}

#[test]
fn lists_records_sharing_data_and_synonyms_as_alternates() {
    assert_eq!(sample_entry("Apple").alternates, vec!["apple", "apples"]);
}

#[test]
fn keeps_line_breaks_in_plain_text() {
    assert_eq!(
        sample_entry("Apple").definitions,
        vec![Definition::text("A round fruit.\nIt grows on trees.")]
    );
}

#[test]
fn reads_html_and_a_resource_list_as_html() {
    assert_eq!(
        sample_entry("cat").definitions,
        vec![
            Definition::Html {
                html: r#"<b>cat</b>: a small animal. <img src="cat.png">"#.to_string()
            },
            Definition::Html {
                html: r#"<img src="cat.png">"#.to_string()
            },
        ]
    );
}

#[test]
fn reads_pango_markup_and_skips_a_sound() {
    assert_eq!(
        sample_entry("dog").definitions,
        vec![Definition::Markup {
            dialect: MarkupDialect::Pango,
            markup: r#"<b>dog</b> <span foreground="gray">n.</span> a loyal animal"#.to_string()
        }]
    );
}

#[test]
fn reads_a_kana_field_as_the_reading() {
    assert_eq!(sample_entry("猫").reading.as_deref(), Some("ねこ"));
}

#[test]
fn reads_xdxf_markup() {
    assert_eq!(
        sample_entry("猫").definitions,
        vec![Definition::Markup {
            dialect: MarkupDialect::Xdxf,
            markup: "<k>猫</k> <dtrn>cat</dtrn>".to_string()
        }]
    );
}

fn archive_source(name: &str) -> DictionarySource {
    DictionarySource::single(name, read_fixture_bytes(name)).unwrap()
}

#[test]
fn reads_the_same_dictionary_from_a_gzip_compressed_tar_archive() {
    let mut source = archive_source("sample-stardict.tar.gz");
    assert_eq!(parse_dictionary(&mut source).unwrap(), sample());
}

#[test]
fn reads_the_same_dictionary_from_a_bzip2_compressed_tar_archive() {
    let mut source = archive_source("sample-stardict.tar.bz2");
    assert_eq!(parse_dictionary(&mut source).unwrap(), sample());
}

#[test]
fn reads_entries_laid_out_by_a_same_type_sequence() {
    let dictionary =
        parse_dictionary(&mut directory_source("sample-stardict-sametypesequence")).unwrap();
    let mut expected = TermEntry::new("world", vec![Definition::text("the earth")]);
    expected.reading = Some("wɜːld".to_string());
    assert_eq!(dictionary.entries.last(), Some(&expected));
}

#[test]
fn imports_the_files_under_res_as_media() {
    let mut sink = MediaCollector::default();
    import_dictionary(&mut directory_source("sample-stardict"), &mut sink).unwrap();
    assert_eq!(
        sink.described(),
        [("cat.png".to_string(), "image/png".to_string())]
    );
}
