# ========================================
# PM2 Production Configuration
# ========================================

module.exports = {
  apps: [
    {
      // Main Application
      name: 'cannaai-app',
      script: './server.ts',
      interpreter: 'tsx',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Process Management
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      autorestart: true,
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      combine_logs: true,
      merge_logs: true,
      
      // Monitoring
      monitoring: true,
      
      // Advanced Features
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      max_restarts: 10,
      min_uptime: '10s',
      
      // Instance Variables
      instance_var: 'INSTANCE_ID',
      
      // Cluster Mode
      exec_interpreter: 'node',
      exec_mode: 'cluster',
      
      // Source Map Support
      source_map_support: true,
      
      // Crash Tracking
      crash_tracking: true,
      
      // Horizontal Scaling
      scale: {
        cannaaiApp: {
          instance: 4,
          min: 2,
          max: 8,
        },
      },
    },
    
    // Monitoring Worker
    {
      name: 'cannaai-monitor',
      script: './docker/monitoring/metrics.sh',
      interpreter: 'bash',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '*/5 * * * *',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/monitor-error.log',
      log_file: './logs/monitor.log',
    },
    
    // Health Check Worker
    {
      name: 'cannaai-health',
      script: './docker/monitoring/health-check.sh',
      interpreter: 'bash',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '*/2 * * * *',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/health-error.log',
      log_file: './logs/health.log',
    },
  ],
  
  // Deployment Configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['production-server-1', 'production-server-2'],
      ref: 'origin/master',
      repo: 'git@github.com:yourusername/cannaai-pro.git',
      path: '/var/www/cannaai-pro',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'ForwardAgent=yes',
    },
    staging: {
      user: 'deploy',
      host: 'staging-server',
      ref: 'origin/develop',
      repo: 'git@github.com:yourusername/cannaai-pro.git',
      path: '/var/www/cannaai-pro-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
    },
  },
};
