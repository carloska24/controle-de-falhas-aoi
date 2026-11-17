const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

function getAuthCookieOptions() {
  const options = {
    httpOnly: true,
    path: '/',
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAMESITE || 'Lax',
  };
  if (process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }
  return options;
}

module.exports = { SESSION_DURATION_MS, getAuthCookieOptions };
