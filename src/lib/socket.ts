import { Server } from 'socket.io';

type SocketOptions = {
  enableAuth?: boolean;
  securityConfig?: any;
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

    // Subscribe to analytics updates
    socket.on('subscribe-analytics', () => {
      socket.join('analytics');
      console.log(`Client ${socket.id} subscribed to analytics updates`);
      socket.emit('analytics-subscribed', {
        message: 'Subscribed to analytics updates',
        timestamp: new Date().toISOString(),
      });
    });

    // Unsubscribe from analytics updates
    socket.on('unsubscribe-analytics', () => {
      socket.leave('analytics');
      console.log(`Client ${socket.id} unsubscribed from analytics updates`);
      socket.emit('analytics-unsubscribed', {
        message: 'Unsubscribed from analytics updates',
        timestamp: new Date().toISOString(),
      });
    });

    // Subscribe to notifications
    socket.on('subscribe-notifications', () => {
      socket.join('notifications');
      console.log(`Client ${socket.id} subscribed to notifications`);
      socket.emit('notifications-subscribed', {
        message: 'Subscribed to notifications',
        timestamp: new Date().toISOString(),
      });
    });

    // Unsubscribe from notifications
    socket.on('unsubscribe-notifications', () => {
      socket.leave('notifications');
      console.log(`Client ${socket.id} unsubscribed from notifications`);
      socket.emit('notifications-unsubscribed', {
        message: 'Unsubscribed from notifications',
        timestamp: new Date().toISOString(),
      });
    });

    // Request unread notifications
    socket.on('request-unread-notifications', async () => {
      try {
        const { prisma } = await import('@/lib/prisma');

        const unreadNotifications = await prisma.notification.findMany({
          where: {
            acknowledged: false
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 20
        });

        socket.emit('unread-notifications', {
          notifications: unreadNotifications,
          count: unreadNotifications.length,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error fetching unread notifications:', error);
        socket.emit('notifications-error', {
          message: 'Failed to fetch unread notifications',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Acknowledge notification via socket
    socket.on('acknowledge-notification', async (data: { notificationId: string }) => {
      try {
        const { prisma } = await import('@/lib/prisma');

        await prisma.notification.update({
          where: { id: data.notificationId },
          data: {
            acknowledged: true,
            acknowledgedAt: new Date()
          }
        });

        // Notify all clients that a notification was acknowledged
        io.to('notifications').emit('notification-acknowledged', {
          notificationId: data.notificationId,
          timestamp: new Date().toISOString(),
        });

        socket.emit('notification-acknowledged-success', {
          notificationId: data.notificationId,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error acknowledging notification:', error);
        socket.emit('notifications-error', {
          message: 'Failed to acknowledge notification',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

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

    // Request analytics snapshot
    socket.on('request-analytics', async () => {
      try {
        const { prisma } = await import('@/lib/prisma');

        const [alerts, plants, sensors] = await Promise.all([
          prisma.alert.count(),
          prisma.plant.findMany(),
          prisma.sensor.findMany({
            include: {
              readings: {
                orderBy: { timestamp: 'desc' },
                take: 1,
              },
            },
          }),
        ]);

        socket.emit('analytics-snapshot', {
          alerts,
          plants: plants.length,
          sensors: sensors.length,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error fetching analytics snapshot:', error);
        socket.emit('analytics-error', {
          message: 'Failed to fetch analytics snapshot',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      clearInterval(refillInterval);
    });

    // Send welcome message
    socket.emit('message', {
      text: 'Welcome to CultivAI Pro WebSocket Server!',
      senderId: 'system',
      timestamp: new Date().toISOString(),
    });
  });
};

// Helper function to broadcast analytics updates
export const broadcastAnalyticsUpdate = (io: Server, data: any) => {
  io.to('analytics').emit('analytics-update', {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

// Helper function to broadcast alerts
export const broadcastAlert = (io: Server, alert: any) => {
  io.to('analytics').emit('new-alert', {
    ...alert,
    timestamp: new Date().toISOString(),
  });
};

// Helper function to broadcast sensor updates
export const broadcastSensorUpdate = (io: Server, data: any) => {
  io.to('analytics').emit('sensor-update', {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

// Helper function to broadcast notifications
export const broadcastNotification = (io: Server, notification: any) => {
  io.to('notifications').emit('new-notification', {
    notification,
    timestamp: new Date().toISOString(),
  });

  // Also send to analytics subscribers for dashboard alerts
  io.to('analytics').emit('notification-alert', {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    severity: notification.metadata?.severity || 'info',
    timestamp: new Date().toISOString(),
  });
};

// Helper function to broadcast webhook delivery status
export const broadcastWebhookDelivery = (io: Server, data: {
  webhookId: string;
  notificationId: string;
  status: string;
  attempts: number;
  responseCode?: number;
}) => {
  io.to('notifications').emit('webhook-delivery-status', {
    ...data,
    timestamp: new Date().toISOString(),
  });
};
