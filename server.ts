// server.ts - Next.js Standalone + Socket.IO
import { setupSocket } from '@/lib/socket';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const currentPort = Number(process.env.PORT) || 3000;
const hostname = process.env.HOST || '127.0.0.1';

// Enhanced CORS configuration
const allowedOrigins = process.env.SOCKET_IO_ORIGINS
  ? process.env.SOCKET_IO_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : dev
    ? ['http://localhost:3000', 'http://127.0.0.1:3000'] // Development origins
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
    const server = createServer((req, res) => {
      // Skip socket.io requests from Next.js handler
      if (req.url?.startsWith('/api/socketio')) {
        return;
      }
      handle(req, res);
    });

    // Setup Socket.IO with enhanced security
    const io = new Server(server, {
      path: '/api/socketio',
      cors: {
        origin: allowedOrigins.length > 0 ? allowedOrigins : false, // Strict in production
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

        // Log connection attempt
        console.log(`🔌 Socket.IO connection attempt from: ${clientIP}`);

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

    // Start the server
    server.listen(currentPort, hostname, () => {
      console.log(`🚀 CannaAI server running at http://${hostname}:${currentPort}`);
      console.log(`🔌 Socket.IO server at ws://${hostname}:${currentPort}/api/socketio`);
      console.log(`📊 Environment: ${dev ? 'Development' : 'Production'}`);
      console.log(`🔒 Security: ${enableSocketAuth ? 'Enabled' : 'Disabled'}`);
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
