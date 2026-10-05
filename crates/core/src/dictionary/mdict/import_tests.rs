use crate::dictionary::mdict::block::LZO;
use crate::dictionary::mdict::header::FormatVersion;
use crate::dictionary::mdict::test_writer::{TestFile, encode_header};
use crate::dictionary::media_collector::MediaCollector;
use crate::dictionary::*;
use crate::test_support::read_fixture_bytes;

fn fixture_source(paths: &[&str]) -> DictionarySource {
    let files = paths
        .iter()
        .map(|path| SourceFile {
            name: file_name(path).to_string(),
            bytes: read_fixture_bytes(path),
        })
        .collect();
    DictionarySource::new(files).unwrap()
}

fn sample() -> Dictionary {
    let paths = [
        "sample-mdict/sample.mdx",
        "sample-mdict/sample.mdd",
        "sample-mdict/sample.css",
    ];
    parse_dictionary(&mut fixture_source(&paths)).unwrap()
}

fn parse_test_file(file: &TestFile) -> Result<Dictionary, DictionaryError> {
    let mut source = DictionarySource::single("test.mdx", file.write()).unwrap();
    parse_dictionary(&mut source)
}

fn first_definition(file: &TestFile) -> Definition {
    parse_test_file(file).unwrap().entries[0].definitions[0].clone()
}

#[test]
fn reads_the_sample_as_an_mdict_dictionary() {
    assert_eq!(sample().metadata.format, DictionaryFormatKind::Mdict);
}

#[test]
fn reads_the_title_of_the_sample() {
    assert_eq!(sample().metadata.title, "Sample MDict");
}

#[test]
fn reads_the_stylesheet_beside_the_sample() {
    let stylesheet = sample().metadata.stylesheet.unwrap();
    assert!(stylesheet.starts_with("body { font-family: Georgia, serif; }"));
}

#[test]
fn leaves_redirects_out_of_the_entries() {
    let terms: Vec<String> = sample()
        .entries
        .into_iter()
        .map(|entry| entry.term)
        .collect();
    assert_eq!(terms, ["cat", "dog"]);
}

#[test]
fn lists_redirect_sources_as_alternates() {
    assert_eq!(sample().entries[0].alternates, ["kitty", "猫"]);
}

#[test]
fn stores_styled_html_with_its_links_intact() {
    let html = concat!(
        r#"<b class="headword">cat</b><i>a small domesticated feline. "#,
        r#"See also <a href="entry://dog">dog</a>.<br><img src="cat.png"></i>"#
    );
    assert_eq!(
        sample().entries[0].definitions,
        [Definition::Html { html: html.into() }]
    );
}

#[test]
fn imports_the_resources_of_the_sample() {
    let paths = ["sample-mdict/sample.mdx", "sample-mdict/sample.mdd"];
    let mut collector = MediaCollector::default();
    import_dictionary(&mut fixture_source(&paths), &mut collector).unwrap();
    assert_eq!(
        collector.described(),
        [("cat.png".to_string(), "image/png".to_string())]
    );
}

#[test]
fn reads_a_version_1_2_dictionary() {
    let dictionary =
        parse_dictionary(&mut fixture_source(&["sample-mdict-v1/legacy.mdx"])).unwrap();
    assert_eq!(
        dictionary.entries[1].definitions,
        [Definition::text("a sweet fruit")]
    );
}

#[test]
fn reads_lzo_blocks() {
    let file = TestFile {
        compression: LZO,
        ..TestFile::new(&[("cat", "a feline")])
    };
    assert_eq!(
        first_definition(&file),
        Definition::Html {
            html: "a feline".into()
        }
    );
}

#[test]
fn reads_a_dictionary_with_an_encrypted_key_block_index() {
    let file = TestFile {
        encrypt_key_info: true,
        ..TestFile::new(&[("cat", "a feline")])
    };
    assert_eq!(
        first_definition(&file),
        Definition::Html {
            html: "a feline".into()
        }
    );
}

#[test]
fn reads_utf16_entries() {
    let file = TestFile {
        encoding: "UTF-16".into(),
        ..TestFile::new(&[("猫", "ねこ")])
    };
    assert_eq!(
        first_definition(&file),
        Definition::Html {
            html: "ねこ".into()
        }
    );
}

#[test]
fn reads_gbk_entries() {
    let file = TestFile {
        encoding: "GBK".into(),
        ..TestFile::new(&[("猫", "一种动物")])
    };
    assert_eq!(
        first_definition(&file),
        Definition::Html {
            html: "一种动物".into()
        }
    );
}

#[test]
fn reads_big5_entries() {
    let file = TestFile {
        encoding: "Big5".into(),
        ..TestFile::new(&[("貓", "一種動物")])
    };
    assert_eq!(
        first_definition(&file),
        Definition::Html {
            html: "一種動物".into()
        }
    );
}

#[test]
fn reads_records_spread_over_many_small_blocks() {
    let entries = [
        ("apple", "red"),
        ("banana", "yellow"),
        ("cherry", "dark red"),
    ];
    let file = TestFile {
        keys_per_block: 1,
        record_block_size: 3,
        version: FormatVersion::V1,
        ..TestFile::new(&entries)
    };
    assert_eq!(
        parse_test_file(&file).unwrap().entries[2].definitions,
        [Definition::Html {
            html: "dark red".into()
        }]
    );
}

fn parse_header_only(element: &str) -> Result<Dictionary, DictionaryError> {
    let mut source = DictionarySource::single("test.mdx", encode_header(element)).unwrap();
    parse_dictionary(&mut source)
}

#[test]
fn rejects_version_3() {
    assert!(matches!(
        parse_header_only(r#"<Dictionary GeneratedByEngineVersion="3.0"/>"#),
        Err(DictionaryError::Mdict(MdictError::UnsupportedVersion(_)))
    ));
}

#[test]
fn rejects_a_dictionary_that_needs_a_registration_code() {
    assert!(matches!(
        parse_header_only(r#"<Dictionary GeneratedByEngineVersion="2.0" Encrypted="1"/>"#),
        Err(DictionaryError::Mdict(MdictError::RegistrationRequired))
    ));
}

/// Parses a dictionary of the given entries and header attributes, and returns the alternates of its first entry.
fn first_alternates(attributes: &str, entries: &[(&str, &str)]) -> Vec<String> {
    let file = TestFile {
        attributes: format!(r#"Format="Html" {attributes}"#),
        ..TestFile::new(entries)
    };
    parse_test_file(&file).unwrap().entries[0]
        .alternates
        .clone()
}

const REDIRECT_IN_ANOTHER_CASE: &[(&str, &str)] = &[("Cat", "a feline"), ("kitty", "@@@LINK=cat")];
const REDIRECT_WITHOUT_PUNCTUATION: &[(&str, &str)] = &[
    ("ice-cream", "a frozen dessert"),
    ("gelato", "@@@LINK=ice cream"),
];

#[test]
fn follows_a_redirect_in_another_case_when_keys_are_not_case_sensitive() {
    let alternates = first_alternates(r#"KeyCaseSensitive="No""#, REDIRECT_IN_ANOTHER_CASE);
    assert_eq!(alternates, ["kitty"]);
}

#[test]
fn drops_a_redirect_in_another_case_when_keys_are_case_sensitive() {
    let alternates = first_alternates(r#"KeyCaseSensitive="Yes""#, REDIRECT_IN_ANOTHER_CASE);
    assert!(alternates.is_empty());
}

#[test]
fn ignores_punctuation_in_keys_and_redirects_when_keys_are_stripped() {
    let alternates = first_alternates(r#"StripKey="Yes""#, REDIRECT_WITHOUT_PUNCTUATION);
    assert_eq!(alternates, ["icecream", "gelato"]);
}

#[test]
fn keeps_punctuation_in_keys_and_redirects_significant_when_keys_are_not_stripped() {
    let alternates = first_alternates(r#"StripKey="No""#, REDIRECT_WITHOUT_PUNCTUATION);
    assert!(alternates.is_empty());
}
