package com.cannaai.pro.work

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.cannaai.pro.data.repository.SensorRepository
import com.cannaai.pro.data.repository.PlantAnalysisRepository
import com.cannaai.pro.data.local.preferences.AppPreferences
import com.cannaai.pro.utils.Logger
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.flow.first
import java.util.concurrent.TimeUnit

@HiltWorker
class SensorMonitoringWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val sensorRepository: SensorRepository,
    private val plantAnalysisRepository: PlantAnalysisRepository,
    private val preferences: AppPreferences,
    private val logger: Logger
) : CoroutineWorker(context, workerParams) {

    companion object {
        const val WORK_NAME = "SensorMonitoringWorker"
        const val NOTIFICATION_ID = 1001
        const val CHANNEL_ID = "sensor_monitoring"
        const val TAG = "SensorMonitoringWorker"

        fun createPeriodicWorkRequest(): PeriodicWorkRequest {
            return PeriodicWorkRequestBuilder<SensorMonitoringWorker>(
                repeatInterval = 15, // Check every 15 minutes
                repeatIntervalTimeUnit = TimeUnit.MINUTES,
                flexTimeInterval = 5, // Flex window of 5 minutes
                flexTimeIntervalUnit = TimeUnit.MINUTES
            )
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .setRequiresCharging(false)
                        .setRequiresBatteryNotLow(true)
                        .build()
                )
                .addTag(TAG)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .build()
        }

        fun createOneTimeWorkRequest(): OneTimeWorkRequest {
            return OneTimeWorkRequestBuilder<SensorMonitoringWorker>()
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .addTag(TAG)
                .build()
        }
    }

    override suspend fun doWork(): Result {
        logger.d("SensorMonitoringWorker started")

        return try {
            // Create notification channel for Android 8.0+
            createNotificationChannel()

            // Show foreground notification
            val notification = createNotification()
            setForegroundAsync(ForegroundInfo(NOTIFICATION_ID, notification))

            // Check if monitoring is enabled
            val isMonitoringEnabled = preferences.isSensorMonitoringEnabled().first()
            if (!isMonitoringEnabled) {
                logger.d("Sensor monitoring is disabled, skipping")
                return Result.success()
            }

            // Check permissions
            if (!hasRequiredPermissions()) {
                logger.e("Missing required permissions for sensor monitoring")
                return Result.failure()
            }

            // Process sensor data
            processSensorData()

            // Check for alerts
            checkForAlerts()

            // Sync data if needed
            syncDataWithServer()

            logger.d("SensorMonitoringWorker completed successfully")
            Result.success()

        } catch (e: Exception) {
            logger.e("SensorMonitoringWorker failed", e)
            Result.retry()
        }
    }

    private suspend fun processSensorData() {
        logger.d("Processing sensor data...")

        try {
            // Get latest sensor readings
            val sensorData = sensorRepository.getLatestSensorReadings()

            // Process each sensor reading
            sensorData.forEach { data ->
                // Save to local database
                sensorRepository.insertSensorData(data)

                // Check if readings are out of bounds
                if (isReadingOutOfBounds(data)) {
                    createSensorAlert(data)
                }
            }

            // Update last sync timestamp
            preferences.updateLastSensorSync(System.currentTimeMillis())

        } catch (e: Exception) {
            logger.e("Error processing sensor data", e)
            throw e
        }
    }

    private suspend fun checkForAlerts() {
        logger.d("Checking for sensor alerts...")

        try {
            // Get alert thresholds from preferences
            val temperatureMin = preferences.getTemperatureMinThreshold().first()
            val temperatureMax = preferences.getTemperatureMaxThreshold().first()
            val humidityMin = preferences.getHumidityMinThreshold().first()
            val humidityMax = preferences.getHumidityMaxThreshold().first()
            val phMin = preferences.getPhMinThreshold().first()
            val phMax = preferences.getPhMaxThreshold().first()

            // Check for temperature alerts
            val currentTemp = sensorRepository.getLatestTemperature()
            currentTemp?.let { temp ->
                if (temp < temperatureMin || temp > temperatureMax) {
                    createTemperatureAlert(temp, temperatureMin, temperatureMax)
                }
            }

            // Check for humidity alerts
            val currentHumidity = sensorRepository.getLatestHumidity()
            currentHumidity?.let { humidity ->
                if (humidity < humidityMin || humidity > humidityMax) {
                    createHumidityAlert(humidity, humidityMin, humidityMax)
                }
            }

            // Check for pH alerts
            val currentPh = sensorRepository.getLatestPh()
            currentPh?.let { ph ->
                if (ph < phMin || ph > phMax) {
                    createPhAlert(ph, phMin, phMax)
                }
            }

        } catch (e: Exception) {
            logger.e("Error checking alerts", e)
        }
    }

    private suspend fun syncDataWithServer() {
        logger.d("Syncing data with server...")

        try {
            // Get unsynced sensor data
            val unsyncedData = sensorRepository.getUnsyncedSensorData()

            if (unsyncedData.isNotEmpty()) {
                // Upload to server
                val syncResult = sensorRepository.syncSensorData(unsyncedData)

                if (syncResult.isSuccess) {
                    // Mark as synced
                    unsyncedData.forEach { data ->
                        sensorRepository.markSensorDataAsSynced(data.id)
                    }
                    logger.d("Successfully synced ${unsyncedData.size} sensor readings")
                } else {
                    logger.e("Failed to sync sensor data: ${syncResult.exceptionOrNull()?.message}")
                }
            }

        } catch (e: Exception) {
            logger.e("Error syncing data", e)
        }
    }

    private fun isReadingOutOfBounds(data: Any): Boolean {
        // Implement bounds checking logic based on sensor type
        return when (data) {
            // Add specific sensor type checks
            else -> false
        }
    }

    private fun createSensorAlert(data: Any) {
        // Create notification for sensor alert
        val notification = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("Sensor Alert")
            .setContentText("Unusual sensor reading detected")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        with(NotificationManagerCompat.from(applicationContext)) {
            if (ActivityCompat.checkSelfPermission(
                    applicationContext,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                return
            }
            notify(NOTIFICATION_ID + 1, notification)
        }
    }

    private fun createTemperatureAlert(current: Double, min: Double, max: Double) {
        val message = when {
            current < min -> "Temperature too low: ${current}°C (min: ${min}°C)"
            current > max -> "Temperature too high: ${current}°C (max: ${max}°C)"
            else -> return
        }

        createAlertNotification("Temperature Alert", message)
    }

    private fun createHumidityAlert(current: Double, min: Double, max: Double) {
        val message = when {
            current < min -> "Humidity too low: ${current}% (min: ${min}%)"
            current > max -> "Humidity too high: ${current}% (max: ${max}%)"
            else -> return
        }

        createAlertNotification("Humidity Alert", message)
    }

    private fun createPhAlert(current: Double, min: Double, max: Double) {
        val message = when {
            current < min -> "pH too low: ${current} (min: ${min})"
            current > max -> "pH too high: ${current} (max: ${max})"
            else -> return
        }

        createAlertNotification("pH Alert", message)
    }

    private fun createAlertNotification(title: String, message: String) {
        val notification = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .build()

        with(NotificationManagerCompat.from(applicationContext)) {
            if (ActivityCompat.checkSelfPermission(
                    applicationContext,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                return
            }
            notify(System.currentTimeMillis().toInt(), notification)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Sensor Monitoring"
            val descriptionText = "Monitors sensor data and provides alerts"
            val importance = NotificationManager.IMPORTANCE_LOW
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                setShowBadge(false)
                enableVibration(false)
            }

            val notificationManager: NotificationManager =
                applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(applicationContext, CHANNEL_ID)
            .setContentTitle("CannaAI Pro")
            .setContentText("Monitoring sensor data...")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun hasRequiredPermissions(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ActivityCompat.checkSelfPermission(
                applicationContext,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true // Notification permission not required before Android 13
        }
    }
}