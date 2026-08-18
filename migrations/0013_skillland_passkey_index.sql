-- A credential ID is needed before the server knows which email belongs to a
-- passwordless visitor. The record is encrypted by SkillLand; D1 only indexes
-- the public credential identifier and keeps the encrypted lookup payload.
CREATE TABLE IF NOT EXISTS skillland_passkey_index (
  credential_id TEXT PRIMARY KEY,
  account_key TEXT NOT NULL,
  encrypted_payload TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_skillland_passkey_index_account
  ON skillland_passkey_index(account_key);
