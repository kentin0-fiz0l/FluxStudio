/**
 * PM2 Configuration for FluxStudio Services
 * Manages all backend services with auto-restart, logging, and monitoring
 */

module.exports = {
  apps: [
    {
      name: 'flux-auth',
      script: './server-auth.js',
      instances: 1,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/auth-error.log',
      out_file: './logs/auth-out.log',
      log_file: './logs/auth-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Health check configuration
      min_uptime: '10s',
      listen_timeout: 3000,
      kill_timeout: 5000,
      restart_delay: 4000
    },
    {
      name: 'flux-messaging',
      script: './server-messaging.js',
      instances: 1,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        MESSAGING_PORT: 3004
      },
      env_production: {
        NODE_ENV: 'production',
        MESSAGING_PORT: 3004
      },
      error_file: './logs/messaging-error.log',
      out_file: './logs/messaging-out.log',
      log_file: './logs/messaging-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Health check configuration
      min_uptime: '10s',
      listen_timeout: 3000,
      kill_timeout: 5000,
      restart_delay: 4000
    },
    {
      name: 'flux-collaboration',
      script: './server-collaboration.js',
      instances: 1,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        COLLABORATION_PORT: 4000
      },
      env_production: {
        NODE_ENV: 'production',
        COLLABORATION_PORT: 4000
      },
      error_file: './logs/collaboration-error.log',
      out_file: './logs/collaboration-out.log',
      log_file: './logs/collaboration-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Health check configuration
      min_uptime: '10s',
      listen_timeout: 3000,
      kill_timeout: 5000,
      restart_delay: 4000
    }
  ],

  // Deploy configuration
  deploy: {
    production: {
      user: 'root',
      host: '167.172.208.61',
      ref: 'origin/master',
      repo: 'git@github.com:yourusername/fluxstudio.git',
      path: '/var/www/fluxstudio',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};