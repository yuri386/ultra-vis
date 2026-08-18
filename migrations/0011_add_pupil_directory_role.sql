-- Before three-role accounts, "student" represented a school pupil.
-- Rebuild the public mirror to extend its original two-role CHECK constraint.
CREATE TABLE skillland_directory_profiles_v3 (
  directory_id TEXT PRIMARY KEY,
  skillland_user_id INTEGER NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('pupil', 'student', 'employer')),
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

INSERT INTO skillland_directory_profiles_v3
  (directory_id, skillland_user_id, full_name, role, headline, bio, city, specialty, skills_json, company, employment_type, avatar_url, updated_at)
SELECT directory_id, skillland_user_id, full_name,
  CASE WHEN role = 'student' THEN 'pupil' ELSE role END,
  headline, bio, city, specialty, skills_json, company, employment_type, avatar_url, updated_at
FROM skillland_directory_profiles;

DROP TABLE skillland_directory_profiles;
ALTER TABLE skillland_directory_profiles_v3 RENAME TO skillland_directory_profiles;
CREATE INDEX IF NOT EXISTS idx_skillland_directory_profiles_role_updated
  ON skillland_directory_profiles(role, updated_at DESC);

UPDATE users SET skillland_role = 'pupil' WHERE skillland_role = 'student';
