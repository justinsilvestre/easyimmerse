CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    settings_json TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    last_opened_at_ms INTEGER NOT NULL
);
