ALTER TABLE movies ADD COLUMN kind TEXT DEFAULT 'movie';
CREATE INDEX IF NOT EXISTS idx_movies_kind ON movies(kind);
