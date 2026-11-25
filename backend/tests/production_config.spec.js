const { getCorsOptions } = require('../src/config/cors');
const { isDemoEnabled } = require('../src/config/demo');

test('production DEMO requires its own explicit flag; legacy debug cannot enable it', () => {
  expect(isDemoEnabled({ NODE_ENV: 'production', DEBUG_ROUTES_ENABLED: 'true' })).toBe(false);
  expect(isDemoEnabled({ NODE_ENV: 'production', DEBUG_ROUTES_ENABLED: 'false', DEMO_ENABLED: 'true' })).toBe(true);
  expect(isDemoEnabled({ NODE_ENV: 'development', DEBUG_ROUTES_ENABLED: 'true', DEMO_ENABLED: 'false' })).toBe(false);
});

test.each(['', ' ', '*', 'https://aoi.local/path', 'https://aoi.local/', 'null', 'ftp://aoi.local'])('rejects unsafe production origin: %s', CORS_ORIGIN => {
  expect(() => getCorsOptions({ NODE_ENV: 'production', CORS_ORIGIN })).toThrow('CORS_ORIGIN');
});

test('production permits only the explicitly configured origins', () => {
  expect(getCorsOptions({ NODE_ENV: 'production', CORS_ORIGIN: 'https://aoi.local, http://localhost:3000' }))
    .toEqual({ origin: ['https://aoi.local', 'http://localhost:3000'], credentials: true });
});

test('development supports local clients when no origin is configured', () => {
  expect(getCorsOptions({ NODE_ENV: 'development' })).toEqual({ origin: true, credentials: true });
});
