const express = require('express');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const modeMiddleware = require('./middleware/mode');
const visitorMiddleware = require('./middleware/visitor');
const errs = require('./middleware/error');

function createApp() {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(function (req, _res, next) {
    const dir = req.mode ? req.mode.viewDir : 'labacinema';
    app.set('views', [
      path.join(__dirname, 'views', dir),
      path.join(__dirname, 'views', 'shared'),
    ]);
    next();
  });

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(morgan('tiny'));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(visitorMiddleware);
  app.use('/css', express.static(path.join(__dirname, '..', 'public', 'css')));
  app.use('/js', express.static(path.join(__dirname, '..', 'public', 'js')));
  app.use('/img', express.static(path.join(__dirname, '..', 'public', 'img')));
  app.use('/favicon', express.static(path.join(__dirname, '..', 'public', 'favicon')));

  app.get('/healthz', function (_req, res) { res.json({ ok: true }); });

  app.use(modeMiddleware);

  app.use('/', require('./routes/public'));
  app.use('/api/upload', require('./routes/upload'));
  app.use('/api/labaflix', require('./routes/labaflix/index'));

  app.use(errs.notFound);
  app.use(errs.errorHandler);

  return app;
}

module.exports = createApp;
