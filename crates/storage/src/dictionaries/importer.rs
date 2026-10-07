use easyimmerse_core::dictionary::{
    self, DictionaryError, DictionaryFormatKind, DictionaryMedia, DictionaryMetadata,
    DictionarySink, DictionarySource, KanjiEntry, KanjiMeta, SinkError, SinkResult, TagDefinition,
    TermEntry, TermMeta, TermMetaData, media_key,
};
use easyimmerse_core::lookup::fold_case;
use rusqlite::{Connection, Transaction, params};

use super::DictionaryId;
use super::columns::{JsonDeflater, enum_text, join_words};
use crate::error::StorageError;

/// Reads a dictionary from its files into the database in one transaction, and returns its new id.
/// Nothing is stored when the files cannot be read.
pub fn import_dictionary(
    conn: &mut Connection,
    source: &mut DictionarySource,
    imported_at: u64,
) -> Result<DictionaryId, StorageError> {
    import_with(conn, imported_at, |sink| {
        dictionary::import_dictionary(source, sink).map(|_| ())
    })
}

/// Stores what `read` passes to the sink, in one transaction.
pub fn import_with(
    conn: &mut Connection,
    imported_at: u64,
    read: impl FnOnce(&mut dyn DictionarySink) -> Result<(), DictionaryError>,
) -> Result<DictionaryId, StorageError> {
    let transaction = conn.transaction()?;
    let mut importer = DictionaryImporter {
        transaction: &transaction,
        imported_at,
        started: None,
        deflater: JsonDeflater::new(),
    };
    read(&mut importer)?;
    let started = importer.started.ok_or(StorageError::ImportOutOfOrder)?;
    record_counts(&transaction, started.number)?;
    transaction.commit()?;
    Ok(started.id)
}

/// Writes each item a format reads straight to the database through cached prepared statements.
struct DictionaryImporter<'a> {
    transaction: &'a Transaction<'a>,
    imported_at: u64,
    /// The dictionary row, once `begin` has written it.
    started: Option<StartedDictionary>,
    deflater: JsonDeflater,
}

struct StartedDictionary {
    number: i64,
    id: DictionaryId,
    format: DictionaryFormatKind,
}

impl DictionaryImporter<'_> {
    fn started(&self) -> Result<&StartedDictionary, StorageError> {
        self.started.as_ref().ok_or(StorageError::ImportOutOfOrder)
    }

    fn number(&self) -> Result<i64, StorageError> {
        Ok(self.started()?.number)
    }

    /// Tells whether a dictionary with the title was imported before, so that the same file is not imported twice.
    fn has_dictionary_titled(&self, title: &str) -> Result<bool, StorageError> {
        let count: i64 = self.transaction.query_row(
            "SELECT COUNT(*) FROM dictionaries WHERE title = ?1",
            params![title],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }

    fn insert_metadata(
        &self,
        metadata: &DictionaryMetadata,
    ) -> Result<StartedDictionary, StorageError> {
        if self.has_dictionary_titled(&metadata.title)? {
            return Err(StorageError::DictionaryAlreadyImported(
                metadata.title.clone(),
            ));
        }
        let id = DictionaryId::generate();
        let frequency_mode = metadata
            .frequency_mode
            .as_ref()
            .map(enum_text)
            .transpose()?;
        self.transaction.execute(
            "INSERT INTO dictionaries (id, title, revision, format, description, author, attribution,
                 url, source_language, target_language, frequency_mode, stylesheet, imported_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                id.0,
                metadata.title,
                metadata.revision,
                enum_text(&metadata.format)?,
                metadata.description,
                metadata.author,
                metadata.attribution,
                metadata.url,
                metadata.source_language,
                metadata.target_language,
                frequency_mode,
                metadata.stylesheet,
                i64::try_from(self.imported_at).unwrap_or(i64::MAX),
            ],
        )?;
        Ok(StartedDictionary {
            number: self.transaction.last_insert_rowid(),
            id,
            format: metadata.format,
        })
    }

    fn insert_entry(&mut self, entry: &TermEntry) -> Result<(), StorageError> {
        let number = self.number()?;
        let definitions = self.deflater.deflate(&entry.definitions)?;
        self.transaction
            .prepare_cached(
                "INSERT INTO dictionary_entries (dictionary_number, term, reading, alternates,
                     word_classes, score, sequence, term_tags, definition_tags, definitions)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            )?
            .execute(params![
                number,
                entry.term,
                entry.reading,
                serde_json::to_string(&entry.alternates)?,
                join_words(&entry.word_classes),
                entry.score,
                entry.sequence,
                join_words(&entry.term_tags),
                join_words(&entry.definition_tags),
                definitions,
            ])?;
        let entry_id = self.transaction.last_insert_rowid();
        self.insert_headwords(entry_id, &entry.headwords())
    }

    fn insert_headwords(&self, entry_id: i64, headwords: &[&str]) -> Result<(), StorageError> {
        let mut statement = self.transaction.prepare_cached(
            "INSERT OR IGNORE INTO dictionary_headwords (folded_headword, entry_id, dictionary_number)
             VALUES (?1, ?2, ?3)",
        )?;
        for headword in headwords {
            statement.execute(params![fold_case(headword), entry_id, self.number()?])?;
        }
        Ok(())
    }

    /// Adds alternates to the stored entries of this dictionary whose term is `term`, found through their headwords.
    fn add_alternates(&self, term: &str, alternates: Vec<String>) -> Result<(), StorageError> {
        let entries: Vec<(i64, String)> = self
            .transaction
            .prepare_cached(
                "SELECT e.id, e.alternates FROM dictionary_headwords h
                 JOIN dictionary_entries e ON e.id = h.entry_id
                 WHERE h.folded_headword = ?1 AND h.dictionary_number = ?2 AND e.term = ?3",
            )?
            .query_map(params![fold_case(term), self.number()?, term], |row| {
                Ok((row.get(0)?, row.get(1)?))
            })?
            .collect::<Result<_, _>>()?;
        for (entry_id, stored) in entries {
            let mut entry = TermEntry::new(term, Vec::new());
            entry.alternates = serde_json::from_str(&stored)?;
            entry.add_alternates(alternates.iter().cloned());
            self.transaction
                .prepare_cached("UPDATE dictionary_entries SET alternates = ?1 WHERE id = ?2")?
                .execute(params![serde_json::to_string(&entry.alternates)?, entry_id])?;
            self.insert_headwords(entry_id, &entry.headwords())?;
        }
        Ok(())
    }

    fn insert_term_meta(&self, meta: &TermMeta) -> Result<(), StorageError> {
        let (kind, value) = match &meta.data {
            TermMetaData::Frequency(frequency) => ("frequency", frequency.value),
            TermMetaData::Pitch { .. } => ("pitch", None),
            TermMetaData::Ipa { .. } => ("ipa", None),
        };
        self.transaction
            .prepare_cached(
                "INSERT INTO dictionary_term_meta (dictionary_number, term, reading, kind, value, data)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            )?
            .execute(params![
                self.number()?,
                meta.term,
                meta.reading,
                kind,
                value,
                serde_json::to_string(&meta.data)?,
            ])?;
        Ok(())
    }

    fn insert_tag(&self, tag: &TagDefinition) -> Result<(), StorageError> {
        self.transaction
            .prepare_cached(
                "INSERT OR REPLACE INTO dictionary_tags
                     (dictionary_number, name, category, sort_order, notes, score)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            )?
            .execute(params![
                self.number()?,
                tag.name,
                tag.category,
                tag.order,
                tag.notes,
                tag.score,
            ])?;
        Ok(())
    }

    fn insert_character_row(
        &self,
        table: &str,
        character: &str,
        data: String,
    ) -> Result<(), StorageError> {
        let sql =
            format!("INSERT INTO {table} (dictionary_number, character, data) VALUES (?1, ?2, ?3)");
        self.transaction
            .prepare_cached(&sql)?
            .execute(params![self.number()?, character, data])?;
        Ok(())
    }

    /// Stores a file under its media key. When two files share a key, the first one stored is kept.
    fn insert_media(&self, media: &DictionaryMedia) -> Result<(), StorageError> {
        let started = self.started()?;
        self.transaction
            .prepare_cached(
                "INSERT OR IGNORE INTO dictionary_media (dictionary_number, path, media_type, bytes)
                 VALUES (?1, ?2, ?3, ?4)",
            )?
            .execute(params![
                started.number,
                media_key(started.format, &media.path),
                media.media_type,
                media.bytes
            ])?;
        Ok(())
    }
}

impl DictionarySink for DictionaryImporter<'_> {
    fn begin(&mut self, metadata: DictionaryMetadata) -> SinkResult {
        if self.started.is_some() {
            return Err(sink_error(StorageError::ImportOutOfOrder));
        }
        self.started = Some(self.insert_metadata(&metadata).map_err(sink_error)?);
        Ok(())
    }

    fn term_entry(&mut self, entry: TermEntry) -> SinkResult {
        self.insert_entry(&entry).map_err(sink_error)
    }

    fn term_alternates(&mut self, term: String, alternates: Vec<String>) -> SinkResult {
        self.add_alternates(&term, alternates).map_err(sink_error)
    }

    fn term_meta(&mut self, meta: TermMeta) -> SinkResult {
        self.insert_term_meta(&meta).map_err(sink_error)
    }

    fn tag(&mut self, tag: TagDefinition) -> SinkResult {
        self.insert_tag(&tag).map_err(sink_error)
    }

    fn kanji_entry(&mut self, entry: KanjiEntry) -> SinkResult {
        let data = serde_json::to_string(&entry).map_err(sink_error)?;
        self.insert_character_row("dictionary_kanji", &entry.character, data)
            .map_err(sink_error)
    }

    fn kanji_meta(&mut self, meta: KanjiMeta) -> SinkResult {
        let data = serde_json::to_string(&meta.frequency).map_err(sink_error)?;
        self.insert_character_row("dictionary_kanji_meta", &meta.character, data)
            .map_err(sink_error)
    }

    fn media(&mut self, media: DictionaryMedia) -> SinkResult {
        self.insert_media(&media).map_err(sink_error)
    }
}

fn sink_error(error: impl Into<StorageError>) -> SinkError {
    SinkError(Box::new(error.into()))
}

/// Counts what the import stored, through the per-dictionary indexes.
fn record_counts(transaction: &Transaction, number: i64) -> Result<(), StorageError> {
    transaction.execute(
        "UPDATE dictionaries SET
             entry_count = (SELECT COUNT(*) FROM dictionary_entries WHERE dictionary_number = ?1),
             term_meta_count = (SELECT COUNT(*) FROM dictionary_term_meta WHERE dictionary_number = ?1),
             tag_count = (SELECT COUNT(*) FROM dictionary_tags WHERE dictionary_number = ?1),
             kanji_count = (SELECT COUNT(*) FROM dictionary_kanji WHERE dictionary_number = ?1),
             kanji_meta_count = (SELECT COUNT(*) FROM dictionary_kanji_meta WHERE dictionary_number = ?1),
             media_count = (SELECT COUNT(*) FROM dictionary_media WHERE dictionary_number = ?1)
         WHERE number = ?1",
        [number],
    )?;
    Ok(())
}
