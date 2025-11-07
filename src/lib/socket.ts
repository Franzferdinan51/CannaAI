import { Server } from 'socket.io';

type SocketOptions = {
  enableAuth?: boolean;
};
export const setupSocket = (io: Server, options: SocketOptions = {}) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    // Basic optional auth (token in query or header)
    if (options.enableAuth) {
      const token = (socket.handshake.auth as any)?.token || socket.handshake.headers['authorization'];
      if (!token) {
        socket.disconnect(true);
        return;
      }
    }

    // Simple per-socket rate limiting for 'message' event
    let tokens = 5; // burst
    const refillInterval = setInterval(() => {
      tokens = Math.min(5, tokens + 1);
    }, 1000);
    
    // Handle messages
    socket.on('message', (msg: { text: string; senderId: string }) => {
      if (tokens <= 0) {
        return; // drop excessive messages
      }
      tokens -= 1;
      // Echo: broadcast message only the client who send the message
      socket.emit('message', {
        text: `Echo: ${msg.text}`,
        senderId: 'system',
        timestamp: new Date().toISOString(),
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      clearInterval(refillInterval);
    });

    // Send welcome message
    socket.emit('message', {
      text: 'Welcome to WebSocket Echo Server!',
      senderId: 'system',
      timestamp: new Date().toISOString(),
    });
  });
};