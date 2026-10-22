require('dotenv').config();

const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'];
const missing = required.filter(k => !process.env[k]);

if (process.env.NODE_ENV === 'production' && missing.length) {
  console.warn('Missing R2 env vars in production: ' + missing.join(', '));
}

module.exports = {
  port: parseInt(process.env.PORT || '10000', 10),
  env: process.env.NODE_ENV || 'development',
  maintenance: process.env.MAINTENANCE === '1',
  dbPath: process.env.DB_PATH || './data/labacinema.db',
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-secret',
  adminKey: process.env.ADMIN_KEY || 'dev-only-admin-key',
  adminSecretPath: process.env.ADMIN_SECRET_PATH || 'laba-admin-panel',
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET || 'labacinema-media',
    publicUrl: process.env.R2_PUBLIC_URL || '',
    endpoint: process.env.R2_ACCOUNT_ID
      ? 'https://' + process.env.R2_ACCOUNT_ID + '.r2.cloudflarestorage.com'
      : undefined,
  },
  tmdbApiKey: process.env.TMDB_API_KEY || '',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
};
