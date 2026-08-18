-- Long-lived SkillLand data that must not depend on a sleeping Render process.
-- Account data is encrypted by SkillLand before it reaches D1; the opaque key
-- is an HMAC, not an email address or a user-visible identifier.
CREATE TABLE IF NOT EXISTS skillland_account_backups (
  account_key TEXT PRIMARY KEY,
  encrypted_payload TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Reviews are public only after a real pupil has authenticated through
-- SkillLand. D1 keeps the newest review per author and game permanently.
CREATE TABLE IF NOT EXISTS skillland_game_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_key TEXT NOT NULL,
  directory_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(game_key, directory_id)
);

CREATE INDEX IF NOT EXISTS idx_skillland_game_reviews_game_updated
  ON skillland_game_reviews(game_key, updated_at DESC);
