const db = require('./db');

function insert(r) {
  const stmt = db.prepare(`
    INSERT INTO requests (title, year, notes, requester_name, requester_contact, status)
    VALUES (@title, @year, @notes, @requester_name, @requester_contact, 'pending')
  `);
  const info = stmt.run({
    title: r.title,
    year: r.year || null,
    notes: r.notes || null,
    requester_name: r.requester_name || null,
    requester_contact: r.requester_contact || null,
  });
  return info.lastInsertRowid;
}

function recent(limit) {
  return db.prepare(`
    SELECT id, title, year, notes, status, created_at
    FROM requests
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit || 20);
}

function count() {
  return db.prepare('SELECT COUNT(*) as c FROM requests').get().c;
}

module.exports = { insert, recent, count };
