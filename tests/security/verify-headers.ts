import middleware from '../../src/middleware';
import { NextRequest } from 'next/server';

console.log('Testing Security Middleware...');

// Mock request
const req = new NextRequest('http://localhost:3000/');
const res = middleware(req);

if (!res) {
    console.error('Middleware returned null/undefined');
    process.exit(1);
}

const headers = res.headers;

// Verify specific headers
const checks = [
    { key: 'content-security-policy', expected: null }, // Just check existence
    { key: 'x-frame-options', expected: 'SAMEORIGIN' },
    { key: 'x-content-type-options', expected: 'nosniff' },
    { key: 'referrer-policy', expected: 'strict-origin-when-cross-origin' },
];

let failed = false;

checks.forEach(check => {
    const value = headers.get(check.key);
    if (!value) {
        console.error(`❌ Missing header: ${check.key}`);
        failed = true;
    } else if (check.expected && value !== check.expected) {
        console.error(`❌ Incorrect value for ${check.key}: expected "${check.expected}", got "${value}"`);
        failed = true;
    } else {
        console.log(`✅ ${check.key}: ${value}`);
    }
});

if (failed) {
    console.error('Security headers verification failed.');
    process.exit(1);
}

console.log('Security headers verification passed.');
