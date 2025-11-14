package com.cannaai.pro.work

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.cannaai.pro.data.local.preferences.AppPreferences
import com.cannaai.pro.utils.Logger
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CannaAIWorkManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val preferences: AppPreferences,
    private val logger: Logger
) {
    private val workManager = WorkManager.getInstance(context)

    companion object {
        private const val TAG = "CannaAIWorkManager"

        // Work tags
        const val SENSOR_MONITORING_TAG = "sensor_monitoring"
        const val PLANT_HEALTH_TAG = "plant_health"
        const val DATA_SYNC_TAG = "data_sync"
        const val CLEANUP_TAG = "cleanup"

        // Unique work names
        private const val SENSOR_MONITORING_WORK = "sensor_monitoring_work"
        private const val PLANT_HEALTH_WORK = "plant_health_work"
        private const val DATA_SYNC_WORK = "data_sync_work"
        private const val CLEANUP_WORK = "cleanup_work"
    }

    /**
     * Initialize and schedule all periodic background work
     */
    suspend fun initializePeriodicWork() {
        logger.d("Initializing periodic background work...")

        try {
            // Check if work is enabled
            val isBackgroundWorkEnabled = preferences.isBackgroundWorkEnabled().first()
            if (!isBackgroundWorkEnabled) {
                logger.d("Background work is disabled")
                return
            }

            // Schedule sensor monitoring
            scheduleSensorMonitoring()

            // Schedule plant health checks
            schedulePlantHealthChecks()

            // Schedule data synchronization
            scheduleDataSync()

            // Schedule periodic cleanup
            schedulePeriodicCleanup()

            logger.d("Periodic background work initialized successfully")

        } catch (e: Exception) {
            logger.e("Error initializing periodic work", e)
        }
    }

    /**
     * Schedule sensor monitoring work
     */
    fun scheduleSensorMonitoring() {
        try {
            val workRequest = SensorMonitoringWorker.createPeriodicWorkRequest()

            workManager.enqueueUniquePeriodicWork(
                SENSOR_MONITORING_WORK,
                ExistingPeriodicWorkPolicy.UPDATE, // Keep existing if running, update if different
                workRequest
            )

            logger.d("Sensor monitoring work scheduled")

        } catch (e: Exception) {
            logger.e("Error scheduling sensor monitoring work", e)
        }
    }

    /**
     * Schedule plant health check work
     */
    fun schedulePlantHealthChecks() {
        try {
            val workRequest = PlantHealthCheckWorker.createPeriodicWorkRequest()

            workManager.enqueueUniquePeriodicWork(
                PLANT_HEALTH_WORK,
                ExistingPeriodicWorkPolicy.UPDATE,
                workRequest
            )

            logger.d("Plant health check work scheduled")

        } catch (e: Exception) {
            logger.e("Error scheduling plant health check work", e)
        }
    }

    /**
     * Schedule data synchronization work
     */
    fun scheduleDataSync() {
        try {
            val workRequest = DataSyncWorker.createPeriodicWorkRequest()

            workManager.enqueueUniquePeriodicWork(
                DATA_SYNC_WORK,
                ExistingPeriodicWorkPolicy.UPDATE,
                workRequest
            )

            logger.d("Data sync work scheduled")

        } catch (e: Exception) {
            logger.e("Error scheduling data sync work", e)
        }
    }

    /**
     * Schedule periodic cleanup work
     */
    fun schedulePeriodicCleanup() {
        try {
            val workRequest = PeriodicWorkRequestBuilder<CleanupWorker>(
                repeatInterval = 1, // Run daily
                repeatIntervalTimeUnit = TimeUnit.DAYS,
                flexTimeInterval = 2, // Flex window of 2 hours
                flexTimeIntervalUnit = TimeUnit.HOURS
            )
                .setConstraints(
                    Constraints.Builder()
                        .setRequiresCharging(true) // Run when device is charging
                        .setRequiresBatteryNotLow(true)
                        .build()
                )
                .addTag(CLEANUP_TAG)
                .build()

            workManager.enqueueUniquePeriodicWork(
                CLEANUP_WORK,
                ExistingPeriodicWorkPolicy.UPDATE,
                workRequest
            )

            logger.d("Periodic cleanup work scheduled")

        } catch (e: Exception) {
            logger.e("Error scheduling cleanup work", e)
        }
    }

    /**
     * Trigger immediate sensor monitoring
     */
    fun triggerImmediateSensorMonitoring() {
        try {
            val workRequest = SensorMonitoringWorker.createOneTimeWorkRequest()

            workManager.enqueueUniqueWork(
                "immediate_sensor_monitoring",
                ExistingWorkPolicy.REPLACE,
                workRequest
            )

            logger.d("Immediate sensor monitoring triggered")

        } catch (e: Exception) {
            logger.e("Error triggering immediate sensor monitoring", e)
        }
    }

    /**
     * Trigger immediate plant health check for specific plant
     */
    fun triggerPlantHealthCheck(plantId: String) {
        try {
            val workRequest = PlantHealthCheckWorker.createOneTimeWorkRequest(plantId)

            workManager.enqueueUniqueWork(
                "plant_health_check_$plantId",
                ExistingWorkPolicy.REPLACE,
                workRequest
            )

            logger.d("Plant health check triggered for plant: $plantId")

        } catch (e: Exception) {
            logger.e("Error triggering plant health check", e)
        }
    }

    /**
     * Trigger immediate data sync
     */
    fun triggerImmediateDataSync(syncType: String = DataSyncWorker.SYNC_TYPE_FULL_SYNC) {
        try {
            val workRequest = DataSyncWorker.createOneTimeWorkRequest(syncType)

            workManager.enqueueUniqueWork(
                "immediate_data_sync",
                ExistingWorkPolicy.REPLACE,
                workRequest
            )

            logger.d("Immediate data sync triggered: $syncType")

        } catch (e: Exception) {
            logger.e("Error triggering immediate data sync", e)
        }
    }

    /**
     * Cancel all background work
     */
    fun cancelAllWork() {
        try {
            workManager.cancelAllWork()
            logger.d("All background work cancelled")

        } catch (e: Exception) {
            logger.e("Error cancelling all work", e)
        }
    }

    /**
     * Cancel work by tag
     */
    fun cancelWorkByTag(tag: String) {
        try {
            workManager.cancelAllWorkByTag(tag)
            logger.d("Work cancelled by tag: $tag")

        } catch (e: Exception) {
            logger.e("Error cancelling work by tag: $tag", e)
        }
    }

    /**
     * Cancel specific unique work
     */
    fun cancelUniqueWork(uniqueWorkName: String) {
        try {
            workManager.cancelUniqueWork(uniqueWorkName)
            logger.d("Unique work cancelled: $uniqueWorkName")

        } catch (e: Exception) {
            logger.e("Error cancelling unique work: $uniqueWorkName", e)
        }
    }

    /**
     * Get work status information
     */
    suspend fun getWorkStatus(): WorkStatusInfo {
        return try {
            val sensorWork = workManager.getWorkInfosForUniqueWork(SENSOR_MONITORING_WORK).first()
            val plantWork = workManager.getWorkInfosForUniqueWork(PLANT_HEALTH_WORK).first()
            val syncWork = workManager.getWorkInfosForUniqueWork(DATA_SYNC_WORK).first()
            val cleanupWork = workManager.getWorkInfosForUniqueWork(CLEANUP_WORK).first()

            WorkStatusInfo(
                sensorMonitoringWork = sensorWork.map { WorkInfoWrapper(it) },
                plantHealthWork = plantWork.map { WorkInfoWrapper(it) },
                dataSyncWork = syncWork.map { WorkInfoWrapper(it) },
                cleanupWork = cleanupWork.map { WorkInfoWrapper(it) }
            )

        } catch (e: Exception) {
            logger.e("Error getting work status", e)
            WorkStatusInfo()
        }
    }

    /**
     * Check if any work is currently running
     */
    suspend fun isAnyWorkRunning(): Boolean {
        return try {
            val runningWork = workManager.getWorkInfosByState(WorkInfo.State.RUNNING).first()
            runningWork.isNotEmpty()

        } catch (e: Exception) {
            logger.e("Error checking running work", e)
            false
        }
    }

    /**
     * Prune finished work to free up resources
     */
    fun pruneWork() {
        try {
            workManager.pruneWork()
            logger.d("Work pruned successfully")

        } catch (e: Exception) {
            logger.e("Error pruning work", e)
        }
    }

    /**
     * Enable or disable background work
     */
    suspend fun setBackgroundWorkEnabled(enabled: Boolean) {
        try {
            preferences.setBackgroundWorkEnabled(enabled)

            if (enabled) {
                initializePeriodicWork()
            } else {
                cancelAllWork()
            }

            logger.d("Background work ${if (enabled) "enabled" else "disabled"}")

        } catch (e: Exception) {
            logger.e("Error setting background work enabled", e)
        }
    }
}

/**
 * Data class to hold work status information
 */
data class WorkStatusInfo(
    val sensorMonitoringWork: List<WorkInfoWrapper> = emptyList(),
    val plantHealthWork: List<WorkInfoWrapper> = emptyList(),
    val dataSyncWork: List<WorkInfoWrapper> = emptyList(),
    val cleanupWork: List<WorkInfoWrapper> = emptyList()
)

/**
 * Wrapper for WorkInfo to make it serializable and easier to work with
 */
data class WorkInfoWrapper(
    val id: String,
    val state: WorkInfo.State,
    val tags: Set<String>,
    val progress: Data,
    val outputData: Data,
    val runAttemptCount: Int
) {
    constructor(workInfo: WorkInfo) : this(
        id = workInfo.id.toString(),
        state = workInfo.state,
        tags = workInfo.tags,
        progress = workInfo.progress,
        outputData = workInfo.outputData,
        runAttemptCount = workInfo.runAttemptCount
    )

    val isRunning: Boolean get() = state == WorkInfo.State.RUNNING
    val isEnqueued: Boolean get() = state == WorkInfo.State.ENQUEUED
    val isSucceeded: Boolean get() = state == WorkInfo.State.SUCCEEDED
    val isFailed: Boolean get() = state == WorkInfo.State.FAILED
    val isCancelled: Boolean get() = state == WorkInfo.State.CANCELLED
}