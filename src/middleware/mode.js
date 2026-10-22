const { resolveMode } = require('../../config/modes');
const config = require('../../config');

function modeMiddleware(req, res, next) {
  req.mode = resolveMode(req.hostname);
  res.locals.mode = req.mode;
  res.locals.maintenance = config.maintenance;
  res.locals.brand = req.mode.brand;
  res.locals.features = req.mode.features;
  next();
}

module.exports = modeMiddleware;
