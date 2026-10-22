ALTER TABLE movies ADD COLUMN vj TEXT;
CREATE INDEX IF NOT EXISTS idx_movies_vj ON movies(vj);
