'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  shouldReconnect?: boolean;
}

interface UseWebSocketReturn {
  socket: WebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  lastMessage: MessageEvent | null;
  send: (data: any) => boolean;
  reconnect: () => void;
  disconnect: () => void;
}

export function useWebSocket(url: string, options: WebSocketOptions = {}): UseWebSocketReturn {
  const {
    onConnect,
    onDisconnect,
    onMessage,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 1000,
    shouldReconnect = true
  } = options;

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);

    try {
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setReconnectCount(0);
        setSocket(ws);
        onConnect?.();
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        setIsConnecting(false);
        setSocket(null);
        onDisconnect?.();

        // Attempt reconnection if enabled and not a clean close
        if (shouldReconnect && event.code !== 1000 && reconnectCount < reconnectAttempts) {
          const nextAttempt = reconnectCount + 1;
          setReconnectCount(nextAttempt);

          const delay = reconnectInterval * Math.pow(2, nextAttempt - 1); // Exponential backoff

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onmessage = (event) => {
        setLastMessage(event);
        onMessage?.(event);
      };

      ws.onerror = (error) => {
        setIsConnecting(false);
        onError?.(error);
      };

    } catch (error) {
      setIsConnecting(false);
      onError?.(error as Event);
    }
  }, [url, onConnect, onDisconnect, onMessage, onError, shouldReconnect, reconnectAttempts, reconnectInterval, reconnectCount]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close(1000, 'Disconnected by user');
      socketRef.current = null;
    }

    setSocket(null);
    setIsConnected(false);
    setIsConnecting(false);
    setReconnectCount(0);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setReconnectCount(0);
    setTimeout(() => {
      connect();
    }, 100);
  }, [disconnect, connect]);

  const send = useCallback((data: any): boolean => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        socketRef.current.send(message);
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    }
    return false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    socket,
    isConnected,
    isConnecting,
    lastMessage,
    send,
    reconnect,
    disconnect
  };
}