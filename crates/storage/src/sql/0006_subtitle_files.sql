CREATE TABLE subtitle_files (
    id TEXT PRIMARY KEY,
    media_file_id TEXT NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    language TEXT,
    -- The file's text as added.
    text TEXT NOT NULL,
    -- The TimedTextFormat the text parsed as.
    format TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL
);

CREATE INDEX subtitle_files_by_media_file ON subtitle_files (media_file_id, created_at_ms);
