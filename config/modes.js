const MODES = {
  labacinema: {
    key: 'labacinema',
    brand: { name: 'LABA', suffix: 'CINEMA', accent: '#e50914', themeColor: '#0088cc' },
    theme: 'blue',
    domains: ['labacinema.online', 'www.labacinema.online', 'localhost', '127.0.0.1'],
    viewDir: 'labacinema',
    features: {
      auth: false, signup: false, payments: false, profile: false,
      watchlist: false, history: false, labaTOTO: false,
      downloads: true, movingNotice: true,
    },
  },
  labaflix: {
    key: 'labaflix',
    brand: { name: 'LABA', suffix: 'FLIX', accent: '#e50914', themeColor: '#e50914' },
    theme: 'dark',
    domains: ['labaflix.com', 'www.labaflix.com'],
    viewDir: 'labaflix',
    features: {
      auth: true, signup: true, payments: true, profile: true,
      watchlist: true, history: true, labaTOTO: true,
      downloads: 'paid', movingNotice: false,
    },
  },
};

const DEFAULT_MODE = 'labacinema';

function resolveMode(hostname) {
  const clean = (hostname || '').split(':')[0].toLowerCase();
  for (const mode of Object.values(MODES)) {
    if (mode.domains.includes(clean)) return mode;
  }
  return MODES[DEFAULT_MODE];
}

module.exports = { MODES, DEFAULT_MODE, resolveMode };
