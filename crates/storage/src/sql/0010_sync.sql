-- The registry of changes to the rows that sync between servers, kept up to date by triggers.

-- The last change sequence this server gave out. Every write to a synced row takes the next one.
CREATE TABLE sync_clock (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_seq INTEGER NOT NULL
);
INSERT INTO sync_clock (id, last_seq) VALUES (1, 0);

-- One entry per synced row, alive or deleted: what changed when, in the order a pull returns it.
-- `row_key` is the row's id, or the composite key spelled out for the few tables that have one.
-- `project_id` is the project a row belongs to, or null for dictionaries, preferences and review parameters.
-- `updated_at_ms` is when the row last changed on any server, which settles which of two changes is kept.
CREATE TABLE sync_rows (
    table_name TEXT NOT NULL,
    row_key TEXT NOT NULL,
    owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    project_id TEXT,
    change_seq INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (table_name, row_key, owner_id)
) WITHOUT ROWID;
CREATE UNIQUE INDEX sync_rows_by_owner ON sync_rows (owner_id, change_seq);
CREATE INDEX sync_rows_by_project ON sync_rows (project_id, change_seq);

-- The servers this server keeps a copy of an owner's data on. One account link and one LAN link per owner at most.
-- `kind` is `account` or `lan`. `session_token` is null once the remote has logged this server out.
-- `pulled_cursor` is the remote's change sequence up to which this server has pulled;
-- `pushed_through_seq` is this server's change sequence up to which the remote holds every change.
CREATE TABLE sync_remotes (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    server_url TEXT NOT NULL,
    session_token TEXT,
    account_id TEXT NOT NULL,
    account_email TEXT NOT NULL,
    account_role TEXT NOT NULL,
    linked_at_ms INTEGER NOT NULL,
    pulled_cursor INTEGER NOT NULL DEFAULT 0,
    pushed_through_seq INTEGER NOT NULL DEFAULT 0,
    last_synced_at_ms INTEGER,
    UNIQUE (owner_id, kind)
);

-- The modification time of each row as the remote last had it, which tells a local change from a concurrent one.
CREATE TABLE sync_bases (
    remote_id TEXT NOT NULL REFERENCES sync_remotes(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    row_key TEXT NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    PRIMARY KEY (remote_id, table_name, row_key)
) WITHOUT ROWID;

-- Rows pulled from a remote and not yet applied, so that a pull survives a crash and a row whose parent arrives later waits for it.
-- `data_json` is the row's synced columns as a JSON object, or null for a deletion.
CREATE TABLE sync_inbox (
    remote_id TEXT NOT NULL REFERENCES sync_remotes(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    row_key TEXT NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    is_deleted INTEGER NOT NULL,
    data_json TEXT,
    PRIMARY KEY (remote_id, table_name, row_key)
) WITHOUT ROWID;

-- Changes made on two servers at once, of which the more recent was kept.
-- `kept` is this_device, other_device or deletion; `description` names the row for the person, such as "a flashcard in Spanish practice".
CREATE TABLE sync_conflicts (
    id TEXT PRIMARY KEY,
    remote_id TEXT NOT NULL REFERENCES sync_remotes(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    row_key TEXT NOT NULL,
    kept TEXT NOT NULL,
    description TEXT NOT NULL,
    detected_at_ms INTEGER NOT NULL
);
CREATE INDEX sync_conflicts_by_time ON sync_conflicts (remote_id, detected_at_ms);

-- Media bytes a remote is known to hold for this server, after an upload or a download.
CREATE TABLE remote_copies (
    remote_id TEXT NOT NULL REFERENCES sync_remotes(id) ON DELETE CASCADE,
    media_file_id TEXT NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
    size_bytes INTEGER NOT NULL,
    PRIMARY KEY (remote_id, media_file_id)
) WITHOUT ROWID;

-- Each synced table has triggers that record its inserts, updates and deletes in `sync_rows`.
-- An update records a change only when a column that syncs changed; device-bound columns are left out of `UPDATE OF`.
-- A row deleted by a cascade from its parent leaves no tombstone, since the parent's tombstone deletes it on every server:
-- its delete trigger finds the parent gone and drops the row's entry instead.
-- A child row whose parent is gone, as during a cascade that sets a reference to null, records nothing.

CREATE TRIGGER projects_synced_insert AFTER INSERT ON projects BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('projects', NEW.id, NEW.owner_id, NEW.id, (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER projects_synced_update AFTER UPDATE OF name, target_language, translation_language,
    flashcard_fields_json, default_tags_json, tags_media_name, fills_audio_with_tts,
    flashcard_front_fields_json, lists_anki_deletions ON projects BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('projects', NEW.id, NEW.owner_id, NEW.id, (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER projects_synced_delete AFTER DELETE ON projects
WHEN EXISTS (SELECT 1 FROM owners WHERE id = OLD.owner_id) BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    UPDATE sync_rows SET is_deleted = 1, change_seq = (SELECT last_seq FROM sync_clock),
        updated_at_ms = CAST(unixepoch('subsec') * 1000 AS INTEGER)
    WHERE table_name = 'projects' AND row_key = OLD.id AND owner_id = OLD.owner_id;
END;

CREATE TRIGGER media_files_synced_insert AFTER INSERT ON media_files
WHEN EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id) BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('media_files', NEW.id, (SELECT owner_id FROM projects WHERE id = NEW.project_id), NEW.project_id, (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER media_files_synced_update AFTER UPDATE OF name, source_kind, source_path, browser_file_size, browser_file_last_modified_ms,
    track_selection_json, origin_plugin, origin_locator, target_subtitle_track_id,
    translation_subtitle_track_id, translation_media_file_id, is_upload_chosen ON media_files
WHEN EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id) BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('media_files', NEW.id, (SELECT owner_id FROM projects WHERE id = NEW.project_id), NEW.project_id, (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER media_files_synced_delete AFTER DELETE ON media_files BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1 WHERE EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id);
    UPDATE sync_rows SET is_deleted = 1, change_seq = (SELECT last_seq FROM sync_clock),
        updated_at_ms = CAST(unixepoch('subsec') * 1000 AS INTEGER)
    WHERE table_name = 'media_files' AND row_key = OLD.id AND EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id);
    DELETE FROM sync_rows WHERE table_name = 'media_files' AND row_key = OLD.id AND NOT (EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id));
END;

CREATE TRIGGER subtitle_tracks_synced_insert AFTER INSERT ON subtitle_tracks
WHEN EXISTS (SELECT 1 FROM media_files WHERE id = NEW.media_file_id) BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('subtitle_tracks', NEW.id, (SELECT p.owner_id FROM media_files m JOIN projects p ON p.id = m.project_id WHERE m.id = NEW.media_file_id), (SELECT project_id FROM media_files WHERE id = NEW.media_file_id), (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER subtitle_tracks_synced_update AFTER UPDATE OF name, format, source_json, sample ON subtitle_tracks
WHEN EXISTS (SELECT 1 FROM media_files WHERE id = NEW.media_file_id) BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('subtitle_tracks', NEW.id, (SELECT p.owner_id FROM media_files m JOIN projects p ON p.id = m.project_id WHERE m.id = NEW.media_file_id), (SELECT project_id FROM media_files WHERE id = NEW.media_file_id), (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER subtitle_tracks_synced_delete AFTER DELETE ON subtitle_tracks BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1 WHERE EXISTS (SELECT 1 FROM media_files WHERE id = OLD.media_file_id);
    UPDATE sync_rows SET is_deleted = 1, change_seq = (SELECT last_seq FROM sync_clock),
        updated_at_ms = CAST(unixepoch('subsec') * 1000 AS INTEGER)
    WHERE table_name = 'subtitle_tracks' AND row_key = OLD.id AND EXISTS (SELECT 1 FROM media_files WHERE id = OLD.media_file_id);
    DELETE FROM sync_rows WHERE table_name = 'subtitle_tracks' AND row_key = OLD.id AND NOT (EXISTS (SELECT 1 FROM media_files WHERE id = OLD.media_file_id));
END;

CREATE TRIGGER alignments_synced_insert AFTER INSERT ON alignments
WHEN EXISTS (SELECT 1 FROM media_files WHERE id = NEW.media_file_id)
    AND EXISTS (SELECT 1 FROM media_files WHERE id = NEW.counterpart_media_file_id) BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('alignments', NEW.id, (SELECT p.owner_id FROM media_files m JOIN projects p ON p.id = m.project_id WHERE m.id = NEW.media_file_id), (SELECT project_id FROM media_files WHERE id = NEW.media_file_id), (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER alignments_synced_update AFTER UPDATE OF kind, provider, content_json ON alignments
WHEN EXISTS (SELECT 1 FROM media_files WHERE id = NEW.media_file_id)
    AND EXISTS (SELECT 1 FROM media_files WHERE id = NEW.counterpart_media_file_id) BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('alignments', NEW.id, (SELECT p.owner_id FROM media_files m JOIN projects p ON p.id = m.project_id WHERE m.id = NEW.media_file_id), (SELECT project_id FROM media_files WHERE id = NEW.media_file_id), (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER alignments_synced_delete AFTER DELETE ON alignments BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1 WHERE EXISTS (SELECT 1 FROM media_files WHERE id = OLD.media_file_id)
    AND EXISTS (SELECT 1 FROM media_files WHERE id = OLD.counterpart_media_file_id);
    UPDATE sync_rows SET is_deleted = 1, change_seq = (SELECT last_seq FROM sync_clock),
        updated_at_ms = CAST(unixepoch('subsec') * 1000 AS INTEGER)
    WHERE table_name = 'alignments' AND row_key = OLD.id AND EXISTS (SELECT 1 FROM media_files WHERE id = OLD.media_file_id)
    AND EXISTS (SELECT 1 FROM media_files WHERE id = OLD.counterpart_media_file_id);
    DELETE FROM sync_rows WHERE table_name = 'alignments' AND row_key = OLD.id AND NOT (EXISTS (SELECT 1 FROM media_files WHERE id = OLD.media_file_id)
    AND EXISTS (SELECT 1 FROM media_files WHERE id = OLD.counterpart_media_file_id));
END;

CREATE TRIGGER flashcards_synced_insert AFTER INSERT ON flashcards
WHEN EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id) BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('flashcards', NEW.id, (SELECT owner_id FROM projects WHERE id = NEW.project_id), NEW.project_id, (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER flashcards_synced_update AFTER UPDATE OF cue_index, word_start, content_json, included_fields_json, updated_at_ms,
    exported_at_ms, was_packaged, sent_at_ms ON flashcards
WHEN EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id) BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('flashcards', NEW.id, (SELECT owner_id FROM projects WHERE id = NEW.project_id), NEW.project_id, (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER flashcards_synced_delete AFTER DELETE ON flashcards BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1 WHERE EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id);
    UPDATE sync_rows SET is_deleted = 1, change_seq = (SELECT last_seq FROM sync_clock),
        updated_at_ms = CAST(unixepoch('subsec') * 1000 AS INTEGER)
    WHERE table_name = 'flashcards' AND row_key = OLD.id AND EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id);
    DELETE FROM sync_rows WHERE table_name = 'flashcards' AND row_key = OLD.id AND NOT (EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id));
END;

CREATE TRIGGER review_log_synced_insert AFTER INSERT ON review_log
WHEN EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id) BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('review_log', NEW.id, (SELECT owner_id FROM projects WHERE id = NEW.project_id), NEW.project_id, (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER review_log_synced_delete AFTER DELETE ON review_log BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1 WHERE EXISTS (SELECT 1 FROM flashcards WHERE id = OLD.flashcard_id)
    AND EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id);
    UPDATE sync_rows SET is_deleted = 1, change_seq = (SELECT last_seq FROM sync_clock),
        updated_at_ms = CAST(unixepoch('subsec') * 1000 AS INTEGER)
    WHERE table_name = 'review_log' AND row_key = OLD.id AND EXISTS (SELECT 1 FROM flashcards WHERE id = OLD.flashcard_id)
    AND EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id);
    DELETE FROM sync_rows WHERE table_name = 'review_log' AND row_key = OLD.id AND NOT (EXISTS (SELECT 1 FROM flashcards WHERE id = OLD.flashcard_id)
    AND EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id));
END;

CREATE TRIGGER review_holds_synced_insert AFTER INSERT ON review_holds
WHEN EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id) BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('review_holds', NEW.flashcard_id, (SELECT owner_id FROM projects WHERE id = NEW.project_id), NEW.project_id, (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER review_holds_synced_update AFTER UPDATE OF kind, until_ms ON review_holds
WHEN EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id) BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('review_holds', NEW.flashcard_id, (SELECT owner_id FROM projects WHERE id = NEW.project_id), NEW.project_id, (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER review_holds_synced_delete AFTER DELETE ON review_holds BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1 WHERE EXISTS (SELECT 1 FROM flashcards WHERE id = OLD.flashcard_id)
    AND EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id);
    UPDATE sync_rows SET is_deleted = 1, change_seq = (SELECT last_seq FROM sync_clock),
        updated_at_ms = CAST(unixepoch('subsec') * 1000 AS INTEGER)
    WHERE table_name = 'review_holds' AND row_key = OLD.flashcard_id AND EXISTS (SELECT 1 FROM flashcards WHERE id = OLD.flashcard_id)
    AND EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id);
    DELETE FROM sync_rows WHERE table_name = 'review_holds' AND row_key = OLD.flashcard_id AND NOT (EXISTS (SELECT 1 FROM flashcards WHERE id = OLD.flashcard_id)
    AND EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id));
END;

CREATE TRIGGER review_day_allowances_synced_insert AFTER INSERT ON review_day_allowances
WHEN EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id) BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('review_day_allowances', NEW.project_id || ':' || NEW.day_key, (SELECT owner_id FROM projects WHERE id = NEW.project_id), NEW.project_id, (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER review_day_allowances_synced_update AFTER UPDATE OF extra_new_cards, extra_reviews ON review_day_allowances
WHEN EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id) BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('review_day_allowances', NEW.project_id || ':' || NEW.day_key, (SELECT owner_id FROM projects WHERE id = NEW.project_id), NEW.project_id, (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER review_day_allowances_synced_delete AFTER DELETE ON review_day_allowances BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1 WHERE EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id);
    UPDATE sync_rows SET is_deleted = 1, change_seq = (SELECT last_seq FROM sync_clock),
        updated_at_ms = CAST(unixepoch('subsec') * 1000 AS INTEGER)
    WHERE table_name = 'review_day_allowances' AND row_key = OLD.project_id || ':' || OLD.day_key AND EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id);
    DELETE FROM sync_rows WHERE table_name = 'review_day_allowances' AND row_key = OLD.project_id || ':' || OLD.day_key AND NOT (EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id));
END;

CREATE TRIGGER anki_pending_deletions_synced_insert AFTER INSERT ON anki_pending_deletions
WHEN EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id) BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('anki_pending_deletions', NEW.flashcard_id, (SELECT owner_id FROM projects WHERE id = NEW.project_id), NEW.project_id, (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER anki_pending_deletions_synced_update AFTER UPDATE OF word, requested_at_ms ON anki_pending_deletions
WHEN EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id) BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('anki_pending_deletions', NEW.flashcard_id, (SELECT owner_id FROM projects WHERE id = NEW.project_id), NEW.project_id, (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER anki_pending_deletions_synced_delete AFTER DELETE ON anki_pending_deletions BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1 WHERE EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id);
    UPDATE sync_rows SET is_deleted = 1, change_seq = (SELECT last_seq FROM sync_clock),
        updated_at_ms = CAST(unixepoch('subsec') * 1000 AS INTEGER)
    WHERE table_name = 'anki_pending_deletions' AND row_key = OLD.flashcard_id AND EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id);
    DELETE FROM sync_rows WHERE table_name = 'anki_pending_deletions' AND row_key = OLD.flashcard_id AND NOT (EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id));
END;

-- A dictionary does not change once imported; its counts are written inside the import's transaction.
CREATE TRIGGER dictionaries_synced_insert AFTER INSERT ON dictionaries BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('dictionaries', NEW.id, NEW.owner_id, NULL, (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER dictionaries_synced_delete AFTER DELETE ON dictionaries
WHEN EXISTS (SELECT 1 FROM owners WHERE id = OLD.owner_id) BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    UPDATE sync_rows SET is_deleted = 1, change_seq = (SELECT last_seq FROM sync_clock),
        updated_at_ms = CAST(unixepoch('subsec') * 1000 AS INTEGER)
    WHERE table_name = 'dictionaries' AND row_key = OLD.id AND owner_id = OLD.owner_id;
END;

-- Only the preferences that follow a person to every device sync; the rest stay with the device that set them.
-- `is_synced_preference` in the storage crate matches the same keys.
CREATE TRIGGER preferences_synced_insert AFTER INSERT ON preferences
WHEN NEW.key IN ('showTranslations', 'showReviewIntervals')
    OR NEW.key GLOB 'readingLocation:*' OR NEW.key GLOB 'playbackPosition:*' BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('preferences', NEW.key, NEW.owner_id, NULL, (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER preferences_synced_update AFTER UPDATE OF value ON preferences
WHEN NEW.key IN ('showTranslations', 'showReviewIntervals')
    OR NEW.key GLOB 'readingLocation:*' OR NEW.key GLOB 'playbackPosition:*' BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('preferences', NEW.key, NEW.owner_id, NULL, (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER preferences_synced_delete AFTER DELETE ON preferences
WHEN (OLD.key IN ('showTranslations', 'showReviewIntervals')
    OR OLD.key GLOB 'readingLocation:*' OR OLD.key GLOB 'playbackPosition:*')
    AND EXISTS (SELECT 1 FROM owners WHERE id = OLD.owner_id) BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    UPDATE sync_rows SET is_deleted = 1, change_seq = (SELECT last_seq FROM sync_clock),
        updated_at_ms = CAST(unixepoch('subsec') * 1000 AS INTEGER)
    WHERE table_name = 'preferences' AND row_key = OLD.key AND owner_id = OLD.owner_id;
END;

CREATE TRIGGER review_parameters_synced_insert AFTER INSERT ON review_parameters BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('review_parameters', 'review_parameters', NEW.owner_id, NULL, (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER review_parameters_synced_update AFTER UPDATE OF weights_json, fitted_at_ms ON review_parameters BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    INSERT INTO sync_rows (table_name, row_key, owner_id, project_id, change_seq, updated_at_ms, is_deleted)
    VALUES ('review_parameters', 'review_parameters', NEW.owner_id, NULL, (SELECT last_seq FROM sync_clock), CAST(unixepoch('subsec') * 1000 AS INTEGER), 0)
    ON CONFLICT (table_name, row_key, owner_id) DO UPDATE SET change_seq = excluded.change_seq,
        updated_at_ms = excluded.updated_at_ms, is_deleted = 0, project_id = excluded.project_id;
END;
CREATE TRIGGER review_parameters_synced_delete AFTER DELETE ON review_parameters
WHEN EXISTS (SELECT 1 FROM owners WHERE id = OLD.owner_id) BEGIN
    UPDATE sync_clock SET last_seq = last_seq + 1;
    UPDATE sync_rows SET is_deleted = 1, change_seq = (SELECT last_seq FROM sync_clock),
        updated_at_ms = CAST(unixepoch('subsec') * 1000 AS INTEGER)
    WHERE table_name = 'review_parameters' AND row_key = 'review_parameters' AND owner_id = OLD.owner_id;
END;
