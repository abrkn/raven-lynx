const debug = require('debug')('raven-lynx');

const {
  SENTRY_DSN,
  LYNX_HOST,
  LYNX_PORT,
} = process.env;

const HEARTBEAT_INTERVAL = 10e3;

const Raven = SENTRY_DSN && require('raven');
const Lynx = LYNX_HOST && require('lynx');
const parentPackageName = require('../../package.json').name;

if (Raven) {
  debug(`Configuring Raven with DSN ${SENTRY_DSN}`);

  Raven.config(SENTRY_DSN, {
    captureUnhandledRejections: true,
  });

  process.on('unhandledException', (error) => {
    console.error('Unhandled exception:');
    console.error(error.stack);
    Raven.captureException(error, () => process.exit(1));
  });
}

let lynx;
let timer;

if (Lynx) {
  debug(`Configuring Lynx with host ${LYNX_HOST}`);

  lynx = new Lynx(LYNX_HOST, +LYNX_PORT || 8125, {
    on_error: error => {
      console.error(error.stack);
      if (!Raven) { return; }
      Raven.captureException(e);
    },
  });

  debug(`Will send heartbeat every ${HEARTBEAT_INTERVAL / 1e3} sec`);

  timer = setInterval(() => {
    debug('Sending heartbeat...');
    lynx.increment(`service.heartbeat,service=${parentPackageName}`);
  }, HEARTBEAT_INTERVAL);
}

return {
  Raven,
  Lynx,
  lynx,
  timer,
};
