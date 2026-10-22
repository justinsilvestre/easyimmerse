-- Whose data a top-level row is: `launch` for the holder of the launch token, which is the device's own data,
-- or the id of an account in `users`. Deleting an owner deletes everything it owns.
CREATE TABLE owners (
    id TEXT PRIMARY KEY
);
INSERT INTO owners (id) VALUES ('launch');

CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_language TEXT NOT NULL,
    translation_language TEXT NOT NULL,
    flashcard_fields_json TEXT NOT NULL,
    default_tags_json TEXT NOT NULL,
    tags_media_name INTEGER NOT NULL,
    fills_audio_with_tts INTEGER NOT NULL,
    flashcard_front_fields_json TEXT NOT NULL,
    lists_anki_deletions INTEGER NOT NULL,
    created_at_ms INTEGER NOT NULL,
    last_opened_at_ms INTEGER NOT NULL,
    uses_anki_connect INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX projects_by_owner ON projects (owner_id, last_opened_at_ms);
