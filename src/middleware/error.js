const config = require('../../config');

function notFound(req, res) {
  console.log('🎯 notFound hit:', req.method, req.path, '| user-agent:', req.headers['user-agent'] && req.headers['user-agent'].slice(0, 20));
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.status(404).render('404', { mode: req.mode });
}

function errorHandler(err, req, res, _next) {
  console.error('[' + req.method + ' ' + req.path + ']', err);
  const status = err.status || 500;
  if (req.path.startsWith('/api')) {
    const body = { error: err.message || 'Server error' };
    if (config.env !== 'production') body.stack = err.stack;
    return res.status(status).json(body);
  }
  res.status(status).render('error', {
    mode: req.mode,
    status: status,
    message: config.env === 'production' ? 'Something went wrong.' : err.message,
    stack: config.env === 'production' ? null : err.stack,
  });
}

module.exports = { notFound: notFound, errorHandler: errorHandler };
