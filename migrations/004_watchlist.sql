CREATE TABLE IF NOT EXISTS watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT NOT NULL,
  movie_id INTEGER NOT NULL,
  added_at TEXT DEFAULT (datetime('now')),
  UNIQUE(visitor_id, movie_id),
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_watchlist_visitor ON watchlist(visitor_id, added_at DESC);
