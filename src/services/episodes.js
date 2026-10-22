const db = require('./db');

function listForSeries(seriesId) {
  return db.prepare(`
    SELECT id, series_id, season_number, episode_number, title, description,
           video_key, download_key, duration, file_size, created_at
    FROM episodes
    WHERE series_id = ?
    ORDER BY season_number ASC, episode_number ASC
  `).all(seriesId);
}

function byId(id) {
  return db.prepare('SELECT * FROM episodes WHERE id = ?').get(id);
}

function bySeriesAndEpisode(seriesId, season, episode) {
  return db.prepare(`
    SELECT * FROM episodes
    WHERE series_id = ? AND season_number = ? AND episode_number = ?
  `).get(seriesId, season, episode);
}

function insert(ep) {
  const info = db.prepare(`
    INSERT INTO episodes (series_id, season_number, episode_number, title, description, video_key, download_key, duration, file_size)
    VALUES (@series_id, @season_number, @episode_number, @title, @description, @video_key, @download_key, @duration, @file_size)
  `).run({
    series_id: ep.series_id,
    season_number: ep.season_number || 1,
    episode_number: ep.episode_number,
    title: ep.title || null,
    description: ep.description || null,
    video_key: ep.video_key,
    download_key: ep.download_key || null,
    duration: ep.duration || null,
    file_size: ep.file_size || null
  });
  return info.lastInsertRowid;
}

function groupBySeason(episodes) {
  const seasons = {};
  episodes.forEach(function (ep) {
    if (!seasons[ep.season_number]) seasons[ep.season_number] = [];
    seasons[ep.season_number].push(ep);
  });
  return seasons;
}

function formatBytes(bytes) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return (mb / 1024).toFixed(2) + ' GB';
  return mb.toFixed(2) + ' MB';
}

module.exports = {
  listForSeries, byId, bySeriesAndEpisode, insert,
  groupBySeason, formatBytes
};
