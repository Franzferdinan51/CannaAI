#!/usr/bin/env tsx
import { execSync } from 'child_process';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = (msg: string, color = COLORS.reset) => console.log(`${color}${msg}${COLORS.reset}`);

const main = async () => {
  log('\n=== PRODUCTION DEPLOYMENT ===\n', COLORS.cyan);
  
  try {
    execSync('npm run test:unit', { stdio: 'inherit' });
    log('✓ Tests passed', COLORS.green);
    
    execSync('npm run build', { stdio: 'inherit' });
    log('✓ Build completed', COLORS.green);
    
    const imageName = process.env.DOCKER_IMAGE_NAME || 'cannaai/cannaai-pro';
    execSync(`docker build -t ${imageName}:latest .`, { stdio: 'inherit' });
    log('✓ Docker image built', COLORS.green);
    
    log('\n✓ Deployment completed!', COLORS.green);
    process.exit(0);
  } catch (error) {
    log('\n✗ Deployment failed!', COLORS.red);
    process.exit(1);
  }
};

main();
