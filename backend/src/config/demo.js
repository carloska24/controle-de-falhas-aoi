// Enabling DEMO never grants a role: routes still require a current admin session.
function isDemoEnabled(env = process.env) {
  if (env.DEMO_ENABLED !== undefined) return env.DEMO_ENABLED === 'true';
  return env.NODE_ENV === 'development' && env.DEBUG_ROUTES_ENABLED === 'true';
}

module.exports = { isDemoEnabled };
