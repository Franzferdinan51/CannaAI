/**
 * /api/security/cors — reports the CORS rules the server is currently using.
 *
 * Lets operators verify (and document) what origins the Socket.IO + HTTP
 * layer will accept without having to read server.ts. Safe to expose because
 * the rules themselves are not sensitive — they describe what is *allowed*,
 * not what is secret.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const dev = process.env.NODE_ENV !== 'production';

function safeRegex(s: RegExp): string {
  return s.source;
}

function describeAllowedOrigins(): Array<string | { regex: string; flags: string }> {
  if (process.env.SOCKET_IO_ORIGINS) {
    return process.env.SOCKET_IO_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  }
  if (!dev) return [];
  // Mirror the dev defaults declared in server.ts. Kept in sync manually;
  // the alternative would be to extract the array into a shared module which
  // is a larger refactor and out of scope for this small enhancement.
  return [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://0.0.0.0:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://0.0.0.0:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://0.0.0.0:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
    'http://0.0.0.0:5175',
    'http://localhost:5176',
    'http://127.0.0.1:5176',
    'http://0.0.0.0:5176',
    { regex: safeRegex(/^http:\/\/100\.\d+\.\d+\.\d+:3000$/), flags: '' },
    { regex: safeRegex(/^http:\/\/100\.\d+\.\d+\.\d+:5173$/), flags: '' },
    { regex: safeRegex(/^http:\/\/100\.\d+\.\d+\.\d+:5174$/), flags: '' },
    { regex: safeRegex(/^http:\/\/100\.\d+\.\d+\.\d+:5175$/), flags: '' },
    { regex: safeRegex(/^http:\/\/100\.\d+\.\d+\.\d+:5176$/), flags: '' },
    { regex: safeRegex(/^http:\/\/192\.168\.\d+\.\d+:3000$/), flags: '' },
    { regex: safeRegex(/^http:\/\/192\.168\.\d+\.\d+:5173$/), flags: '' },
    { regex: safeRegex(/^http:\/\/10\.\d+\.\d+\.\d+:3000$/), flags: '' },
    { regex: safeRegex(/^http:\/\/10\.\d+\.\d+\.\d+:5173$/), flags: '' },
    { regex: safeRegex(/^http:\/\/172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+:3000$/), flags: '' },
    { regex: safeRegex(/^http:\/\/172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+:5173$/), flags: '' },
  ];
}

export async function GET() {
  const allowed = describeAllowedOrigins();
  return NextResponse.json({
    success: true,
    environment: dev ? 'development' : 'production',
    socketAuthEnabled: process.env.SOCKET_IO_AUTH === 'true',
    anyHostPort3000Allowed: process.env.CANNAAI_ALLOW_DEV_HOST_PORT === '1',
    allowedOrigins: allowed,
    runtimeChecks: [
      // Documented at runtime so future maintainers don't have to read server.ts
      'localhost / 127.0.0.1 / 0.0.0.0 (any port in dev)',
      'Tailscale 100.x.x.x (any port, dev only)',
      'Tailscale magic DNS *.ts.net (HTTPS, dev only)',
      'Local network 192.168.x.x / 10.x.x.x / 172.16-31.x.x (any port, dev only)',
      `Any host on port 3000: ${process.env.CANNAAI_ALLOW_DEV_HOST_PORT === '1' ? 'ENABLED (opt-in)' : 'DISABLED (default)'}`,
      'No origin header (mobile apps, curl, server-to-server): always allowed',
    ],
    notes: [
      'Production builds refuse to start with empty allowedOrigins — set SOCKET_IO_ORIGINS=...',
      'CANNAAI_ALLOW_DEV_HOST_PORT=1 opts into the broad "any host on port 3000" rule for dev flexibility only',
    ],
    timestamp: new Date().toISOString(),
  });
}
