// server.ts - Next.js + Socket.IO custom server
// Node 20.12+ provides process.loadEnvFile, which avoids relying on a
// transitive dotenv dependency during clean production installs.
const loadEnvFile = (process as NodeJS.Process & {
  loadEnvFile?: (path?: string) => void;
}).loadEnvFile;
if (loadEnvFile) {
  try { loadEnvFile.call(process, '.env.local'); } catch { /* optional */ }
  try { loadEnvFile.call(process, '.env'); } catch { /* optional */ }
}
import { setupSocket } from '@/lib/socket';
import { recordUnhandledRejection } from '@/lib/process-health';
import { createServer } from 'http';
import { networkInterfaces } from 'node:os';
import { Server } from 'socket.io';
import { WebSocketServer } from 'ws';
import next from 'next';
import { getLogger } from './src/lib/logger';

const log = getLogger();

// Prevent server crashes from unhandled promise rejections (e.g., libheif-js localStorage in Node.js)
process.on('unhandledRejection', (reason, promise) => {
  // Counted + surfaced in /api/health-check (see @/lib/process-health):
  // continuing forever is fine, continuing invisibly is not.
  recordUnhandledRejection(reason);
  log.error('server.unhandled_rejection', { reason: reason instanceof Error ? reason.message : String(reason) });
  // Don't exit - let the server continue running
});

const dev = process.env.NODE_ENV !== 'production';
const currentPort = Number(process.env.PORT) || 3000;
// Fail closed on bind address: never default to 0.0.0.0. The systemd unit
// sets HOST to the tailnet IP explicitly; without it we bind loopback only
// and say so loudly, so a dropped env var can't silently expose the API.
const hostname = process.env.HOST || '127.0.0.1';
if (!process.env.HOST) {
  log.warn('server.host_not_set', { hostname, hint: 'Set HOST to the tailnet IP for remote access' });
}

// Enhanced CORS configuration for local and remote access
const allowedOrigins = process.env.SOCKET_IO_ORIGINS
  ? process.env.SOCKET_IO_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : dev
    ? [
        // Backend (Next.js) origins
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://0.0.0.0:3000',
        // Frontend (New UI Vite) origins
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
        // Allow any Tailscale IP (100.x.x.x range) for both ports
        /^http:\/\/100\.\d+\.\d+\.\d+:3000$/,
        /^http:\/\/100\.\d+\.\d+\.\d+:5173$/,
        /^http:\/\/100\.\d+\.\d+\.\d+:5174$/,
        /^http:\/\/100\.\d+\.\d+\.\d+:5175$/,
        /^http:\/\/100\.\d+\.\d+\.\d+:5176$/,
        // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x) for both ports
        /^http:\/\/192\.168\.\d+\.\d+:3000$/,
        /^http:\/\/192\.168\.\d+\.\d+:5173$/,
        /^http:\/\/10\.\d+\.\d+\.\d+:3000$/,
        /^http:\/\/10\.\d+\.\d+\.\d+:5173$/,
        /^http:\/\/172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+:3000$/,
        /^http:\/\/172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+:5173$/,
        // Allow any hostname with ports 3000 or 5173 for flexibility
        /^http:\/\/[\w\.-]+:3000$/,
        /^http:\/\/[\w\.-]+:5173$/
      ] // Development origins including remote access
    : []; // Production requires explicit configuration

const enableSocketAuth = !dev || process.env.SOCKET_IO_AUTH === 'true';

// Security configuration
const securityConfig = {
  allowedOrigins: allowedOrigins,
  enableAuth: enableSocketAuth,
  maxConnections: 100, // Limit concurrent connections
  pingTimeout: 20000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
  transports: ['websocket', 'polling'] as Array<'websocket' | 'polling'>,
};

// Validate configuration
function validateConfig() {
  if (!dev && allowedOrigins.length === 0) {
    log.warn('server.config_no_allowed_origins', { hint: 'Set SOCKET_IO_ORIGINS environment variable' });
  }

  if (allowedOrigins.length > 0) {
    log.info('server.cors_allowed_origins', { allowedOriginCount: allowedOrigins.length, allowedOrigins: allowedOrigins.map((o) => String(o)) });
  }

  if (enableSocketAuth) {
    if (!process.env.SOCKET_IO_TOKEN && !process.env.CANNAAI_API_TOKEN) {
      throw new Error('Socket authentication is required but SOCKET_IO_TOKEN or CANNAAI_API_TOKEN is not configured');
    }
    log.info('server.socket_auth_enabled');
  } else {
    log.warn('server.socket_auth_disabled', { mode: 'development' });
  }
}

// Custom server with Socket.IO integration
async function createCustomServer() {
  try {
    validateConfig();

    // Create Next.js app
    const nextApp = next({
      dev,
      dir: process.cwd(),
      // In production, use the current directory where .next is located
      conf: dev ? undefined : { distDir: './.next' }
    });

    await nextApp.prepare();
    const handle = nextApp.getRequestHandler();

    // Create HTTP server that will handle both Next.js and Socket.IO
    const server = createServer();

    // Setup Socket.IO with enhanced security and dynamic CORS
    const io = new Server(server, {
      path: '/api/socketio',
      cors: {
        origin: (origin, callback) => {
          // Allow requests with no origin (mobile apps, curl, etc.)
          if (!origin) return callback(null, true);

          // In development, be more permissive for local and Tailscale access
          if (dev) {
            // Allow localhost variants
            if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('0.0.0.0')) {
              return callback(null, true);
            }

            // Allow Tailscale IPs (100.x.x.x)
            if (origin.match(/^https?:\/\/100\.\d+\.\d+\.\d+(:\d+)?$/)) {
              return callback(null, true);
            }

            // Allow the HTTPS endpoint Tailscale Serve gives the Pixel. HTTPS
            // is required for mobile camera capture outside localhost.
            if (origin.match(/^https:\/\/[\w.-]+\.ts\.net(?::\d+)?$/)) {
              return callback(null, true);
            }

            // Allow local network ranges
            if (origin.match(/^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/) ||
                origin.match(/^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/) ||
                origin.match(/^https?:\/\/172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+(:\d+)?$/)) {
              return callback(null, true);
            }

            // Allow specific port 3000 on any hostname for development flexibility.
            // Opt-in only — set CANNAAI_ALLOW_DEV_HOST_PORT=1 to enable, since
            // a regex that accepts "any hostname" plus a known dev port is a
            // sharp tool and shouldn't be on by default.
            if (process.env.CANNAAI_ALLOW_DEV_HOST_PORT === '1' &&
                origin.match(/^https?:\/\/[\w\.-]+:3000$/)) {
              return callback(null, true);
            }
          }

          // Check explicit allowed origins
          if (allowedOrigins.length > 0 && Array.isArray(allowedOrigins)) {
            const isAllowed = allowedOrigins.some(allowedOrigin => {
              if (typeof allowedOrigin === 'string') {
                return origin === allowedOrigin || origin.startsWith(allowedOrigin);
              } else if (allowedOrigin instanceof RegExp) {
                return allowedOrigin.test(origin);
              }
              return false;
            });

            if (isAllowed) {
              return callback(null, true);
            }
          }

          // Log blocked origin for debugging
          log.warn('socket.cors_origin_blocked', { origin });
          callback(new Error('Not allowed by CORS'), false);
        },
        methods: ["GET", "POST"],
        credentials: true,
      },
      allowEIO3: false,
      pingTimeout: securityConfig.pingTimeout,
      pingInterval: securityConfig.pingInterval,
      maxHttpBufferSize: securityConfig.maxHttpBufferSize,
      transports: securityConfig.transports,
      // Additional security options
      allowRequest: (req, callback) => {
        // Basic IP validation and rate limiting could be added here
        const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Log connection attempt with IP info
        log.info('socket.connection_attempt', { clientIp: clientIP });

        // In development, allow all connections
        if (dev) {
          callback(null, true);
          return;
        }

        // In production, you could add more strict validation here
        callback(null, true);
      },
    });

    // Add connection limiting
    let connectionCount = 0;
    io.engine.on('connection', (socket) => {
      // The development Pixel/browser clients reconnect aggressively while
      // hot reloads and tunnels change. Limiting raw Engine.IO connections
      // here causes an endless reconnect storm and starves API requests.
      if (dev) return;
      connectionCount++;

      if (connectionCount > securityConfig.maxConnections) {
        log.warn('socket.connection_limit_exceeded', { connectionCount, maxConnections: securityConfig.maxConnections });
        // `io.engine` exposes a raw Engine.IO socket, not a Socket.IO socket.
        // Calling disconnect() here caused an unhandled rejection on every
        // excess connection and destabilized long-running analysis requests.
        socket.close();
        return;
      }

      log.info('socket.connected', { socketId: socket.id, total: connectionCount });

      socket.on('disconnect', (reason) => {
        connectionCount--;
        log.info('socket.disconnected', { socketId: socket.id, reason, total: connectionCount });
      });
    });

    // Setup Socket.IO handlers
    setupSocket(io, {
      enableAuth: enableSocketAuth,
      securityConfig: securityConfig
    });

    // Initialize notification system
    try {
      const { initializeNotificationSystem } = await import('@/lib/notification-init');
      await initializeNotificationSystem(io);
      log.info('server.notification_system_initialized');
    } catch (error) {
      log.error('server.notification_system_init_failed', { error: error instanceof Error ? error.message : String(error) });
      // Don't fail startup, just log the error
    }

    // Start the in-process scheduler: due automation schedules, analysis
    // schedulers, daily reports, and a notification-queue drain backstop.
    // Independent of the notification system so due work still moves even
    // if that failed to initialize. Disable with
    // CANNAAI_SCHEDULER_DISABLED=true.
    try {
      const { startScheduler } = await import('@/lib/scheduler');
      startScheduler();
    } catch (error) {
      log.error('server.scheduler_start_failed', { error: error instanceof Error ? error.message : String(error) });
      // Don't fail startup, just log the error
    }

    // Native WebSocket endpoint for chat UI
    const wss = new WebSocketServer({ noServer: true });
    wss.on('connection', (ws) => {
      ws.send(JSON.stringify({ type: 'connected', message: 'Chat websocket connected' }));
      ws.on('message', (message) => {
        const text = message.toString();
        const response = {
          type: 'message_received',
          content: `Echo: ${text}`,
          timestamp: new Date().toISOString()
        };
        ws.send(JSON.stringify(response));
      });
    });

    // Route upgrades to the chat websocket path
    server.on('upgrade', (request, socket, head) => {
      const { url } = request;
      if (url && url.startsWith('/api/chat/ws')) {
        if (!dev) {
          const token = new URL(url, `http://${request.headers.host || 'localhost'}`).searchParams.get('token');
          const expected = process.env.CANNAAI_API_TOKEN || process.env.SOCKET_IO_TOKEN;
          if (!expected || token !== expected) {
            socket.destroy();
            return;
          }
        }
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    });

    // Attach Next.js request handler to the server
    // Socket.IO registers its own request listener on the same HTTP server.
    // Do not pass those Engine.IO requests to Next as well: both handlers
    // writing the response causes `ERR_HTTP_HEADERS_SENT` and takes down the
    // whole custom server, leaving Chat/Sensors falsely offline.
    server.on('request', (req, res) => {
      if (req.url?.startsWith('/api/socketio')) return;
      handle(req, res);
    });

    // Start the server
    server.listen(currentPort, hostname, () => {
      // Get local IP addresses for better guidance
      const nets = networkInterfaces();
      const networkUrls: string[] = [];
      for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
          // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
          if (net.family === 'IPv4' && !net.internal) {
            networkUrls.push(`http://${net.address}:${currentPort}`);
          }
        }
      }

      log.info('server.started', {
        port: currentPort,
        env: dev ? 'Development' : 'Production',
        security: enableSocketAuth ? 'Enabled' : 'Disabled',
      });
      log.info('server.access_urls', {
        localUrl: `http://localhost:${currentPort}`,
        networkUrl: `http://${hostname}:${currentPort}`,
        networkUrls,
        socketIoUrl: `ws://${hostname}:${currentPort}/api/socketio`,
      });
      log.info('server.tailscale_hint', {
        tailscaleUrl: `http://100.x.x.x:${currentPort}`,
        magicDnsUrl: `http://<machine-name>.tailnet-name.ts.net:${currentPort}`,
      });
    });

    // Graceful shutdown handling
    let shuttingDown = false;
    const gracefulShutdown = (signal: string) => {
      if (shuttingDown) {
        log.warn('server.shutdown_already_in_progress', { signal });
        process.exit(1);
      }
      shuttingDown = true;
      log.info('server.shutdown_started', { signal });

      // Stop the scheduler so no new tick starts while we drain.
      import('@/lib/scheduler')
        .then(({ stopScheduler }) => stopScheduler())
        .catch(() => { /* scheduler may not be loaded; nothing to stop */ });

      // Stop accepting new HTTP connections; existing connections finish.
      // closeAllConnections() is needed in newer Node to drop keep-alive
      // sockets that would otherwise hold the shutdown open.
      try {
        if (typeof (server as any).closeAllConnections === 'function') {
          (server as any).closeAllConnections();
        }
      } catch (e) {
        log.warn('server.close_all_connections_failed', { error: e instanceof Error ? e.message : String(e) });
      }

      let httpClosed = false;
      let ioClosed = false;
      const maybeExit = () => {
        if (httpClosed && ioClosed) {
          // Drain Prisma so SQLite WAL is flushed before the process dies.
          import('./src/lib/prisma')
            .then(({ prisma }) => prisma.$disconnect())
            .catch((e: unknown) => {
              const message = e instanceof Error ? e.message : String(e);
              log.warn('server.prisma_disconnect_failed', { error: message });
            })
            .finally(() => process.exit(0));
        }
      };

      server.close(() => {
        log.info('server.http_closed');
        httpClosed = true;
        maybeExit();
      });

      io.close(() => {
        log.info('server.socketio_closed');
        ioClosed = true;
        maybeExit();
      });

      // Force shutdown after 10 seconds — refuse to hang forever
      setTimeout(() => {
        log.error('server.shutdown_forced_timeout', { timeoutMs: 10000 });
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (err) {
    log.error('server.startup_failed', { error: err instanceof Error ? err.message : String(err) });
    process.exit(1);
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  log.error('server.uncaught_exception', { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});

// Start the server
createCustomServer();
