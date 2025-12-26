'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import socketService from '@/lib/socket-client';

export default function SocketTest() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Array<{text: string, senderId: string, timestamp: string}>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Test Socket.IO connection
    socketService.connect()
      .then(() => {
        setConnected(true);
        setError(null);

        // Listen for messages
        socketService.onMessage((data) => {
          setMessages(prev => [...prev, data]);
        });
      })
      .catch((err) => {
        setError(`Connection failed: ${err.message}`);
        setConnected(false);
      });

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (inputMessage.trim() && connected) {
      socketService.sendMessage(inputMessage);
      setInputMessage('');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Socket.IO Connection Test</h1>
        <p className="text-muted-foreground">
          Test the WebSocket connection to verify Socket.IO is working correctly.
        </p>
      </div>

      <div className="space-y-4">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Connection Status
              <Badge variant={connected ? "default" : "destructive"}>
                {connected ? "Connected" : "Disconnected"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-red-600">{error}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {connected
                  ? "Successfully connected to Socket.IO server at /api/socketio"
                  : "Attempting to connect to Socket.IO server..."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Message Interface */}
        {connected && (
          <Card>
            <CardHeader>
              <CardTitle>Test Communication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Send Message */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a test message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button onClick={sendMessage} disabled={!inputMessage.trim()}>
                  Send
                </Button>
              </div>

              {/* Messages */}
              <div className="h-64 border border-gray-200 rounded-md p-3 overflow-y-auto">
                <h4 className="font-semibold mb-2">Messages:</h4>
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages yet. Send one to test!</p>
                ) : (
                  <div className="space-y-2">
                    {messages.map((msg, index) => (
                      <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                        <span className="font-medium">{msg.senderId}:</span> {msg.text}
                        <div className="text-xs text-gray-500">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}