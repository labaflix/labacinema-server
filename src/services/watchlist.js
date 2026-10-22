const db = require('./db');

function add(visitorId, movieId) {
  try {
    db.prepare('INSERT OR IGNORE INTO watchlist (visitor_id, movie_id) VALUES (?, ?)')
      .run(visitorId, movieId);
    return true;
  } catch (e) {
    return false;
  }
}

function remove(visitorId, movieId) {
  db.prepare('DELETE FROM watchlist WHERE visitor_id = ? AND movie_id = ?')
    .run(visitorId, movieId);
}

function has(visitorId, movieId) {
  return !!db.prepare('SELECT id FROM watchlist WHERE visitor_id = ? AND movie_id = ?')
    .get(visitorId, movieId);
}

function toggle(visitorId, movieId) {
  if (has(visitorId, movieId)) {
    remove(visitorId, movieId);
    return { inWatchlist: false };
  }
  add(visitorId, movieId);
  return { inWatchlist: true };
}

function listForVisitor(visitorId, limit) {
  return db.prepare(`
    SELECT m.id, m.slug, m.title, m.poster_key, m.year, m.genre, m.description, w.added_at
    FROM watchlist w
    JOIN movies m ON m.id = w.movie_id
    WHERE w.visitor_id = ?
    ORDER BY w.added_at DESC
    LIMIT ?
  `).all(visitorId, limit || 100);
}

function count(visitorId) {
  return db.prepare('SELECT COUNT(*) as c FROM watchlist WHERE visitor_id = ?').get(visitorId).c;
}

function clearAll(visitorId) {
  db.prepare('DELETE FROM watchlist WHERE visitor_id = ?').run(visitorId);
}

module.exports = { add, remove, has, toggle, listForVisitor, count, clearAll };
