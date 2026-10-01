CREATE TABLE media_files (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    source_json TEXT NOT NULL,
    duration_ms INTEGER,
    added_at TEXT NOT NULL
);

CREATE INDEX media_files_by_project ON media_files (project_id);

CREATE TABLE subtitle_tracks (
    id TEXT PRIMARY KEY,
    media_id TEXT NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    language TEXT,
    source_json TEXT NOT NULL
);

CREATE INDEX subtitle_tracks_by_media ON subtitle_tracks (media_id);

CREATE TABLE flashcards (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    media_id TEXT REFERENCES media_files(id) ON DELETE SET NULL,
    fields_json TEXT NOT NULL,
    tags_json TEXT NOT NULL,
    clip_start_ms INTEGER,
    clip_end_ms INTEGER,
    screenshot_ms INTEGER,
    created_at TEXT NOT NULL
);

CREATE INDEX flashcards_by_project ON flashcards (project_id, created_at);

ALTER TABLE dictionaries ADD COLUMN source_language TEXT;
ALTER TABLE dictionaries ADD COLUMN target_language TEXT;
