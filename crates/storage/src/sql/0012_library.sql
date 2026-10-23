-- Media that library managers prepare for everyone on the server. Server-local; does not sync.
-- `kind`, `difficulty` and `status` are the snake_case names of the core library enums.
CREATE TABLE library_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    language TEXT NOT NULL,
    translation_language TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('video', 'audio', 'document')),
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    tags_json TEXT NOT NULL,
    chapter_titles_json TEXT,          -- documents only: one entry per chapter, null entries for untitled ones
    file_name TEXT,                    -- the uploaded file's original name, null until uploaded
    size_bytes INTEGER,
    duration_ms INTEGER,               -- probed at publish, null for documents
    cover_at_ms INTEGER,               -- the video time of the cover frame
    status TEXT NOT NULL CHECK (status IN ('draft', 'processing', 'published', 'failed')),
    failure TEXT,                      -- why the last publish failed
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
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
