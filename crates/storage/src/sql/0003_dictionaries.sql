CREATE TABLE dictionaries (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    revision TEXT,
    format TEXT NOT NULL,
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    -- The order among the dictionaries of the same source language.
    position INTEGER NOT NULL
);

CREATE INDEX dictionaries_by_language ON dictionaries (source_language, position);

CREATE TABLE dictionary_entries (
    id INTEGER PRIMARY KEY,
    dictionary_id TEXT NOT NULL REFERENCES dictionaries(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    reading TEXT,
    definitions_json TEXT NOT NULL,
    tags_json TEXT NOT NULL
);

CREATE INDEX dictionary_entries_by_term ON dictionary_entries (dictionary_id, term);
CREATE INDEX dictionary_entries_by_reading ON dictionary_entries (dictionary_id, reading);
