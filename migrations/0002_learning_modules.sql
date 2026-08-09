CREATE TABLE IF NOT EXISTS lectures (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  level TEXT NOT NULL,
  duration INTEGER NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  image TEXT,
  views INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS colleges (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  specialties TEXT NOT NULL,
  rating REAL NOT NULL,
  image TEXT
);

CREATE TABLE IF NOT EXISTS saved_lectures (
  user_id INTEGER NOT NULL,
  lecture_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, lecture_id)
);

CREATE TABLE IF NOT EXISTS favorite_colleges (
  user_id INTEGER NOT NULL,
  college_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, college_id)
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO lectures (id, title, description, category, level, duration, author, content, image, views) VALUES
  (1, 'Linear algebra: vectors and space', 'A practical introduction to vectors, matrices and the way they model real systems.', 'Mathematics', 'Beginner', 42, 'SkillLand Studio', 'Learn how vectors describe movement, data and geometric relationships. Finish with a short matrix exercise.', '/assets/images/lectures/math-linear.jpg', 1240),
  (2, 'Quantum physics without the fog', 'Understand probability, observation and the building blocks of the quantum world.', 'Physics', 'Intermediate', 36, 'Dr. Maya Chen', 'A clear visual route through quantum states, uncertainty and how modern devices use quantum effects.', '/assets/images/lectures/physics-quantum.jpg', 980),
  (3, 'JavaScript: your first interface', 'Build a responsive interaction with variables, events and the DOM.', 'Programming', 'Beginner', 51, 'Alex Kim', 'Turn a small idea into a working browser interaction while learning the core JavaScript building blocks.', '/assets/images/lectures/programming-js.jpg', 2130),
  (4, 'Python for real tasks', 'Use Python to organise data, automate a routine and think algorithmically.', 'Programming', 'Beginner', 47, 'Nora Davis', 'A practical sequence of Python patterns: input, conditions, loops and simple data structures.', '/assets/images/lectures/programming-python.jpg', 1875),
  (5, 'The living cell', 'Explore how cells communicate, make energy and keep an organism alive.', 'Biology', 'Beginner', 39, 'Dr. Sofia Green', 'A visual exploration of cell structures and the systems that make life possible.', '/assets/images/lectures/biology-cell.jpg', 1104),
  (6, 'Organic chemistry: patterns that matter', 'Recognise the structures and reactions behind the materials around you.', 'Chemistry', 'Intermediate', 44, 'Ivan Petrov', 'Learn to read organic molecules as patterns rather than isolated formulas.', '/assets/images/lectures/chemistry-organic.jpg', 863),
  (7, 'Microeconomics in everyday decisions', 'See how price, choice and incentives shape the world around you.', 'Economics', 'Beginner', 33, 'Lena Morris', 'Use familiar examples to understand markets, trade-offs and opportunity cost.', '/assets/images/lectures/economics-micro.jpg', 1428),
  (8, 'Russian history: turning points', 'A guided overview of pivotal ideas, people and periods in Russian history.', 'History', 'Beginner', 48, 'Andrei Volkov', 'Connect major historical turning points with the questions they still raise today.', '/assets/images/lectures/history-russia.jpg', 1195),
  (9, 'English for ideas and presentations', 'Communicate a point of view clearly in an academic or creative setting.', 'Languages', 'Beginner', 29, 'Olivia Brooks', 'Practice the vocabulary and structure needed to present an idea with confidence.', '/assets/images/lectures/languages-english.jpg', 1764),
  (10, 'Ethics: asking better questions', 'Use philosophical tools to think more carefully about hard choices.', 'Philosophy', 'Intermediate', 35, 'Mikhail Orlov', 'A concise guide to ethical frameworks, argument quality and respectful disagreement.', '/assets/images/lectures/philosophy-ethics.jpg', 736);

INSERT OR IGNORE INTO colleges (id, name, city, type, description, specialties, rating, image) VALUES
  (1, 'Lomonosov Moscow State University', 'Moscow', 'University', 'A broad research university with a strong academic tradition.', 'Mathematics, physics, chemistry, economics, law', 4.9, '/assets/images/colleges/msu-1.jpg'),
  (2, 'Saint Petersburg State University', 'Saint Petersburg', 'University', 'A historic university with wide humanities and science programmes.', 'History, languages, law, physics, economics', 4.8, '/assets/images/colleges/spbu-1.jpg'),
  (3, 'Moscow Institute of Physics and Technology', 'Dolgoprudny', 'Technical university', 'A focused technical environment for research and engineering.', 'Physics, mathematics, computer science, electronics', 4.9, '/assets/images/colleges/mipt-1.jpg'),
  (4, 'HSE University', 'Moscow', 'University', 'Modern programmes connecting technology, social science and business.', 'Design, economics, data science, management', 4.8, '/assets/images/colleges/hse-1.jpg'),
  (5, 'ITMO University', 'Saint Petersburg', 'Technical university', 'A practical technology university with creative digital programmes.', 'Programming, robotics, product design, data science', 4.8, '/assets/images/colleges/itmo-1.jpg');
