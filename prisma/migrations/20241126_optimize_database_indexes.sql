-- Database Optimization Migration
-- Generated on: 2024-11-26
-- Purpose: Add performance indexes for high-volume queries

-- ===============================================
-- HIGH-VOLUME TIME-SERIES DATA INDEXES
-- ===============================================

-- SensorReading: Most queried table for sensor data
CREATE INDEX IF NOT EXISTS idx_sensor_reading_sensor_timestamp
  ON SensorReading(sensorId, timestamp DESC);

-- SensorAnalytics: Sensor analytics with time filters
CREATE INDEX IF NOT EXISTS idx_sensor_analytics_sensor_timestamp
  ON SensorAnalytics(sensorId, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_sensor_analytics_status_timestamp
  ON SensorAnalytics(status, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_sensor_analytics_timestamp
  ON SensorAnalytics(timestamp DESC);

-- PlantHealthAnalytics: Health tracking over time
CREATE INDEX IF NOT EXISTS idx_plant_health_analytics_plant_timestamp
  ON PlantHealthAnalytics(plantId, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_plant_health_analytics_status_timestamp
  ON PlantHealthAnalytics(healthStatus, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_plant_health_analytics_timestamp
  ON PlantHealthAnalytics(timestamp DESC);

-- AnalyticsRecord: System analytics and metrics
CREATE INDEX IF NOT EXISTS idx_analytics_record_category_timestamp
  ON AnalyticsRecord(category, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_record_event_timestamp
  ON AnalyticsRecord(eventType, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_record_timestamp
  ON AnalyticsRecord(timestamp DESC);

-- APIPerformanceMetrics: API performance tracking
CREATE INDEX IF NOT EXISTS idx_api_performance_endpoint_timestamp
  ON APIPerformanceMetrics(endpoint, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_api_performance_status_timestamp
  ON APIPerformanceMetrics(statusCode, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_api_performance_timestamp
  ON APIPerformanceMetrics(timestamp DESC);

-- ===============================================
-- RELATIONSHIP & FOREIGN KEY INDEXES
-- ===============================================

-- Sensor: Room relationship queries
CREATE INDEX IF NOT EXISTS idx_sensor_room
  ON Sensor(roomId);

-- Sensor: Type-based filtering
CREATE INDEX IF NOT EXISTS idx_sensor_type
  ON Sensor(type);

-- Sensor: Enabled status filtering
CREATE INDEX IF NOT EXISTS idx_sensor_enabled
  ON Sensor(enabled);

-- Plant: Room relationship
CREATE INDEX IF NOT EXISTS idx_plant_room
  ON Plant(locationId);

-- Plant: Strain relationship
CREATE INDEX IF NOT EXISTS idx_plant_strain
  ON Plant(strainId);

-- Plant: Active filtering
CREATE INDEX IF NOT EXISTS idx_plant_active
  ON Plant(isActive);

-- Plant: Stage filtering
CREATE INDEX IF NOT EXISTS idx_plant_stage
  ON Plant(stage);

-- ===============================================
-- NOTIFICATION SYSTEM INDEXES
-- ===============================================

-- Alert: Sensor relationship
CREATE INDEX IF NOT EXISTS idx_alert_sensor
  ON Alert(sensorId);

-- Alert: Acknowledged status with time
CREATE INDEX IF NOT EXISTS idx_alert_acknowledged_created
  ON Alert(acknowledged, createdAt DESC);

-- Notification: Acknowledged status
CREATE INDEX IF NOT EXISTS idx_notification_acknowledged
  ON Notification(acknowledged, createdAt DESC);

-- NotificationDelivery: Notification lookup
CREATE INDEX IF NOT EXISTS idx_notification_delivery_notification_channel
  ON NotificationDelivery(notificationId, channel);

-- WebhookSubscription: Active subscriptions
CREATE INDEX IF NOT EXISTS idx_webhook_subscription_enabled
  ON WebhookSubscription(enabled);

-- WebhookSubscription: Last used
CREATE INDEX IF NOT EXISTS idx_webhook_subscription_last_used
  ON WebhookSubscription(lastUsed DESC);

-- WebhookDelivery: Queue processing optimization
-- Already exists: idx_webhook_delivery_webhook_id
-- Enhance with status for queue queries
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_status_retry
  ON WebhookDelivery(status, nextRetryAt);

-- NotificationPreference: User preferences
-- Already exists: idx_notification_preference_user_type
-- Composite index covers this pattern well

-- ===============================================
-- TASK & ACTION SYSTEM INDEXES
-- ===============================================

-- Task: Plant relationship
CREATE INDEX IF NOT EXISTS idx_task_plant
  ON Task(plantId);

-- Task: Status with scheduled date
CREATE INDEX IF NOT EXISTS idx_task_status_scheduled
  ON Task(status, scheduledAt);

-- Task: Status with completion
CREATE INDEX IF NOT EXISTS idx_task_status_completed
  ON Task(status, completedAt);

-- Action: Plant relationship
CREATE INDEX IF NOT EXISTS idx_action_plant
  ON Action(plantId);

-- Action: Status with creation time
CREATE INDEX IF NOT EXISTS idx_action_status_created
  ON Action(status, createdAt DESC);

-- ===============================================
-- ANALYSIS & HEALTH TRACKING INDEXES
-- ===============================================

-- PlantAnalysis: Plant relationship for history
CREATE INDEX IF NOT EXISTS idx_plant_analysis_plant
  ON PlantAnalysis(plantId);

-- PlantAnalysis: Provider filtering
CREATE INDEX IF NOT EXISTS idx_plant_analysis_provider
  ON PlantAnalysis(provider);

-- Metric: Time-series queries
-- Already exists: idx_metric_name_timestamp, idx_metric_timestamp

-- DataAggregation: Time-series queries
-- Already exists: idx_data_aggregation_period_category_timestamp, idx_data_aggregation_timestamp

-- DailyReport: Date queries
-- Already exists: idx_daily_report_date
-- Unique constraint on date field provides optimal performance

-- AlertThreshold: Metric-based lookups
-- Already exists: idx_alert_threshold_metric_enabled

-- ===============================================
-- PARTIAL INDEXES (SQLite supports WHERE clause)
-- ===============================================

-- Active notifications only
CREATE INDEX IF NOT EXISTS idx_notification_active
  ON Notification(createdAt DESC)
  WHERE acknowledged = false;

-- Unacknowledged alerts
CREATE INDEX IF NOT EXISTS idx_alert_unacknowledged
  ON Alert(createdAt DESC)
  WHERE acknowledged = false;

-- Pending webhook deliveries
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_pending
  ON WebhookDelivery(nextRetryAt, attempts)
  WHERE status = 'pending' OR status = 'retry';

-- Successful API calls only
CREATE INDEX IF NOT EXISTS idx_api_performance_success
  ON APIPerformanceMetrics(timestamp DESC)
  WHERE success = true;

-- Critical alerts only
CREATE INDEX IF NOT EXISTS idx_alert_critical
  ON Alert(createdAt DESC)
  WHERE severity = 'critical';

-- ===============================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ===============================================

-- Sensor analytics with room filtering
CREATE INDEX IF NOT EXISTS idx_sensor_analytics_room_time
  ON SensorAnalytics(sensorId, timestamp DESC)
  WHERE status IN ('normal', 'warning', 'critical');

-- Plant health with status filtering
CREATE INDEX IF NOT EXISTS idx_plant_health_status_time
  ON PlantHealthAnalytics(plantId, healthStatus, timestamp DESC);

-- Task filtering by status and plant
CREATE INDEX IF NOT EXISTS idx_task_plant_status
  ON Task(plantId, status, scheduledAt);

-- ===============================================
-- INDEX STATISTICS & MAINTENANCE
-- ===============================================

-- Update index statistics (SQLite auto-analyze can be triggered)
-- ANALYZE;  -- Uncomment for production use

-- Enable query planner to consider index statistics
-- PRAGMA optimize;  -- Uncomment for production use

-- ===============================================
-- VERIFICATION QUERIES
-- ===============================================

-- Verify all indexes created
-- SELECT name, tbl_name
-- FROM sqlite_master
-- WHERE type = 'index'
-- AND sql IS NOT NULL
-- ORDER BY tbl_name, name;
