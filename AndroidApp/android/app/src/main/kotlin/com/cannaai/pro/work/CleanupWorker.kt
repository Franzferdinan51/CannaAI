package com.cannaai.pro.work

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.cannaai.pro.data.repository.SensorRepository
import com.cannaai.pro.data.repository.PlantAnalysisRepository
import com.cannaai.pro.data.local.preferences.AppPreferences
import com.cannaai.pro.utils.Logger
import com.cannaai.pro.utils.FileManager
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.io.File
import java.util.concurrent.TimeUnit

@HiltWorker
class CleanupWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val sensorRepository: SensorRepository,
    private val plantAnalysisRepository: PlantAnalysisRepository,
    private val preferences: AppPreferences,
    private val fileManager: FileManager,
    private val logger: Logger
) : CoroutineWorker(applicationContext, workerParams) {

    companion object {
        const val WORK_NAME = "CleanupWorker"
        const val TAG = "CleanupWorker"

        fun createOneTimeWorkRequest(): OneTimeWorkRequest {
            return OneTimeWorkRequestBuilder<CleanupWorker>()
                .setConstraints(
                    Constraints.Builder()
                        .setRequiresCharging(true)
                        .setRequiresBatteryNotLow(true)
                        .build()
                )
                .addTag(TAG)
                .build()
        }
    }

    override suspend fun doWork(): Result {
        logger.d("CleanupWorker started")

        return try {
            var totalCleaned = 0

            // Clean up old sensor data
            totalCleaned += cleanupOldSensorData()

            // Clean up old analysis results
            totalCleaned += cleanupOldAnalysisResults()

            // Clean up cache files
            totalCleaned += cleanupCacheFiles()

            // Clean up log files
            totalCleaned += cleanupLogFiles()

            // Clean up temporary files
            totalCleaned += cleanupTemporaryFiles()

            // Optimize database
            optimizeDatabase()

            logger.d("CleanupWorker completed. Total items cleaned: $totalCleaned")
            Result.success(workDataOf("items_cleaned" to totalCleaned))

        } catch (e: Exception) {
            logger.e("CleanupWorker failed", e)
            Result.failure()
        }
    }

    private suspend fun cleanupOldSensorData(): Int {
        logger.d("Cleaning up old sensor data...")

        var cleaned = 0

        try {
            // Get retention period from preferences (default: 30 days)
            val retentionDays = preferences.getSensorDataRetentionDays()
            val cutoffTime = System.currentTimeMillis() - (retentionDays * 24 * 60 * 60 * 1000L)

            // Delete old sensor data
            cleaned = sensorRepository.deleteSensorDataOlderThan(cutoffTime)

            // Delete synced data older than retention period
            val syncedRetentionDays = preferences.getSyncedDataRetentionDays()
            val syncedCutoffTime = System.currentTimeMillis() - (syncedRetentionDays * 24 * 60 * 60 * 1000L)
            cleaned += sensorRepository.deleteOldSyncedData(syncedCutoffTime)

            logger.d("Cleaned $cleaned old sensor data records")

        } catch (e: Exception) {
            logger.e("Error cleaning up sensor data", e)
        }

        return cleaned
    }

    private suspend fun cleanupOldAnalysisResults(): Int {
        logger.d("Cleaning up old analysis results...")

        var cleaned = 0

        try {
            // Get retention period for analysis results (default: 90 days)
            val retentionDays = preferences.getAnalysisDataRetentionDays()
            val cutoffTime = System.currentTimeMillis() - (retentionDays * 24 * 60 * 60 * 1000L)

            // Delete old analysis results
            cleaned = plantAnalysisRepository.deleteAnalysesOlderThan(cutoffTime)

            // Keep only the most recent analysis per plant
            cleaned += plantAnalysisRepository.keepOnlyLatestAnalysisPerPlant()

            logger.d("Cleaned $cleaned old analysis results")

        } catch (e: Exception) {
            logger.e("Error cleaning up analysis results", e)
        }

        return cleaned
    }

    private suspend fun cleanupCacheFiles(): Int {
        logger.d("Cleaning up cache files...")

        var cleaned = 0

        try {
            // Clean image cache
            cleaned += fileManager.cleanImageCache(maxAgeDays = 7, maxSizeMB = 100)

            // Clean thumbnail cache
            cleaned += fileManager.cleanThumbnailCache(maxAgeDays = 3, maxSizeMB = 50)

            // Clean network cache
            cleaned += fileManager.cleanNetworkCache(maxAgeDays = 1)

            logger.d("Cleaned $cleaned cache files")

        } catch (e: Exception) {
            logger.e("Error cleaning up cache files", e)
        }

        return cleaned
    }

    private suspend fun cleanupLogFiles(): Int {
        logger.d("Cleaning up log files...")

        var cleaned = 0

        try {
            val logDir = File(applicationContext.filesDir, "logs")
            if (!logDir.exists()) {
                return 0
            }

            val maxLogFiles = 10
            val maxLogAgeDays = 30

            logDir.listFiles()?.let { files ->
                val logFiles = files
                    .filter { it.name.endsWith(".log") }
                    .sortedByDescending { it.lastModified() }

                // Delete old log files
                val cutoffTime = System.currentTimeMillis() - (maxLogAgeDays * 24 * 60 * 60 * 1000L)
                logFiles.forEach { logFile ->
                    if (logFile.lastModified() < cutoffTime) {
                        if (logFile.delete()) {
                            cleaned++
                        }
                    }
                }

                // Keep only the most recent log files
                logFiles.forEachIndexed { index, logFile ->
                    if (index >= maxLogFiles && logFile.lastModified() < cutoffTime) {
                        if (logFile.delete()) {
                            cleaned++
                        }
                    }
                }
            }

            logger.d("Cleaned $cleaned log files")

        } catch (e: Exception) {
            logger.e("Error cleaning up log files", e)
        }

        return cleaned
    }

    private suspend fun cleanupTemporaryFiles(): Int {
        logger.d("Cleaning up temporary files...")

        var cleaned = 0

        try {
            val tempDir = File(applicationContext.cacheDir, "temp")
            if (tempDir.exists()) {
                tempDir.listFiles()?.forEach { file ->
                    if (file.delete()) {
                        cleaned++
                    }
                }
            }

            // Clean download cache
            val downloadDir = File(applicationContext.cacheDir, "downloads")
            if (downloadDir.exists()) {
                val cutoffTime = System.currentTimeMillis() - (24 * 60 * 60 * 1000L) // 24 hours
                downloadDir.listFiles()?.forEach { file ->
                    if (file.lastModified() < cutoffTime && file.delete()) {
                        cleaned++
                    }
                }
            }

            logger.d("Cleaned $cleaned temporary files")

        } catch (e: Exception) {
            logger.e("Error cleaning up temporary files", e)
        }

        return cleaned
    }

    private suspend fun optimizeDatabase() {
        logger.d("Optimizing database...")

        try {
            // VACUUM the database to reclaim space
            sensorRepository.optimizeDatabase()
            plantAnalysisRepository.optimizeDatabase()

            // Update statistics
            sensorRepository.updateDatabaseStats()
            plantAnalysisRepository.updateDatabaseStats()

            logger.d("Database optimization completed")

        } catch (e: Exception) {
            logger.e("Error optimizing database", e)
        }
    }
}