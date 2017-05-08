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
    autoBreadcrumbs: true,
  });

  Raven.install(function (err, sendErr, eventId) {
    if (!sendErr) {
      console.error(`Fatal error reported as ${eventId}:`);
      console.error(err.stack);
    }
    process.exit(1);
  });
} else {
  debug('Not configuring Raven. SENTRY_DSN not set');
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

  const sendHeartbeat = () => {
    debug('Sending heartbeat...');
    lynx.increment(`service.heartbeat,service=${parentPackageName}`);
  };

  timer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
  timer.unref();

  setImmediate(sendHeartbeat);
} else {
  debug('Not configuring Lynx. LYNX_HOST not set');
}

return {
  Raven,
  Lynx,
  lynx,
  timer,
};
