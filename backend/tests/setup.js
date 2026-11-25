// A suíte padrão nunca utiliza credenciais ou banco do .env local.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'isolated-test-secret-not-used-in-production';
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/aoi_test';
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_SAMESITE = 'Lax';
process.env.DEBUG_ROUTES_ENABLED = 'false';
delete process.env.DEMO_ENABLED;
process.env.SILENCE_LOGS = 'true';
delete process.env.COOKIE_DOMAIN;
delete process.env.CORS_ORIGIN;
