const config = require('../../config');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

function adminAuth(req, res, next) {
  const allowedIps = (process.env.ADMIN_ALLOWED_IPS || '')
    .split(',')
    .map(function (ip) { return ip.trim(); })
    .filter(Boolean);

  if (allowedIps.length > 0) {
    const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (allowedIps.indexOf(clientIp) === -1) {
      return res.status(404).render('404', { mode: req.mode, brand: req.mode.brand, features: req.mode.features });
    }
  }

  // Accept login via ?key=... query param (for initial setup)
  if (req.query.key && req.query.key === config.adminKey) {
    res.cookie('lbc_admin_session', config.adminKey, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    });
    // Redirect to remove ?key from URL
    const cleanUrl = req.path;
    return res.redirect(cleanUrl);
  }

  // Check session cookie
  const key = req.cookies && req.cookies.lbc_admin_session;

  if (!key || key !== config.adminKey) {
    // CRITICAL: return 404 instead of login page
    // Treats admin URLs as if they don't exist
    return res.status(404).render('404', {
      mode: req.mode,
      brand: req.mode.brand,
      features: req.mode.features
    });
  }

  next();
}

module.exports = adminAuth;
