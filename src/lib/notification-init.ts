import { startWebhookWorker, stopWebhookWorker } from './webhooks';
import { startQueueProcessor, stopQueueProcessor } from './notification-queue';
import { Server } from 'socket.io';
import { getLogger } from './logger';

const log = getLogger().child({ tag: '[NOTIFICATION-SYSTEM]' });

// Notification system initialization
export class NotificationSystem {
  private static instance: NotificationSystem;
  private io: Server | null = null;
  private initialized = false;

  private constructor() {}

  public static getInstance(): NotificationSystem {
    if (!NotificationSystem.instance) {
      NotificationSystem.instance = new NotificationSystem();
    }
    return NotificationSystem.instance;
  }

  /**
   * Initialize the notification system
   */
  public async initialize(io?: Server): Promise<void> {
    if (this.initialized) {
      log.info('notification_init.already_initialized');
      return;
    }

    log.info('notification_init.initializing');

    // Set Socket.IO instance if provided
    if (io) {
      this.io = io;
      log.info('notification_init.socket_io_instance_set');
    }

    // Do not start database-backed workers until the schema is available. A
    // fresh checkout commonly starts before `prisma db push`/migrations have
    // been run; starting them first creates a repeating stream of P2021
    // errors and wastes connections while the app is otherwise usable.
    let databaseReady = true;

    // Create default notification templates (graceful - tables may not exist yet)
    try {
      await this.createDefaultTemplates();
    } catch (error: any) {
      if (error.code === 'P2021') {
        databaseReady = false;
        log.info('notification_init.template_creation_skipped', { reason: 'tables_not_created', hint: 'Run: npm run db:push' });
      } else {
        log.error('notification_init.templates_creation_failed', { error: error instanceof Error ? error.message : String(error) });
      }
    }

    // Create default notification preferences (graceful - tables may not exist yet)
    if (databaseReady) {
      try {
        await this.createDefaultPreferences();
      } catch (error: any) {
        if (error.code === 'P2021') {
          databaseReady = false;
          log.info('notification_init.preferences_creation_skipped', { reason: 'tables_not_created', hint: 'Run: npm run db:push' });
        } else {
          log.error('notification_init.preferences_creation_failed', { error: error instanceof Error ? error.message : String(error) });
        }
      }
    }

    if (databaseReady) {
      this.startWorkers();
    } else {
      log.info('notification_init.workers_disabled', { reason: 'database_schema_not_initialized' });
    }

    this.initialized = true;
    log.info('notification_init.initialization_complete');
  }

  /**
   * Start background workers
   */
  private startWorkers(): void {
    try {
      // Start webhook delivery worker
      startWebhookWorker();
      log.info('notification_init.webhook_worker_started');

      // Start notification queue processor
      startQueueProcessor(5000);
      log.info('notification_init.queue_processor_started');
    } catch (error) {
      log.error('notification_init.workers_start_failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Create default notification templates
   */
  private async createDefaultTemplates(): Promise<void> {
    const { prisma } = await import('./prisma');

    const templates = [
      {
        name: 'sensor_threshold_warning',
        type: 'sensor_threshold',
        title: 'Sensor Warning: {{sensorName}}',
        message: 'The {{sensorType}} reading is outside optimal range. Current value: {{value}}',
        channels: JSON.stringify(['in_app', 'push', 'webhook'])
      },
      {
        name: 'sensor_threshold_critical',
        type: 'sensor_threshold',
        title: 'CRITICAL: Sensor Alert {{sensorName}}',
        message: 'The {{sensorType}} reading is critically outside range. Current value: {{value}}',
        channels: JSON.stringify(['in_app', 'push', 'email', 'webhook', 'discord'])
      },
      {
        name: 'plant_health_alert',
        type: 'plant_health',
        title: 'Plant Health Alert: {{plantName}}',
        message: 'Plant health status: {{healthStatus}} (Score: {{healthScore}}/100)',
        channels: JSON.stringify(['in_app', 'push', 'webhook'])
      },
      {
        name: 'system_failure',
        type: 'system_failure',
        title: 'SYSTEM FAILURE: {{component}}',
        message: '{{component}} has encountered an error: {{errorMessage}}',
        channels: JSON.stringify(['in_app', 'push', 'email', 'webhook', 'discord', 'slack'])
      },
      {
        name: 'harvest_ready',
        type: 'harvest_ready',
        title: 'Harvest Ready: {{plantName}}',
        message: '{{plantName}} may be ready for harvest. Days in flowering: {{daysInFlowering}}',
        channels: JSON.stringify(['in_app', 'push', 'email', 'webhook'])
      }
    ];

    for (const template of templates) {
      try {
        await prisma.notificationTemplate.upsert({
          where: { name: template.name },
          update: template,
          create: template
        });
        log.info('notification_init.template_created', { templateName: template.name });
      } catch (error) {
        if ((error as any)?.code === 'P2021') {
          throw error;
        }
        log.error('notification_init.template_creation_failed', { templateName: template.name, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  /**
   * Create default notification preferences
   */
  private async createDefaultPreferences(): Promise<void> {
    const { prisma } = await import('./prisma');

    const defaultTypes = [
      'system_alert',
      'sensor_threshold',
      'plant_health',
      'automation_event',
      'harvest_ready',
      'system_failure',
      'analysis_complete',
      'user_action_required'
    ];

    for (const type of defaultTypes) {
      try {
        // Check if preference already exists
        const existing = await prisma.notificationPreference.findFirst({
          where: { type }
        });

        if (!existing) {
          await prisma.notificationPreference.create({
            data: {
              type,
              emailEnabled: true,
              smsEnabled: false,
              pushEnabled: true,
              webhookEnabled: false,
              discordEnabled: false,
              slackEnabled: false,
              inAppEnabled: true,
              minSeverity: 'info',
              throttleRate: 0
            }
          });
          log.info('notification_init.preference_created', { preferenceType: type });
        }
      } catch (error) {
        if ((error as any)?.code === 'P2021') {
          throw error;
        }
        log.error('notification_init.preference_creation_failed', { preferenceType: type, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  /**
   * Get system statistics
   */
  public async getStatistics(): Promise<{
    notifications: {
      total: number;
      pending: number;
      acknowledged: number;
      byType: Record<string, number>;
    };
    webhooks: {
      total: number;
      enabled: number;
      verified: number;
      recentDeliveries: number;
    };
    deliveries: {
      total: number;
      successful: number;
      failed: number;
      successRate: number;
    };
    system: {
      uptime: number;
      workersRunning: boolean;
      initialized: boolean;
    };
  }> {
    const { prisma } = await import('./prisma');

    const [
      notifications,
      notificationsByType,
      webhooks,
      webhookStats,
      recentWebhookDeliveries,
      deliveries,
      deliveryStats
    ] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.groupBy({
        by: ['type'],
        _count: true
      }),
      prisma.webhookSubscription.count(),
      prisma.webhookSubscription.findMany({
        select: { enabled: true, isVerified: true }
      }),
      prisma.webhookDelivery.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.notificationDelivery.count(),
      prisma.notificationDelivery.groupBy({
        by: ['status'],
        _count: true
      })
    ]);

    const pendingNotifications = await prisma.notification.count({
      where: { acknowledged: false }
    });

    const acknowledgedNotifications = notifications - pendingNotifications;

    const enabledWebhooks = webhookStats.filter(w => w.enabled).length;
    const verifiedWebhooks = webhookStats.filter(w => w.isVerified).length;

    const successfulDeliveries = deliveryStats.find(d => d.status === 'delivered')?._count || 0;
    const failedDeliveries = deliveryStats.find(d => d.status === 'failed')?._count || 0;

    return {
      notifications: {
        total: notifications,
        pending: pendingNotifications,
        acknowledged: acknowledgedNotifications,
        byType: Object.fromEntries(notificationsByType.map(n => [n.type, n._count]))
      },
      webhooks: {
        total: webhooks,
        enabled: enabledWebhooks,
        verified: verifiedWebhooks,
        recentDeliveries: recentWebhookDeliveries
      },
      deliveries: {
        total: deliveries,
        successful: successfulDeliveries,
        failed: failedDeliveries,
        successRate: deliveries > 0 ? (successfulDeliveries / deliveries) * 100 : 0
      },
      system: {
        uptime: process.uptime(),
        workersRunning: true,
        initialized: this.initialized
      }
    };
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
      database: boolean;
      workers: boolean;
      initialized: boolean;
    };
    issues: string[];
  }> {
    const issues: string[] = [];
    const checks = {
      database: false,
      workers: false,
      initialized: false
    };

    // Check database connection
    try {
      const { prisma } = await import('./prisma');
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      issues.push('Database connection failed');
    }

    // Check if initialized
    if (this.initialized) {
      checks.initialized = true;
    } else {
      issues.push('Notification system not initialized');
    }

    // Check workers (they are started during initialization)
    checks.workers = this.initialized;

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues.length > 1) {
      status = 'unhealthy';
    } else if (issues.length > 0) {
      status = 'degraded';
    }

    return { status, checks, issues };
  }

  /**
   * Shutdown notification system
   */
  public shutdown(): void {
    log.info('notification_init.shutting_down');
    stopWebhookWorker();
    stopQueueProcessor();
    this.initialized = false;
    this.io = null;
    log.info('notification_init.shutdown_complete');
  }
}

// Export singleton instance
export const notificationSystem = NotificationSystem.getInstance();

// Initialize function for use in server startup
export async function initializeNotificationSystem(io?: Server): Promise<void> {
  try {
    await notificationSystem.initialize(io);
  } catch (error) {
    log.error('notification_init.initialization_failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// Graceful shutdown
export function shutdownNotificationSystem(): void {
  notificationSystem.shutdown();
}
