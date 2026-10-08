CREATE TABLE flashcards (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    media_file_id TEXT REFERENCES media_files(id) ON DELETE SET NULL,
    cue_index INTEGER,
    word_start INTEGER,
    content_json TEXT NOT NULL,
    included_fields_json TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
);

CREATE INDEX flashcards_by_project ON flashcards (project_id, created_at_ms);
CREATE INDEX flashcards_by_media_file ON flashcards (media_file_id);
