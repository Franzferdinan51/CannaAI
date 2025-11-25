// server.ts - Next.js Standalone + Socket.IO
import { setupSocket } from '@/lib/socket';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';

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

const enableSocketAuth = process.env.SOCKET_IO_AUTH === 'true';

// Security configuration
const securityConfig = {
  allowedOrigins: allowedOrigins,
  enableAuth: enableSocketAuth,
  maxConnections: 100, // Limit concurrent connections
  pingTimeout: 20000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
  transports: ['websocket', 'polling'] as const,
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

            // Allow local network ranges
            if (origin.match(/^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/) ||
                origin.match(/^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/) ||
                origin.match(/^https?:\/\/172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+(:\d+)?$/)) {
              return callback(null, true);
            }

            // Allow specific port 3000 on any hostname for development flexibility
            if (origin.match(/^https?:\/\/[\w\.-]+:3000$/)) {
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
      connectionCount++;

      if (connectionCount > securityConfig.maxConnections) {
        console.warn(`⚠️  Connection limit exceeded: ${connectionCount}/${securityConfig.maxConnections}`);
        socket.disconnect(true);
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
    const gracefulShutdown = (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      server.close(() => {
        console.log('✅ HTTP server closed');
        io.close(() => {
          console.log('✅ Socket.IO server closed');
          process.exit(0);
        });
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
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

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
createCustomServer();
