const morgan = require('morgan');

const isProduction = process.env.NODE_ENV === 'production';
const SILENCE_LOGS = String(process.env.SILENCE_LOGS || '').toLowerCase() === 'true';
const LOG_LEVEL = (process.env.LOG_LEVEL || (isProduction ? 'error' : 'debug')).toLowerCase();
const _levelOrder = { error: 0, warn: 1, info: 2, debug: 3 };
const _currentLevel = _levelOrder[LOG_LEVEL] !== undefined ? _levelOrder[LOG_LEVEL] : 3;

function setupLogger() {
  const _origConsoleLog = console.log.bind(console);
  const _origConsoleError = console.error.bind(console);
  const _origConsoleWarn = console.warn.bind(console);
  const _origConsoleInfo = console.info ? console.info.bind(console) : _origConsoleLog;
  const _origConsoleDebug = console.debug ? console.debug.bind(console) : _origConsoleLog;

  function _shouldLogByLevel(forceLevel) {
    if (SILENCE_LOGS) return false;
    const lvl = forceLevel || 'info';
    return _levelOrder[lvl] <= _currentLevel;
  }

  console.log = function (...args) {
    if (SILENCE_LOGS) return;
    try {
      const first = typeof args[0] === 'string' ? args[0] : '';
      let msgLevel = 'info';
      if (/^\[debug/i.test(first) || first.toLowerCase().includes('debug:')) msgLevel = 'debug';
      if (/error|failed|exception/i.test(first)) msgLevel = 'error';
      if (/warn|warning/i.test(first)) msgLevel = 'warn';

      if (_levelOrder[msgLevel] <= _currentLevel) _origConsoleLog(...args);
    } catch (e) {
      _origConsoleLog(...args);
    }
  };

  console.error = function (...args) {
    if (_shouldLogByLevel('error')) _origConsoleError(...args);
  };

  console.warn = function (...args) {
    if (_shouldLogByLevel('warn')) _origConsoleWarn(...args);
  };

  console.info = function (...args) {
    if (_shouldLogByLevel('info')) _origConsoleInfo(...args);
  };

  console.debug = function (...args) {
    if (_shouldLogByLevel('debug')) _origConsoleDebug(...args);
  };
}

const morganMiddleware = morgan('combined', {
  skip: (_req, _res) => {
    if (String(process.env.SILENCE_LOGS || '').toLowerCase() === 'true') return true;
    const envLevel = (process.env.LOG_LEVEL || LOG_LEVEL || 'debug').toLowerCase();
    const lvlOrderLocal = { error: 0, warn: 1, info: 2, debug: 3 };
    return lvlOrderLocal[envLevel] < 2; // se for error/warn, pula logs de info (http)
  },
});

module.exports = { setupLogger, morganMiddleware };
