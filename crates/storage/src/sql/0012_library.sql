-- What holds for the whole library: one row. `language` is null until a library manager sets it,
-- which is possible only while the library has no items. Server-local; does not sync.
CREATE TABLE library_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    language TEXT
);
INSERT INTO library_settings (id, language) VALUES (1, NULL);

-- Media that library managers prepare for everyone on the server, in the library's language. Server-local; does not sync.
-- `kind`, `status` and `cover_kind` are the snake_case names of the core library enums;
-- `difficulty` is a level of the Common European Framework of Reference for Languages, A1 to C2.
CREATE TABLE library_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    translation_language TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('video', 'audio', 'document')),
    difficulty TEXT CHECK (difficulty IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    tags_json TEXT NOT NULL,
    chapter_titles_json TEXT,          -- documents only: one entry per chapter, null entries for untitled ones
    file_name TEXT,                    -- the uploaded file's original name, null until uploaded
    size_bytes INTEGER,
    duration_ms INTEGER,               -- probed at publish, null for documents
    cover_kind TEXT NOT NULL DEFAULT 'automatic' CHECK (cover_kind IN ('automatic', 'frame', 'uploaded')),
    cover_at_ms INTEGER,               -- the video time of a chosen cover frame
    cover_media_type TEXT,             -- the type of the cover picture kept in the item's files, null when there is none
    status TEXT NOT NULL CHECK (status IN ('draft', 'processing', 'published', 'failed')),
    failure TEXT,                      -- why the last publish failed
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    track_selection_json TEXT          -- the tracks learners play, a `TrackSelection` taken from the manager's media file at publish
);

-- A subtitle cue of a video or audio item, or a paragraph of a document, with the words the manager set.
-- `words_json` is a JSON array of `LibraryWord`; offsets count UTF-16 code units of `text`, as flashcard `word_start` does.
CREATE TABLE library_segments (
    item_id TEXT NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
    segment_index INTEGER NOT NULL,
    chapter_index INTEGER,
    start_ms INTEGER,
    end_ms INTEGER,
    screenshot_at_ms INTEGER,          -- video only: the midpoint of the cue, fixed at publish
    text TEXT NOT NULL,
    translation TEXT,
    words_json TEXT NOT NULL,
    PRIMARY KEY (item_id, segment_index)
) WITHOUT ROWID;
