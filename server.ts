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
import { createServer } from 'http';
import { Server } from 'socket.io';
import { WebSocketServer } from 'ws';
import next from 'next';

// Prevent server crashes from unhandled promise rejections (e.g., libheif-js localStorage in Node.js)
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - let the server continue running
});

const dev = process.env.NODE_ENV !== 'production';
const currentPort = Number(process.env.PORT) || 3000;
// Bind to all interfaces (0.0.0.0) for remote access via Tailscale
const hostname = process.env.HOST || '0.0.0.0';

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
    console.warn('⚠️  Production mode: No allowed origins configured. Please set SOCKET_IO_ORIGINS environment variable.');
  }

  if (allowedOrigins.length > 0) {
    console.log('🔒 CORS allowed origins:', allowedOrigins);
  }

  if (enableSocketAuth) {
    if (!process.env.SOCKET_IO_TOKEN && !process.env.CANNAAI_API_TOKEN) {
      throw new Error('Socket authentication is required but SOCKET_IO_TOKEN or CANNAAI_API_TOKEN is not configured');
    }
    console.log('🔐 Socket.IO authentication enabled');
  } else {
    console.log('⚠️  Socket.IO authentication disabled (development mode)');
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
          console.log(`🚫 Blocked CORS origin: ${origin}`);
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
        console.log(`🔌 Socket.IO connection attempt from: ${clientIP}`);

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
        console.warn(`⚠️  Connection limit exceeded: ${connectionCount}/${securityConfig.maxConnections}`);
        // `io.engine` exposes a raw Engine.IO socket, not a Socket.IO socket.
        // Calling disconnect() here caused an unhandled rejection on every
        // excess connection and destabilized long-running analysis requests.
        socket.close();
        return;
      }

      console.log(`✅ Socket.IO connected: ${socket.id} (Total: ${connectionCount})`);

      socket.on('disconnect', (reason) => {
        connectionCount--;
        console.log(`❌ Socket.IO disconnected: ${socket.id} (${reason}) (Total: ${connectionCount})`);
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
      console.log('✅ Notification system initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification system:', error);
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
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    });

    // Attach Next.js request handler to the server
    // Socket.IO will handle its own requests before Next.js
    server.on('request', (req, res) => {
      handle(req, res);
    });

    // Start the server
    server.listen(currentPort, hostname, () => {
      console.log(`🚀 CannaAI server running on port ${currentPort}`);
      console.log(`📊 Environment: ${dev ? 'Development' : 'Production'}`);
      console.log(`🔒 Security: ${enableSocketAuth ? 'Enabled' : 'Disabled'}`);
      console.log(`\n📍 Access URLs:`);
      console.log(`   • Local: http://localhost:${currentPort}`);
      console.log(`   • Network: http://0.0.0.0:${currentPort}`);

      // Get local IP addresses for better guidance
      const { networkInterfaces } = require('os');
      const nets = networkInterfaces();

      console.log(`\n🌐 Available on your network:`);
      for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
          // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
          if (net.family === 'IPv4' && !net.internal) {
            console.log(`   • http://${net.address}:${currentPort}`);
          }
        }
      }

      console.log(`\n🔌 Socket.IO server at ws://${hostname}:${currentPort}/api/socketio`);
      console.log(`\n💡 Tailscale Users:`);
      console.log(`   • Access via your Tailscale IP: http://100.x.x.x:${currentPort}`);
      console.log(`   • Or use Tailscale magic DNS: http://<machine-name>.tailnet-name.ts.net:${currentPort}`);
    });

    // Graceful shutdown handling
    let shuttingDown = false;
    const gracefulShutdown = (signal: string) => {
      if (shuttingDown) {
        console.log(`🛑 Already shutting down (received ${signal} again). Forcing exit.`);
        process.exit(1);
      }
      shuttingDown = true;
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      // Stop accepting new HTTP connections; existing connections finish.
      // closeAllConnections() is needed in newer Node to drop keep-alive
      // sockets that would otherwise hold the shutdown open.
      try {
        if (typeof (server as any).closeAllConnections === 'function') {
          (server as any).closeAllConnections();
        }
      } catch (e) {
        console.warn('closeAllConnections failed (continuing):', e);
      }

      let httpClosed = false;
      let ioClosed = false;
      const maybeExit = () => {
        if (httpClosed && ioClosed) {
          // Drain Prisma so SQLite WAL is flushed before the process dies.
          try {
            const { prisma } = require('./src/lib/prisma');
            prisma.$disconnect()
              .catch((e: any) => console.warn('Prisma disconnect failed:', e?.message))
              .finally(() => process.exit(0));
          } catch {
            process.exit(0);
          }
        }
      };

      server.close(() => {
        console.log('✅ HTTP server closed');
        httpClosed = true;
        maybeExit();
      });

      io.close(() => {
        console.log('✅ Socket.IO server closed');
        ioClosed = true;
        maybeExit();
      });

      // Force shutdown after 10 seconds — refuse to hang forever
      setTimeout(() => {
        console.error('❌ Forced shutdown after 10s timeout');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (err) {
    console.error('❌ Server startup error:', err);
    process.exit(1);
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
createCustomServer();
