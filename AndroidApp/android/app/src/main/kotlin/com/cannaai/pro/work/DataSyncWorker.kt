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
import com.cannaai.pro.data.repository.UserPreferencesRepository
import com.cannaai.pro.data.local.preferences.AppPreferences
import com.cannaai.pro.utils.Logger
import com.cannaai.pro.utils.NetworkUtils
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.flow.first
import java.util.concurrent.TimeUnit

@HiltWorker
class DataSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val sensorRepository: SensorRepository,
    private val plantAnalysisRepository: PlantAnalysisRepository,
    private val userPreferencesRepository: UserPreferencesRepository,
    private val preferences: AppPreferences,
    private val networkUtils: NetworkUtils,
    private val logger: Logger
) : CoroutineWorker(applicationContext, workerParams) {

    companion object {
        const val WORK_NAME = "DataSyncWorker"
        const val NOTIFICATION_ID = 1003
        const val CHANNEL_ID = "data_sync"
        const val TAG = "DataSyncWorker"

        const val SYNC_TYPE_SENSOR_DATA = "sensor_data"
        const val SYNC_TYPE_PLANT_DATA = "plant_data"
        const val SYNC_TYPE_USER_PREFERENCES = "user_preferences"
        const val SYNC_TYPE_FULL_SYNC = "full_sync"

        fun createPeriodicWorkRequest(): PeriodicWorkRequest {
            return PeriodicWorkRequestBuilder<DataSyncWorker>(
                repeatInterval = 1, // Sync every hour
                repeatIntervalTimeUnit = TimeUnit.HOURS,
                flexTimeInterval = 15, // Flex window of 15 minutes
                flexTimeIntervalUnit = TimeUnit.MINUTES
            )
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .setRequiresCharging(false)
                        .setRequiresBatteryNotLow(false)
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

        fun createOneTimeWorkRequest(syncType: String = SYNC_TYPE_FULL_SYNC): OneTimeWorkRequest {
            return OneTimeWorkRequestBuilder<DataSyncWorker>()
                .setInputData(
                    workDataOf("sync_type" to syncType)
                )
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .addTag(TAG)
                .build()
        }

        fun createImmediateWorkRequest(): OneTimeWorkRequest {
            return OneTimeWorkRequestBuilder<DataSyncWorker>()
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .addTag(TAG)
                .setExpedited(OneTimeWorkRequest.EXPEDITED) // High priority
                .build()
        }
    }

    override suspend fun doWork(): Result {
        logger.d("DataSyncWorker started")

        return try {
            // Check if we have network connectivity
            if (!networkUtils.isNetworkAvailable()) {
                logger.d("No network connectivity available")
                return Result.retry()
            }

            // Check if auto-sync is enabled
            val isAutoSyncEnabled = preferences.isAutoSyncEnabled().first()
            if (!isAutoSyncEnabled && inputData.getString("sync_type") == null) {
                logger.d("Auto-sync is disabled")
                return Result.success()
            }

            // Check network type (WiFi-only mode)
            val wifiOnlySync = preferences.isWifiOnlySyncEnabled().first()
            if (wifiOnlySync && !networkUtils.isWifiConnected()) {
                logger.d("WiFi-only sync enabled but not connected to WiFi")
                return Result.retry()
            }

            // Create notification channel
            createNotificationChannel()

            // Get sync type
            val syncType = inputData.getString("sync_type") ?: SYNC_TYPE_FULL_SYNC

            // Perform sync based on type
            when (syncType) {
                SYNC_TYPE_SENSOR_DATA -> syncSensorData()
                SYNC_TYPE_PLANT_DATA -> syncPlantData()
                SYNC_TYPE_USER_PREFERENCES -> syncUserPreferences()
                SYNC_TYPE_FULL_SYNC -> performFullSync()
            }

            logger.d("DataSyncWorker completed successfully")
            Result.success()

        } catch (e: Exception) {
            logger.e("DataSyncWorker failed", e)
            Result.retry()
        }
    }

    private suspend fun performFullSync() {
        logger.d("Performing full data sync...")

        try {
            var totalItemsSynced = 0

            // Sync sensor data
            val sensorSyncResult = syncSensorData()
            totalItemsSynced += sensorSyncResult

            // Sync plant data
            val plantSyncResult = syncPlantData()
            totalItemsSynced += plantSyncResult

            // Sync user preferences
            val prefSyncResult = syncUserPreferences()
            totalItemsSynced += prefSyncResult

            // Update last sync timestamp
            preferences.updateLastSyncTimestamp(System.currentTimeMillis())

            // Show sync completion notification if items were synced
            if (totalItemsSynced > 0) {
                showSyncCompletionNotification(totalItemsSynced)
            }

            logger.d("Full sync completed. Total items synced: $totalItemsSynced")

        } catch (e: Exception) {
            logger.e("Error during full sync", e)
            throw e
        }
    }

    private suspend fun syncSensorData(): Int {
        logger.d("Syncing sensor data...")

        var itemsSynced = 0

        try {
            // Get unsynced sensor data
            val unsyncedSensorData = sensorRepository.getUnsyncedSensorData()

            if (unsyncedSensorData.isNotEmpty()) {
                logger.d("Found ${unsyncedSensorData.size} unsynced sensor readings")

                // Upload in batches to avoid large payloads
                val batchSize = 50
                unsyncedSensorData.chunked(batchSize).forEach { batch ->
                    val syncResult = sensorRepository.syncSensorDataToServer(batch)

                    if (syncResult.isSuccess) {
                        // Mark as synced
                        batch.forEach { sensorData ->
                            sensorRepository.markSensorDataAsSynced(sensorData.id)
                        }
                        itemsSynced += batch.size
                        logger.d("Successfully synced batch of ${batch.size} sensor readings")
                    } else {
                        logger.e("Failed to sync sensor batch: ${syncResult.exceptionOrNull()?.message}")
                        // Continue with other batches even if one fails
                    }
                }
            }

            // Download latest sensor settings from server
            downloadLatestSensorSettings()

            logger.d("Sensor data sync completed. Items synced: $itemsSynced")
            return itemsSynced

        } catch (e: Exception) {
            logger.e("Error syncing sensor data", e)
            throw e
        }
    }

    private suspend fun syncPlantData(): Int {
        logger.d("Syncing plant data...")

        var itemsSynced = 0

        try {
            // Sync plant analyses
            val unsyncedAnalyses = plantAnalysisRepository.getUnsyncedAnalyses()

            if (unsyncedAnalyses.isNotEmpty()) {
                logger.d("Found ${unsyncedAnalyses.size} unsynced plant analyses")

                val syncResult = plantAnalysisRepository.syncAnalysesToServer(unsyncedAnalyses)

                if (syncResult.isSuccess) {
                    // Mark as synced
                    unsyncedAnalyses.forEach { analysis ->
                        plantAnalysisRepository.markAnalysisAsSynced(analysis.id)
                    }
                    itemsSynced = unsyncedAnalyses.size
                    logger.d("Successfully synced ${unsyncedAnalyses.size} plant analyses")
                } else {
                    logger.e("Failed to sync plant analyses: ${syncResult.exceptionOrNull()?.message}")
                }
            }

            // Download latest plant data from server
            downloadLatestPlantData()

            logger.d("Plant data sync completed. Items synced: $itemsSynced")
            return itemsSynced

        } catch (e: Exception) {
            logger.e("Error syncing plant data", e)
            throw e
        }
    }

    private suspend fun syncUserPreferences(): Int {
        logger.d("Syncing user preferences...")

        var itemsSynced = 0

        try {
            // Upload local preferences to server
            val localPreferences = preferences.getAllPreferences()
            val syncResult = userPreferencesRepository.syncPreferencesToServer(localPreferences)

            if (syncResult.isSuccess) {
                itemsSynced = 1
                logger.d("Successfully synced user preferences")

                // Download latest preferences from server
                downloadLatestUserPreferences()
            } else {
                logger.e("Failed to sync user preferences: ${syncResult.exceptionOrNull()?.message}")
            }

            logger.d("User preferences sync completed. Items synced: $itemsSynced")
            return itemsSynced

        } catch (e: Exception) {
            logger.e("Error syncing user preferences", e)
            throw e
        }
    }

    private suspend fun downloadLatestSensorSettings() {
        logger.d("Downloading latest sensor settings...")

        try {
            val serverSettings = sensorRepository.getSensorSettingsFromServer()
            if (serverSettings.isSuccess) {
                val settings = serverSettings.getOrNull()
                if (settings != null) {
                    preferences.updateSensorSettings(settings)
                    logger.d("Downloaded and updated sensor settings")
                }
            }
        } catch (e: Exception) {
            logger.e("Error downloading sensor settings", e)
        }
    }

    private suspend fun downloadLatestPlantData() {
        logger.d("Downloading latest plant data...")

        try {
            val lastSyncTime = preferences.getLastPlantDataSync()
            val serverPlantData = plantAnalysisRepository.getPlantDataFromServer(lastSyncTime)

            if (serverPlantData.isSuccess) {
                val plantData = serverPlantData.getOrNull()
                if (plantData != null && plantData.isNotEmpty()) {
                    plantAnalysisRepository.savePlantDataFromServer(plantData)
                    preferences.updateLastPlantDataSync(System.currentTimeMillis())
                    logger.d("Downloaded and saved ${plantData.size} plant data items")
                }
            }
        } catch (e: Exception) {
            logger.e("Error downloading plant data", e)
        }
    }

    private suspend fun downloadLatestUserPreferences() {
        logger.d("Downloading latest user preferences...")

        try {
            val serverPreferences = userPreferencesRepository.getPreferencesFromServer()
            if (serverPreferences.isSuccess) {
                val preferences = serverPreferences.getOrNull()
                if (preferences != null) {
                    userPreferencesRepository.savePreferencesFromServer(preferences)
                    logger.d("Downloaded and saved user preferences")
                }
            }
        } catch (e: Exception) {
            logger.e("Error downloading user preferences", e)
        }
    }

    private fun showSyncCompletionNotification(itemsSynced: Int) {
        val title = "CannaAI Pro Sync Complete"
        val message = "Successfully synchronized $itemsSynced items"

        val notification = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
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
            val name = "Data Synchronization"
            val descriptionText = "Synchronizes data with the cloud server"
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
}