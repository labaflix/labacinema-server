const db = require('./db');

function getRatingStats(movieId) {
  const row = db.prepare(
    'SELECT COUNT(*) as count, AVG(score) as avg FROM ratings WHERE movie_id = ?'
  ).get(movieId);
  return {
    count: row.count || 0,
    avg: row.avg ? Math.round(row.avg * 10) / 10 : 0
  };
}

function getUserRating(visitorId, movieId) {
  if (!visitorId) return null;
  const row = db.prepare(
    'SELECT score FROM ratings WHERE visitor_id = ? AND movie_id = ?'
  ).get(visitorId, movieId);
  return row ? row.score : null;
}

function setRating(visitorId, movieId, score) {
  const s = Math.min(5, Math.max(1, Math.round(score)));
  db.prepare(`
    INSERT INTO ratings (visitor_id, movie_id, score)
    VALUES (?, ?, ?)
    ON CONFLICT(visitor_id, movie_id) DO UPDATE SET score = excluded.score, created_at = datetime('now')
  `).run(visitorId, movieId, s);
}

function listComments(movieId, limit) {
  return db.prepare(`
    SELECT id, author_name, body, created_at
    FROM comments
    WHERE movie_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(movieId, limit || 20);
}

function addComment(movieId, visitorId, authorName, body) {
  const b = (body || '').trim().slice(0, 1000);
  if (!b) throw new Error('Comment cannot be empty');
  const info = db.prepare(
    'INSERT INTO comments (movie_id, visitor_id, author_name, body) VALUES (?, ?, ?, ?)'
  ).run(movieId, visitorId, (authorName || 'Anonymous').slice(0, 60), b);
  return info.lastInsertRowid;
}

module.exports = {
  getRatingStats,
  getUserRating,
  setRating,
  listComments,
  addComment
};
