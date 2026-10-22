CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  year INTEGER,
  genre TEXT,
  poster_key TEXT,
  video_key TEXT NOT NULL,
  download_key TEXT,
  duration INTEGER,
  is_free INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS movie_categories (
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (movie_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_movies_created ON movies(created_at DESC);
