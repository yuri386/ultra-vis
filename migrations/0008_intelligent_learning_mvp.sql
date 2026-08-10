-- Ultra VIS learning model: progress records what was completed;
-- mastery and confidence are calculated only from independent evidence.

CREATE TABLE IF NOT EXISTS concepts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  parent_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS concept_dependencies (
  concept_id TEXT NOT NULL,
  prerequisite_id TEXT NOT NULL,
  PRIMARY KEY (concept_id, prerequisite_id)
);

CREATE TABLE IF NOT EXISTS lecture_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lecture_id INTEGER NOT NULL,
  block_key TEXT NOT NULL,
  position INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  concept_ids_json TEXT NOT NULL DEFAULT '[]',
  estimated_minutes INTEGER NOT NULL DEFAULT 1,
  UNIQUE(lecture_id, block_key),
  UNIQUE(lecture_id, position)
);

CREATE INDEX IF NOT EXISTS idx_lecture_blocks_lecture_position ON lecture_blocks(lecture_id, position);

CREATE TABLE IF NOT EXISTS learning_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  lecture_id INTEGER NOT NULL,
  current_block_key TEXT,
  current_position INTEGER NOT NULL DEFAULT 1,
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK(progress_percent >= 0 AND progress_percent <= 100),
  active_seconds INTEGER NOT NULL DEFAULT 0,
  interaction_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'started',
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  UNIQUE(user_id, lecture_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_recent ON learning_sessions(user_id, last_activity_at DESC);

CREATE TABLE IF NOT EXISTS learning_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  lecture_id INTEGER,
  block_key TEXT,
  concept_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_learning_events_user_recent ON learning_events(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS knowledge_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  concept_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  source_id TEXT NOT NULL DEFAULT '',
  score REAL NOT NULL CHECK(score >= 0 AND score <= 1),
  weight REAL NOT NULL CHECK(weight > 0),
  assistance_level REAL NOT NULL DEFAULT 0 CHECK(assistance_level >= 0 AND assistance_level <= 1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_knowledge_evidence_user_concept ON knowledge_evidence(user_id, concept_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_concept_mastery (
  user_id INTEGER NOT NULL,
  concept_id TEXT NOT NULL,
  mastery_score INTEGER NOT NULL DEFAULT 0 CHECK(mastery_score >= 0 AND mastery_score <= 100),
  confidence_score INTEGER NOT NULL DEFAULT 0 CHECK(confidence_score >= 0 AND confidence_score <= 100),
  evidence_count INTEGER NOT NULL DEFAULT 0,
  last_practiced_at TEXT,
  last_verified_at TEXT,
  next_review_at TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_mastery_user_review ON user_concept_mastery(user_id, next_review_at);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  concept_id TEXT NOT NULL,
  due_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'due',
  last_score REAL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_reviews_user_due ON reviews(user_id, status, due_at);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  goal_type TEXT NOT NULL DEFAULT 'career',
  target_id TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  progress INTEGER NOT NULL DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, title)
);

CREATE TABLE IF NOT EXISTS learning_paths (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  goal_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, goal_id)
);

CREATE TABLE IF NOT EXISTS learning_path_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path_id INTEGER NOT NULL,
  concept_id TEXT,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
  status TEXT NOT NULL DEFAULT 'new',
  UNIQUE(path_id, position)
);

INSERT OR IGNORE INTO concepts (id, name, description, parent_id) VALUES
  ('frontend', 'Frontend Development', 'Путь от структуры страницы к работающему интерфейсу.', NULL),
  ('html', 'HTML', 'Структура интерфейса.', 'frontend'),
  ('css', 'CSS', 'Внешний вид и компоновка.', 'frontend'),
  ('javascript', 'JavaScript', 'Логика и поведение интерфейса.', 'frontend'),
  ('javascript.dom', 'DOM и события', 'Связь JavaScript с элементами страницы.', 'javascript'),
  ('javascript.promises', 'Promises', 'Результат, который придёт позже.', 'javascript'),
  ('javascript.async.await', 'Async/Await', 'Последовательный способ работать с асинхронным кодом.', 'javascript'),
  ('python', 'Python', 'Ясный язык для задач и автоматизации.', NULL),
  ('python.fundamentals', 'Основы Python', 'Ввод, условия и циклы.', 'python'),
  ('sql.joins', 'SQL JOIN', 'Соединение связанных таблиц.', NULL);

INSERT OR IGNORE INTO concept_dependencies (concept_id, prerequisite_id) VALUES
  ('javascript.dom', 'javascript'),
  ('javascript.promises', 'javascript'),
  ('javascript.async.await', 'javascript.promises'),
  ('javascript.async.await', 'javascript.dom');

INSERT OR IGNORE INTO lectures (id, title, description, category, level, duration, author, content, image, views) VALUES
  (11, 'JavaScript: Async/Await без ожидания', 'Пойми Promise, await и порядок действий на одном живом примере — без стены теории.', 'Программирование', 'Начальный', 18, 'Ultra VIS', 'Async/Await\nКороткая интерактивная лекция о том, как JavaScript ждёт результат и продолжает работать.', '/assets/images/lectures/lecture-programming-v1.png', 0);

INSERT OR IGNORE INTO lecture_blocks (lecture_id, block_key, position, type, title, body, payload_json, concept_ids_json, estimated_minutes)
SELECT id, 'intro', 1, 'hero', title, description, '{}', CASE WHEN category = 'Программирование' THEN '["javascript"]' ELSE '[]' END, 2 FROM lectures;

INSERT OR IGNORE INTO lecture_blocks (lecture_id, block_key, position, type, title, body, payload_json, concept_ids_json, estimated_minutes)
SELECT id, 'idea', 2, 'key_idea', 'Главная мысль', 'Не торопись запоминать формулировку. Сначала свяжи новую идею с тем, что уже умеешь объяснить своими словами.', '{}', CASE WHEN category = 'Программирование' THEN '["javascript"]' ELSE '[]' END, 2 FROM lectures;

INSERT OR IGNORE INTO lecture_blocks (lecture_id, block_key, position, type, title, body, payload_json, concept_ids_json, estimated_minutes)
SELECT id, 'example', 3, 'example', 'Посмотри на пример', 'Остановись на одном шаге: что приходит на вход, что меняется и какой результат должен появиться?', '{}', CASE WHEN category = 'Программирование' THEN '["javascript"]' ELSE '[]' END, 3 FROM lectures;

INSERT OR IGNORE INTO lecture_blocks (lecture_id, block_key, position, type, title, body, payload_json, concept_ids_json, estimated_minutes)
SELECT id, 'check', 4, 'question', 'Короткая проверка', 'Как бы ты объяснил главную идею этой части человеку, который ещё не знаком с темой?', '{"answers":["Это действие происходит сразу","Нужно сначала понять вход и результат","Достаточно просто запомнить термин"],"correct":1}', CASE WHEN category = 'Программирование' THEN '["javascript"]' ELSE '[]' END, 2 FROM lectures;

INSERT OR IGNORE INTO lecture_blocks (lecture_id, block_key, position, type, title, body, payload_json, concept_ids_json, estimated_minutes)
SELECT id, 'practice', 5, 'practice', 'Сделай маленький шаг', 'Примени идею на своём примере. Это важнее, чем просто дочитать страницу до конца.', '{}', CASE WHEN category = 'Программирование' THEN '["javascript"]' ELSE '[]' END, 3 FROM lectures;

INSERT OR IGNORE INTO lecture_blocks (lecture_id, block_key, position, type, title, body, payload_json, concept_ids_json, estimated_minutes)
SELECT id, 'summary', 6, 'summary', 'Что осталось с тобой', 'Прогресс показывает, что материал пройден. Уверенность появляется только после самостоятельного ответа и практики.', '{}', CASE WHEN category = 'Программирование' THEN '["javascript"]' ELSE '[]' END, 1 FROM lectures;

INSERT OR REPLACE INTO lecture_blocks (lecture_id, block_key, position, type, title, body, payload_json, concept_ids_json, estimated_minutes) VALUES
  (11, 'intro', 1, 'hero', 'Что происходит, когда JavaScript встречает await?', 'Представь: приложение отправило запрос серверу. Ответ придёт позже, но интерфейс не должен застыть. Await помогает дождаться результата внутри одной понятной функции.', '{}', '["javascript","javascript.promises","javascript.async.await"]', 2),
  (11, 'promise', 2, 'key_idea', 'Promise — не готовый ответ', 'Promise — это обещание: результат появится позже. Пока он ожидается, JavaScript может продолжить другие задачи.', '{}', '["javascript.promises"]', 2),
  (11, 'code', 3, 'code', 'Один живой пример', 'Запусти пример, измени имя и посмотри, что меняется.', '{"code":"const getProfile = () => new Promise(resolve => setTimeout(() => resolve(\"Юрий\"), 600));\\n\\nasync function greet() {\\n  const name = await getProfile();\\n  return `Привет, ${name}`;\\n}","output":"Привет, Юрий"}', '["javascript.promises","javascript.async.await"]', 3),
  (11, 'flow', 4, 'interactive', 'Порядок действий', 'Сначала запрос создаёт Promise. Затем await ждёт именно его результат. После этого функция спокойно продолжает следующую строку.', '{"steps":["Запрос отправлен","Promise ожидается","Ответ получен","Функция продолжена"]}', '["javascript.async.await"]', 2),
  (11, 'check', 5, 'question', 'Быстрый вопрос', 'Что возвращает fetch до выполнения await?', '{"answers":["Готовый JSON","Promise","Ничего"],"correct":1}', '["javascript.promises","javascript.async.await"]', 2),
  (11, 'practice', 6, 'practice', 'Мини-практика', 'Есть три независимых запроса. Подумай: как получить их параллельно, а не ждать каждый по очереди?', '{}', '["javascript.promises","javascript.async.await"]', 3),
  (11, 'summary', 7, 'summary', 'Итог', 'Await не останавливает весь JavaScript. Он делает ожидание результата внутри async-функции читаемым и последовательным.', '{}', '["javascript.async.await"]', 1);
