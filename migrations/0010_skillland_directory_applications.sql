-- Delivery queue for applications sent while the recipient's Render process is
-- asleep. The sender and recipient are opaque directory IDs, not emails.
CREATE TABLE IF NOT EXISTS skillland_directory_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_directory_id TEXT NOT NULL,
  recipient_directory_id TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sender_directory_id, recipient_directory_id)
);

CREATE INDEX IF NOT EXISTS idx_skillland_directory_applications_recipient
  ON skillland_directory_applications(recipient_directory_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_skillland_directory_applications_sender
  ON skillland_directory_applications(sender_directory_id, status, updated_at DESC);
