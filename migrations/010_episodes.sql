CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id INTEGER NOT NULL,
  season_number INTEGER NOT NULL DEFAULT 1,
  episode_number INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  video_key TEXT NOT NULL,
  download_key TEXT,
  duration INTEGER,
  file_size INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(series_id, season_number, episode_number),
  FOREIGN KEY (series_id) REFERENCES movies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_episodes_series ON episodes(series_id, season_number, episode_number);
