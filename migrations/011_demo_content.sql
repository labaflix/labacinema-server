ALTER TABLE movies ADD COLUMN is_demo INTEGER DEFAULT 0;
ALTER TABLE movies ADD COLUMN age_rating TEXT DEFAULT 'PG 13';
ALTER TABLE movies ADD COLUMN trending INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_movies_demo ON movies(is_demo);
CREATE INDEX IF NOT EXISTS idx_movies_trending ON movies(trending);
