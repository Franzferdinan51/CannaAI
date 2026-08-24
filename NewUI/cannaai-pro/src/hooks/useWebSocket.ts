'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { resolveWebSocketUrl } from '../lib/socket';

export { resolveWebSocketUrl } from '../lib/socket';

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
  const reconnectCountRef = useRef(0);
  const manuallyDisconnectedRef = useRef(false);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const callbacksRef = useRef({ onConnect, onDisconnect, onMessage, onError });
  callbacksRef.current = { onConnect, onDisconnect, onMessage, onError };
  const optionsRef = useRef({ reconnectAttempts, reconnectInterval, shouldReconnect });
  optionsRef.current = { reconnectAttempts, reconnectInterval, shouldReconnect };

  const connect = useCallback(() => {
    if (socketRef.current && [WebSocket.CONNECTING, WebSocket.OPEN].includes(socketRef.current.readyState)) {
      return;
    }

    setIsConnecting(true);
    manuallyDisconnectedRef.current = false;

    try {
      const ws = new WebSocket(resolveWebSocketUrl(url));
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        reconnectCountRef.current = 0;
        setSocket(ws);
        callbacksRef.current.onConnect?.();
      };

      ws.onclose = (event) => {
        if (socketRef.current !== ws) return;
        socketRef.current = null;
        setIsConnected(false);
        setIsConnecting(false);
        setSocket(null);
        callbacksRef.current.onDisconnect?.();

        if (!manuallyDisconnectedRef.current && optionsRef.current.shouldReconnect && event.code !== 1000 && reconnectCountRef.current < optionsRef.current.reconnectAttempts) {
          const nextAttempt = reconnectCountRef.current + 1;
          reconnectCountRef.current = nextAttempt;

          const delay = optionsRef.current.reconnectInterval * Math.pow(2, nextAttempt - 1);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onmessage = (event) => {
        setLastMessage(event);
        callbacksRef.current.onMessage?.(event);
      };

      ws.onerror = (error) => {
        setIsConnecting(false);
        callbacksRef.current.onError?.(error);
      };

    } catch (error) {
      setIsConnecting(false);
      callbacksRef.current.onError?.(error as Event);
    }
  }, [url]);

  const disconnect = useCallback(() => {
    manuallyDisconnectedRef.current = true;
    reconnectCountRef.current = 0;
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
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectCountRef.current = 0;
    connect();
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

  // Connect once for this URL and close it when the consuming component unmounts.
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [url]);

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
