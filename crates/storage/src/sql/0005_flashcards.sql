CREATE TABLE flashcards (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    media_file_id TEXT REFERENCES media_files(id) ON DELETE SET NULL,
    -- FlashcardFields as JSON.
    fields_json TEXT NOT NULL,
    -- A list of FlashcardFieldKey as JSON.
    included_fields_json TEXT NOT NULL,
    -- A data URL such as data:image/jpeg;base64,...
    screenshot_data_url TEXT,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
);

CREATE INDEX flashcards_by_project ON flashcards (project_id, created_at_ms);
CREATE INDEX flashcards_by_media_file ON flashcards (media_file_id);
