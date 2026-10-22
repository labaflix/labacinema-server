const https = require('https');
const config = require('../../config');

function tmdbGet(path) {
  return new Promise(function (resolve, reject) {
    const key = config.tmdbApiKey;
    if (!key) return reject(new Error('TMDB_API_KEY not set'));

    const url = 'https://api.themoviedb.org/3' + path + (path.includes('?') ? '&' : '?') + 'api_key=' + key + '&language=en-US';

    https.get(url, function (res) {
      let data = '';
      res.on('data', function (chunk) { data += chunk; });
      res.on('end', function () {
        if (res.statusCode !== 200) {
          return reject(new Error('TMDb API ' + res.statusCode));
        }
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function tryFetch(endpoint, query, yearParam) {
  try {
    const data = await tmdbGet(endpoint + '?query=' + encodeURIComponent(query) + (yearParam || ''));
    const results = data.results || [];
    for (var i = 0; i < Math.min(results.length, 5); i++) {
      if (results[i].poster_path) {
        return 'https://image.tmdb.org/t/p/w500' + results[i].poster_path;
      }
    }
  } catch (e) {}
  return null;
}

async function fetchPoster(title, year, kind) {
  const isSeries = kind === 'series';
  const endpoint = isSeries ? '/search/tv' : '/search/movie';

  // 1. Try with exact year
  if (year) {
    const yearParam = isSeries ? '&first_air_date_year=' + year : '&year=' + year;
    let poster = await tryFetch(endpoint, title, yearParam);
    if (poster) return poster;
  }

  // 2. Try without year
  let poster = await tryFetch(endpoint, title, '');
  if (poster) return poster;

  // 3. Try with special chars stripped
  const stripped = title
    .replace(/[+$'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped !== title) {
    poster = await tryFetch(endpoint, stripped, '');
    if (poster) return poster;
  }

  // 4. Try just the first 2-3 words (for long titles)
  const words = title.split(' ');
  if (words.length > 3) {
    const short = words.slice(0, 3).join(' ');
    poster = await tryFetch(endpoint, short, '');
    if (poster) return poster;
  }

  return null;
}

module.exports = { fetchPoster };
