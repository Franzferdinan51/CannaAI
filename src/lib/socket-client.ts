import { io, Socket } from 'socket.io-client';

type SocketOptions = {
  autoConnect?: boolean;
  reconnection?: boolean;
};

class SocketService {
  private socket: Socket | null = null;
  private connectionPromise: Promise<Socket> | null = null;

  connect(options: SocketOptions = {}): Promise<Socket> {
    // Return existing connection if already connected
    if (this.socket?.connected) {
      return Promise.resolve(this.socket);
    }

    // Return existing connection promise if connection is in progress
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Create new connection promise
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // Determine the server URL
        const serverUrl = process.env.NODE_ENV === 'production'
          ? window.location.origin
          : `http://${window.location.hostname}:3000`;

        console.log(`🔌 Connecting to Socket.IO server at: ${serverUrl}`);

        // Create socket connection with proper configuration
        this.socket = io(serverUrl, {
          path: '/api/socketio',
          autoConnect: options.autoConnect !== false,
          reconnection: options.reconnection !== false,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
          transports: ['websocket', 'polling'],
          withCredentials: true,
        });

        // Connection event handlers
        this.socket.on('connect', () => {
          console.log('✅ Socket.IO connected:', this.socket?.id);
          resolve(this.socket!);
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ Socket.IO connection error:', error);
          this.connectionPromise = null;
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('❌ Socket.IO disconnected:', reason);
          this.connectionPromise = null;
        });

        // Message handler
        this.socket.on('message', (data) => {
          console.log('📨 Socket.IO message received:', data);
        });

      } catch (error) {
        console.error('❌ Failed to create Socket.IO connection:', error);
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting Socket.IO...');
      this.socket.disconnect();
      this.socket = null;
      this.connectionPromise = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Send a message to the server
  sendMessage(text: string): void {
    if (this.socket?.connected) {
      this.socket.emit('message', {
        text,
        senderId: 'client-' + Math.random().toString(36).substr(2, 9)
      });
    } else {
      console.warn('⚠️ Cannot send message - Socket.IO not connected');
    }
  }

  // Listen for server messages
  onMessage(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('message', callback);
    }
  }

  // Stop listening for server messages
  offMessage(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.off('message', callback);
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;