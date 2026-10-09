CREATE TABLE subtitle_tracks (
    id TEXT PRIMARY KEY,
    media_file_id TEXT NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    format TEXT NOT NULL,
    source_json TEXT NOT NULL,
    sample TEXT,
    created_at_ms INTEGER NOT NULL
);

CREATE INDEX subtitle_tracks_by_media_file ON subtitle_tracks (media_file_id, created_at_ms);
CREATE INDEX subtitle_tracks_by_source_path ON subtitle_tracks (json_extract(source_json, '$.path'));
