# Analytics Dashboard Implementation Guide

## Overview

This document describes the comprehensive analytics system implementation for the CultivAI Pro cultivation management system. The analytics dashboard provides real-time insights, performance metrics, and automated reporting capabilities.

## Features Implemented

### 1. Database Models

The following Prisma models have been added to support analytics:

#### Metric
- Tracks system metrics (counters, gauges, histograms)
- Indexed for efficient querying
- Supports tagging for categorization

#### AnalyticsRecord
- General purpose analytics event tracking
- Categories: API, sensor, plant_health, system
- Includes response times and success/failure status

#### SensorAnalytics
- Stores sensor readings with anomaly detection
- Tracks status (normal, warning, critical)
- Records anomaly scores (0-1)

#### PlantHealthAnalytics
- Tracks plant health scores and trends
- Includes issues and recommendations
- Stores confidence scores from AI analysis

#### APIPerformanceMetrics
- Monitors API endpoint performance
- Tracks response times, status codes, success rates
- Includes request/response sizes

#### DailyReport
- Automated daily summary reports
- Aggregated metrics from all sources
- Cached to prevent redundant calculations

#### AlertThreshold
- Configurable alert thresholds
- Supports multiple conditions (gt, lt, eq, ne)
- Can be scoped to specific sensors or rooms

#### DataAggregation
- Time-series data aggregation
- Supports hourly, daily, weekly, monthly periods
- Includes statistical measures (min, max, avg, stddev)

### 2. API Endpoints

#### `/api/analytics` (GET)
- Main analytics endpoint with basic metrics
- Returns sensor uptime, plant health, automation stats
- Supports timeframe filtering (1h, 24h, 7d)

#### `/api/analytics/metrics` (GET, POST)
- GET: Fetch aggregated metrics with timeframe filtering
- POST: Record new metric data
- Query params: timeframe, metric, category

#### `/api/analytics/plant-health` (GET, POST)
- GET: Fetch plant health trends and statistics
- POST: Record plant health analysis
- Query params: timeframe, plantId

#### `/api/analytics/sensors` (GET, POST)
- GET: Fetch sensor analytics and time-series data
- POST: Record sensor reading analytics
- Query params: timeframe, sensorId, roomId

#### `/api/analytics/performance` (GET, POST)
- GET: Fetch API performance metrics
- POST: Record API performance data
- Returns success rates, response times, error counts

#### `/api/analytics/export` (GET)
- Export analytics data to CSV or JSON
- Query params: type (metrics/sensors/plant-health/performance/summary), format, timeframe
- Example: `/api/analytics/export?type=sensors&format=csv&timeframe=7d`

#### `/api/analytics/thresholds` (GET, POST, PUT, DELETE)
- Manage alert thresholds
- GET: List thresholds with optional filtering
- POST: Create new threshold
- PUT: Update existing threshold
- DELETE: Remove threshold

#### `/api/analytics/reports` (GET, DELETE)
- GET: Generate or retrieve daily/monthly reports
- DELETE: Delete a report
- Reports are cached and automatically generated

#### `/api/scheduled-tasks` (GET, POST)
- Execute scheduled analytics tasks
- POST tasks: generate-daily-report, cleanup-data, aggregate-data, run-scheduled-tasks
- Can be triggered by external cron services

### 3. Dashboard Component

#### `AnalyticsDashboard.tsx`
Location: `src/components/analytics/AnalyticsDashboard.tsx`

**Features:**
- Real-time data updates via WebSocket
- Four main tabs:
  1. Overview: System-wide metrics, success rates, API status
  2. Plant Health: Health score trends, top issues
  3. Sensors: Reading statistics, anomaly detection
  4. Performance: Response times, error tracking

**Visualizations:**
- Line charts for trends
- Area charts for time-series data
- Pie charts for distribution
- Bar charts for comparisons
- Progress indicators for success rates

**Real-time Features:**
- Auto-refresh (configurable intervals)
- WebSocket subscription for live updates
- Visual indicators for new data

### 4. Real-time Updates

#### WebSocket Integration
Location: `src/lib/socket.ts`

**New Events:**
- `subscribe-analytics`: Subscribe to analytics updates
- `unsubscribe-analytics`: Unsubscribe from updates
- `request-analytics`: Request current analytics snapshot
- `analytics-update`: Broadcast when new data is available
- `new-alert`: Broadcast when alerts are triggered
- `sensor-update`: Broadcast sensor reading updates

**Helper Functions:**
- `broadcastAnalyticsUpdate(io, data)`: Send analytics update
- `broadcastAlert(io, alert)`: Send alert notification
- `broadcastSensorUpdate(io, data)`: Send sensor update

### 5. Automated Reports and Tasks

#### `analytics-utils.ts`
Location: `src/lib/analytics-utils.ts`

**Functions:**
- `recordAPIPerformance()`: Track API metrics
- `recordMetric()`: Record system metrics
- `recordSensorAnalytics()`: Store sensor data with analytics
- `checkThresholds()`: Evaluate alert thresholds
- `generateDailyReport()`: Create daily summary
- `aggregateData()`: Perform data aggregation
- `cleanupOldData()`: Remove old data based on retention policy
- `runScheduledTasks()`: Execute periodic maintenance tasks

**Threshold Conditions:**
- `gt`: Greater than
- `lt`: Less than
- `eq`: Equal to
- `ne`: Not equal to

### 6. Export Functionality

The export endpoint supports multiple formats:

**CSV Export:**
- Flattened structure for compatibility
- Proper escaping of quotes and commas
- Suitable for Excel, Google Sheets

**JSON Export:**
- Full nested structure preserved
- Machine-readable format
- Suitable for further processing

**Supported Types:**
- `metrics`: Raw metric data
- `sensors`: Sensor readings with analytics
- `plant-health`: Plant health analyses
- `performance`: API performance data
- `summary`: Comprehensive summary report

### 7. Performance Optimizations

**Database Indexing:**
- Timestamp indexes for time-series queries
- Composite indexes for category + timestamp
- Unique constraints for daily reports

**Query Optimization:**
- Limited result sets (default 100-1000 records)
- Paginated endpoints for large datasets
- Aggregated data to reduce query load

**Caching:**
- Daily reports cached by date
- Avoids redundant calculations
- 24-hour cache lifetime

**Data Retention:**
- Raw data: 90 days (configurable)
- API metrics: 30 days
- Aggregated data: Retained indefinitely
- Automatic cleanup via scheduled tasks

### 8. Usage Examples

#### Recording API Performance
```typescript
import { recordAPIPerformance } from '@/lib/analytics-utils';

await recordAPIPerformance(
  '/api/analyze',
  'POST',
  200,
  150.5,
  true,
  undefined,
  1024,
  2048
);
```

#### Recording Sensor Data
```typescript
import { recordSensorAnalytics } from '@/lib/analytics-utils';

await recordSensorAnalytics(
  'sensor-123',
  22.5,
  { temperature: 22.5, humidity: 55 },
  'normal',
  30.0,
  0.1,
  22.5,
  55
);
```

#### Checking Thresholds
```typescript
import { checkThresholds } from '@/lib/analytics-utils';

await checkThresholds(
  io,
  'temperature',
  28.5,
  'sensor-123',
  'room-456'
);
```

#### Generating Daily Report
```typescript
import { generateDailyReport } from '@/lib/analytics-utils';

await generateDailyReport(new Date());
```

### 9. Dashboard Usage

#### Accessing the Dashboard
Navigate to: `/analytics-dashboard`

**Features:**
- Select timeframe (1h, 24h, 7d, 30d)
- Export data in CSV/JSON format
- Auto-refresh toggle
- Real-time updates via WebSocket
- Tab-based navigation

#### Integrating with Existing Components
```typescript
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

// In your component
<AnalyticsDashboard roomId="room-123" plantId="plant-456" />
```

### 10. Scheduling Tasks

#### Using Vercel Cron (Recommended)
Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/scheduled-tasks",
      "schedule": "0 0 * * *"
    }
  ]
}
```

#### Manual Trigger
```bash
curl -X POST http://localhost:3000/api/scheduled-tasks \
  -H "Content-Type: application/json" \
  -d '{"task": "run-scheduled-tasks"}'
```

#### Generate Specific Report
```bash
curl -X POST http://localhost:3000/api/scheduled-tasks \
  -H "Content-Type: application/json" \
  -d '{"task": "generate-daily-report", "date": "2025-11-26"}'
```

### 11. Alert Thresholds

#### Creating Thresholds
```typescript
const response = await fetch('/api/analytics/thresholds', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'High Temperature',
    metric: 'temperature',
    condition: 'gt',
    value: 28.0,
    severity: 'warning',
    sensorId: 'sensor-123',
    enabled: true
  })
});
```

#### Managing Thresholds
```typescript
// Get all thresholds
const thresholds = await fetch('/api/analytics/thresholds');

// Update threshold
await fetch('/api/analytics/thresholds', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'threshold-123',
    value: 30.0,
    enabled: true
  })
});

// Delete threshold
await fetch('/api/analytics/thresholds?id=threshold-123', {
  method: 'DELETE'
});
```

### 12. Error Handling

All API endpoints include:
- Try-catch blocks for error handling
- Descriptive error messages
- HTTP status codes
- Consistent response format

Example error response:
```json
{
  "success": false,
  "error": "Failed to fetch metrics",
  "message": "Database connection failed",
  "timestamp": "2025-11-26T20:00:00.000Z"
}
```

### 13. Monitoring and Health Checks

#### Task API Health Check
```bash
curl http://localhost:3000/api/scheduled-tasks
```

Response:
```json
{
  "success": true,
  "message": "Scheduled Tasks API is running",
  "availableTasks": [
    "generate-daily-report",
    "cleanup-data",
    "aggregate-data",
    "run-scheduled-tasks"
  ]
}
```

### 14. Best Practices

1. **Data Collection:**
   - Record metrics immediately after operations
   - Use consistent naming conventions
   - Include relevant metadata

2. **Threshold Configuration:**
   - Start with conservative values
   - Adjust based on historical data
   - Set up alerts for critical thresholds

3. **Export and Analysis:**
   - Use CSV for quick analysis in spreadsheets
   - Use JSON for programmatic processing
   - Filter by timeframe to limit data size

4. **Performance:**
   - Monitor query performance
   - Use appropriate indexes
   - Archive old data regularly

5. **WebSocket Usage:**
   - Subscribe to analytics updates when dashboard is active
   - Unsubscribe when not needed to save resources
   - Handle disconnect/reconnect scenarios

### 15. Troubleshooting

#### Common Issues

**Metrics Not Updating:**
- Check WebSocket connection status
- Verify auto-refresh is enabled
- Check browser console for errors

**Slow Dashboard Loading:**
- Reduce timeframe to limit data
- Check database connection
- Verify index usage in queries

**Export Failing:**
- Check timeframe parameters
- Verify data exists for selected range
- Check file size limits

**Reports Not Generating:**
- Check scheduled task execution
- Verify database permissions
- Check logs for errors

#### Logs Location
- Development: Console output
- Production: Server logs
- Database: Prisma query logs

## Conclusion

This analytics system provides comprehensive monitoring and insights for the CultivAI Pro application. It includes real-time updates, automated reporting, configurable alerts, and flexible export options. The system is designed to scale with the application's growth while maintaining performance and reliability.

For support or questions, refer to the codebase comments and inline documentation.
