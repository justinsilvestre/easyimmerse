CREATE TABLE flashcards (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    media_file_id TEXT REFERENCES media_files(id) ON DELETE SET NULL,
    cue_index INTEGER,
    word_start INTEGER,
    content_json TEXT NOT NULL,
    included_fields_json TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    exported_at_ms INTEGER,
    was_packaged INTEGER NOT NULL DEFAULT 0,
    sent_at_ms INTEGER,
    -- 1 for a flashcard the server built from a library item, whose content cannot be changed
    is_from_library INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX flashcards_by_project ON flashcards (project_id, created_at_ms);
CREATE INDEX flashcards_by_media_file ON flashcards (media_file_id);

-- Deleted flashcards that had reached Anki, whose notes may still be there,
-- until AnkiConnect deletes them, the user marks them done, or the project is deleted.
CREATE TABLE anki_pending_deletions (
    flashcard_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    requested_at_ms INTEGER NOT NULL
);

CREATE INDEX anki_pending_deletions_by_project ON anki_pending_deletions (project_id, requested_at_ms);
