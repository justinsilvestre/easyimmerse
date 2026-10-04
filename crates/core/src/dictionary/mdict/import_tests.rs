use crate::dictionary::mdict::block::LZO;
use crate::dictionary::mdict::header::FormatVersion;
use crate::dictionary::mdict::test_writer::{TestFile, encode_header};
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

#[derive(Default)]
struct MediaCollector(Vec<DictionaryMedia>);

impl DictionarySink for MediaCollector {
    fn begin(&mut self, _: DictionaryMetadata) -> SinkResult {
        Ok(())
    }
    fn term_entry(&mut self, _: TermEntry) -> SinkResult {
        Ok(())
    }
    fn term_meta(&mut self, _: TermMeta) -> SinkResult {
        Ok(())
    }
    fn tag(&mut self, _: TagDefinition) -> SinkResult {
        Ok(())
    }
    fn kanji_entry(&mut self, _: KanjiEntry) -> SinkResult {
        Ok(())
    }
    fn kanji_meta(&mut self, _: KanjiMeta) -> SinkResult {
        Ok(())
    }
    fn media(&mut self, media: DictionaryMedia) -> SinkResult {
        self.0.push(media);
        Ok(())
    }
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
    assert_eq!(
        sample().metadata.stylesheet.as_deref(),
        Some(".cat b { color: #a33; }\n")
    );
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
        "<b>cat</b><i>a small domesticated feline. ",
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
    let media: Vec<(String, String)> = collector
        .0
        .into_iter()
        .map(|media| (media.path, media.media_type))
        .collect();
    assert_eq!(media, [("cat.png".to_string(), "image/png".to_string())]);
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
