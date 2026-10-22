const express = require('express');
const movies = require('../services/movies');
const r2 = require('../services/r2');
const socialSvc = require('../services/social');
const notifSvc = require('../services/notifications');
const episodesSvc = require('../services/episodes');
const requestsSvc = require('../services/requests');
const historySvc = require('../services/history');
const watchlistSvc = require('../services/watchlist');
const adminAuth = require('../middleware/admin');

const router = express.Router();

function absoluteUrl(key) {
  if (!key) return null;
  if (key.indexOf('http') === 0) return key;
  return (process.env.R2_PUBLIC_URL || '') + '/' + key;
}

router.get('/', function (req, res) {
  const allMovies = movies.list({ kind: 'movie', limit: 200 });
  const allSeries = movies.list({ kind: 'series', limit: 200 });
  const allContent = allMovies.concat(allSeries);

  // Hero carousel — newest 5
  const heroMovies = allContent.slice(0, 5);

  // Trending: 12 newest (or high trending flag)
  const trending = allContent.slice(0, 12);

  // Top 10
  const top10 = allContent.slice(0, 10);

  // New Releases
  const newReleases = allContent.slice()
    .sort(function (a, b) { return (b.year || 0) - (a.year || 0); })
    .slice(0, 12);

  // Recently Added (2024+)
  const recentlyUpdated = allContent.filter(function (m) {
    return m.year >= 2024;
  }).slice(0, 12);

  // Latest (2025+)
  const latest = allContent.filter(function (m) {
    return m.year >= 2025;
  }).slice(0, 12);

  // Genre rows — ALL genres from DB
  const genreMap = {};
  allContent.forEach(function (m) {
    if (!m.genre) return;
    var key = m.genre.toLowerCase();
    if (!genreMap[key]) genreMap[key] = { title: m.genre, movies: [] };
    genreMap[key].movies.push(m);
  });

  const genreRows = Object.keys(genreMap).map(function (key) {
    return {
      title: genreMap[key].title,
      genre: genreMap[key].title,
      movies: genreMap[key].movies.slice(0, 12)
    };
  }).sort(function (a, b) { return b.movies.length - a.movies.length; });

  // Series row
  const seriesRow = allSeries.length ? {
    title: 'Series',
    movies: allSeries.slice(0, 12)
  } : null;

  res.render('index', {
    query: '',
    movies: allContent.slice(0, 24),
    heroMovies: heroMovies,
    trending: trending,
    top10: top10,
    newReleases: newReleases,
    recentlyUpdated: recentlyUpdated,
    latest: latest,
    genreRows: genreRows,
    seriesRow: seriesRow
  });
});



router.get('/movies', function (req, res) {
  const q = (req.query.q || '').trim();
  const cat = (req.query.cat || '').trim();
  const genre = (req.query.genre || '').trim();
  const vj = (req.query.vj || '').trim();
  const filterGenre = cat || genre || '';

  const allMovies = movies.list({ kind: 'movie', limit: 500 });
  const allSeries = movies.list({ kind: 'series', limit: 500 });
  let filtered = allMovies;

  // When filtering by VJ → include BOTH movies and series
  if (vj) {
    var vjKey = vj.toLowerCase().replace(/[^a-z0-9]/g, '');
    var combined = allMovies.concat(allSeries);
    filtered = combined.filter(function (m) {
      if (!m.vj) return false;
      var mKey = m.vj.toLowerCase().replace(/[^a-z0-9]/g, '');
      return mKey === vjKey;
    });
  } else {
    // Regular filtering → movies only
    if (q) {
      var ql = q.toLowerCase();
      filtered = filtered.filter(function (m) {
        return (m.title || '').toLowerCase().indexOf(ql) !== -1 ||
               (m.description || '').toLowerCase().indexOf(ql) !== -1;
      });
    }

    if (filterGenre) {
      var gl = filterGenre.toLowerCase().replace(/-/g, ' ');
      filtered = filtered.filter(function (m) {
        var mg = (m.genre || '').toLowerCase().replace(/-/g, ' ');
        return mg === gl || mg.indexOf(gl) !== -1 || gl.indexOf(mg) !== -1;
      });
    }
  }

  const isFiltered = !!(q || filterGenre || vj);

  var filterLabel = '';
  if (vj) {
    filterLabel = vj.split('-').map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
    if (!filterLabel.toLowerCase().startsWith('vj')) {
      filterLabel = 'Vj ' + filterLabel;
    }
  } else if (filterGenre) {
    filterLabel = filterGenre.charAt(0).toUpperCase() + filterGenre.slice(1);
  } else if (q) {
    filterLabel = 'Search: "' + q + '"';
  }

  // Group by genre (unfiltered view)
  var genreMap = {};
  allMovies.forEach(function (m) {
    if (!m.genre) return;
    var key = m.genre.toLowerCase();
    if (!genreMap[key]) genreMap[key] = { title: m.genre, movies: [] };
    genreMap[key].movies.push(m);
  });

  var rows = Object.keys(genreMap).map(function (key) {
    return {
      title: genreMap[key].title,
      genre: genreMap[key].title,
      movies: genreMap[key].movies.slice(0, 12)
    };
  }).sort(function (a, b) { return b.movies.length - a.movies.length; });

  res.render('movies', {
    query: q,
    category: cat,
    genre: genre,
    vj: vj,
    allMovies: filtered,
    heroMovies: allMovies.slice(0, 5),
    rows: rows,
    isFiltered: isFiltered,
    filterGenre: filterGenre,
    filterLabel: filterLabel,
    totalCount: filtered.length
  });
});




router.get('/search', function (req, res) {
  const q = (req.query.q || '').trim();
  var results = [];

  if (q) {
    try {
      const movieResults = movies.list({ search: q, kind: 'movie', limit: 100 });
      const seriesResults = movies.list({ search: q, kind: 'series', limit: 100 });
      results = movieResults.concat(seriesResults);
    } catch (e) {
      console.error('search error:', e.message);
    }
  }

  res.render('search', {
    query: q,
    results: results,
    resultCount: results.length
  });
});

router.get('/play/:slug', function (req, res) {
  const movie = movies.bySlug(req.params.slug);
  if (!movie) return res.status(404).render('404');

  const isSeries = movie.kind === 'series';

  var resumeSeconds = 0;
  if (req.visitorId) {
    try {
      historySvc.record(req.visitorId, movie);
      const prog = historySvc.getProgress(req.visitorId, movie.id);
      if (prog && prog.progress_seconds > 0 && prog.progress < 95) {
        resumeSeconds = prog.progress_seconds;
      }
    } catch (e) { console.error('history error:', e.message); }
  }

  var ratingStats = { count: 0, avg: 0 };
  var userRating = null;
  try {
    ratingStats = socialSvc.getRatingStats(movie.id);
    userRating = req.visitorId ? socialSvc.getUserRating(req.visitorId, movie.id) : null;
  } catch (e) { console.error('rating error:', e.message); }

  var comments = [];
  try { comments = socialSvc.listComments(movie.id, 20); }
  catch (e) { console.error('comment error:', e.message); }

  var similar = [];
  try {
    if (movie.genre) {
      similar = movies.list({ genre: movie.genre, limit: 12 })
        .filter(function (x) { return x.id !== movie.id; })
        .slice(0, 10);
    }
  } catch (e) {}

  // For series: load episodes and figure out which one to play
  var seasons = {};
  var currentEpisode = null;
  var currentSeason = 1;
  var currentEpisodeNum = 1;

  if (isSeries) {
    try {
      const eps = episodesSvc.listForSeries(movie.id);
      seasons = episodesSvc.groupBySeason(eps);

      // Decide which episode to show
      const reqSeason = parseInt(req.query.s, 10);
      const reqEpisode = parseInt(req.query.e, 10);

      if (reqSeason && reqEpisode) {
        currentEpisode = episodesSvc.bySeriesAndEpisode(movie.id, reqSeason, reqEpisode);
        if (currentEpisode) {
          currentSeason = reqSeason;
          currentEpisodeNum = reqEpisode;
        }
      }
      if (!currentEpisode && eps.length > 0) {
        currentEpisode = eps[0];
        currentSeason = currentEpisode.season_number;
        currentEpisodeNum = currentEpisode.episode_number;
      }
    } catch (e) { console.error('episodes error:', e.message); }
  }

  
  // Compute next episode (for series auto-play)
  var nextEpisode = null;
  if (isSeries && currentEpisode) {
    try {
      const allEps = episodesSvc.listForSeries(movie.id);
      const currentIdx = allEps.findIndex(function (e) { return e.id === currentEpisode.id; });
      if (currentIdx !== -1 && currentIdx + 1 < allEps.length) {
        nextEpisode = allEps[currentIdx + 1];
      }
    } catch (e) { console.error('next ep error:', e.message); }
  }

  res.render('play', {
    movie: movie,
    isSeries: isSeries,
    videoUrl: isSeries
      ? (currentEpisode ? absoluteUrl(currentEpisode.video_key) : null)
      : absoluteUrl(movie.video_key),
    posterUrl: absoluteUrl(movie.poster_key),
    resumeSeconds: resumeSeconds,
    ratingStats: ratingStats,
    userRating: userRating,
    comments: comments,
    similar: similar,
    seasons: seasons,
    currentEpisode: currentEpisode,
    currentSeason: currentSeason,
    currentEpisodeNum: currentEpisodeNum,
    nextEpisode: nextEpisode,
    formatBytes: episodesSvc.formatBytes,
    query: ''
  });
});



router.get('/download/:slug', async function (req, res, next) {
  try {
    const movie = movies.bySlug(req.params.slug);
    if (!movie) return res.status(404).send('Movie not found');

    if (req.mode.features.downloads !== true) {
      return res.status(403).send('Downloads not allowed on this plan');
    }

    // Use download_key if set, else fall back to video_key
    const fileKey = movie.download_key || movie.video_key;
    if (!fileKey) return res.status(404).send('No downloadable file');

    // Build a clean filename from title
    const safeTitle = (movie.title || movie.slug || 'movie')
      .replace(/[^a-zA-Z0-9 _-]/g, '')
      .replace(/\s+/g, '_')
      .trim() || 'movie';
    const filename = safeTitle + '.mp4';

    const url = await r2.presignDownload(fileKey, 600, filename);
    res.redirect(url);
  } catch (e) { next(e); }
});


// ─── Stub pages (coming soon) ───
router.get('/upload', adminAuth, function (req, res) {
  res.render('upload', { query: '' });
});

router.get('/requests', function (req, res) {
  res.render('requests', { query: '', recentRequests: requestsSvc.recent(20) });
});

router.post('/requests', function (req, res) {
  const b = req.body || {};
  const title = (b.title || '').trim();
  if (!title) {
    return res.status(400).render('requests', {
      query: '',
      recentRequests: requestsSvc.recent(20),
      error: 'Title is required.',
    });
  }
  try {
    requestsSvc.insert({
      title: title,
      year: b.year ? parseInt(b.year, 10) : null,
      notes: (b.notes || '').trim() || null,
      requester_name: (b.requester_name || '').trim() || null,
      requester_contact: (b.requester_contact || '').trim() || null,
    });
    res.render('requests', {
      query: '',
      recentRequests: requestsSvc.recent(20),
      success: { title: title },
    });
  } catch (e) {
    res.status(500).render('requests', {
      query: '',
      recentRequests: requestsSvc.recent(20),
      error: 'Could not save request: ' + e.message,
    });
  }
});


router.post('/api/history/progress', function (req, res) {
  if (!req.visitorId) return res.status(400).json({ error: 'no visitor id' });
  const { movie_id, progress, seconds, duration } = req.body || {};
  if (!movie_id) return res.status(400).json({ error: 'movie_id required' });
  try {
    historySvc.setProgress(
      req.visitorId,
      parseInt(movie_id, 10),
      parseInt(progress, 10) || 0,
      parseFloat(seconds) || 0,
      parseFloat(duration) || null
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/api/history/clear', function (req, res) {
  if (!req.visitorId) return res.status(400).json({ error: 'no visitor id' });
  try {
    historySvc.clearAll(req.visitorId);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/api/history/remove', function (req, res) {
  if (!req.visitorId) return res.status(400).json({ error: 'no visitor id' });
  const { movie_id } = req.body || {};
  if (!movie_id) return res.status(400).json({ error: 'movie_id required' });
  try {
    historySvc.removeOne(req.visitorId, movie_id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/history', function (req, res) {
  const items = req.visitorId ? historySvc.listForVisitor(req.visitorId, 50) : [];
  res.render('history', { query: '', items: items });
});

router.get('/watchlist', function (req, res) {
  const items = req.visitorId ? watchlistSvc.listForVisitor(req.visitorId, 100) : [];
  res.render('watchlist', { query: '', items: items });
});

router.get('/series', function (req, res) {
  const genre = req.query.genre || '';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const perPage = 48;
  const offset = (page - 1) * perPage;

  const allSeries = movies.list({ kind: 'series', limit: 1000 });
  const filtered = genre
    ? allSeries.filter(function (s) { return (s.genre || '').toLowerCase() === genre.toLowerCase(); })
    : allSeries;

  const pageItems = filtered.slice(offset, offset + perPage);
  const hasMore = offset + perPage < filtered.length;

  res.render('series', {
    query: '',
    series: pageItems,
    heroSeries: allSeries.slice(0, 5),
    activeGenre: genre,
    totalSeries: filtered.length,
    page: page,
    perPage: perPage,
    hasMore: hasMore
  });
});



router.get('/explore', function (req, res) {
  const allMovies = movies.list({ kind: 'movie', limit: 60 });
  const allSeries = movies.list({ kind: 'series', limit: 60 });

  // Trending: most recent 12
  const trending = allMovies.slice(0, 12);

  // New releases: next 12 (older)
  const newReleases = allMovies.slice(12, 24);

  // Top 10: we don't have real ratings — pick first 10 by insertion order
  const top10 = allMovies.slice(0, 10);

  // Popular by genre grouping
  const byGenre = {};
  allMovies.forEach(function (m) {
    if (!m.genre) return;
    var key = m.genre.toLowerCase();
    if (!byGenre[key]) byGenre[key] = [];
    byGenre[key].push(m);
  });

  var displayGenre = {
    'action': 'Action & Adventure',
    'sci-fi': 'Sci-Fi & Fantasy',
    'drama': 'Dramas',
    'crime': 'Crime & Thrillers',
    'comedy': 'Comedies',
    'horror': 'Horror',
    'romance': 'Romance',
    'animation': 'Animation'
  };

  const genreRows = [];
  Object.keys(byGenre).forEach(function (key) {
    genreRows.push({
      title: displayGenre[key] || (key.charAt(0).toUpperCase() + key.slice(1)),
      movies: byGenre[key]
    });
  });

  res.render('explore', {
    query: '',
    trending: trending,
    newReleases: newReleases,
    top10: top10,
    genreRows: genreRows,
    seriesCount: allSeries.length,
    movieCount: allMovies.length
  });
});

router.get('/contact', function (req, res) {
  res.render('contact', { query: '' });
});

router.get('/privacy', function (req, res) {
  res.render('privacy', { query: '' });
});


// ─── Admin dashboard ───
router.get('/laba-panel-2026', adminAuth, function (req, res) {
  const movieCount = movies.list({ limit: 100000 }).length;
  const seriesCount = movies.list({ kind: 'series', limit: 100000 }).length;
  const recentMovies = movies.list({ limit: 12 });
  const recentRequests = requestsSvc.recent(10);

  res.render('admin/dashboard', {
    query: '',
    movieCount: movieCount,
    seriesCount: seriesCount,
    recentMovies: recentMovies,
    recentRequests: recentRequests
  });
});

router.get('/laba-panel-2026/movies', adminAuth, function (req, res) {
  const list = movies.list({ limit: 100 });
  res.render('admin/movies', { query: '', movies: list });
});

router.get('/laba-panel-2026/requests', adminAuth, function (req, res) {
  const list = requestsSvc.recent(100);
  res.render('admin/requests', { query: '', requests: list });
});


router.get('/laba-panel-2026/movies/:id/edit', adminAuth, function (req, res) {
  const movie = movies.byId(parseInt(req.params.id, 10));
  if (!movie) return res.status(404).send('Movie not found');
  res.render('admin/movie-edit', { query: '', movie: movie, saved: req.query.saved === '1' });
});

router.post('/laba-panel-2026/movies/:id/edit', adminAuth, function (req, res) {
  const id = parseInt(req.params.id, 10);
  const b = req.body || {};
  const movie = movies.byId(id);
  if (!movie) return res.status(404).send('Movie not found');

  const title = (b.title || '').trim();
  const slug = (b.slug || '').trim() || (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  
  try {
    movies.update(id, {
      title: title,
      description: (b.description || '').trim() || null,
      year: b.year ? parseInt(b.year, 10) : null,
      genre: (b.genre || '').trim() || null,
      slug: slug,
      kind: b.kind || 'movie',
      vj: (b.vj || '').trim() || null
    });
    res.redirect('/admin/movies/' + id + '/edit?saved=1');
  } catch (e) {
    res.status(500).send('Update failed: ' + e.message);
  }
});

router.post('/laba-panel-2026/movies/:id/delete', adminAuth, function (req, res) {
  const id = parseInt(req.params.id, 10);
  try {
    movies.remove(id);
    res.redirect('/admin/movies');
  } catch (e) {
    res.status(500).send('Delete failed: ' + e.message);
  }
});


router.post('/api/rating', function (req, res) {
  if (!req.visitorId) return res.status(400).json({ error: 'no visitor id' });
  const b = req.body || {};
  if (!b.movie_id || !b.score) return res.status(400).json({ error: 'movie_id and score required' });
  try {
    socialSvc.setRating(req.visitorId, parseInt(b.movie_id, 10), parseInt(b.score, 10));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/comment', function (req, res) {
  if (!req.visitorId) return res.status(400).json({ error: 'no visitor id' });
  const b = req.body || {};
  if (!b.movie_id || !b.body) return res.status(400).json({ error: 'movie_id and body required' });
  try {
    const id = socialSvc.addComment(
      parseInt(b.movie_id, 10),
      req.visitorId,
      (b.author_name || '').trim() || 'Anonymous',
      b.body
    );
    res.json({ ok: true, id: id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/comments/:movieId', function (req, res) {
  try {
    const list = socialSvc.listComments(parseInt(req.params.movieId, 10), 20);
    res.json({ comments: list });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/rating/:movieId', function (req, res) {
  try {
    const stats = socialSvc.getRatingStats(parseInt(req.params.movieId, 10));
    const user = req.visitorId ? socialSvc.getUserRating(req.visitorId, parseInt(req.params.movieId, 10)) : null;
    res.json({ stats: stats, userRating: user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


router.get('/api/notifications', function (req, res) {
  try {
    const list = notifSvc.listRecent(20).map(function (n) {
      return {
        id: n.id,
        title: n.title,
        body: n.body,
        link: n.link,
        is_read: n.is_read === 1,
        time: notifSvc.relativeTime(n.created_at)
      };
    });
    res.json({ notifications: list, unread: notifSvc.countUnread() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/api/notifications/read-all', function (req, res) {
  try {
    notifSvc.markAllRead();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/notifications/read', function (req, res) {
  try {
    const id = parseInt((req.body || {}).id, 10);
    if (!id) return res.status(400).json({ error: 'id required' });
    notifSvc.markOneRead(id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


router.get('/api/admin/episodes/:seriesId', adminAuth, function (req, res) {
  try {
    const eps = episodesSvc.listForSeries(parseInt(req.params.seriesId, 10));
    res.json({ episodes: eps });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/admin/episodes/:seriesId/add', adminAuth, function (req, res) {
  try {
    const b = req.body || {};
    const id = episodesSvc.insert({
      series_id: parseInt(req.params.seriesId, 10),
      season_number: parseInt(b.season_number, 10) || 1,
      episode_number: parseInt(b.episode_number, 10),
      title: b.title,
      video_key: b.video_key,
      file_size: b.file_size || null
    });
    res.json({ ok: true, id: id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/admin/episodes/:episodeId/delete', adminAuth, function (req, res) {
  try {
    require('../services/db').prepare('DELETE FROM episodes WHERE id = ?').run(parseInt(req.params.episodeId, 10));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function stub(title, message) {
  return function (req, res) {
    res.render('stub', { pageTitle: title, message: message, query: '' });
  };
}
router.get('/categories', function (req, res) { res.render('categories', { query: '' }); });
router.get('/help', function (req, res) { res.render('help', { query: '' }); });

router.get('/test-download', function (req, res) {
  res.send('✅ test download route works');
});


router.get('/laba-panel-2026/movies/:id/upload-video', adminAuth, function (req, res) {
  const movie = movies.byId(parseInt(req.params.id, 10));
  if (!movie) return res.status(404).send('Movie not found');
  res.render('admin/upload-video', { query: '', movie: movie, saved: req.query.saved === '1' });
});

router.post('/api/admin/movies/:id/update-video', adminAuth, function (req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const b = req.body || {};
    if (!b.video_key) return res.status(400).json({ error: 'video_key required' });
    const movie = movies.byId(id);
    if (!movie) return res.status(404).json({ error: 'Movie not found' });

    require('../services/db').prepare('UPDATE movies SET video_key = ? WHERE id = ?').run(b.video_key, id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


router.post('/api/admin/episodes/:episodeId/update-video', adminAuth, function (req, res) {
  try {
    const id = parseInt(req.params.episodeId, 10);
    const b = req.body || {};
    if (!b.video_key) return res.status(400).json({ error: 'video_key required' });
    require('../services/db').prepare('UPDATE episodes SET video_key = ? WHERE id = ?').run(b.video_key, id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
