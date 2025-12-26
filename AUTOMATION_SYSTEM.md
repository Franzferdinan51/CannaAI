# Photo Analysis Automation System Documentation

## Overview

This comprehensive automation system is designed specifically for photo analysis workflows in cannabis cultivation. It provides automated scheduling, batch processing, anomaly detection, and intelligent notifications to streamline the entire plant monitoring process.

## Table of Contents

1. [Architecture](#architecture)
2. [Database Models](#database-models)
3. [API Endpoints](#api-endpoints)
4. [Features](#features)
5. [Usage Examples](#usage-examples)
6. [Best Practices](#best-practices)

## Architecture

### Core Components

1. **Automation Engine** - Central orchestrator that runs scheduled tasks
2. **Scheduling System** - Cron-like scheduling for automated tasks
3. **Batch Processing** - Handle multiple plants simultaneously
4. **Workflow Engine** - IF-THEN-ELSE logic for complex automation
5. **Anomaly Detection** - Automatic detection of health issues
6. **Notification System** - Smart alerts and reports

### Technology Stack

- **Database**: SQLite with Prisma ORM
- **API**: Next.js App Router
- **Scheduling**: Cron-like expressions with date-fns
- **Real-time**: Socket.IO integration

## Database Models

### AutomationRule
```typescript
{
  id: string
  name: string
  type: 'schedule' | 'trigger' | 'workflow'
  conditions: Json // IF-THEN logic conditions
  actions: Json[]  // Actions to execute
  plantId?: string
  scheduleId?: string
  triggerId?: string
}
```

### Schedule
```typescript
{
  id: string
  name: string
  cronExpression: string
  type: 'analysis' | 'capture' | 'report' | 'cleanup'
  interval?: 'hourly' | 'daily' | 'weekly' | 'monthly'
  nextRun: Date
}
```

### AnalysisScheduler
```typescript
{
  id: string
  plantId?: string
  analysisType: 'photo' | 'trichome' | 'health'
  frequency: 'hourly' | 'daily' | 'bi_weekly' | 'weekly' | 'monthly'
  timeOfDay?: string // HH:MM format
  nextRun: Date
}
```

### Workflow
```typescript
{
  id: string
  name: string
  type: 'photo_analysis' | 'batch_analysis' | 'monitoring' | 'harvest'
  steps: Json[] // Workflow steps with IF-THEN-ELSE logic
}
```

### AnalysisBatch
```typescript
{
  id: string
  name: string
  type: 'photo' | 'trichome' | 'health' | 'full'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  plantIds: string[] // JSON array
  totalCount: number
  completedCount: number
  failedCount: number
}
```

### AnalysisHistory
```typescript
{
  id: string
  plantId: string
  analysisType: 'photo' | 'trichome' | 'health' | 'automated'
  data: Json // Analysis results snapshot
  metadata?: Json
}
```

### AnomalyDetection
```typescript
{
  id: string
  plantId?: string
  type: 'health' | 'growth' | 'trichome' | 'environmental'
  metric: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  threshold: number
  currentValue: number
  resolved: boolean
}
```

### AnalysisMilestone
```typescript
{
  id: string
  plantId: string
  type: 'flowering_start' | 'trichome_peak' | 'harvest_ready' | 'deficiency_detected'
  title: string
  description: string
  data?: Json
}
```

## API Endpoints

### 1. Create Automation
**Endpoint**: `POST /api/automation/create`

Create different types of automation rules:

```javascript
// Create a schedule
{
  type: 'schedule',
  data: {
    name: 'Daily Photo Analysis',
    cronExpression: '0 9 * * *', // 9 AM daily
    type: 'analysis',
    interval: 'daily'
  }
}

// Create a workflow
{
  type: 'workflow',
  data: {
    name: 'Harvest Monitoring',
    workflowType: 'harvest',
    steps: [
      {
        type: 'if',
        condition: { type: 'value', value: true },
        then: [
          { type: 'capture', config: { device: 'microscope' } },
          { type: 'analyze', config: { type: 'trichome' } },
          { type: 'if',
            condition: { type: 'equals', key: 'harvestReady', expected: true },
            then: [
              { type: 'notify', config: { type: 'harvest_ready' } },
              { type: 'create-task', config: { title: 'Harvest Required' } }
            ]
          }
        ]
      }
    ]
  }
}

// Create a scheduler
{
  type: 'scheduler',
  data: {
    plantId: 'plant-123',
    analysisType: 'photo',
    frequency: 'daily',
    timeOfDay: '09:00'
  }
}
```

### 2. Run Automation
**Endpoint**: `POST /api/automation/run`

Execute automation rules, schedules, workflows, or batches:

```javascript
// Run an automation rule
{
  type: 'rule',
  id: 'rule-123'
}

// Run a workflow
{
  type: 'workflow',
  id: 'workflow-123',
  data: { plantId: 'plant-123' }
}

// Run a batch analysis
{
  type: 'batch',
  id: 'batch-123'
}
```

### 3. Manage Schedules
**Endpoint**: `/api/automation/schedules`

- `GET`: List all schedulers
- `POST`: Create new scheduler
- `PUT`: Update scheduler
- `DELETE`: Delete scheduler

### 4. Batch Processing
**Endpoint**: `/api/automation/batch`

- `GET`: List batches
- `POST`: Create batch
- `PUT`: Update batch
- `DELETE`: Delete batch

### 5. Anomaly Detection
**Endpoint**: `/api/automation/anomalies`

- `GET`: List anomalies
- `POST`: Report anomaly
- `PUT`: Resolve anomaly

### 6. Trends & History
**Endpoint**: `/api/automation/trends`

- `GET`: Get analysis history and trends
- `POST`: Add to analysis history

### 7. Automation Engine
**Endpoint**: `/api/automation/engine`

- `GET`: Get engine status
- `POST`: Run automation engine

```javascript
// Run all scheduled tasks
{
  action: 'run'
}

// Check for anomalies
{
  action: 'check-anomalies'
}
```

### 8. Workflows
**Endpoint**: `/api/automation/workflows`

- `GET`: List workflows
- `POST`: Create workflow
- `PUT`: Update workflow
- `DELETE`: Delete workflow

### 9. Photo Capture
**Endpoint**: `/api/automation/photo-capture`

- `GET`: List photo captures
- `POST`: Schedule photo capture
- `PUT`: Update capture result

## Features

### 1. Automated Analysis Workflows

- **Periodic Photo Capture**: Schedule automatic photo capture at optimal times
- **Trichome Monitoring**: Automated trichome analysis for harvest timing
- **Batch Processing**: Analyze multiple plants simultaneously
- **Scheduled Health Scans**: Daily/weekly health monitoring
- **Auto-save Results**: Automatic saving to analysis history
- **Anomaly Detection**: AI-powered detection of health issues

### 2. Smart Scheduling System

- **Cron-like Scheduling**: Flexible scheduling with cron expressions
- **Frequency Options**: Hourly, daily, weekly, bi-weekly, monthly
- **Time-based**: Specific time of day for execution
- **Growth Stage-based**: Different schedules for different stages
- **Custom Schedules**: Per-plant or per-strain customization
- **Automatic Recalculation**: Next run time automatically updated

### 3. Analysis Automation Features

- **Auto-capture**: Trigger camera capture automatically
- **Image Preprocessing**: Automatic enhancement before analysis
- **Smart Timing**: Detect optimal lighting conditions
- **Batch Analysis**: Process multiple images efficiently
- **Automated Reports**: Generate analysis reports automatically
- **Comparison**: Auto-compare to previous analyses

### 4. Intelligent Notifications

- **Harvest Alerts**: Notify when ready for harvest
- **Health Change Alerts**: Significant health deterioration
- **Weekly/Monthly Reports**: Automated summary reports
- **Pest/Disease Alerts**: Early detection notifications
- **Deficiency Warnings**: Nutrient deficiency alerts
- **Custom Rules**: User-defined notification conditions

### 5. Workflow Automation (IF-THEN Logic)

```javascript
{
  type: 'if',
  condition: {
    type: 'greater_than',
    key: 'healthScore',
    threshold: 80
  },
  then: [
    { type: 'notify', config: { message: 'Plant is healthy!' } }
  ],
  else: [
    { type: 'analyze', config: { type: 'full' } },
    { type: 'if',
      condition: { type: 'equals', key: 'severity', expected: 'critical' },
      then: [
        { type: 'notify', config: { type: 'critical_alert' } },
        { type: 'create-task', config: { title: 'Immediate attention required' } }
      ]
    }
  ]
}
```

### 6. Analysis History & Trends

- **Automated Logging**: All analyses automatically logged
- **Trend Detection**: Identify improving/declining health
- **Before/After Comparison**: Visual progress tracking
- **Milestone Detection**: Automatic detection of growth stages
- **Data Aggregation**: Hourly, daily, weekly summaries
- **Pattern Recognition**: Identify growth patterns over time

### 7. Anomaly Detection

Automatic detection of:
- Health score drops below threshold
- Trichome maturity reaching harvest window
- Environmental stress indicators
- Pest/disease signs
- Nutrient deficiencies

### 8. Batch Processing

- **Multi-plant Analysis**: Analyze dozens of plants simultaneously
- **Progress Tracking**: Real-time progress updates
- **Error Handling**: Failed analyses don't stop batch
- **Result Aggregation**: Combined results with statistics
- **Retry Logic**: Automatic retry of failed analyses

## Usage Examples

### Example 1: Daily Photo Analysis Schedule

```javascript
// Create a daily schedule at 9 AM
const response = await fetch('/api/automation/schedules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    plantId: 'plant-123',
    analysisType: 'photo',
    frequency: 'daily',
    timeOfDay: '09:00',
    enabled: true
  })
});

const schedule = await response.json();
```

### Example 2: Batch Analysis for All Plants

```javascript
// Get all plants
const plants = await fetch('/api/plants').then(r => r.json());

// Create batch analysis
const batch = await fetch('/api/automation/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Weekly Health Check',
    type: 'photo',
    plantIds: plants.map(p => p.id),
    config: {
      analysisType: 'comprehensive',
      saveToHistory: true
    }
  })
});

const result = await batch.json();
// Batch automatically starts
```

### Example 3: Harvest Monitoring Workflow

```javascript
const workflow = await fetch('/api/automation/workflows', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Harvest Readiness Monitor',
    type: 'harvest',
    steps: [
      // Step 1: Capture photo
      {
        type: 'capture',
        config: {
          device: 'microscope',
          magnification: 200
        }
      },
      // Step 2: Analyze trichomes
      {
        type: 'analyze',
        config: {
          type: 'trichome',
          checkMaturity: true
        }
      },
      // Step 3: If harvest ready, notify
      {
        type: 'if',
        condition: {
          type: 'equals',
          key: 'trichomeAnalysis.harvestReadiness.ready',
          expected: true
        },
        then: [
          {
            type: 'notify',
            config: {
              type: 'harvest_ready',
              channels: ['inApp', 'email']
            }
          },
          {
            type: 'create-task',
            config: {
              title: 'Harvest Ready - Action Required',
              priority: 'high'
            }
          }
        ]
      }
    ]
  })
});
```

### Example 4: Health Anomaly Detection

```javascript
// Create anomaly detection rule
const rule = await fetch('/api/automation/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'rule',
    data: {
      name: 'Low Health Score Alert',
      type: 'trigger',
      conditions: {
        type: 'greater_than',
        key: 'healthScore',
        threshold: 60
      },
      actions: [
        {
          type: 'notify',
          config: {
            type: 'health_alert',
            severity: 'medium'
          }
        },
        {
          type: 'create-task',
          config: {
            title: 'Plant Health Check Required',
            priority: 'medium'
          }
        }
      ]
    }
  })
});
```

### Example 5: Run Automation Engine

```javascript
// Execute all scheduled tasks
const engine = await fetch('/api/automation/engine', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'run'
  })
});

const result = await engine.json();
console.log(`Executed ${result.data.schedulesExecuted} schedules`);
```

### Example 6: Photo Capture with Analysis

```javascript
// Schedule photo capture
const capture = await fetch('/api/automation/photo-capture', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    plantId: 'plant-123',
    type: 'trichome',
    deviceInfo: {
      deviceId: 'microscope-1',
      mode: 'microscope',
      magnification: 200
    },
    scheduleCapture: true,
    scheduleTime: '2024-01-15T09:00:00Z'
  })
});

// Capture will auto-execute and trigger analysis
```

### Example 7: Get Analysis Trends

```javascript
// Get trends for last 30 days
const trends = await fetch('/api/automation/trends?plantId=plant-123&startDate=2024-01-01', {
  method: 'GET'
});

const result = await trends.json();
console.log(`Health trend: ${result.data.trends.healthScoreTrend}`);
console.log(`Changes detected: ${result.data.trends.changesDetected}`);
```

## Best Practices

### 1. Scheduling

- **Avoid Overlapping**: Don't schedule too many tasks simultaneously
- **Stagger Times**: Spread automated tasks throughout the day
- **Consider Growth Stage**: Different stages need different frequencies
- **Use Appropriate Frequency**: Daily for active monitoring, weekly for trends

### 2. Batch Processing

- **Limit Batch Size**: Process 20-50 plants at a time
- **Monitor Progress**: Check batch status regularly
- **Handle Errors**: Some analyses may fail - that's okay
- **Use Appropriate Time**: Run batches during low system load

### 3. Workflow Design

- **Keep It Simple**: Start with basic workflows, add complexity gradually
- **Use IF-THEN Logic**: Handle different scenarios appropriately
- **Test Thoroughly**: Test workflows with different inputs
- **Document Purpose**: Document what each workflow does

### 4. Anomaly Detection

- **Set Appropriate Thresholds**: Don't be too sensitive
- **Review False Positives**: Adjust thresholds based on feedback
- **Handle Resolution**: Always resolve or acknowledge anomalies
- **Use Severity Levels**: Critical vs. low priority issues

### 5. Notifications

- **Avoid Spam**: Use cooldown periods for repeated notifications
- **Priority-based**: Higher priority = more aggressive notification
- **Choose Right Channel**: Critical alerts need multiple channels
- **Template Consistency**: Use consistent notification templates

### 6. Data Management

- **Regular Cleanup**: Run cleanup regularly to remove old data
- **Archive Important Data**: Don't delete important historical data
- **Monitor Storage**: Keep an eye on database size
- **Backup Regularly**: Back up automation configurations

### 7. Monitoring

- **Check Engine Status**: Regularly verify engine is running
- **Review Logs**: Check for errors in automation execution
- **Monitor Performance**: Track execution times and success rates
- **Alert on Failures**: Set up monitoring for automation failures

## Integration Points

### Analysis APIs
- `/api/analyze` - General plant health analysis
- `/api/trichome-analysis` - Trichome-specific analysis

### Sensor Integration
- `/api/sensors` - Environmental sensor data
- Automation can trigger based on sensor readings

### Notification System
- `/api/notifications` - Notification management
- Webhooks, email, SMS, in-app notifications

### Real-time Updates
- Socket.IO - Real-time automation status updates
- WebSocket endpoint at `/api/socketio`

## Troubleshooting

### Common Issues

1. **Schedules Not Executing**
   - Check if engine is running
   - Verify `enabled: true`
   - Check `nextRun` timestamp is in the past

2. **Batches Stuck in Pending**
   - Manually trigger with `/api/automation/run`
   - Check for AI provider configuration
   - Review batch configuration

3. **No Anomaly Detection**
   - Verify thresholds are appropriate
   - Check if analyses are being saved to history
   - Review anomaly detection logic

4. **Notifications Not Sending**
   - Check notification rules configuration
   - Verify channel settings
   - Check cooldown periods

## Future Enhancements

1. **Weather Integration**: Outdoor grow weather-based automation
2. **Advanced ML**: More sophisticated anomaly detection models
3. **Mobile App**: Native mobile app for automation management
4. **API Rate Limiting**: Better rate limiting for batch operations
5. **Visual Workflow Builder**: Drag-and-drop workflow creation UI
6. **Third-party Integrations**: Integration with IoT devices and sensors

## Support

For issues or questions about the automation system:
1. Check the troubleshooting section
2. Review API endpoint documentation
3. Check application logs for errors
4. Verify database models match expected structure
