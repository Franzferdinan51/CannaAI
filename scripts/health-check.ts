#!/usr/bin/env tsx

/**
 * CannaAI - Service Health Monitor
 *
 * This script monitors the health and status of CannaAI backend and frontend services.
 * It can be used for development monitoring or production health checks.
 *
 * Usage:
 *   npm run health                    # One-time health check
 *   npm run health -- --watch         # Continuous monitoring
 *   npm run health -- --verbose       # Detailed diagnostics
 *
 * Features:
 * - HTTP endpoint health checks
 * - Socket.IO connection testing
 * - Response time monitoring
 * - Service dependency checking
 * - Continuous monitoring mode
 */

import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { setInterval, clearInterval } from 'timers';

// Configuration
const CONFIG = {
  backend: {
    port: 3000,
    name: 'Backend',
    baseUrl: 'http://localhost:3000',
    endpoints: [
      { path: '/', method: 'GET', timeout: 5000, expectedStatus: 200 },
      { path: '/api/health', method: 'GET', timeout: 5000, expectedStatus: [200, 404] }, // 404 if no health endpoint
    ],
    socketEndpoint: '/api/socketio',
  },
  frontend: {
    port: 5173,
    name: 'Frontend',
    baseUrl: 'http://localhost:5173',
    endpoints: [
      { path: '/', method: 'GET', timeout: 5000, expectedStatus: 200 },
    ],
  },
  monitoring: {
    interval: 5000, // Monitoring interval in ms
    timeout: 10000, // Overall timeout for health checks
    retries: 2,
    retryDelay: 1000,
  },
};

// Command line arguments
const args = process.argv.slice(2);
const isWatchMode = args.includes('--watch');
const isVerbose = args.includes('--verbose');

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
  gray: '\x1b[90m',
};

function colorLog(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getTimestamp(): string {
  return new Date().toLocaleTimeString();
}

// Health check result interface
interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'warning';
  responseTime?: number;
  details: string[];
  errors?: string[];
}

// HTTP health check
async function checkHttpEndpoint(service: typeof CONFIG.backend | typeof CONFIG.frontend): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    service: service.name,
    status: 'healthy',
    details: [],
    errors: [],
  };

  for (const endpoint of service.endpoints) {
    const startTime = Date.now();

    try {
      const response = await axios({
        method: endpoint.method,
        url: `${service.baseUrl}${endpoint.path}`,
        timeout: endpoint.timeout,
        validateStatus: () => true, // Don't throw on HTTP errors
      });

      const responseTime = Date.now() - startTime;
      result.responseTime = responseTime;

      const expectedStatuses = Array.isArray(endpoint.expectedStatus)
        ? endpoint.expectedStatus
        : [endpoint.expectedStatus];

      if (expectedStatuses.includes(response.status)) {
        result.details.push(`✅ ${endpoint.method} ${endpoint.path} - ${response.status} (${responseTime}ms)`);

        if (isVerbose) {
          result.details.push(`   Headers: ${JSON.stringify(response.headers, null, 2).substring(0, 200)}...`);
        }
      } else {
        result.status = 'unhealthy';
        result.errors?.push(`❌ ${endpoint.method} ${endpoint.path} - ${response.status} (expected: ${expectedStatuses.join(', ')})`);
      }

    } catch (error) {
      result.status = 'unhealthy';
      const responseTime = Date.now() - startTime;

      if (error instanceof Error) {
        result.errors?.push(`❌ ${endpoint.method} ${endpoint.path} - ${error.message} (${responseTime}ms)`);
      } else {
        result.errors?.push(`❌ ${endpoint.method} ${endpoint.path} - Unknown error (${responseTime}ms)`);
      }
    }
  }

  return result;
}

// Socket.IO health check
async function checkSocketIO(service: typeof CONFIG.backend): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    service: `${service.name} Socket.IO`,
    status: 'healthy',
    details: [],
    errors: [],
  };

  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket: Socket = io(`${service.baseUrl}${service.socketEndpoint}`, {
      timeout: 5000,
      transports: ['websocket', 'polling'],
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      result.status = 'unhealthy';
      result.errors?.push('❌ Socket.IO connection timeout');
      resolve(result);
    }, 5000);

    socket.on('connect', () => {
      const responseTime = Date.now() - startTime;
      clearTimeout(timeout);

      result.responseTime = responseTime;
      result.details.push(`✅ Socket.IO connected (${responseTime}ms)`);
      result.details.push(`   Socket ID: ${socket.id}`);
      result.details.push(`   Transport: ${socket.io.engine.transport.name}`);

      // Test basic communication
      socket.emit('ping', { timestamp: Date.now() });

      setTimeout(() => {
        socket.disconnect();
        resolve(result);
      }, 1000);
    });

    socket.on('connect_error', (error) => {
      const responseTime = Date.now() - startTime;
      clearTimeout(timeout);

      result.status = 'unhealthy';
      result.errors?.push(`❌ Socket.IO connection failed: ${error.message} (${responseTime}ms)`);

      socket.disconnect();
      resolve(result);
    });

    socket.on('pong', (data) => {
      const roundTrip = Date.now() - data.timestamp;
      result.details.push(`   Ping-pong: ${roundTrip}ms`);
    });
  });
}

// Overall system health check
async function performHealthCheck(): Promise<void> {
  console.clear();
  colorLog('bright', `🏥 CannaAI Health Monitor - ${getTimestamp()}`);
  colorLog('blue', `Mode: ${isWatchMode ? 'Continuous Monitoring' : 'One-time Check'}\n`);

  const results: HealthCheckResult[] = [];

  // Check backend HTTP endpoints
  try {
    const backendHttp = await checkHttpEndpoint(CONFIG.backend);
    results.push(backendHttp);
  } catch (error) {
    results.push({
      service: CONFIG.backend.name,
      status: 'unhealthy',
      details: [],
      errors: [`Failed to perform HTTP health check: ${error}`],
    });
  }

  // Check backend Socket.IO
  try {
    const backendSocket = await checkSocketIO(CONFIG.backend);
    results.push(backendSocket);
  } catch (error) {
    results.push({
      service: `${CONFIG.backend.name} Socket.IO`,
      status: 'unhealthy',
      details: [],
      errors: [`Failed to perform Socket.IO health check: ${error}`],
    });
  }

  // Check frontend
  try {
    const frontend = await checkHttpEndpoint(CONFIG.frontend);
    results.push(frontend);
  } catch (error) {
    results.push({
      service: CONFIG.frontend.name,
      status: 'unhealthy',
      details: [],
      errors: [`Failed to perform health check: ${error}`],
    });
  }

  // Display results
  let overallStatus: 'healthy' | 'warning' | 'unhealthy' = 'healthy';

  results.forEach((result) => {
    const statusIcon = result.status === 'healthy' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    const statusColor = result.status === 'healthy' ? 'green' : result.status === 'warning' ? 'yellow' : 'red';

    colorLog(statusColor, `${statusIcon} ${result.service}`);

    if (result.responseTime) {
      const responseColor = result.responseTime < 500 ? 'green' : result.responseTime < 1000 ? 'yellow' : 'red';
      colorLog(responseColor, `   Response Time: ${result.responseTime}ms`);
    }

    result.details.forEach((detail) => {
      if (isVerbose || result.status === 'healthy') {
        colorLog('white', `   ${detail}`);
      }
    });

    result.errors?.forEach((error) => {
      colorLog('red', `   ${error}`);
    });

    console.log(''); // Spacing

    // Update overall status
    if (result.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (result.status === 'warning' && overallStatus === 'healthy') {
      overallStatus = 'warning';
    }
  });

  // Overall summary
  const summaryIcon = overallStatus === 'healthy' ? '✅' : overallStatus === 'warning' ? '⚠️' : '❌';
  const summaryColor = overallStatus === 'healthy' ? 'green' : overallStatus === 'warning' ? 'yellow' : 'red';
  const summaryText = overallStatus === 'healthy' ? 'All Systems Operational' :
                     overallStatus === 'warning' ? 'Some Issues Detected' : 'System Unhealthy';

  colorLog('bright', '\n📊 Overall Status:');
  colorLog(summaryColor, `${summaryIcon} ${summaryText}`);

  // Service URLs
  colorLog('cyan', '\n📍 Service URLs:');
  console.log(`   • Backend API:  ${CONFIG.backend.baseUrl}`);
  console.log(`   • Frontend UI:  ${CONFIG.frontend.baseUrl}`);
  console.log(`   • Socket.IO:    ${CONFIG.backend.baseUrl}${CONFIG.backend.socketEndpoint}`);

  // Recommendations if there are issues
  if (overallStatus !== 'healthy') {
    colorLog('yellow', '\n💡 Recommendations:');

    const unhealthyServices = results.filter(r => r.status !== 'healthy');
    if (unhealthyServices.some(s => s.service.includes('Backend'))) {
      console.log('   • Check if backend is running: npm run dev:backend');
      console.log('   • Verify backend dependencies: npm install');
      console.log('   • Check backend logs for errors');
    }

    if (unhealthyServices.some(s => s.service.includes('Frontend'))) {
      console.log('   • Check if frontend is running: npm run dev:frontend');
      console.log('   • Verify frontend dependencies: cd NewUI/cannaai-pro && npm install');
      console.log('   • Check frontend build process');
    }

    if (unhealthyServices.some(s => s.service.includes('Socket'))) {
      console.log('   • Verify Socket.IO configuration in server.ts');
      console.log('   • Check for CORS issues');
      console.log('   • Verify firewall settings');
    }

    console.log('   • Run port check: npm run check:ports');
  }

  if (!isWatchMode) {
    process.exit(overallStatus === 'healthy' ? 0 : 1);
  }
}

// Main execution
async function main() {
  if (isWatchMode) {
    colorLog('cyan', '🔄 Starting continuous health monitoring...\n');
    colorLog('gray', 'Press Ctrl+C to stop monitoring\n');

    // Initial check
    await performHealthCheck();

    // Set up interval for continuous monitoring
    const interval = setInterval(async () => {
      await performHealthCheck();
    }, CONFIG.monitoring.interval);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      colorLog('yellow', '\n🛑 Stopping health monitoring...');
      clearInterval(interval);
      colorLog('green', '✅ Health monitoring stopped');
      process.exit(0);
    });

  } else {
    await performHealthCheck();
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  colorLog('red', `❌ Uncaught Exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  colorLog('red', `❌ Unhandled Rejection: ${reason}`);
  process.exit(1);
});

// Run the main function
if (require.main === module) {
  main();
}