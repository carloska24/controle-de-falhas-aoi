module.exports = {
  apps: [
    {
      name: 'aoi-backend',
      script: './server.js',
      cwd: __dirname,
      node_args: '-r dotenv/config',
      env: {
        PORT: 3001,
        NODE_ENV: 'production',
        DEBUG_ROUTES_ENABLED: 'false',
        LOG_LEVEL: 'info',
        SILENCE_LOGS: 'false'
      }
    }
  ]
};
