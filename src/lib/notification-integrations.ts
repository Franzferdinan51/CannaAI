import { sendNotification } from './notifications';
import { broadcastNotification } from './socket';

// Sensor threshold monitoring integration
export async function checkSensorThresholds(
  sensorId: string,
  sensorType: string,
  value: number,
  thresholds: {
    warningLow?: number;
    warningHigh?: number;
    criticalLow?: number;
    criticalHigh?: number;
  },
  metadata: {
    roomId?: string;
    sensorName: string;
  }
): Promise<void> {
  // Check critical thresholds first
  if (thresholds.criticalLow !== undefined && value <= thresholds.criticalLow) {
    await sendNotification({
      type: 'sensor_threshold',
      title: `Critical Low ${sensorType} Alert`,
      message: `${metadata.sensorName} is critically low at ${value}. Immediate attention required.`,
      severity: 'critical',
      channels: ['in_app', 'push', 'email', 'webhook', 'discord', 'slack'],
      metadata: {
        sensorId,
        sensorType,
        value,
        threshold: thresholds.criticalLow,
        direction: 'below',
        roomId: metadata.roomId
      },
      sensorId,
      roomId: metadata.roomId
    });
  } else if (thresholds.criticalHigh !== undefined && value >= thresholds.criticalHigh) {
    await sendNotification({
      type: 'sensor_threshold',
      title: `Critical High ${sensorType} Alert`,
      message: `${metadata.sensorName} is critically high at ${value}. Immediate attention required.`,
      severity: 'critical',
      channels: ['in_app', 'push', 'email', 'webhook', 'discord', 'slack'],
      metadata: {
        sensorId,
        sensorType,
        value,
        threshold: thresholds.criticalHigh,
        direction: 'above',
        roomId: metadata.roomId
      },
      sensorId,
      roomId: metadata.roomId
    });
  }
  // Check warning thresholds
  else if (thresholds.warningLow !== undefined && value <= thresholds.warningLow) {
    await sendNotification({
      type: 'sensor_threshold',
      title: `Low ${sensorType} Warning`,
      message: `${metadata.sensorName} is below optimal range at ${value}.`,
      severity: 'warning',
      channels: ['in_app', 'push', 'webhook'],
      metadata: {
        sensorId,
        sensorType,
        value,
        threshold: thresholds.warningLow,
        direction: 'below',
        roomId: metadata.roomId
      },
      sensorId,
      roomId: metadata.roomId
    });
  } else if (thresholds.warningHigh !== undefined && value >= thresholds.warningHigh) {
    await sendNotification({
      type: 'sensor_threshold',
      title: `High ${sensorType} Warning`,
      message: `${metadata.sensorName} is above optimal range at ${value}.`,
      severity: 'warning',
      channels: ['in_app', 'push', 'webhook'],
      metadata: {
        sensorId,
        sensorType,
        value,
        threshold: thresholds.warningHigh,
        direction: 'above',
        roomId: metadata.roomId
      },
      sensorId,
      roomId: metadata.roomId
    });
  }
}

// Plant health alert integration
export async function checkPlantHealth(
  plantId: string,
  healthScore: number,
  healthStatus: string,
  issues: string[],
  metadata: {
    plantName: string;
    strainName?: string;
    roomId?: string;
  }
): Promise<void> {
  let severity: 'info' | 'warning' | 'critical' = 'info';
  let notificationType: 'plant_health' | 'harvest_ready' = 'plant_health';

  if (healthStatus === 'critical') {
    severity = 'critical';
    notificationType = 'plant_health';
  } else if (healthStatus === 'poor') {
    severity = 'warning';
    notificationType = 'plant_health';
  } else if (healthStatus === 'excellent' && issues.length === 0) {
    // Don't send notification for healthy plants unless significant improvement
    return;
  }

  await sendNotification({
    type: notificationType,
    title: `Plant Health Alert: ${metadata.plantName}`,
    message: `${metadata.plantName} health status: ${healthStatus} (Score: ${healthScore}/100). Issues: ${
      issues.length > 0 ? issues.join(', ') : 'None'
    }`,
    severity,
    channels: ['in_app', 'push', 'webhook'],
    metadata: {
      plantId,
      healthScore,
      healthStatus,
      issues,
      strainName: metadata.strainName,
      roomId: metadata.roomId
    },
    plantId,
    roomId: metadata.roomId
  });
}

// System failure alert integration
export async function reportSystemFailure(
  component: string,
  errorMessage: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  await sendNotification({
    type: 'system_failure',
    title: `System Failure: ${component}`,
    message: `${component} has encountered an error: ${errorMessage}`,
    severity: 'emergency',
    channels: ['in_app', 'push', 'email', 'webhook', 'discord', 'slack'],
    metadata: {
      component,
      errorMessage,
      ...metadata
    }
  });
}

// Plant analysis complete integration
export async function notifyAnalysisComplete(
  plantId: string,
  analysisId: string,
  metadata: {
    plantName: string;
    analysisType: string;
    result: any;
  }
): Promise<void> {
  await sendNotification({
    type: 'analysis_complete',
    title: `Analysis Complete: ${metadata.plantName}`,
    message: `${metadata.analysisType} analysis for ${metadata.plantName} is complete.`,
    severity: 'info',
    channels: ['in_app', 'push', 'webhook'],
    metadata: {
      plantId,
      analysisId,
      analysisType: metadata.analysisType,
      result: metadata.result
    },
    plantId
  });
}

// Automation event integration
export async function notifyAutomationEvent(
  eventType: 'started' | 'completed' | 'failed',
  automationType: string,
  details: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  let severity: 'info' | 'warning' = 'info';
  let title = '';
  let channels: ('in_app' | 'push' | 'webhook')[] = ['in_app', 'webhook'];

  if (eventType === 'started') {
    title = `Automation Started: ${automationType}`;
    channels = ['in_app']; // Less verbose for start events
  } else if (eventType === 'completed') {
    title = `Automation Complete: ${automationType}`;
  } else if (eventType === 'failed') {
    title = `Automation Failed: ${automationType}`;
    severity = 'warning';
    channels = ['in_app', 'push', 'webhook'];
  }

  await sendNotification({
    type: 'automation_event',
    title,
    message: `${automationType} ${eventType}. ${details}`,
    severity,
    channels,
    metadata: {
      eventType,
      automationType,
      ...metadata
    }
  });
}

// System health check integration
export async function reportSystemHealth(
  status: 'healthy' | 'degraded' | 'unhealthy',
  metrics: {
    uptime: number;
    memoryUsage: number;
    activeConnections: number;
    databaseStatus: string;
  },
  issues: string[] = []
): Promise<void> {
  if (status === 'healthy' && issues.length === 0) {
    // Don't send notification for healthy status
    return;
  }

  let severity: 'info' | 'warning' | 'critical' = 'info';
  let channels: ('in_app' | 'push' | 'email' | 'webhook')[] = ['in_app'];

  if (status === 'degraded') {
    severity = 'warning';
    channels = ['in_app', 'push', 'webhook'];
  } else if (status === 'unhealthy') {
    severity = 'critical';
    channels = ['in_app', 'push', 'email', 'webhook'];
  }

  await sendNotification({
    type: 'system_alert',
    title: `System Health: ${status.toUpperCase()}`,
    message: `System is ${status}. Issues: ${issues.length > 0 ? issues.join(', ') : 'None'}`,
    severity,
    channels,
    metadata: {
      status,
      uptime: metrics.uptime,
      memoryUsage: metrics.memoryUsage,
      activeConnections: metrics.activeConnections,
      databaseStatus: metrics.databaseStatus,
      issues
    }
  });
}

// Harvest readiness alert
export async function notifyHarvestReady(
  plantId: string,
  daysInFlowering: number,
  metadata: {
    plantName: string;
    strainName: string;
    expectedHarvestDate: Date;
    trichomeStatus?: string;
    roomId?: string;
  }
): Promise<void> {
  await sendNotification({
    type: 'harvest_ready',
    title: `Harvest Ready: ${metadata.plantName}`,
    message: `${metadata.plantName} (${metadata.strainName}) may be ready for harvest. Days in flowering: ${daysInFlowering}.`,
    severity: 'info',
    channels: ['in_app', 'push', 'email', 'webhook'],
    metadata: {
      plantId,
      daysInFlowering,
      strainName: metadata.strainName,
      expectedHarvestDate: metadata.expectedHarvestDate,
      trichomeStatus: metadata.trichomeStatus,
      roomId: metadata.roomId
    },
    plantId,
    roomId: metadata.roomId
  });
}

// Batch notification for multiple plants/plants
export async function notifyBatchUpdate(
  eventType: string,
  summary: string,
  items: Array<{
    id: string;
    name: string;
    status: string;
    details?: string;
  }>,
  severity: 'info' | 'warning' | 'critical' = 'info',
  metadata: Record<string, any> = {}
): Promise<void> {
  await sendNotification({
    type: 'system_alert' as any,
    title: `${eventType}: ${summary}`,
    message: `${summary}\n\n${items.map((item) => `• ${item.name}: ${item.status}`).join('\n')}`,
    severity,
    channels: ['in_app', 'push', 'webhook'],
    metadata: {
      eventType,
      itemCount: items.length,
      items,
      ...metadata
    }
  });
}

// Real-time notification with WebSocket broadcast
export async function notifyRealTime(
  notification: any,
  io?: any
): Promise<void> {
  // Send via notification system
  const result = await sendNotification(notification);

  // Broadcast via WebSocket if io instance is provided
  if (io && result.notification) {
    broadcastNotification(io, result.notification);
  }
}

// Integration with sensor API endpoint
export async function handleSensorReading(
  sensorData: {
    id: string;
    name: string;
    type: string;
    value: number;
    roomId?: string;
    thresholds?: any;
  }
): Promise<void> {
  // Check thresholds if defined
  if (sensorData.thresholds) {
    await checkSensorThresholds(
      sensorData.id,
      sensorData.type,
      sensorData.value,
      sensorData.thresholds,
      {
        roomId: sensorData.roomId,
        sensorName: sensorData.name
      }
    );
  }
}

// Integration with plant analysis API
export async function handlePlantAnalysis(
  analysisData: {
    plantId: string;
    analysisId: string;
    healthScore: number;
    healthStatus: string;
    issues: string[];
    metadata: {
      plantName: string;
      strainName?: string;
      roomId?: string;
    };
  }
): Promise<void> {
  // Notify about plant health
  await checkPlantHealth(
    analysisData.plantId,
    analysisData.healthScore,
    analysisData.healthStatus,
    analysisData.issues,
    analysisData.metadata
  );

  // Notify about analysis completion
  await notifyAnalysisComplete(
    analysisData.plantId,
    analysisData.analysisId,
    {
      plantName: analysisData.metadata.plantName,
      analysisType: 'Health',
      result: {
        healthScore: analysisData.healthScore,
        healthStatus: analysisData.healthStatus,
        issues: analysisData.issues
      }
    }
  );
}
