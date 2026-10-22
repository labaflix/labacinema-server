const config = require('./config');
const createApp = require('./src/app');

const app = createApp();

app.listen(config.port, function () {
  console.log('LabaCinemaFresh on :' + config.port + ' (' + config.env + ')');
  console.log('maintenance: ' + config.maintenance);
});
