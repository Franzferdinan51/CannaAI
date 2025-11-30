# Advanced Notification System Documentation

## Overview

The CultivAI Pro Advanced Notification System is a comprehensive, multi-channel notification delivery platform designed for cannabis cultivation management. It provides real-time alerts, webhook integrations, and flexible notification preferences to keep growers informed about critical cultivation events.

## Features

### Core Capabilities

- **Multi-Channel Delivery**: Support for in-app, push, email, SMS, Discord, Slack, and custom webhooks
- **Real-Time Notifications**: WebSocket-based instant delivery to connected clients
- **Webhook Integration**: Full webhook management with authentication, retries, and monitoring
- **Notification Preferences**: Granular user preferences with quiet hours and throttling
- **Queue Processing**: Asynchronous notification processing with batching and deduplication
- **Delivery Tracking**: Comprehensive delivery status tracking and analytics
- **Integration Points**: Seamless integration with sensor monitoring and plant analysis systems

### Notification Types

1. **System Alerts** (`system_alert`): General system status and health updates
2. **Sensor Threshold Alerts** (`sensor_threshold`): Environmental sensor value warnings
3. **Plant Health Alerts** (`plant_health`): Plant health status and disease detection
4. **Automation Events** (`automation_event`): Automated system actions (watering, lighting)
5. **Harvest Ready Alerts** (`harvest_ready`): Harvest timing recommendations
6. **System Failures** (`system_failure`): Critical system errors requiring immediate attention
7. **Analysis Complete** (`analysis_complete`): AI analysis results notifications
8. **User Action Required** (`user_action_required`): Notifications requiring user intervention

### Severity Levels

- **Info**: Informational messages, no immediate action required
- **Warning**: Attention needed, monitor the situation
- **Critical**: Immediate action required, urgent
- **Emergency**: System failure or critical emergency, requires immediate response

## Architecture

### Database Schema

#### Core Models

```prisma
model Notification {
  id             String   @id @default(cuid())
  type           String
  title          String?
  message        String
  acknowledged   Boolean  @default(false)
  acknowledgedAt DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deliveries     NotificationDelivery[]
  webhookDeliveries WebhookDelivery[]
  templateId     String?
  template       NotificationTemplate?
  metadata       Json?
}

model NotificationDelivery {
  id              String   @id @default(cuid())
  notificationId  String
  notification    Notification @relation(fields: [notificationId], references: [id])
  channel         String
  status          String   // 'pending', 'sent', 'delivered', 'failed'
  provider        String?
  recipient       String?
  messageId       String?
  errorMessage    String?
  attempts        Int      @default(0)
  sentAt          DateTime?
  deliveredAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model WebhookSubscription {
  id          String   @id @default(cuid())
  name        String
  url         String
  secret      String?  // For HMAC signature verification
  events      String   // JSON array of event types
  enabled     Boolean  @default(true)
  retryCount  Int      @default(3)
  timeout     Int      @default(5000) // milliseconds
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deliveries  WebhookDelivery[]
  lastUsed    DateTime?
  isVerified  Boolean  @default(false)
}

model WebhookDelivery {
  id              String   @id @default(cuid())
  webhookId       String
  webhook         WebhookSubscription
  notificationId  String?
  notification    Notification?
  eventType       String
  status          String   // 'pending', 'success', 'failed', 'retry'
  responseCode    Int?
  responseBody    String?
  attempts        Int      @default(0)
  nextRetryAt     DateTime?
  errorMessage    String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model NotificationPreference {
  id                    String   @id @default(cuid())
  userId                String?
  type                  String
  emailEnabled          Boolean  @default(true)
  smsEnabled           Boolean  @default(false)
  pushEnabled          Boolean  @default(true)
  webhookEnabled       Boolean  @default(false)
  discordEnabled       Boolean  @default(false)
  slackEnabled         Boolean  @default(false)
  inAppEnabled         Boolean  @default(true)
  minSeverity          String   @default('info')
  quietHoursStart      String?  // HH:MM format
  quietHoursEnd        String?  // HH:MM format
  throttleRate         Int      @default(0) // 0 = unlimited
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

### Service Layer Architecture

#### Core Services

1. **Notification Service** (`src/lib/notifications.ts`)
   - Multi-channel notification delivery
   - User preference filtering
   - Quiet hours enforcement
   - Delivery status tracking

2. **Webhook Service** (`src/lib/webhooks.ts`)
   - Webhook subscription management
   - HMAC signature authentication
   - Retry logic with exponential backoff
   - Delivery monitoring and statistics

3. **Queue Service** (`src/lib/notification-queue.ts`)
   - Asynchronous processing
   - Batching and deduplication
   - Failed delivery retry
   - Health monitoring

4. **Integration Service** (`src/lib/notification-integrations.ts`)
   - Sensor threshold monitoring
   - Plant health alerts
   - System failure detection
   - Harvest readiness notifications

5. **Initialization Service** (`src/lib/notification-init.ts`)
   - System startup and shutdown
   - Default template creation
   - Background worker management
   - Health checks and statistics

## API Reference

### Notifications API

#### Send Notification

```http
POST /api/notifications/send
```

**Request Body:**
```json
{
  "type": "sensor_threshold",
  "title": "Temperature Warning",
  "message": "Temperature exceeded 80°F",
  "severity": "warning",
  "channels": ["in_app", "push", "webhook"],
  "metadata": {
    "sensorId": "temp_01",
    "roomId": "room_1"
  },
  "plantId": "plant_123",
  "sensorId": "sensor_456",
  "roomId": "room_789",
  "userId": "user_001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notification": {
      "id": "notif_123",
      "type": "sensor_threshold",
      "title": "Temperature Warning",
      "message": "Temperature exceeded 80°F",
      "acknowledged": false,
      "createdAt": "2025-11-26T10:00:00.000Z"
    },
    "deliveries": [
      {
        "channel": "in_app",
        "status": "delivered",
        "messageId": "inapp_notif_123"
      }
    ]
  }
}
```

#### Get Notification History

```http
GET /api/notifications/history?type=sensor_threshold&limit=50
```

**Query Parameters:**
- `type`: Filter by notification type
- `severity`: Filter by severity level
- `startDate`: ISO 8601 date string
- `endDate`: ISO 8601 date string
- `limit`: Maximum number of results (default: 100)

#### Acknowledge Notification

```http
POST /api/notifications/history
```

**Request Body:**
```json
{
  "notificationId": "notif_123"
}
```

### Webhooks API

#### Register Webhook

```http
POST /api/webhooks/register
```

**Request Body:**
```json
{
  "name": "Discord Alert Channel",
  "url": "https://discord.com/api/webhooks/...",
  "secret": "optional-secret-key",
  "events": ["sensor_threshold", "system_failure"],
  "retryCount": 3,
  "timeout": 5000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "webhook_123",
    "name": "Discord Alert Channel",
    "url": "https://discord.com/api/webhooks/...",
    "events": ["sensor_threshold", "system_failure"],
    "enabled": true,
    "isVerified": true,
    "createdAt": "2025-11-26T10:00:00.000Z"
  },
  "message": "Webhook registered successfully. A test delivery has been scheduled."
}
```

#### List Webhooks

```http
GET /api/webhooks?includeStats=true
```

#### Get Webhook

```http
GET /api/webhooks/{id}
```

#### Update Webhook

```http
PUT /api/webhooks/{id}
```

#### Delete Webhook

```http
DELETE /api/webhooks/{id}
```

#### Test Webhook

```http
POST /api/webhooks/{id}/test
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "status": 200,
    "response": {
      "status": 200,
      "statusText": "OK",
      "body": "",
      "responseTime": 245
    }
  },
  "message": "Webhook test successful"
}
```

### Preferences API

#### List Preferences

```http
GET /api/notifications/preferences?userId=user_001
```

#### Create Preference

```http
POST /api/notifications/preferences
```

**Request Body:**
```json
{
  "userId": "user_001",
  "type": "sensor_threshold",
  "emailEnabled": true,
  "smsEnabled": false,
  "pushEnabled": true,
  "webhookEnabled": true,
  "discordEnabled": false,
  "slackEnabled": false,
  "inAppEnabled": true,
  "minSeverity": "warning",
  "quietHoursStart": "22:00",
  "quietHoursEnd": "07:00",
  "throttleRate": 10
}
```

#### Update Preference

```http
PUT /api/notifications/preferences/{id}
```

#### Delete Preference

```http
DELETE /api/notifications/preferences/{id}
```

## Webhook Payloads

### Standard Webhook Event

```json
{
  "id": "notification_123",
  "event": "sensor_threshold",
  "timestamp": "2025-11-26T10:00:00.000Z",
  "data": {
    "id": "notification_123",
    "type": "sensor_threshold",
    "title": "Temperature Warning",
    "message": "Temperature exceeded 80°F",
    "severity": "warning",
    "metadata": {
      "sensorId": "temp_01",
      "value": 82.5,
      "threshold": 80,
      "roomId": "room_1"
    }
  }
}
```

### Discord Webhook Format

Discord webhooks use rich embeds:

```json
{
  "username": "CultivAI Pro",
  "embeds": [
    {
      "title": "Temperature Warning",
      "description": "Temperature exceeded 80°F",
      "color": 2437896,
      "fields": [
        {
          "name": "Type",
          "value": "sensor_threshold",
          "inline": true
        },
        {
          "name": "Severity",
          "value": "warning",
          "inline": true
        },
        {
          "name": "Time",
          "value": "2025-11-26T10:00:00.000Z",
          "inline": true
        }
      ]
    }
  ]
}
```

### Slack Webhook Format

```json
{
  "text": "*Temperature Warning*\nTemperature exceeded 80°F",
  "attachments": [
    {
      "color": "warning",
      "fields": [
        {
          "title": "Type",
          "value": "sensor_threshold",
          "short": true
        },
        {
          "title": "Severity",
          "value": "warning",
          "short": true
        }
      ]
    }
  ]
}
```

## WebSocket Events

### Client to Server

- `subscribe-notifications`: Subscribe to notification updates
- `unsubscribe-notifications`: Unsubscribe from notifications
- `request-unread-notifications`: Request list of unread notifications
- `acknowledge-notification`: Acknowledge a notification

### Server to Client

- `new-notification`: New notification received
- `unread-notifications`: List of unread notifications
- `notification-acknowledged`: Notification was acknowledged
- `webhook-delivery-status`: Webhook delivery status update
- `notifications-error`: Error occurred

## Integration Examples

### Sensor Threshold Monitoring

```typescript
import { checkSensorThresholds } from '@/lib/notification-integrations';

await checkSensorThresholds(
  'sensor_temp_01',
  'temperature',
  85.5,
  {
    warningHigh: 80,
    criticalHigh: 85
  },
  {
    sensorName: 'Canopy Temperature',
    roomId: 'room_flower_1'
  }
);
```

### Plant Health Alert

```typescript
import { checkPlantHealth } from '@/lib/notification-integrations';

await checkPlantHealth(
  'plant_123',
  65,
  'fair',
  ['slight-yellowing', 'possible-nutrient-deficiency'],
  {
    plantName: 'BD-01',
    strainName: 'Blue Dream',
    roomId: 'room_flower_1'
  }
);
```

### System Failure Alert

```typescript
import { reportSystemFailure } from '@/lib/notification-integrations';

await reportSystemFailure(
  'Climate Controller',
  'Temperature sensor offline',
  {
    componentId: 'climate_01',
    lastValue: 72.0,
    errorCode: 'SENSOR_OFFLINE'
  }
);
```

## Background Workers

### Webhook Delivery Worker

- Processes pending webhook deliveries
- Implements retry logic with exponential backoff
- Runs every 30 seconds
- Tracks delivery statistics

### Notification Queue Processor

- Processes queued notifications
- Handles batching and deduplication
- Runs every 5 seconds
- Monitors system health

## Configuration

### Environment Variables

```bash
# Notification Settings
NOTIFICATION_QUEUE_INTERVAL=5000
WEBHOOK_WORKER_INTERVAL=30000
MAX_WEBHOOK_RETRIES=3
WEBHOOK_TIMEOUT=5000

# Rate Limiting
NOTIFICATION_RATE_LIMIT=100
WEBHOOK_REGISTRATION_LIMIT=10

# Quiet Hours Default
DEFAULT_QUIET_HOURS_START=22:00
DEFAULT_QUIET_HOURS_END=07:00
```

## Monitoring and Health Checks

### System Statistics

```typescript
import { notificationSystem } from '@/lib/notification-init';

const stats = await notificationSystem.getStatistics();
console.log(stats);
```

### Health Check

```typescript
const health = await notificationSystem.healthCheck();
console.log(health.status); // 'healthy' | 'degraded' | 'unhealthy'
```

## Best Practices

1. **Use Appropriate Severity Levels**: Match severity to urgency
2. **Respect Quiet Hours**: Configure quiet hours to avoid nighttime alerts
3. **Throttle High-Frequency Events**: Use throttleRate to limit notifications
4. **Monitor Delivery Statistics**: Check webhook delivery success rates
5. **Test Webhooks Regularly**: Use the test endpoint to verify integrations
6. **Acknowledge Notifications**: Clear notifications once handled

## Troubleshooting

### Common Issues

**Webhooks Not Delivering**
- Check webhook URL is accessible
- Verify webhook is enabled
- Check retry count and timeout settings
- Review webhook delivery logs

**Notifications Not Received**
- Verify user preferences are configured
- Check quiet hours settings
- Ensure channels are enabled
- Review notification history

**High Notification Volume**
- Implement throttling with throttleRate
- Use notification grouping
- Review severity thresholds
- Consider increasing quiet hours

## Error Codes

- `400`: Bad Request - Invalid input data
- `401`: Unauthorized - Authentication required
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server-side error
- `Webhook_Delivery_Failed`: Webhook delivery failed
- `Notification_Throttled`: Notification throttled due to rate limits

## Security Considerations

1. **Webhook Signatures**: All webhooks support HMAC signature verification
2. **Rate Limiting**: API endpoints are protected by rate limiting
3. **Input Validation**: All inputs are validated before processing
4. **Secure Headers**: Webhooks include security headers for verification
5. **No Sensitive Data**: Notifications don't include passwords or tokens

## Performance

- **Async Processing**: All notifications are processed asynchronously
- **Batching**: Multiple notifications can be batched together
- **Queue Management**: Failed deliveries are queued for retry
- **Indexing**: Database indexes optimize query performance
- **WebSocket Efficiency**: Only subscribed clients receive notifications

## Future Enhancements

1. **SMS Integration**: Full SMS provider integration
2. **Push Notification Service**: Complete PWA push notification system
3. **Notification Templates**: Dynamic template system
4. **Advanced Analytics**: Detailed delivery analytics dashboard
5. **Machine Learning**: Smart notification scheduling
6. **Multi-Tenant Support**: Support for multiple cultivation sites
