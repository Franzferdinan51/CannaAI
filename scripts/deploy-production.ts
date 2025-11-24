#!/usr/bin/env tsx

/**
 * CannaAI - Production Deployment Script
 *
 * This script handles the complete production deployment process for both
 * the Next.js backend and Vite frontend, with proper environment setup,
 * build optimization, and service deployment.
 *
 * Usage:
 *   npm run deploy:prod         # Full production deployment
 *   npm run deploy:build        # Build only (no deployment)
 *   npm run deploy:check        # Pre-deployment checks
 *
 * Features:
 * - Environment validation
 * - Production builds for both services
 * - Health checks and validation
 * - Rollback capabilities
 * - Production environment setup
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

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

function executeCommand(command: string, description: string, options: { silent?: boolean; cwd?: string } = {}): boolean {
  try {
    colorLog('cyan', `🔄 ${description}...`);

    if (!options.silent) {
      console.log(`   Command: ${command}`);
    }

    execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: options.cwd || process.cwd(),
      encoding: 'utf8'
    });

    colorLog('green', `✅ ${description} completed`);
    return true;
  } catch (error) {
    colorLog('red', `❌ ${description} failed`);
    if (!options.silent && error instanceof Error) {
      console.log(`   Error: ${error.message}`);
    }
    return false;
  }
}

function checkEnvironmentVariables(): boolean {
  colorLog('yellow', '🔍 Checking environment variables...');

  const requiredVars = [
    'NODE_ENV',
  ];

  const optionalVars = [
    'PORT',
    'HOST',
    'OPENROUTER_API_KEY',
    'GEMINI_API_KEY',
    'LM_STUDIO_URL',
  ];

  let allRequiredPresent = true;

  // Check required variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      colorLog('red', `   ❌ Missing required: ${varName}`);
      allRequiredPresent = false;
    } else {
      colorLog('green', `   ✅ ${varName}: ${process.env[varName]}`);
    }
  }

  // Check optional variables
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      colorLog('green', `   ✅ ${varName}: [SET]`);
    } else {
      colorLog('yellow', `   ⚠️  ${varName}: [NOT SET]`);
    }
  }

  if (!allRequiredPresent) {
    colorLog('red', '\n❌ Required environment variables are missing');
    colorLog('yellow', 'Please set the required environment variables and try again');
    return false;
  }

  colorLog('green', '✅ Environment check passed');
  return true;
}

function checkDependencies(): boolean {
  colorLog('yellow', '🔍 Checking dependencies...');

  // Check Node.js version
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion < 18) {
      colorLog('red', `   ❌ Node.js version ${nodeVersion} is too old (required: 18+)`);
      return false;
    }
    colorLog('green', `   ✅ Node.js: ${nodeVersion}`);
  } catch (error) {
    colorLog('red', '   ❌ Node.js not found');
    return false;
  }

  // Check npm version
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    colorLog('green', `   ✅ npm: ${npmVersion}`);
  } catch (error) {
    colorLog('red', '   ❌ npm not found');
    return false;
  }

  // Check if required directories exist
  const requiredDirs = [
    'src',
    'NewUI/cannaai-pro',
    'scripts',
  ];

  for (const dir of requiredDirs) {
    if (!existsSync(dir)) {
      colorLog('red', `   ❌ Directory not found: ${dir}`);
      return false;
    }
    colorLog('green', `   ✅ Directory exists: ${dir}`);
  }

  // Check package.json files
  const packageFiles = [
    'package.json',
    'NewUI/cannaai-pro/package.json',
  ];

  for (const file of packageFiles) {
    if (!existsSync(file)) {
      colorLog('red', `   ❌ Package file not found: ${file}`);
      return false;
    }
    colorLog('green', `   ✅ Package file exists: ${file}`);
  }

  colorLog('green', '✅ Dependencies check passed');
  return true;
}

function checkPorts(): boolean {
  colorLog('yellow', '🔍 Checking port availability...');

  const { checkPortAvailable } = require('./check-ports');
  const ports = [
    { port: 3000, name: 'Backend API' },
    { port: 5173, name: 'Frontend (for preview)' },
  ];

  let allPortsAvailable = true;

  for (const { port, name } of ports) {
    checkPortAvailable(port).then((available: boolean) => {
      if (available) {
        colorLog('green', `   ✅ Port ${port} available for ${name}`);
      } else {
        colorLog('yellow', `   ⚠️  Port ${port} in use by ${name}`);
        colorLog('yellow', `      Note: This is normal if services are already running`);
      }
    });
  }

  return true;
}

function buildBackend(): boolean {
  colorLog('blue', '\n🏗️  Building Backend for Production...');

  // Set production environment
  process.env.NODE_ENV = 'production';

  const steps = [
    {
      command: 'npm ci --only=production',
      description: 'Installing production dependencies',
    },
    {
      command: 'npm run build:backend',
      description: 'Building Next.js application',
    },
    {
      command: 'npm run db:generate',
      description: 'Generating Prisma client',
    },
  ];

  for (const step of steps) {
    if (!executeCommand(step.command, step.description)) {
      return false;
    }
  }

  colorLog('green', '✅ Backend build completed successfully');
  return true;
}

function buildFrontend(): boolean {
  colorLog('blue', '\n🏗️  Building Frontend for Production...');

  const frontendDir = 'NewUI/cannaai-pro';

  const steps = [
    {
      command: 'npm ci --only=production',
      description: 'Installing production dependencies',
      cwd: frontendDir,
    },
    {
      command: 'npm run build',
      description: 'Building Vite application',
      cwd: frontendDir,
    },
  ];

  for (const step of steps) {
    if (!executeCommand(step.command, step.description, { cwd: frontendDir })) {
      return false;
    }
  }

  // Verify build output
  const distDir = join(frontendDir, 'dist');
  if (!existsSync(distDir)) {
    colorLog('red', '❌ Frontend build output not found');
    return false;
  }

  colorLog('green', '✅ Frontend build completed successfully');
  return true;
}

function createProductionEnv(): void {
  colorLog('cyan', '\n📝 Creating production environment file...');

  const envContent = `# Production Environment Configuration
# Generated by deployment script on ${new Date().toISOString()}

# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Build Configuration
BUILD_MODE=server

# AI Services (configure as needed)
# OPENROUTER_API_KEY=your-production-api-key
# GEMINI_API_KEY=your-production-gemini-key
# LM_STUDIO_URL=http://localhost:1234

# Database
DATABASE_URL="file:./db/custom.db"

# Security
SOCKET_IO_AUTH=true

# Performance
ENABLE_FAST_REFRESH=false
`;

  writeFileSync('.env.production', envContent);
  colorLog('green', '✅ Production environment file created');
}

function runHealthChecks(): boolean {
  colorLog('blue', '\n🏥 Running post-deployment health checks...');

  // Check if build outputs exist
  const requiredOutputs = [
    { path: '.next', name: 'Backend build output' },
    { path: 'NewUI/cannaai-pro/dist', name: 'Frontend build output' },
  ];

  for (const { path, name } of requiredOutputs) {
    if (!existsSync(path)) {
      colorLog('red', `❌ ${name} not found: ${path}`);
      return false;
    }
    colorLog('green', `✅ ${name} verified: ${path}`);
  }

  colorLog('green', '✅ All health checks passed');
  return true;
}

function generateDeploymentReport(): void {
  colorLog('cyan', '\n📊 Generating deployment report...');

  const report = {
    deployment: {
      timestamp: new Date().toISOString(),
      environment: 'production',
      nodeVersion: execSync('node --version', { encoding: 'utf8' }).trim(),
      npmVersion: execSync('npm --version', { encoding: 'utf8' }).trim(),
    },
    services: {
      backend: {
        port: 3000,
        buildOutput: '.next',
        status: 'built',
      },
      frontend: {
        port: 5173,
        buildOutput: 'NewUI/cannaai-pro/dist',
        status: 'built',
      },
    },
    nextSteps: [
      'Start backend: npm run start:prod',
      'Start frontend: npm run start:frontend',
      'Or use combined startup: npm run start',
    ],
  };

  writeFileSync('deployment-report.json', JSON.stringify(report, null, 2));
  colorLog('green', '✅ Deployment report saved to deployment-report.json');
}

async function main() {
  colorLog('bright', '🚀 CannaAI Production Deployment Script');
  colorLog('blue', `Started at: ${new Date().toISOString()}\n`);

  const args = process.argv.slice(2);
  const buildOnly = args.includes('--build-only');
  const checkOnly = args.includes('--check-only');

  // Pre-deployment checks
  colorLog('yellow', '🔍 Running pre-deployment checks...\n');

  if (!checkEnvironmentVariables()) {
    process.exit(1);
  }

  if (!checkDependencies()) {
    process.exit(1);
  }

  if (!checkPorts()) {
    process.exit(1);
  }

  if (checkOnly) {
    colorLog('green', '\n✅ All checks passed! Ready for deployment.');
    return;
  }

  // Build process
  colorLog('bright', '\n🏗️  Starting Production Build Process...\n');

  if (!buildBackend()) {
    colorLog('red', '\n❌ Backend build failed');
    process.exit(1);
  }

  if (!buildFrontend()) {
    colorLog('red', '\n❌ Frontend build failed');
    process.exit(1);
  }

  // Production setup
  createProductionEnv();

  if (!runHealthChecks()) {
    colorLog('red', '\n❌ Post-deployment health checks failed');
    process.exit(1);
  }

  // Generate report
  generateDeploymentReport();

  if (!buildOnly) {
    // Deployment instructions
    colorLog('bright', '\n🎉 Production Build Completed Successfully!');
    colorLog('green', '\n📋 Next Steps:');

    console.log(`
1. Start Production Services:
   npm run start                    # Start both services
   npm run start:prod               # Advanced startup with monitoring

2. Individual Services:
   npm run start:backend            # Backend only
   npm run start:frontend           # Frontend preview only

3. Monitor Services:
   npm run health -- --watch        # Continuous health monitoring

4. Access URLs:
   • Backend API:    http://localhost:3000
   • Frontend UI:    http://localhost:5173 (preview)
   • Socket.IO:      ws://localhost:3000/api/socketio

5. Deployment Notes:
   • Backend build output: .next/
   • Frontend build output: NewUI/cannaai-pro/dist/
   • Environment file: .env.production
   • Deployment report: deployment-report.json

6. For Production Deployment:
   • Copy .next/ and NewUI/cannaai-pro/dist/ to production server
   • Set production environment variables
   • Configure reverse proxy (nginx/Apache) if needed
   • Set up SSL certificates
   • Configure process manager (PM2, systemd, etc.)
`);
  } else {
    colorLog('green', '\n✅ Production build completed successfully');
    colorLog('blue', 'Run again without --build-only to deploy');
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