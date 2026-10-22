const fs = require('fs');
const path = require('path');
const db = require('../src/services/db');

const files = fs.readdirSync(__dirname).filter(function (f) { return f.endsWith('.sql'); }).sort();
db.exec("CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))");
const appliedRows = db.prepare('SELECT name FROM _migrations').all();
const applied = new Set(appliedRows.map(function (r) { return r.name; }));

for (const f of files) {
  if (applied.has(f)) continue;
  console.log('applying ' + f);
  const sql = fs.readFileSync(path.join(__dirname, f), 'utf8');
  db.exec(sql);
  db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(f);
}
console.log('migrations done');
