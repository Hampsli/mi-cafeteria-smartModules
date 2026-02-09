const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'debug'] ?? LOG_LEVELS.debug;

function timestamp() {
  return new Date().toISOString();
}

function formatMessage(level, message, ...args) {
  const extra = args.length > 0 ? ' ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ') : '';
  return `[${timestamp()}] [${level.toUpperCase()}] ${message}${extra}`;
}

const logger = {
  error(message, ...args) {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(formatMessage('error', message, ...args));
    }
  },

  warn(message, ...args) {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', message, ...args));
    }
  },

  info(message, ...args) {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(formatMessage('info', message, ...args));
    }
  },

  debug(message, ...args) {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log(formatMessage('debug', message, ...args));
    }
  },
};

export default logger;
