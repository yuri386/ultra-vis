-- Public SkillLand profile fields only. This lives in D1 so the shared
-- directory remains available when the Render web service has been restarted.
-- Passwords, session data, telephone numbers and private messages never enter
-- this table.
CREATE TABLE IF NOT EXISTS skillland_directory_profiles (
  directory_id TEXT PRIMARY KEY,
  skillland_user_id INTEGER NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student', 'employer')),
  headline TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  specialty TEXT NOT NULL DEFAULT '',
  skills_json TEXT NOT NULL DEFAULT '[]',
  company TEXT NOT NULL DEFAULT '',
  employment_type TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_skillland_directory_profiles_role_updated
  ON skillland_directory_profiles(role, updated_at DESC);
