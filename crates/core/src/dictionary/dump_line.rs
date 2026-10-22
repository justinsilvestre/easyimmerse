use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

use super::dictionary_media::DictionaryMedia;
use super::kanji_entry::{KanjiEntry, KanjiMeta};
use super::metadata::DictionaryMetadata;
use super::sink::{DictionarySink, SinkError, SinkResult};
use super::tag_definition::TagDefinition;
use super::term_entry::TermEntry;
use super::term_meta::TermMeta;

/// One line of a stored dictionary as two servers exchange it, written as one JSON object per line.
/// A dump begins with `Begin`, then lists the content in import order, and closes with `End`,
/// so that a receiver can tell a whole dump from one cut short.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum DictionaryDumpLine {
    Begin {
        metadata: DictionaryMetadata,
        /// When the dictionary was first imported, in milliseconds since the Unix epoch.
        imported_at: u64,
    },
    TermEntry {
        entry: TermEntry,
    },
    TermMeta {
        meta: TermMeta,
    },
    Tag {
        tag: TagDefinition,
    },
    KanjiEntry {
        entry: KanjiEntry,
    },
    KanjiMeta {
        meta: KanjiMeta,
    },
    Media {
        path: String,
        media_type: String,
        #[serde(rename = "bytes_base64", with = "base64_bytes")]
        bytes: Vec<u8>,
    },
    End,
}

impl DictionaryDumpLine {
    /// Passes the content of the line to the sink. `Begin` and `End` carry no content; the receiver handles them.
    pub fn feed(self, sink: &mut dyn DictionarySink) -> SinkResult {
        match self {
            DictionaryDumpLine::Begin { metadata, .. } => sink.begin(metadata),
            DictionaryDumpLine::TermEntry { entry } => sink.term_entry(entry),
            DictionaryDumpLine::TermMeta { meta } => sink.term_meta(meta),
            DictionaryDumpLine::Tag { tag } => sink.tag(tag),
            DictionaryDumpLine::KanjiEntry { entry } => sink.kanji_entry(entry),
            DictionaryDumpLine::KanjiMeta { meta } => sink.kanji_meta(meta),
            DictionaryDumpLine::Media {
                path,
                media_type,
                bytes,
            } => sink.media(DictionaryMedia {
                path,
                media_type,
                bytes,
            }),
            DictionaryDumpLine::End => Ok(()),
        }
    }
}

/// Collects the content a sink receives as dump lines. `begin` is left out, since `Begin` also needs the import time.
#[derive(Debug, Default)]
pub struct DumpLineCollector {
    pub lines: Vec<DictionaryDumpLine>,
}

impl DictionarySink for DumpLineCollector {
    fn begin(&mut self, _metadata: DictionaryMetadata) -> SinkResult {
        Ok(())
    }

    fn term_entry(&mut self, entry: TermEntry) -> SinkResult {
        self.lines.push(DictionaryDumpLine::TermEntry { entry });
        Ok(())
    }

    fn term_alternates(&mut self, term: String, _alternates: Vec<String>) -> SinkResult {
        Err(SinkError(
            format!("a dump lists every alternate in its entry, not apart from it ({term})").into(),
        ))
    }

    fn term_meta(&mut self, meta: TermMeta) -> SinkResult {
        self.lines.push(DictionaryDumpLine::TermMeta { meta });
        Ok(())
    }

    fn tag(&mut self, tag: TagDefinition) -> SinkResult {
        self.lines.push(DictionaryDumpLine::Tag { tag });
        Ok(())
    }

    fn kanji_entry(&mut self, entry: KanjiEntry) -> SinkResult {
        self.lines.push(DictionaryDumpLine::KanjiEntry { entry });
        Ok(())
    }

    fn kanji_meta(&mut self, meta: KanjiMeta) -> SinkResult {
        self.lines.push(DictionaryDumpLine::KanjiMeta { meta });
        Ok(())
    }

    fn media(&mut self, media: DictionaryMedia) -> SinkResult {
        self.lines.push(DictionaryDumpLine::Media {
            path: media.path,
            media_type: media.media_type,
            bytes: media.bytes,
        });
        Ok(())
    }
}

mod base64_bytes {
    use super::*;

    pub fn serialize<S: Serializer>(bytes: &[u8], serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&STANDARD.encode(bytes))
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(deserializer: D) -> Result<Vec<u8>, D::Error> {
        let text = String::deserialize(deserializer)?;
        STANDARD.decode(text).map_err(serde::de::Error::custom)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dictionary::{Definition, DictionaryFormatKind};

    fn round_trip(line: &DictionaryDumpLine) -> DictionaryDumpLine {
        serde_json::from_str(&serde_json::to_string(line).unwrap()).unwrap()
    }

    #[test]
    fn names_each_line_by_its_kind() {
        let line = DictionaryDumpLine::End;
        assert_eq!(serde_json::to_string(&line).unwrap(), r#"{"kind":"end"}"#);
    }

    #[test]
    fn writes_media_bytes_as_base64() {
        let line = DictionaryDumpLine::Media {
            path: "a.png".to_string(),
            media_type: "image/png".to_string(),
            bytes: vec![0, 1, 2],
        };
        let json: serde_json::Value = serde_json::to_value(&line).unwrap();
        assert_eq!(json["bytes_base64"], "AAEC");
    }

    #[test]
    fn round_trips_media_bytes() {
        let line = DictionaryDumpLine::Media {
            path: "a.png".to_string(),
            media_type: "image/png".to_string(),
            bytes: vec![255, 0, 7],
        };
        assert_eq!(round_trip(&line), line);
    }

    #[test]
    fn round_trips_a_beginning() {
        let line = DictionaryDumpLine::Begin {
            metadata: DictionaryMetadata::new("Sample", DictionaryFormatKind::Yomitan),
            imported_at: 1_000,
        };
        assert_eq!(round_trip(&line), line);
    }

    #[test]
    fn round_trips_an_entry_whose_definitions_are_tagged_too() {
        let line = DictionaryDumpLine::TermEntry {
            entry: TermEntry::new("cat", vec![Definition::text("a small feline")]),
        };
        assert_eq!(round_trip(&line), line);
    }

    #[test]
    fn refuses_media_whose_bytes_are_not_base64() {
        let json = r#"{"kind":"media","path":"a","media_type":"b","bytes_base64":"%%"}"#;
        assert!(serde_json::from_str::<DictionaryDumpLine>(json).is_err());
    }

    #[test]
    fn collects_an_entry_as_a_line() {
        let mut collector = DumpLineCollector::default();
        collector
            .term_entry(TermEntry::new("cat", Vec::new()))
            .unwrap();
        assert_eq!(collector.lines.len(), 1);
    }
}
