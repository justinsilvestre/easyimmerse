CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_language TEXT NOT NULL,
    translation_language TEXT NOT NULL,
    flashcard_fields_json TEXT NOT NULL,
    default_tags_json TEXT NOT NULL,
    tags_media_name INTEGER NOT NULL,
    fills_audio_with_tts INTEGER NOT NULL,
    created_at_ms INTEGER NOT NULL,
    last_opened_at_ms INTEGER NOT NULL
);
