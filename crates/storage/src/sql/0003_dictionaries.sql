-- `number` orders dictionaries by import and is the key that every other dictionary table refers to.
-- An integer key keeps the rows of large dictionaries smaller than the 32-character `id` would.
-- The counts are written once an import finishes, so that listing never scans the content tables.
CREATE TABLE dictionaries (
    number INTEGER PRIMARY KEY,
    id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    revision TEXT,
    format TEXT NOT NULL,
    description TEXT,
    author TEXT,
    attribution TEXT,
    url TEXT,
    source_language TEXT,
    target_language TEXT,
    frequency_mode TEXT,
    stylesheet TEXT,
    imported_at INTEGER NOT NULL,
    entry_count INTEGER NOT NULL DEFAULT 0,
    term_meta_count INTEGER NOT NULL DEFAULT 0,
    tag_count INTEGER NOT NULL DEFAULT 0,
    kanji_count INTEGER NOT NULL DEFAULT 0,
    kanji_meta_count INTEGER NOT NULL DEFAULT 0,
    media_count INTEGER NOT NULL DEFAULT 0
);

-- `alternates` is a JSON array. `word_classes`, `term_tags` and `definition_tags` are space-separated.
-- `definitions` holds the entry's definitions as JSON, compressed with raw deflate.
CREATE TABLE dictionary_entries (
    id INTEGER PRIMARY KEY,
    dictionary_number INTEGER NOT NULL REFERENCES dictionaries(number) ON DELETE CASCADE,
    term TEXT NOT NULL,
    reading TEXT,
    alternates TEXT NOT NULL,
    word_classes TEXT NOT NULL,
    score INTEGER NOT NULL,
    sequence INTEGER,
    term_tags TEXT NOT NULL,
    definition_tags TEXT NOT NULL,
    definitions BLOB NOT NULL
);

CREATE INDEX dictionary_entries_by_dictionary ON dictionary_entries (dictionary_number);

-- One row for each distinct term, reading and alternate of an entry.
-- The key leads with the headword alone, so that one lookup spans every dictionary.
-- NOCASE folds only ASCII letters, as StarDict lookup does.
CREATE TABLE dictionary_headwords (
    headword TEXT NOT NULL COLLATE NOCASE,
    entry_id INTEGER NOT NULL,
    dictionary_number INTEGER NOT NULL REFERENCES dictionaries(number) ON DELETE CASCADE,
    PRIMARY KEY (headword, entry_id)
) WITHOUT ROWID;

CREATE INDEX dictionary_headwords_by_dictionary ON dictionary_headwords (dictionary_number);

-- `kind` is `frequency`, `pitch` or `ipa`; `value` is the numeric frequency, for sorting; `data` is the JSON of the meta.
CREATE TABLE dictionary_term_meta (
    dictionary_number INTEGER NOT NULL REFERENCES dictionaries(number) ON DELETE CASCADE,
    term TEXT NOT NULL,
    reading TEXT,
    kind TEXT NOT NULL,
    value REAL,
    data TEXT NOT NULL
);

CREATE INDEX dictionary_term_meta_by_term ON dictionary_term_meta (term);
CREATE INDEX dictionary_term_meta_by_dictionary ON dictionary_term_meta (dictionary_number);

CREATE TABLE dictionary_tags (
    dictionary_number INTEGER NOT NULL REFERENCES dictionaries(number) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    notes TEXT NOT NULL,
    score INTEGER NOT NULL,
    PRIMARY KEY (dictionary_number, name)
);

CREATE TABLE dictionary_kanji (
    dictionary_number INTEGER NOT NULL REFERENCES dictionaries(number) ON DELETE CASCADE,
    character TEXT NOT NULL,
    data TEXT NOT NULL
);

CREATE INDEX dictionary_kanji_by_character ON dictionary_kanji (character);
CREATE INDEX dictionary_kanji_by_dictionary ON dictionary_kanji (dictionary_number);

CREATE TABLE dictionary_kanji_meta (
    dictionary_number INTEGER NOT NULL REFERENCES dictionaries(number) ON DELETE CASCADE,
    character TEXT NOT NULL,
    data TEXT NOT NULL
);

CREATE INDEX dictionary_kanji_meta_by_character ON dictionary_kanji_meta (character);
CREATE INDEX dictionary_kanji_meta_by_dictionary ON dictionary_kanji_meta (dictionary_number);

CREATE TABLE dictionary_media (
    dictionary_number INTEGER NOT NULL REFERENCES dictionaries(number) ON DELETE CASCADE,
    path TEXT NOT NULL,
    media_type TEXT NOT NULL,
    bytes BLOB NOT NULL,
    PRIMARY KEY (dictionary_number, path)
);
