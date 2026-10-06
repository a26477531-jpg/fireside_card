CREATE TABLE password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  consumed_by TEXT
);
CREATE INDEX idx_password_resets_user ON password_resets(user_id);
CREATE TABLE password_reset_limits (
  key_hash TEXT PRIMARY KEY,
  next_allowed_at INTEGER NOT NULL
);
