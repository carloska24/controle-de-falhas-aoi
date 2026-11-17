const { getCorsOptions } = require('../src/config/cors');

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
