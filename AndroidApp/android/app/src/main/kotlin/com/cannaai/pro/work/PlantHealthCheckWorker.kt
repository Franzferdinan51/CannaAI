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
import com.cannaai.pro.data.repository.PlantAnalysisRepository
import com.cannaai.pro.data.repository.SensorRepository
import com.cannaai.pro.data.local.preferences.AppPreferences
import com.cannaai.pro.utils.Logger
import com.cannaai.pro.utils.PlantHealthCalculator
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.flow.first
import java.util.concurrent.TimeUnit

@HiltWorker
class PlantHealthCheckWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val plantAnalysisRepository: PlantAnalysisRepository,
    private val sensorRepository: SensorRepository,
    private val preferences: AppPreferences,
    private val plantHealthCalculator: PlantHealthCalculator,
    private val logger: Logger
) : CoroutineWorker(applicationContext, workerParams) {

    companion object {
        const val WORK_NAME = "PlantHealthCheckWorker"
        const val NOTIFICATION_ID = 1002
        const val CHANNEL_ID = "plant_health"
        const val TAG = "PlantHealthCheckWorker"

        fun createPeriodicWorkRequest(): PeriodicWorkRequest {
            return PeriodicWorkRequestBuilder<PlantHealthCheckWorker>(
                repeatInterval = 6, // Check every 6 hours
                repeatIntervalTimeUnit = TimeUnit.HOURS,
                flexTimeInterval = 30, // Flex window of 30 minutes
                flexTimeIntervalUnit = TimeUnit.MINUTES
            )
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .setRequiresCharging(false)
                        .setRequiresBatteryNotLow(false) // Allow even when battery is low
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

        fun createOneTimeWorkRequest(plantId: String): OneTimeWorkRequest {
            return OneTimeWorkRequestBuilder<PlantHealthCheckWorker>()
                .setInputData(
                    workDataOf("plant_id" to plantId)
                )
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
        logger.d("PlantHealthCheckWorker started")

        return try {
            // Create notification channel
            createNotificationChannel()

            val plantId = inputData.getString("plant_id")

            if (plantId != null) {
                // Single plant health check
                checkSinglePlantHealth(plantId)
            } else {
                // All plants health check
                checkAllPlantsHealth()
            }

            logger.d("PlantHealthCheckWorker completed successfully")
            Result.success()

        } catch (e: Exception) {
            logger.e("PlantHealthCheckWorker failed", e)
            Result.retry()
        }
    }

    private suspend fun checkAllPlantsHealth() {
        logger.d("Checking health for all plants...")

        try {
            // Check if health monitoring is enabled
            val isHealthMonitoringEnabled = preferences.isHealthMonitoringEnabled().first()
            if (!isHealthMonitoringEnabled) {
                logger.d("Plant health monitoring is disabled")
                return
            }

            // Get all plants from database
            val plants = plantAnalysisRepository.getAllPlants()

            plants.forEach { plant ->
                checkIndividualPlantHealth(plant)
            }

            // Update last health check timestamp
            preferences.updateLastHealthCheck(System.currentTimeMillis())

        } catch (e: Exception) {
            logger.e("Error checking all plants health", e)
            throw e
        }
    }

    private suspend fun checkSinglePlantHealth(plantId: String) {
        logger.d("Checking health for plant: $plantId")

        try {
            val plant = plantAnalysisRepository.getPlantById(plantId)
            if (plant != null) {
                checkIndividualPlantHealth(plant)
            } else {
                logger.w("Plant not found: $plantId")
            }
        } catch (e: Exception) {
            logger.e("Error checking plant health: $plantId", e)
            throw e
        }
    }

    private suspend fun checkIndividualPlantHealth(plant: Any) { // Replace with Plant entity type
        logger.d("Checking health for plant: ${/* plant.name */ "Unknown"}")

        try {
            // Get latest sensor data for this plant's environment
            val currentSensorData = sensorRepository.getLatestSensorDataForPlant(/* plant.id */)

            // Get last analysis results
            val lastAnalysis = plantAnalysisRepository.getLatestAnalysisForPlant(/* plant.id */)

            // Calculate overall health score
            val healthScore = plantHealthCalculator.calculateHealthScore(
                plant = plant,
                sensorData = currentSensorData,
                lastAnalysis = lastAnalysis,
                timeSinceLastAnalysis = System.currentTimeMillis() - (/* lastAnalysis?.timestamp */ 0)
            )

            // Check if health analysis is needed
            val needsAnalysis = shouldPerformAnalysis(plant, lastAnalysis, healthScore)

            if (needsAnalysis) {
                // Schedule or perform plant analysis
                schedulePlantAnalysis(plant, healthScore)
            }

            // Check for health warnings
            checkForHealthWarnings(plant, healthScore, currentSensorData)

            // Update plant's health status
            plantAnalysisRepository.updatePlantHealthStatus(/* plant.id */, healthScore)

            // Log health check result
            logger.d("Plant health check completed - Score: $healthScore%")

        } catch (e: Exception) {
            logger.e("Error checking individual plant health", e)
        }
    }

    private fun shouldPerformAnalysis(plant: Any, lastAnalysis: Any?, healthScore: Int): Boolean {
        val currentTime = System.currentTimeMillis()
        val lastAnalysisTime = /* lastAnalysis?.timestamp */ 0L
        val hoursSinceLastAnalysis = (currentTime - lastAnalysisTime) / (1000 * 60 * 60)

        return when {
            // No analysis ever performed
            lastAnalysis == null -> true

            // Health score is critically low
            healthScore < 30 -> true

            // Health score is declining significantly
            healthScore < 50 -> hoursSinceLastAnalysis >= 12

            // Regular analysis schedule
            healthScore >= 50 -> hoursSinceLastAnalysis >= 24

            else -> false
        }
    }

    private suspend fun schedulePlantAnalysis(plant: Any, healthScore: Int) {
        logger.d("Scheduling plant analysis for health score: $healthScore")

        try {
            // Create analysis request
            val analysisRequest = PlantAnalysisWorker.createOneTimeWorkRequest(
                plantId = /* plant.id */ "unknown",
                priority = if (healthScore < 30) "HIGH" else "NORMAL"
            )

            // Enqueue analysis work
            WorkManager.getInstance(applicationContext)
                .enqueueUniqueWork(
                    "analysis_${/* plant.id */ "unknown"}",
                    ExistingWorkPolicy.REPLACE,
                    analysisRequest
                )

            logger.d("Plant analysis scheduled successfully")

        } catch (e: Exception) {
            logger.e("Error scheduling plant analysis", e)
        }
    }

    private fun checkForHealthWarnings(plant: Any, healthScore: Int, sensorData: Any?) {
        logger.d("Checking for health warnings - Score: $healthScore%")

        try {
            when {
                healthScore < 20 -> {
                    createCriticalHealthAlert(plant, healthScore)
                }
                healthScore < 40 -> {
                    createWarningHealthAlert(plant, healthScore)
                }
                healthScore < 60 -> {
                    createInfoHealthAlert(plant, healthScore)
                }
            }

            // Check for specific sensor-based warnings
            sensorData?.let { data ->
                checkSensorBasedWarnings(plant, data)
            }

        } catch (e: Exception) {
            logger.e("Error checking health warnings", e)
        }
    }

    private fun checkSensorBasedWarnings(plant: Any, sensorData: Any) {
        // Implement specific sensor-based warning logic
        // For example: unusual temperature fluctuations, humidity issues, etc.
    }

    private fun createCriticalHealthAlert(plant: Any, healthScore: Int) {
        val title = "Critical Plant Health Alert"
        val message = "Plant ${/* plant.name */ "Unknown"} needs immediate attention! Health score: $healthScore%"

        createHealthNotification(title, message, NotificationCompat.PRIORITY_HIGH)
    }

    private fun createWarningHealthAlert(plant: Any, healthScore: Int) {
        val title = "Plant Health Warning"
        val message = "Plant ${/* plant.name */ "Unknown"} shows declining health. Score: $healthScore%"

        createHealthNotification(title, message, NotificationCompat.PRIORITY_DEFAULT)
    }

    private fun createInfoHealthAlert(plant: Any, healthScore: Int) {
        val title = "Plant Health Update"
        val message = "Plant ${/* plant.name */ "Unknown"} health status: $healthScore%"

        createHealthNotification(title, message, NotificationCompat.PRIORITY_LOW)
    }

    private fun createHealthNotification(title: String, message: String, priority: Int) {
        val notification = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(priority)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
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
            val name = "Plant Health Monitoring"
            val descriptionText = "Monitors plant health and provides care recommendations"
            val importance = NotificationManager.IMPORTANCE_DEFAULT
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                setShowBadge(true)
                enableVibration(true)
            }

            val notificationManager: NotificationManager =
                applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
}