CREATE TABLE dictionaries (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    revision TEXT
);

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
