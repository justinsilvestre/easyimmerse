-- An alignment belongs to the document `media_file_id` and names its counterpart (the audio file or
-- the translation) in `counterpart_media_file_id`, so that removing either file removes the alignment.
-- `kind` is `audio` or `translation`; `content_json` is the JSON of the `AlignmentContent`.
CREATE TABLE alignments (
    id TEXT PRIMARY KEY,
    media_file_id TEXT NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
    counterpart_media_file_id TEXT NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    provider TEXT,
    content_json TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL
);

CREATE INDEX alignments_by_media_file ON alignments (media_file_id, created_at_ms);
CREATE INDEX alignments_by_counterpart ON alignments (counterpart_media_file_id);

-- The translation a document is paired with before the two are aligned.
ALTER TABLE media_files ADD COLUMN translation_media_file_id TEXT
    REFERENCES media_files(id) ON DELETE SET NULL;
