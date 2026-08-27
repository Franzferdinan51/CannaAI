#!/usr/bin/env node

/**
 * Test script to verify hybrid architecture setup
 * This script checks if both frontend and backend configurations are correct
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🔍 Testing CannaAI Pro Hybrid Architecture Setup...\n');

// Test 1: Check if main package.json has correct scripts
console.log('1️⃣ Checking main package.json scripts...');
const mainPackage = require('./package.json');
const requiredScripts = [
  'dev', 'dev:frontend', 'dev:backend',
  'build', 'build:frontend', 'build:backend',
  'start', 'start:frontend', 'start:backend'
];

let allScriptsPresent = true;
requiredScripts.forEach(script => {
  if (!mainPackage.scripts[script]) {
    console.log(`   ❌ Missing script: ${script}`);
    allScriptsPresent = false;
  } else {
    console.log(`   ✅ Found script: ${script}`);
  }
});

// Test 2: Check if New UI package.json exists
console.log('\n2️⃣ Checking New UI configuration...');
try {
  const frontendPackage = require('./NewUI/cannaai-pro/package.json');
  console.log('   ✅ New UI package.json found');
  console.log('   ✅ New UI name:', frontendPackage.name);
  console.log('   ✅ New UI scripts:', Object.keys(frontendPackage.scripts).join(', '));
} catch (error) {
  console.log('   ❌ New UI package.json not found or invalid');
  allScriptsPresent = false;
}

// Test 3: Check vite.config.ts for port configuration
console.log('\n3️⃣ Checking Vite configuration...');
const fs = require('fs');
try {
  const viteConfig = fs.readFileSync('./NewUI/cannaai-pro/vite.config.ts', 'utf8');
  if (viteConfig.includes('5174')) {
    console.log('   ✅ Vite configured for port 5174');
  } else {
    console.log('   ⚠️  Vite port configuration might need verification');
  }
} catch (error) {
  console.log('   ❌ Could not read vite.config.ts');
}

// Test 4: Check server.ts CORS configuration
console.log('\n4️⃣ Checking backend CORS configuration...');
try {
  const serverConfig = fs.readFileSync('./server.ts', 'utf8');
  if (serverConfig.includes('5174')) {
    console.log('   ✅ Server CORS configured for port 5174');
  } else {
    console.log('   ❌ Server CORS might not allow port 5174');
  }
} catch (error) {
  console.log('   ❌ Could not read server.ts');
}

// Test 5: Check if concurrently is available
console.log('\n5️⃣ Checking dependencies...');
try {
  require('concurrently');
  console.log('   ✅ Concurrently package available');
} catch (error) {
  console.log('   ❌ Concurrently package not found - run npm install');
  allScriptsPresent = false;
}

// Final result
console.log('\n📊 Test Summary:');
if (allScriptsPresent) {
  console.log('   ✅ All checks passed! Hybrid architecture is ready.');
  console.log('\n🚀 You can now run:');
  console.log('   npm run dev          # Start both services');
  console.log('   npm run dev:frontend # Start only frontend');
  console.log('   npm run dev:backend  # Start only backend');
} else {
  console.log('   ❌ Some checks failed. Please review the issues above.');
}

process.exit(allScriptsPresent ? 0 : 1);
