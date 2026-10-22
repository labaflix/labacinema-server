const db = require('./db');

function list(opts) {
  const o = opts || {};
  const limit = o.limit || 60;
  const offset = o.offset || 0;
  const where = [];
  const params = {};

  if (o.search) {
    where.push('(title LIKE @q OR description LIKE @q)');
    params.q = '%' + o.search + '%';
  }
  if (o.category) {
    where.push('id IN (SELECT mc.movie_id FROM movie_categories mc JOIN categories c ON c.id = mc.category_id WHERE c.slug = @cat)');
    params.cat = o.category;
  }
  if (o.kind) {
    where.push('kind = @kind');
    params.kind = o.kind;
  }
  if (o.genre) {
    where.push('LOWER(genre) = LOWER(@genre)');
    params.genre = o.genre;
  }
  if (o.trending) {
    where.push('trending = 1');
  }
  if (o.isDemo !== undefined) {
    where.push('is_demo = @is_demo');
    params.is_demo = o.isDemo ? 1 : 0;
  }

  const sql = 'SELECT * FROM movies ' +
    (where.length ? 'WHERE ' + where.join(' AND ') + ' ' : '') +
    'ORDER BY created_at DESC LIMIT @limit OFFSET @offset';

  return db.prepare(sql).all(Object.assign({}, params, { limit: limit, offset: offset }));
}

function bySlug(slug) {
  return db.prepare('SELECT * FROM movies WHERE slug = ?').get(slug);
}

function byId(id) {
  return db.prepare('SELECT * FROM movies WHERE id = ?').get(id);
}

function categories() {
  return db.prepare('SELECT * FROM categories ORDER BY name').all();
}

function byYear(y) {
  return db.prepare('SELECT * FROM movies WHERE year = ? ORDER BY created_at DESC LIMIT 20').all(y);
}

function count() {
  return db.prepare('SELECT COUNT(*) as c FROM movies').get().c;
}

function insert(m) {
  const stmt = db.prepare(
    'INSERT INTO movies (slug, title, description, year, genre, poster_key, video_key, download_key, duration, is_free, kind, vj, age_rating, is_demo, trending) ' +
    'VALUES (@slug, @title, @description, @year, @genre, @poster_key, @video_key, @download_key, @duration, @is_free, @kind, @vj, @age_rating, @is_demo, @trending)'
  );
  const info = stmt.run({
    slug: m.slug,
    title: m.title,
    description: m.description || null,
    year: m.year || null,
    genre: m.genre || null,
    poster_key: m.poster_key || null,
    video_key: m.video_key,
    download_key: m.download_key || null,
    duration: m.duration || null,
    is_free: m.is_free ? 1 : 0,
    kind: m.kind || 'movie',
    vj: m.vj || null,
    age_rating: m.age_rating || 'PG 13',
    is_demo: m.is_demo ? 1 : 0,
    trending: m.trending ? 1 : 0
  });
  return info.lastInsertRowid;
}

function update(id, fields) {
  db.prepare(
    'UPDATE movies SET title = @title, description = @description, year = @year, genre = @genre, slug = @slug, kind = @kind, vj = @vj, age_rating = @age_rating WHERE id = @id'
  ).run({
    id: id,
    title: fields.title,
    description: fields.description || null,
    year: fields.year || null,
    genre: fields.genre || null,
    slug: fields.slug,
    kind: fields.kind || 'movie',
    vj: fields.vj || null,
    age_rating: fields.age_rating || 'PG 13'
  });
}

function remove(id) {
  db.prepare('DELETE FROM movies WHERE id = ?').run(id);
}

module.exports = { list, bySlug, byId, categories, byYear, count, insert, update, remove };
