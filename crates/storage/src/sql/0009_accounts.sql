-- The accounts of a server that has them. `role` is the snake_case name of an `AccountRole`;
-- `password_hash` is a PHC string, which only the API crate reads.
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL
);

-- A session is stored under the hash of its token, so that the stored rows cannot be presented as tokens.
CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at_ms INTEGER NOT NULL,
    expires_at_ms INTEGER NOT NULL
);

CREATE INDEX sessions_user_id ON sessions(user_id);
