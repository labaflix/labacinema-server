const db = require('./db');

function create(opts) {
  const stmt = db.prepare(
    'INSERT INTO notifications (title, body, link, kind) VALUES (?, ?, ?, ?)'
  );
  const info = stmt.run(
    opts.title,
    opts.body || null,
    opts.link || null,
    opts.kind || 'info'
  );
  return info.lastInsertRowid;
}

function listRecent(limit) {
  return db.prepare(`
    SELECT id, title, body, link, kind, is_read, created_at
    FROM notifications
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit || 20);
}

function countUnread() {
  const row = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE is_read = 0').get();
  return row.c;
}

function markAllRead() {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE is_read = 0').run();
}

function markOneRead(id) {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
}

function relativeTime(createdAt) {
  const now = new Date();
  const then = new Date(createdAt + ' UTC');
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return then.toLocaleDateString();
}

module.exports = { create, listRecent, countUnread, markAllRead, markOneRead, relativeTime };
