CREATE TABLE preferences (
    owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (owner_id, key)
) WITHOUT ROWID;
