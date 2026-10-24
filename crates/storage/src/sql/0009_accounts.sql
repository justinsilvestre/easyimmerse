-- The accounts of a server that has them. `role` is the snake_case name of an `AccountRole`;
-- `password_hash` is a PHC string, which only the API crate reads.
-- `email_confirmed_at_ms` is null until the owner follows a link mailed to the address.
-- `manages_library` is 1 for an account an administrator let manage the server's library.
CREATE TABLE users (
    id TEXT PRIMARY KEY REFERENCES owners(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    email_confirmed_at_ms INTEGER,
    manages_library INTEGER NOT NULL DEFAULT 0
);

-- A session is stored under the hash of its token, so that the stored rows cannot be presented as tokens.
-- `id` names the session to its user without revealing the hash.
-- `user_agent` is the User-Agent header of the login or sign-up that started it, and may be empty.
CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_agent TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    last_used_at_ms INTEGER NOT NULL,
    expires_at_ms INTEGER NOT NULL
);

CREATE INDEX sessions_user_id ON sessions(user_id);

-- The tokens of the links mailed to confirm an email address or to reset a password, stored hashed like session tokens.
CREATE TABLE email_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL CHECK (purpose IN ('confirm_email', 'reset_password')),
    created_at_ms INTEGER NOT NULL,
    expires_at_ms INTEGER NOT NULL
);

CREATE INDEX email_tokens_user_id ON email_tokens(user_id);
