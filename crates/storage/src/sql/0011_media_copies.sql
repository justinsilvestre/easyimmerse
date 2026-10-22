-- Media bytes this server keeps itself: uploads on a remote, downloads on a device. `file_name` is relative to the uploads directory.
-- The table is server-local and does not sync.
CREATE TABLE media_copies (
    media_file_id TEXT PRIMARY KEY REFERENCES media_files(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL UNIQUE,
    size_bytes INTEGER NOT NULL,
    stored_at_ms INTEGER NOT NULL
);

-- The files of copies that are gone, whichever way their row went: removed, replaced, or deleted with their
-- media file, project or account. The server deletes these files and then their rows.
CREATE TABLE released_media_copies (
    file_name TEXT PRIMARY KEY
) WITHOUT ROWID;

CREATE TRIGGER media_copies_released AFTER DELETE ON media_copies BEGIN
    INSERT OR IGNORE INTO released_media_copies (file_name) VALUES (OLD.file_name);
END;

-- Turning off the choice to keep a copy on a server drops the copy here and what is known of the remote's.
CREATE TRIGGER media_copies_dropped_with_choice AFTER UPDATE OF is_upload_chosen ON media_files
WHEN NEW.is_upload_chosen = 0 BEGIN
    DELETE FROM media_copies WHERE media_file_id = NEW.id;
    DELETE FROM remote_copies WHERE media_file_id = NEW.id;
END;
