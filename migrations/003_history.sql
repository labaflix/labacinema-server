CREATE TABLE IF NOT EXISTS watch_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT NOT NULL,
  movie_id INTEGER NOT NULL,
  movie_slug TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  duration INTEGER,
  watched_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_history_visitor ON watch_history(visitor_id, watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_movie ON watch_history(movie_id);
