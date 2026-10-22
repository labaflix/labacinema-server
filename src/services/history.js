const db = require('./db');

function record(visitorId, movie) {
  const existing = db.prepare(
    'SELECT id FROM watch_history WHERE visitor_id = ? AND movie_id = ?'
  ).get(visitorId, movie.id);

  if (existing) {
    db.prepare(
      `UPDATE watch_history
       SET watched_at = datetime('now'),
           movie_slug = ?
       WHERE id = ?`
    ).run(movie.slug, existing.id);
    return existing.id;
  }

  const info = db.prepare(
    `INSERT INTO watch_history (visitor_id, movie_id, movie_slug, progress, progress_seconds, duration)
     VALUES (?, ?, ?, 0, 0, ?)`
  ).run(visitorId, movie.id, movie.slug, movie.duration || null);
  return info.lastInsertRowid;
}

// Save progress — accepts percent 0-100 AND seconds
function setProgress(visitorId, movieId, percent, seconds, duration) {
  const p = Math.min(100, Math.max(0, Math.round(percent)));
  const s = Math.max(0, Math.round(seconds || 0));
  const d = duration ? Math.round(duration) : null;
  db.prepare(
    `UPDATE watch_history
     SET progress = ?, progress_seconds = ?, duration = COALESCE(?, duration)
     WHERE visitor_id = ? AND movie_id = ?`
  ).run(p, s, d, visitorId, movieId);
}

// Get one movie's progress for a visitor
function getProgress(visitorId, movieId) {
  return db.prepare(
    'SELECT progress, progress_seconds, duration FROM watch_history WHERE visitor_id = ? AND movie_id = ?'
  ).get(visitorId, movieId);
}

function listForVisitor(visitorId, limit) {
  return db.prepare(`
    SELECT
      m.id, m.slug, m.title, m.poster_key, m.year, m.genre, m.description,
      h.watched_at, h.progress, h.progress_seconds, h.duration
    FROM watch_history h
    JOIN movies m ON m.id = h.movie_id
    WHERE h.visitor_id = ?
    ORDER BY h.watched_at DESC
    LIMIT ?
  `).all(visitorId, limit || 50);
}

function removeOne(visitorId, movieId) {
  db.prepare('DELETE FROM watch_history WHERE visitor_id = ? AND movie_id = ?')
    .run(visitorId, movieId);
}

function clearAll(visitorId) {
  db.prepare('DELETE FROM watch_history WHERE visitor_id = ?').run(visitorId);
}

module.exports = { record, setProgress, getProgress, listForVisitor, removeOne, clearAll };
