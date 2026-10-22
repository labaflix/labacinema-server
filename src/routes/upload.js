const express = require('express');
const path = require('path');
const crypto = require('crypto');
const r2 = require('../services/r2');
const adminAuth = require('../middleware/admin');
const notifSvc = require('../services/notifications');
const movies = require('../services/movies');

const router = express.Router();

router.post('/sign', adminAuth, async function (req, res, next) {
  try {
    const body = req.body || {};
    const kind = body.kind || 'video';
    const filename = body.filename;
    const contentType = body.contentType;
    if (!filename) return res.status(400).json({ error: 'filename required' });
    if (['video', 'poster', 'download'].indexOf(kind) === -1) {
      return res.status(400).json({ error: 'invalid kind' });
    }
    const ext = path.extname(filename).toLowerCase();
    const id = crypto.randomBytes(8).toString('hex');
    const key = kind + '/' + Date.now() + '-' + id + ext;
    const uploadUrl = await r2.presignUpload(key, contentType, 900);
    res.json({ key: key, uploadUrl: uploadUrl, publicUrl: r2.publicUrl(key) });
  } catch (e) { next(e); }
});

router.post('/commit', adminAuth, function (req, res, next) {
  try {
    const b = req.body || {};
    if (!b.title || !b.video_key) return res.status(400).json({ error: 'title and video_key required' });
    const slug = (b.slug || b.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const id = movies.insert({
      slug: slug, title: b.title, description: b.description, year: b.year,
      genre: b.genre, video_key: b.video_key, poster_key: b.poster_key,
      download_key: b.download_key,
      vj: b.vj || null,
      is_free: 1,
    });
    // Create notification for the new movie
    try {
      notifSvc.create({
        title: 'New movie added',
        body: '“' + title + '” is now available to stream',
        link: '/play/' + finalSlug,
        kind: 'movie'
      });
    } catch (e) { console.error('notification error:', e.message); }
    res.json({ id: id, slug: slug });
  } catch (e) { next(e); }
});

module.exports = router;
