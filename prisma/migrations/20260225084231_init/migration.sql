-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "temp" REAL,
    "humidity" REAL,
    "co2" REAL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Sensor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "locationId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "calibration" JSONB,
    "lastValue" REAL,
    "lastUpdated" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sensor_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Room" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SensorReading" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sensorId" TEXT NOT NULL,
    "value" REAL,
    "data" JSONB,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SensorReading_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sensorId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Alert_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "message" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "templateId" TEXT,
    "metadata" JSONB,
    CONSTRAINT "Notification_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "retryCount" INTEGER NOT NULL DEFAULT 3,
    "timeout" INTEGER NOT NULL DEFAULT 5000,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastUsed" DATETIME,
    "isVerified" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "webhookId" TEXT NOT NULL,
    "notificationId" TEXT,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "responseCode" INTEGER,
    "responseBody" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" DATETIME,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "WebhookSubscription" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WebhookDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "channels" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notificationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT,
    "recipient" TEXT,
    "messageId" TEXT,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" DATETIME,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "webhookEnabled" BOOLEAN NOT NULL DEFAULT false,
    "discordEnabled" BOOLEAN NOT NULL DEFAULT false,
    "slackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "minSeverity" TEXT NOT NULL DEFAULT 'info',
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "throttleRate" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AutomationSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "config" JSONB NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Strain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lineage" TEXT,
    "description" TEXT,
    "isPurpleStrain" BOOLEAN NOT NULL DEFAULT false,
    "optimalConditions" JSONB,
    "commonDeficiencies" JSONB,
    "characteristics" JSONB,
    "growingDifficulty" TEXT,
    "floweringTime" INTEGER,
    "thcLevel" REAL,
    "cbdLevel" REAL,
    "effects" JSONB,
    "medicalUses" JSONB,
    "flavors" JSONB,
    "aroma" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Plant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "strainId" TEXT,
    "stage" TEXT,
    "health" JSONB,
    "age" INTEGER,
    "plantedDate" DATETIME,
    "locationId" TEXT,
    "images" JSONB,
    "notes" TEXT,
    "tags" JSONB,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Plant_strainId_fkey" FOREIGN KEY ("strainId") REFERENCES "Strain" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Plant_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Room" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT,
    "priority" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "data" JSONB,
    "plantId" TEXT,
    "scheduledAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Action" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "data" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Action_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlantAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT,
    "request" JSONB,
    "result" JSONB,
    "provider" TEXT,
    "imageInfo" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlantAnalysis_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "tags" JSONB,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AnalyticsRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "metadata" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "responseTime" REAL,
    "userId" TEXT,
    "plantId" TEXT,
    "sensorId" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SensorAnalytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sensorId" TEXT NOT NULL,
    "reading" REAL NOT NULL,
    "value" JSONB,
    "status" TEXT NOT NULL,
    "threshold" REAL,
    "anomalyScore" REAL,
    "temperature" REAL,
    "humidity" REAL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SensorAnalytics_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlantHealthAnalytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "analysisId" TEXT,
    "healthScore" REAL NOT NULL,
    "healthStatus" TEXT NOT NULL,
    "issues" JSONB,
    "recommendations" JSONB,
    "confidence" REAL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlantHealthAnalytics_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "APIPerformanceMetrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" REAL NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "requestSize" REAL,
    "responseSize" REAL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "summary" JSONB NOT NULL,
    "metrics" JSONB NOT NULL,
    "alertsCount" INTEGER NOT NULL,
    "actionsCount" INTEGER NOT NULL,
    "analysisCount" INTEGER NOT NULL,
    "sensorReadings" INTEGER NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AlertThreshold" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "severity" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "roomId" TEXT,
    "sensorId" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DataAggregation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "period" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "count" INTEGER NOT NULL,
    "min" REAL,
    "max" REAL,
    "avg" REAL,
    "stddev" REAL,
    "timestamp" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "config" JSONB,
    "plantId" TEXT,
    "scheduleId" TEXT,
    "triggerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AutomationRule_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AutomationRule_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AutomationRule_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "Trigger" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cronExpression" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "interval" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "lastRun" DATETIME,
    "nextRun" DATETIME,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Trigger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "config" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cooldown" INTEGER NOT NULL DEFAULT 3600,
    "lastTriggered" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "steps" JSONB NOT NULL,
    "config" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AnalysisBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "plantIds" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "results" JSONB,
    "scheduledAt" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AnalysisHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "analysisType" TEXT NOT NULL,
    "analysisId" TEXT,
    "data" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalysisHistory_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnomalyDetection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT,
    "type" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "detected" BOOLEAN NOT NULL DEFAULT true,
    "threshold" REAL NOT NULL,
    "currentValue" REAL NOT NULL,
    "data" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnomalyDetection_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalysisScheduler" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT,
    "analysisType" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "timeOfDay" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "lastRun" DATETIME,
    "nextRun" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnalysisScheduler_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalysisMilestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "data" JSONB,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" DATETIME,
    CONSTRAINT "AnalysisMilestone_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "channels" TEXT NOT NULL,
    "template" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cooldown" INTEGER NOT NULL DEFAULT 3600,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Room_active_idx" ON "Room"("active");

-- CreateIndex
CREATE INDEX "Room_name_idx" ON "Room"("name");

-- CreateIndex
CREATE INDEX "Sensor_locationId_idx" ON "Sensor"("locationId");

-- CreateIndex
CREATE INDEX "Sensor_type_idx" ON "Sensor"("type");

-- CreateIndex
CREATE INDEX "Sensor_enabled_idx" ON "Sensor"("enabled");

-- CreateIndex
CREATE INDEX "Sensor_name_idx" ON "Sensor"("name");

-- CreateIndex
CREATE INDEX "SensorReading_sensorId_timestamp_idx" ON "SensorReading"("sensorId", "timestamp");

-- CreateIndex
CREATE INDEX "SensorReading_sensorId_timestamp_id_idx" ON "SensorReading"("sensorId", "timestamp", "id");

-- CreateIndex
CREATE INDEX "SensorReading_timestamp_idx" ON "SensorReading"("timestamp");

-- CreateIndex
CREATE INDEX "Alert_sensorId_idx" ON "Alert"("sensorId");

-- CreateIndex
CREATE INDEX "Alert_acknowledged_createdAt_idx" ON "Alert"("acknowledged", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_severity_createdAt_idx" ON "Alert"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_type_createdAt_idx" ON "Alert"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_acknowledged_createdAt_idx" ON "Notification"("acknowledged", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_templateId_idx" ON "Notification"("templateId");

-- CreateIndex
CREATE INDEX "WebhookSubscription_enabled_idx" ON "WebhookSubscription"("enabled");

-- CreateIndex
CREATE INDEX "WebhookSubscription_lastUsed_idx" ON "WebhookSubscription"("lastUsed");

-- CreateIndex
CREATE INDEX "WebhookSubscription_name_idx" ON "WebhookSubscription"("name");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_nextRetryAt_idx" ON "WebhookDelivery"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_webhookId_idx" ON "WebhookDelivery"("webhookId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_eventType_createdAt_idx" ON "WebhookDelivery"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_notificationId_idx" ON "WebhookDelivery"("notificationId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_name_key" ON "NotificationTemplate"("name");

-- CreateIndex
CREATE INDEX "NotificationDelivery_notificationId_channel_idx" ON "NotificationDelivery"("notificationId", "channel");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_idx" ON "NotificationDelivery"("status");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_type_idx" ON "NotificationPreference"("userId", "type");

-- CreateIndex
CREATE INDEX "Plant_locationId_idx" ON "Plant"("locationId");

-- CreateIndex
CREATE INDEX "Plant_strainId_idx" ON "Plant"("strainId");

-- CreateIndex
CREATE INDEX "Plant_isActive_idx" ON "Plant"("isActive");

-- CreateIndex
CREATE INDEX "Plant_stage_idx" ON "Plant"("stage");

-- CreateIndex
CREATE INDEX "Plant_name_idx" ON "Plant"("name");

-- CreateIndex
CREATE INDEX "Plant_createdAt_idx" ON "Plant"("createdAt");

-- CreateIndex
CREATE INDEX "Task_plantId_idx" ON "Task"("plantId");

-- CreateIndex
CREATE INDEX "Task_status_scheduledAt_idx" ON "Task"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Task_status_completedAt_idx" ON "Task"("status", "completedAt");

-- CreateIndex
CREATE INDEX "Task_type_status_idx" ON "Task"("type", "status");

-- CreateIndex
CREATE INDEX "Task_priority_status_idx" ON "Task"("priority", "status");

-- CreateIndex
CREATE INDEX "Task_createdAt_idx" ON "Task"("createdAt");

-- CreateIndex
CREATE INDEX "Action_plantId_idx" ON "Action"("plantId");

-- CreateIndex
CREATE INDEX "Action_status_createdAt_idx" ON "Action"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Action_type_status_idx" ON "Action"("type", "status");

-- CreateIndex
CREATE INDEX "Action_createdAt_idx" ON "Action"("createdAt");

-- CreateIndex
CREATE INDEX "PlantAnalysis_plantId_idx" ON "PlantAnalysis"("plantId");

-- CreateIndex
CREATE INDEX "PlantAnalysis_provider_idx" ON "PlantAnalysis"("provider");

-- CreateIndex
CREATE INDEX "PlantAnalysis_createdAt_id_idx" ON "PlantAnalysis"("createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Metric_name_key" ON "Metric"("name");

-- CreateIndex
CREATE INDEX "Metric_name_timestamp_idx" ON "Metric"("name", "timestamp");

-- CreateIndex
CREATE INDEX "Metric_timestamp_idx" ON "Metric"("timestamp");

-- CreateIndex
CREATE INDEX "Metric_createdAt_idx" ON "Metric"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsRecord_category_timestamp_idx" ON "AnalyticsRecord"("category", "timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsRecord_eventType_timestamp_idx" ON "AnalyticsRecord"("eventType", "timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsRecord_timestamp_success_idx" ON "AnalyticsRecord"("timestamp", "success");

-- CreateIndex
CREATE INDEX "AnalyticsRecord_success_timestamp_idx" ON "AnalyticsRecord"("success", "timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsRecord_category_eventType_timestamp_idx" ON "AnalyticsRecord"("category", "eventType", "timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsRecord_plantId_timestamp_idx" ON "AnalyticsRecord"("plantId", "timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsRecord_sensorId_timestamp_idx" ON "AnalyticsRecord"("sensorId", "timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsRecord_createdAt_idx" ON "AnalyticsRecord"("createdAt");

-- CreateIndex
CREATE INDEX "SensorAnalytics_sensorId_timestamp_idx" ON "SensorAnalytics"("sensorId", "timestamp");

-- CreateIndex
CREATE INDEX "SensorAnalytics_status_timestamp_idx" ON "SensorAnalytics"("status", "timestamp");

-- CreateIndex
CREATE INDEX "SensorAnalytics_timestamp_idx" ON "SensorAnalytics"("timestamp");

-- CreateIndex
CREATE INDEX "SensorAnalytics_sensorId_status_timestamp_idx" ON "SensorAnalytics"("sensorId", "status", "timestamp");

-- CreateIndex
CREATE INDEX "SensorAnalytics_sensorId_createdAt_idx" ON "SensorAnalytics"("sensorId", "createdAt");

-- CreateIndex
CREATE INDEX "PlantHealthAnalytics_plantId_timestamp_idx" ON "PlantHealthAnalytics"("plantId", "timestamp");

-- CreateIndex
CREATE INDEX "PlantHealthAnalytics_healthStatus_timestamp_idx" ON "PlantHealthAnalytics"("healthStatus", "timestamp");

-- CreateIndex
CREATE INDEX "PlantHealthAnalytics_timestamp_idx" ON "PlantHealthAnalytics"("timestamp");

-- CreateIndex
CREATE INDEX "PlantHealthAnalytics_plantId_healthStatus_timestamp_idx" ON "PlantHealthAnalytics"("plantId", "healthStatus", "timestamp");

-- CreateIndex
CREATE INDEX "PlantHealthAnalytics_confidence_idx" ON "PlantHealthAnalytics"("confidence");

-- CreateIndex
CREATE INDEX "APIPerformanceMetrics_endpoint_timestamp_idx" ON "APIPerformanceMetrics"("endpoint", "timestamp");

-- CreateIndex
CREATE INDEX "APIPerformanceMetrics_statusCode_timestamp_idx" ON "APIPerformanceMetrics"("statusCode", "timestamp");

-- CreateIndex
CREATE INDEX "APIPerformanceMetrics_timestamp_success_idx" ON "APIPerformanceMetrics"("timestamp", "success");

-- CreateIndex
CREATE INDEX "APIPerformanceMetrics_success_timestamp_idx" ON "APIPerformanceMetrics"("success", "timestamp");

-- CreateIndex
CREATE INDEX "APIPerformanceMetrics_method_statusCode_idx" ON "APIPerformanceMetrics"("method", "statusCode");

-- CreateIndex
CREATE INDEX "APIPerformanceMetrics_createdAt_idx" ON "APIPerformanceMetrics"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReport_date_key" ON "DailyReport"("date");

-- CreateIndex
CREATE INDEX "DailyReport_date_idx" ON "DailyReport"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AlertThreshold_name_key" ON "AlertThreshold"("name");

-- CreateIndex
CREATE INDEX "AlertThreshold_metric_enabled_idx" ON "AlertThreshold"("metric", "enabled");

-- CreateIndex
CREATE INDEX "DataAggregation_period_category_timestamp_idx" ON "DataAggregation"("period", "category", "timestamp");

-- CreateIndex
CREATE INDEX "DataAggregation_timestamp_idx" ON "DataAggregation"("timestamp");

-- CreateIndex
CREATE INDEX "AutomationRule_enabled_idx" ON "AutomationRule"("enabled");

-- CreateIndex
CREATE INDEX "AutomationRule_plantId_idx" ON "AutomationRule"("plantId");

-- CreateIndex
CREATE INDEX "AutomationRule_type_idx" ON "AutomationRule"("type");

-- CreateIndex
CREATE INDEX "AutomationRule_scheduleId_idx" ON "AutomationRule"("scheduleId");

-- CreateIndex
CREATE INDEX "Schedule_enabled_idx" ON "Schedule"("enabled");

-- CreateIndex
CREATE INDEX "Schedule_nextRun_idx" ON "Schedule"("nextRun");

-- CreateIndex
CREATE INDEX "Schedule_type_idx" ON "Schedule"("type");

-- CreateIndex
CREATE INDEX "Trigger_enabled_idx" ON "Trigger"("enabled");

-- CreateIndex
CREATE INDEX "Trigger_type_idx" ON "Trigger"("type");

-- CreateIndex
CREATE INDEX "Workflow_enabled_idx" ON "Workflow"("enabled");

-- CreateIndex
CREATE INDEX "Workflow_type_idx" ON "Workflow"("type");

-- CreateIndex
CREATE INDEX "AnalysisBatch_status_idx" ON "AnalysisBatch"("status");

-- CreateIndex
CREATE INDEX "AnalysisBatch_scheduledAt_idx" ON "AnalysisBatch"("scheduledAt");

-- CreateIndex
CREATE INDEX "AnalysisBatch_type_idx" ON "AnalysisBatch"("type");

-- CreateIndex
CREATE INDEX "AnalysisHistory_plantId_createdAt_idx" ON "AnalysisHistory"("plantId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalysisHistory_analysisType_createdAt_idx" ON "AnalysisHistory"("analysisType", "createdAt");

-- CreateIndex
CREATE INDEX "AnomalyDetection_plantId_createdAt_idx" ON "AnomalyDetection"("plantId", "createdAt");

-- CreateIndex
CREATE INDEX "AnomalyDetection_resolved_severity_idx" ON "AnomalyDetection"("resolved", "severity");

-- CreateIndex
CREATE INDEX "AnomalyDetection_type_createdAt_idx" ON "AnomalyDetection"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AnalysisScheduler_enabled_idx" ON "AnalysisScheduler"("enabled");

-- CreateIndex
CREATE INDEX "AnalysisScheduler_nextRun_idx" ON "AnalysisScheduler"("nextRun");

-- CreateIndex
CREATE INDEX "AnalysisScheduler_plantId_idx" ON "AnalysisScheduler"("plantId");

-- CreateIndex
CREATE INDEX "AnalysisMilestone_plantId_detectedAt_idx" ON "AnalysisMilestone"("plantId", "detectedAt");

-- CreateIndex
CREATE INDEX "AnalysisMilestone_type_idx" ON "AnalysisMilestone"("type");

-- CreateIndex
CREATE INDEX "NotificationRule_enabled_idx" ON "NotificationRule"("enabled");

-- CreateIndex
CREATE INDEX "NotificationRule_type_idx" ON "NotificationRule"("type");
