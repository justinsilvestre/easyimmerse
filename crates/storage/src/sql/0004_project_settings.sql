ALTER TABLE projects RENAME COLUMN language TO target_language;
ALTER TABLE projects ADD COLUMN translation_language TEXT NOT NULL DEFAULT 'en';
ALTER TABLE projects ADD COLUMN flashcard_settings_json TEXT NOT NULL DEFAULT '{"included_fields":["word","l1_definition","context","context_translation","context_audio","screenshot"],"default_tags":[],"tag_with_media_name":true,"use_tts_when_no_audio":false}';
ALTER TABLE projects ADD COLUMN last_opened_at TEXT NOT NULL DEFAULT '';
UPDATE projects SET last_opened_at = created_at WHERE last_opened_at = '';
