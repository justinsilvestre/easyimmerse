-- `complete` is zero while an import is still adding entries.
-- Every query hides incomplete dictionaries.
CREATE TABLE dictionaries (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    revision TEXT,
    stylesheet TEXT,
    entry_count INTEGER NOT NULL DEFAULT 0,
    complete INTEGER NOT NULL DEFAULT 0
);

-- The entries of each dictionary live in a table of their own, `dictionary_terms_<id>`.
-- Each block holds the deflated JSON array of the glossaries of consecutive entries.
CREATE TABLE dictionary_glossary_blocks (
    dictionary_id TEXT NOT NULL REFERENCES dictionaries(id) ON DELETE CASCADE,
    block INTEGER NOT NULL,
    glossaries BLOB NOT NULL,
    PRIMARY KEY (dictionary_id, block)
);

CREATE TABLE dictionary_assets (
    dictionary_id TEXT NOT NULL REFERENCES dictionaries(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    media_type TEXT NOT NULL,
    bytes BLOB NOT NULL,
    PRIMARY KEY (dictionary_id, path)
);
