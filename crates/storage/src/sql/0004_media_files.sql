CREATE TABLE media_files (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    source_kind TEXT NOT NULL,
    source_path TEXT,
    browser_file_size INTEGER,
    browser_file_last_modified_ms INTEGER,
    created_at_ms INTEGER NOT NULL,
    track_selection_json TEXT,
    -- A SubtitleSelection as JSON. Null reads as no subtitles chosen.
    subtitle_selection_json TEXT
);

CREATE INDEX media_files_by_project ON media_files (project_id, created_at_ms);
