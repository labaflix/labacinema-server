const crypto = require('crypto');

// Gives every visitor a stable anonymous ID via a long-lived cookie.
// No login, no PII. Used to track watch history per browser.
function visitorMiddleware(req, res, next) {
  let vid = req.cookies && req.cookies.visitor_id;
  if (!vid || typeof vid !== 'string' || vid.length < 16) {
    vid = crypto.randomBytes(16).toString('hex');
    res.cookie('visitor_id', vid, {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      httpOnly: true,
      sameSite: 'lax',
    });
  }
  req.visitorId = vid;
  next();
}

module.exports = visitorMiddleware;
