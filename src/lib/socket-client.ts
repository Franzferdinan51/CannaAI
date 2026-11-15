import { io, Socket } from 'socket.io-client';
import { getLogger } from './logger';

const log = getLogger().child({ tag: '[SOCKET-CLIENT]' });

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

        log.info('socket_client.connecting', { serverUrl });

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
          log.info('socket_client.connected', { socketId: this.socket?.id });
          resolve(this.socket!);
        });

        this.socket.on('connect_error', (error) => {
          log.error('socket_client.connection_error', { error: error instanceof Error ? error.message : String(error) });
          this.connectionPromise = null;
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          log.info('socket_client.disconnected', { reason });
          this.connectionPromise = null;
        });

        // Message handler
        this.socket.on('message', (data) => {
          log.debug('socket_client.message_received', { dataType: typeof data, keys: data && typeof data === 'object' ? Object.keys(data as Record<string, unknown>) : undefined });
        });

      } catch (error) {
        log.error('socket_client.connection_create_failed', { error: error instanceof Error ? error.message : String(error) });
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  disconnect(): void {
    if (this.socket) {
      log.info('socket_client.disconnecting');
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
      log.warn('socket_client.send_failed_not_connected');
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