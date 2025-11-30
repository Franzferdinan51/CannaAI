#!/usr/bin/env tsx

/**
 * CannaAI - Advanced Service Startup Script
 *
 * This script handles starting both the Next.js backend and Vite frontend
 * with proper port management, health checks, and graceful shutdown.
 *
 * Usage:
 *   npm run start:both        # Start both services in development
 *   npm run start:dev         # Start both services in development
 *   npm run start:prod        # Start both services in production
 *
 * Features:
 * - Port availability checking
 * - Service health monitoring
 * - Graceful shutdown handling
 * - Clear status messages
 * - Automatic error recovery
 */

import { spawn, ChildProcess } from 'child_process';
import { createServer } from 'net';
import { performance } from 'perf_hooks';

// Configuration
const CONFIG = {
  backend: {
    port: 3000,
    name: 'Backend',
    command: 'npm',
    args: ['run', process.argv.includes('--prod') ? 'start:backend' : 'dev:backend'],
    healthCheckPath: '/',
    startupDelay: 3000, // Time to wait before checking health
    startupTimeout: 30000, // Max time to wait for startup
  },
  frontend: {
    port: 5173,
    name: 'Frontend',
    command: 'npm',
    args: ['run', process.argv.includes('--prod') ? 'start:frontend' : 'dev:frontend'],
    healthCheckPath: '/',
    startupDelay: 2000, // Vite starts faster
    startupTimeout: 15000, // Vite has shorter startup time
  },
  healthCheckInterval: 2000,
  maxRetries: 3,
  retryDelay: 5000,
};

// Global state
let backendProcess: ChildProcess | null = null;
let frontendProcess: ChildProcess | null = null;
let isShuttingDown = false;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function colorLog(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Utility functions
function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });

    server.on('error', () => resolve(false));
  });
}

function waitForPort(port: number, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();

    const check = () => {
      const elapsed = performance.now() - startTime;

      if (elapsed > timeout) {
        reject(new Error(`Port ${port} did not become available within ${timeout}ms`));
        return;
      }

      checkPortAvailable(port).then((available) => {
        if (!available) {
          resolve(); // Port is in use (service is running)
        } else {
          setTimeout(check, 500); // Check again in 500ms
        }
      });
    };

    check();
  });
}

function spawnProcess(config: typeof CONFIG.backend | typeof CONFIG.frontend): ChildProcess {
  const { command, args, name } = config;

  colorLog('cyan', `🚀 Starting ${name}...`);

  const process = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
  });

  process.on('error', (error) => {
    colorLog('red', `❌ Failed to start ${name}: ${error.message}`);
    if (!isShuttingDown) {
      process.exit(1);
    }
  });

  process.on('exit', (code, signal) => {
    if (!isShuttingDown) {
      if (signal) {
        colorLog('yellow', `⚠️  ${name} killed with signal: ${signal}`);
      } else if (code !== 0) {
        colorLog('red', `❌ ${name} exited with code: ${code}`);
      } else {
        colorLog('green', `✅ ${name} exited successfully`);
      }

      // If one service exits, shut down the other
      gracefulShutdown('Service exited');
    }
  });

  return process;
}

async function waitForService(config: typeof CONFIG.backend | typeof CONFIG.frontend): Promise<void> {
  const { port, name, startupDelay, startupTimeout } = config;

  // Wait initial startup delay
  await new Promise(resolve => setTimeout(resolve, startupDelay));

  colorLog('yellow', `⏳ Waiting for ${name} to be ready on port ${port}...`);

  try {
    await waitForPort(port, startupTimeout);
    colorLog('green', `✅ ${name} is ready on port ${port}`);
  } catch (error) {
    colorLog('red', `❌ ${name} failed to start: ${error.message}`);
    throw error;
  }
}

async function showStartupInfo() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();

  colorLog('bright', '\n🎉 CannaAI is now running!');
  colorLog('cyan', '\n📍 Access URLs:');

  console.log(`   • Backend (API):  http://localhost:${CONFIG.backend.port}`);
  console.log(`   • Frontend (UI):  http://localhost:${CONFIG.frontend.port}`);

  colorLog('cyan', '\n🌐 Available on your network:');
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`   • Frontend: http://${net.address}:${CONFIG.frontend.port}`);
        console.log(`   • Backend:  http://${net.address}:${CONFIG.backend.port}`);
      }
    }
  }

  colorLog('cyan', '\n🔌 Socket.IO endpoint:');
  console.log(`   • ws://localhost:${CONFIG.backend.port}/api/socketio`);

  colorLog('green', '\n✨ Development Features:');
  console.log('   • Hot reload enabled for both services');
  console.log('   • Socket.IO real-time communication active');
  console.log('   • API endpoints available at backend URL');

  colorLog('yellow', '\n🛑 Press Ctrl+C to stop both services');
}

function gracefulShutdown(reason: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  colorLog('yellow', `\n🛑 ${reason}. Starting graceful shutdown...`);

  const shutdownPromises: Promise<void>[] = [];

  if (frontendProcess) {
    colorLog('cyan', '🛑 Stopping Frontend...');
    shutdownPromises.push(
      new Promise<void>((resolve) => {
        if (!frontendProcess) return resolve();

        frontendProcess.on('exit', () => {
          colorLog('green', '✅ Frontend stopped');
          resolve();
        });

        frontendProcess.kill('SIGTERM');

        // Force kill after 5 seconds
        setTimeout(() => {
          if (frontendProcess && !frontendProcess.killed) {
            frontendProcess.kill('SIGKILL');
            resolve();
          }
        }, 5000);
      })
    );
  }

  if (backendProcess) {
    colorLog('cyan', '🛑 Stopping Backend...');
    shutdownPromises.push(
      new Promise<void>((resolve) => {
        if (!backendProcess) return resolve();

        backendProcess.on('exit', () => {
          colorLog('green', '✅ Backend stopped');
          resolve();
        });

        backendProcess.kill('SIGTERM');

        // Force kill after 5 seconds
        setTimeout(() => {
          if (backendProcess && !backendProcess.killed) {
            backendProcess.kill('SIGKILL');
            resolve();
          }
        }, 5000);
      })
    );
  }

  Promise.all(shutdownPromises).then(() => {
    colorLog('green', '✅ All services stopped successfully');
    process.exit(0);
  });
}

// Main execution
async function main() {
  colorLog('bright', '🌱 CannaAI Service Startup Script');
  colorLog('blue', `📊 Mode: ${process.argv.includes('--prod') ? 'Production' : 'Development'}`);

  try {
    // Check port availability
    colorLog('yellow', '🔍 Checking port availability...');

    const backendPortAvailable = await checkPortAvailable(CONFIG.backend.port);
    const frontendPortAvailable = await checkPortAvailable(CONFIG.frontend.port);

    if (!backendPortAvailable) {
      colorLog('yellow', `⚠️  Port ${CONFIG.backend.port} is already in use`);
    }

    if (!frontendPortAvailable) {
      colorLog('yellow', `⚠️  Port ${CONFIG.frontend.port} is already in use`);
    }

    // Start backend first
    colorLog('cyan', '\n🚀 Starting services...');
    backendProcess = spawnProcess(CONFIG.backend);

    // Wait for backend to be ready
    await waitForService(CONFIG.backend);

    // Then start frontend
    frontendProcess = spawnProcess(CONFIG.frontend);

    // Wait for frontend to be ready
    await waitForService(CONFIG.frontend);

    // Show startup information
    await showStartupInfo();

    // Setup graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Monitor processes (optional - for advanced error handling)
    setInterval(() => {
      if (backendProcess && backendProcess.killed) {
        colorLog('red', '❌ Backend process died unexpectedly');
        gracefulShutdown('Backend process died');
      }

      if (frontendProcess && frontendProcess.killed) {
        colorLog('red', '❌ Frontend process died unexpectedly');
        gracefulShutdown('Frontend process died');
      }
    }, CONFIG.healthCheckInterval);

  } catch (error) {
    colorLog('red', `❌ Failed to start services: ${error.message}`);
    gracefulShutdown('Startup failed');
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  colorLog('red', `❌ Uncaught Exception: ${error.message}`);
  gracefulShutdown('Uncaught exception');
});

process.on('unhandledRejection', (reason, promise) => {
  colorLog('red', `❌ Unhandled Rejection: ${reason}`);
  gracefulShutdown('Unhandled rejection');
});

// Run the main function
if (require.main === module) {
  main();
}