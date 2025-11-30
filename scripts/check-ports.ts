#!/usr/bin/env tsx

/**
 * CannaAI - Port Availability Checker
 *
 * This script checks if the required ports for CannaAI services are available
 * and provides diagnostic information about port usage.
 *
 * Usage:
 *   npm run check:ports
 *
 * Features:
 * - Check port availability for backend and frontend
 * - Show which processes are using ports
 * - Provide recommendations for port conflicts
 * - Network interface information
 */

import { createServer } from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuration
const PORTS = {
  backend: {
    port: 3000,
    name: 'Backend (Next.js API)',
    service: 'API Server, Socket.IO',
  },
  frontend: {
    port: 5173,
    name: 'Frontend (Vite Dev Server)',
    service: 'Development UI',
  },
};

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

async function getProcessUsingPort(port: number): Promise<string | null> {
  try {
    let command: string;

    if (process.platform === 'win32') {
      // Windows: use netstat
      command = `netstat -ano | findstr :${port}`;
    } else if (process.platform === 'darwin') {
      // macOS: use lsof
      command = `lsof -i :${port}`;
    } else {
      // Linux: use ss or lsof
      command = `ss -tulpn | grep :${port} || lsof -i :${port}`;
    }

    const { stdout } = await execAsync(command);
    return stdout.trim() || null;
  } catch (error) {
    return null;
  }
}

async function getNetworkInterfaces() {
  try {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const interfaces: { name: string; address: string; family: string }[] = [];

    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          interfaces.push({
            name,
            address: net.address,
            family: 'IPv4',
          });
        }
      }
    }

    return interfaces;
  } catch (error) {
    return [];
  }
}

function generatePortSuggestion(port: number): number[] {
  // Generate alternative port suggestions
  const basePort = port;
  const suggestions: number[] = [];

  for (let i = 1; i <= 5; i++) {
    suggestions.push(basePort + i);
    suggestions.push(basePort + (i * 10));
  }

  return suggestions.slice(0, 5);
}

async function suggestSolution(port: number, portInfo: typeof PORTS.backend | typeof PORTS.frontend) {
  colorLog('yellow', '\n💡 Possible Solutions:');

  // Check if it's a CannaAI process
  try {
    const processInfo = await getProcessUsingPort(port);
    if (processInfo && processInfo.toLowerCase().includes('node')) {
      colorLog('cyan', '   1. This might be another CannaAI process running:');
      colorLog('white', `      - Check for other terminals running CannaAI`);
      colorLog('white', `      - Use Task Manager (Windows) or Activity Monitor (macOS) to find Node.js processes`);
      colorLog('white', `      - Try running: taskkill /F /IM node.exe (Windows)`);
    } else if (processInfo) {
      colorLog('cyan', '   1. Another application is using this port:');
      colorLog('white', `      - Stop the application using port ${port}`);
      colorLog('white', `      - Or use a different port for ${portInfo.name}`);
    }
  } catch (error) {
    // Continue with general suggestions
  }

  colorLog('cyan', '   2. Use different ports:');
  const suggestions = generatePortSuggestion(port);
  suggestions.forEach((suggestedPort, index) => {
    colorLog('white', `      - Set PORT=${suggestedPort} for ${portInfo.name}`);
  });

  colorLog('cyan', '   3. Port-specific solutions:');

  if (port === 3000) {
    colorLog('white', `      - Backend: Set PORT=3001 npm run dev`);
    colorLog('white', `      - Update frontend API URL to match new backend port`);
  } else if (port === 5173) {
    colorLog('white', `      - Frontend: cd NewUI/cannaai-pro && npm run dev -- --port 5174`);
  }

  colorLog('cyan', '   4. Force kill processes (last resort):');
  if (process.platform === 'win32') {
    colorLog('white', `      - Windows: netstat -ano | findstr :${port}`);
    colorLog('white', `      - Then: taskkill /F /PID <PID>`);
  } else {
    colorLog('white', `      - macOS/Linux: lsof -ti :${port} | xargs kill -9`);
  }
}

async function main() {
  colorLog('bright', '🔍 CannaAI Port Availability Checker');
  colorLog('blue', 'Checking required ports for CannaAI services...\n');

  let allPortsAvailable = true;

  // Check each required port
  for (const [key, portInfo] of Object.entries(PORTS)) {
    const { port, name, service } = portInfo;

    const isAvailable = await checkPortAvailable(port);

    if (isAvailable) {
      colorLog('green', `✅ Port ${port} is available for ${name}`);
      colorLog('white', `   Service: ${service}`);
    } else {
      colorLog('red', `❌ Port ${port} is NOT available for ${name}`);
      colorLog('white', `   Service: ${service}`);
      colorLog('yellow', `   Status: Port is already in use`);

      // Try to get more information about what's using the port
      const processInfo = await getProcessUsingPort(port);
      if (processInfo) {
        colorLog('yellow', `   Process info: ${processInfo}`);
      } else {
        colorLog('yellow', `   Process info: Unable to determine (may require admin privileges)`);
      }

      await suggestSolution(port, portInfo);
      allPortsAvailable = false;
    }

    console.log(''); // Add spacing
  }

  // Show network interfaces
  colorLog('cyan', '🌐 Network Interfaces:');
  const interfaces = await getNetworkInterfaces();

  if (interfaces.length > 0) {
    interfaces.forEach(({ name, address }) => {
      console.log(`   • ${name}: ${address}`);
      console.log(`     - Backend:  http://${address}:${PORTS.backend.port}`);
      console.log(`     - Frontend: http://${address}:${PORTS.frontend.port}`);
    });
  } else {
    colorLog('yellow', '   No external network interfaces found');
  }

  // Summary
  colorLog('bright', '\n📊 Summary:');
  if (allPortsAvailable) {
    colorLog('green', '✅ All required ports are available!');
    colorLog('green', '🚀 You can start CannaAI with: npm run dev');
  } else {
    colorLog('red', '❌ Some ports are not available');
    colorLog('yellow', '🔧 Please resolve the port conflicts before starting CannaAI');
  }

  // Local development URLs
  colorLog('cyan', '\n📍 Local Access URLs:');
  console.log(`   • Backend API:  http://localhost:${PORTS.backend.port}`);
  console.log(`   • Frontend UI:  http://localhost:${PORTS.frontend.port}`);
  console.log(`   • Socket.IO:    ws://localhost:${PORTS.backend.port}/api/socketio`);

  // Exit with appropriate code
  process.exit(allPortsAvailable ? 0 : 1);
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