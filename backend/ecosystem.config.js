module.exports = {
  apps: [
    {
      name: 'aoi-backend',
      script: './server.js',
      cwd: __dirname,
      node_args: '-r dotenv/config',
      env: {
        PORT: 3001,
        NODE_ENV: 'development',
        SILENCE_LOGS: 'true'
      }
    }
  ]
};
