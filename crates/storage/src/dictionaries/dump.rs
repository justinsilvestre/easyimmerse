//! Reading a stored dictionary back into the items an import receives, so that another server can import it whole.

use easyimmerse_core::dictionary::{
    DictionaryError, DictionaryMedia, DictionaryMetadata, DictionarySink, KanjiEntry, KanjiMeta,
    SinkResult, TagDefinition, TermEntry, TermMeta,
};
use rusqlite::{Connection, OptionalExtension, Row, params};

use super::DictionaryId;
use super::columns::{get_deflated_json, get_json, split_words};
use super::listing::get_dictionary;
use crate::error::StorageError;
use crate::owners::OwnerId;

/// Rows read per page of every section but media.
const PAGE_ROWS: i64 = 500;
/// Media files read per page, since each may be large.
const MEDIA_PAGE_ROWS: i64 = 8;

/// A dump of one dictionary in progress. Each page is read on its own, so a caller can release the
/// database between pages; a dictionary does not change once imported, so the pages fit together.
#[derive(Debug, Clone)]
pub struct DictionaryDump {
    pub metadata: DictionaryMetadata,
    /// When the dictionary was first imported, in milliseconds since the Unix epoch.
    pub imported_at: u64,
    number: i64,
    section: Section,
    after_rowid: i64,
    after_key: Option<String>,
}

/// The kinds of content, in the order an import receives them.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Section {
    Entries,
    TermMeta,
    Tags,
    Kanji,
    KanjiMeta,
    Media,
    Done,
}

impl Section {
    fn next(self) -> Self {
        match self {
            Section::Entries => Section::TermMeta,
            Section::TermMeta => Section::Tags,
            Section::Tags => Section::Kanji,
            Section::Kanji => Section::KanjiMeta,
            Section::KanjiMeta => Section::Media,
            Section::Media | Section::Done => Section::Done,
        }
    }
}

/// Passes a dictionary of the owner to the sink in import order: its metadata first, then its content.
pub fn dump_dictionary(
    conn: &Connection,
    owner: &OwnerId,
    id: &DictionaryId,
    sink: &mut dyn DictionarySink,
) -> Result<(), StorageError> {
    let mut dump = start_dump(conn, owner, id)?;
    sink.begin(dump.metadata.clone()).map_err(sink_error)?;
    while continue_dump(conn, &mut dump, sink)? {}
    Ok(())
}

/// Begins a dump of a dictionary of the owner. Another owner's dictionary is not found.
pub fn start_dump(
    conn: &Connection,
    owner: &OwnerId,
    id: &DictionaryId,
) -> Result<DictionaryDump, StorageError> {
    let number: Option<i64> = conn
        .query_row(
            "SELECT number FROM dictionaries WHERE id = ?1 AND owner_id = ?2",
            params![id.0, owner.0],
            |row| row.get(0),
        )
        .optional()?;
    let number = number.ok_or_else(|| StorageError::DictionaryNotFound(id.0.clone()))?;
    let stored = get_dictionary(conn, id)?;
    Ok(DictionaryDump {
        metadata: stored.metadata,
        imported_at: stored.imported_at,
        number,
        section: Section::Entries,
        after_rowid: 0,
        after_key: None,
    })
}

/// Passes the next page of the dump's content to the sink, and tells whether any content remains.
pub fn continue_dump(
    conn: &Connection,
    dump: &mut DictionaryDump,
    sink: &mut dyn DictionarySink,
) -> Result<bool, StorageError> {
    let read = match dump.section {
        Section::Entries => dump_entries(conn, dump, sink)?,
        Section::TermMeta => dump_rowid_page(conn, dump, sink, TERM_META_PAGE, feed_term_meta)?,
        Section::Tags => dump_tags(conn, dump, sink)?,
        Section::Kanji => dump_rowid_page(conn, dump, sink, KANJI_PAGE, feed_kanji)?,
        Section::KanjiMeta => dump_rowid_page(conn, dump, sink, KANJI_META_PAGE, feed_kanji_meta)?,
        Section::Media => dump_media(conn, dump, sink)?,
        Section::Done => return Ok(false),
    };
    let limit = match dump.section {
        Section::Media => MEDIA_PAGE_ROWS,
        _ => PAGE_ROWS,
    };
    if read < limit {
        dump.section = dump.section.next();
        dump.after_rowid = 0;
        dump.after_key = None;
    }
    Ok(dump.section != Section::Done)
}

const TERM_META_PAGE: &str = "SELECT rowid, term, reading, data FROM dictionary_term_meta
    WHERE dictionary_number = ?1 AND rowid > ?2 ORDER BY rowid LIMIT ?3";
const KANJI_PAGE: &str = "SELECT rowid, data FROM dictionary_kanji
    WHERE dictionary_number = ?1 AND rowid > ?2 ORDER BY rowid LIMIT ?3";
const KANJI_META_PAGE: &str = "SELECT rowid, character, data FROM dictionary_kanji_meta
    WHERE dictionary_number = ?1 AND rowid > ?2 ORDER BY rowid LIMIT ?3";

fn dump_entries(
    conn: &Connection,
    dump: &mut DictionaryDump,
    sink: &mut dyn DictionarySink,
) -> Result<i64, StorageError> {
    let mut statement = conn.prepare_cached(
        "SELECT id, term, reading, alternates, word_classes, score, sequence, term_tags,
             definition_tags, definitions
         FROM dictionary_entries WHERE dictionary_number = ?1 AND id > ?2 ORDER BY id LIMIT ?3",
    )?;
    let entries: Vec<(i64, TermEntry)> = statement
        .query_map(params![dump.number, dump.after_rowid, PAGE_ROWS], |row| {
            Ok((row.get(0)?, read_entry(row)?))
        })?
        .collect::<Result<_, _>>()?;
    let count = entries.len() as i64;
    for (rowid, entry) in entries {
        sink.term_entry(entry).map_err(sink_error)?;
        dump.after_rowid = rowid;
    }
    Ok(count)
}

fn read_entry(row: &Row) -> rusqlite::Result<TermEntry> {
    Ok(TermEntry {
        term: row.get(1)?,
        reading: row.get(2)?,
        alternates: get_json(row, 3)?,
        word_classes: split_words(&row.get::<_, String>(4)?),
        score: row.get(5)?,
        sequence: row.get(6)?,
        term_tags: split_words(&row.get::<_, String>(7)?),
        definition_tags: split_words(&row.get::<_, String>(8)?),
        definitions: get_deflated_json(row, 9)?,
    })
}

/// An item read from a row whose first column is its rowid, ready to be passed to a sink.
type Feed = fn(&Row) -> rusqlite::Result<Item>;

enum Item {
    TermMeta(TermMeta),
    Kanji(KanjiEntry),
    KanjiMeta(KanjiMeta),
}

fn dump_rowid_page(
    conn: &Connection,
    dump: &mut DictionaryDump,
    sink: &mut dyn DictionarySink,
    sql: &str,
    feed: Feed,
) -> Result<i64, StorageError> {
    let mut statement = conn.prepare_cached(sql)?;
    let items: Vec<(i64, Item)> = statement
        .query_map(params![dump.number, dump.after_rowid, PAGE_ROWS], |row| {
            Ok((row.get(0)?, feed(row)?))
        })?
        .collect::<Result<_, _>>()?;
    let count = items.len() as i64;
    for (rowid, item) in items {
        let fed: SinkResult = match item {
            Item::TermMeta(meta) => sink.term_meta(meta),
            Item::Kanji(entry) => sink.kanji_entry(entry),
            Item::KanjiMeta(meta) => sink.kanji_meta(meta),
        };
        fed.map_err(sink_error)?;
        dump.after_rowid = rowid;
    }
    Ok(count)
}

fn feed_term_meta(row: &Row) -> rusqlite::Result<Item> {
    Ok(Item::TermMeta(TermMeta {
        term: row.get(1)?,
        reading: row.get(2)?,
        data: get_json(row, 3)?,
    }))
}

fn feed_kanji(row: &Row) -> rusqlite::Result<Item> {
    Ok(Item::Kanji(get_json(row, 1)?))
}

fn feed_kanji_meta(row: &Row) -> rusqlite::Result<Item> {
    Ok(Item::KanjiMeta(KanjiMeta {
        character: row.get(1)?,
        frequency: get_json(row, 2)?,
    }))
}

/// Tags are paged by name, the key of their table, rather than by rowid.
fn dump_tags(
    conn: &Connection,
    dump: &mut DictionaryDump,
    sink: &mut dyn DictionarySink,
) -> Result<i64, StorageError> {
    let mut statement = conn.prepare_cached(
        "SELECT name, category, sort_order, notes, score FROM dictionary_tags
         WHERE dictionary_number = ?1 AND (?2 IS NULL OR name > ?2) ORDER BY name LIMIT ?3",
    )?;
    let tags: Vec<TagDefinition> = statement
        .query_map(params![dump.number, dump.after_key, PAGE_ROWS], |row| {
            Ok(TagDefinition {
                name: row.get(0)?,
                category: row.get(1)?,
                order: row.get(2)?,
                notes: row.get(3)?,
                score: row.get(4)?,
            })
        })?
        .collect::<Result<_, _>>()?;
    let count = tags.len() as i64;
    for tag in tags {
        dump.after_key = Some(tag.name.clone());
        sink.tag(tag).map_err(sink_error)?;
    }
    Ok(count)
}

/// Media files are paged by path, the key of their table, which lets each page start without reading the files before it.
fn dump_media(
    conn: &Connection,
    dump: &mut DictionaryDump,
    sink: &mut dyn DictionarySink,
) -> Result<i64, StorageError> {
    let mut statement = conn.prepare_cached(
        "SELECT path, media_type, bytes FROM dictionary_media
         WHERE dictionary_number = ?1 AND (?2 IS NULL OR path > ?2) ORDER BY path LIMIT ?3",
    )?;
    let files: Vec<DictionaryMedia> = statement
        .query_map(
            params![dump.number, dump.after_key, MEDIA_PAGE_ROWS],
            |row| {
                Ok(DictionaryMedia {
                    path: row.get(0)?,
                    media_type: row.get(1)?,
                    bytes: row.get(2)?,
                })
            },
        )?
        .collect::<Result<_, _>>()?;
    let count = files.len() as i64;
    for media in files {
        dump.after_key = Some(media.path.clone());
        sink.media(media).map_err(sink_error)?;
    }
    Ok(count)
}

fn sink_error(error: easyimmerse_core::dictionary::SinkError) -> StorageError {
    StorageError::from(DictionaryError::Sink(error))
}
