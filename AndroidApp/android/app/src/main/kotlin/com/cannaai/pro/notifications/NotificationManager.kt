package com.cannaai.pro.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.Person
import androidx.core.content.FileProvider
import com.cannaai.pro.MainActivity
import com.cannaai.pro.R
import com.cannaai.pro.data.local.preferences.AppPreferences
import com.cannaai.pro.utils.Logger
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import java.io.File
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CannaAINotificationManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val preferences: AppPreferences,
    private val logger: Logger
) {
    private val notificationManager = NotificationManagerCompat.from(context)

    companion object {
        private const val TAG = "CannaAINotificationManager"

        // Notification Channels
        const val CHANNEL_ALERTS = "alerts"
        const val CHANNEL_REMINDERS = "reminders"
        const val CHANNEL_PLANT_CARE = "plant_care"
        const val CHANNEL_SENSOR_ALERTS = "sensor_alerts"
        const val CHANNEL_ANALYSIS_RESULTS = "analysis_results"
        const val CHANNEL_SYSTEM = "system"

        // Notification IDs
        const val ID_ALERT_BASE = 2000
        const val ID_REMINDER_BASE = 3000
        const val ID_PLANT_CARE_BASE = 4000
        const val ID_SENSOR_ALERT_BASE = 5000
        const val ID_ANALYSIS_RESULTS_BASE = 6000
        const val ID_SYSTEM_BASE = 7000

        // Pending Intent Request Codes
        const val REQUEST_CODE_MAIN_ACTIVITY = 1000
        const val REQUEST_CODE_PLANT_DETAILS = 1001
        const val REQUEST_CODE_SENSOR_SETTINGS = 1002
        const val REQUEST_CODE_CAMERA = 1003
    }

    init {
        createNotificationChannels()
    }

    /**
     * Create all notification channels for Android 8.0+
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channels = listOf(
                NotificationChannel(
                    CHANNEL_ALERTS,
                    "Alerts",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Critical alerts and warnings"
                    enableLights(true)
                    enableVibration(true)
                    setShowBadge(true)
                },

                NotificationChannel(
                    CHANNEL_REMINDERS,
                    "Reminders",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Plant care reminders and notifications"
                    enableLights(true)
                    enableVibration(true)
                    setShowBadge(true)
                },

                NotificationChannel(
                    CHANNEL_PLANT_CARE,
                    "Plant Care",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Plant health updates and care recommendations"
                    enableLights(false)
                    enableVibration(false)
                    setShowBadge(true)
                },

                NotificationChannel(
                    CHANNEL_SENSOR_ALERTS,
                    "Sensor Alerts",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Sensor threshold alerts and warnings"
                    enableLights(true)
                    enableVibration(true)
                    setShowBadge(true)
                },

                NotificationChannel(
                    CHANNEL_ANALYSIS_RESULTS,
                    "Analysis Results",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Plant analysis results and recommendations"
                    enableLights(false)
                    enableVibration(false)
                    setShowBadge(true)
                },

                NotificationChannel(
                    CHANNEL_SYSTEM,
                    "System",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "System notifications and updates"
                    enableLights(false)
                    enableVibration(false)
                    setShowBadge(false)
                }
            )

            notificationManager.createNotificationChannels(channels)
            logger.d("Notification channels created")
        }
    }

    /**
     * Check if notification permissions are granted
     */
    fun areNotificationsEnabled(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ActivityCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            notificationManager.areNotificationsEnabled()
        }
    }

    /**
     * Show sensor alert notification
     */
    fun showSensorAlert(
        sensorType: String,
        value: Double,
        threshold: Double,
        isHigh: Boolean,
        plantName: String? = null
    ) {
        if (!areNotificationsEnabled() || !preferences.isSensorAlertsEnabled().first()) {
            return
        }

        try {
            val title = "Sensor Alert: $sensorType"
            val message = when {
                plantName != null -> {
                    if (isHigh) {
                        "$plantName: $sensorType too high ($value, max: $threshold)"
                    } else {
                        "$plantName: $sensorType too low ($value, min: $threshold)"
                    }
                }
                else -> {
                    if (isHigh) {
                        "$sensorType too high: $value (threshold: $threshold)"
                    } else {
                        "$sensorType too low: $value (threshold: $threshold)"
                    }
                }
            }

            val notification = NotificationCompat.Builder(context, CHANNEL_SENSOR_ALERTS)
                .setSmallIcon(R.drawable.ic_sensor_alert)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setContentIntent(createMainActivityIntent())
                .addAction(
                    R.drawable.ic_settings,
                    "Settings",
                    createSensorSettingsIntent()
                )
                .build()

            notificationManager.notify(
                ID_SENSOR_ALERT_BASE + sensorType.hashCode(),
                notification
            )

            logger.d("Sensor alert notification shown: $title")

        } catch (e: Exception) {
            logger.e("Error showing sensor alert", e)
        }
    }

    /**
     * Show plant health notification
     */
    fun showPlantHealthNotification(
        plantName: String,
        healthScore: Int,
        analysis: String,
        plantId: String
    ) {
        if (!areNotificationsEnabled() || !preferences.isPlantHealthNotificationsEnabled().first()) {
            return
        }

        try {
            val title = when {
                healthScore < 30 -> "Critical: $plantName"
                healthScore < 50 -> "Warning: $plantName"
                healthScore < 70 -> "Attention: $plantName"
                else -> "Update: $plantName"
            }

            val priority = when {
                healthScore < 30 -> NotificationCompat.PRIORITY_HIGH
                healthScore < 50 -> NotificationCompat.PRIORITY_DEFAULT
                else -> NotificationCompat.PRIORITY_LOW
            }

            val notification = NotificationCompat.Builder(context, CHANNEL_PLANT_CARE)
                .setSmallIcon(R.drawable.ic_plant_health)
                .setContentTitle(title)
                .setContentText("Health score: $healthScore%")
                .setStyle(NotificationCompat.BigTextStyle().bigText(analysis))
                .setPriority(priority)
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .setAutoCancel(true)
                .setContentIntent(createPlantDetailsIntent(plantId))
                .addAction(
                    R.drawable.ic_camera,
                    "Analyze",
                    createCameraIntent()
                )
                .build()

            notificationManager.notify(
                ID_PLANT_CARE_BASE + plantId.hashCode(),
                notification
            )

            logger.d("Plant health notification shown: $title")

        } catch (e: Exception) {
            logger.e("Error showing plant health notification", e)
        }
    }

    /**
     * Show analysis results notification with image
     */
    fun showAnalysisResultsNotification(
        plantName: String,
        analysisResults: String,
        imagePath: String? = null,
        plantId: String
    ) {
        if (!areNotificationsEnabled() || !preferences.isAnalysisResultsEnabled().first()) {
            return
        }

        try {
            val builder = NotificationCompat.Builder(context, CHANNEL_ANALYSIS_RESULTS)
                .setSmallIcon(R.drawable.ic_analysis)
                .setContentTitle("Analysis Complete: $plantName")
                .setContentText("Tap to view detailed results")
                .setStyle(NotificationCompat.BigTextStyle().bigText(analysisResults))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .setAutoCancel(true)
                .setContentIntent(createPlantDetailsIntent(plantId))

            // Add image if provided
            imagePath?.let { path ->
                val imageFile = File(path)
                if (imageFile.exists()) {
                    try {
                        val imageUri = FileProvider.getUriForFile(
                            context,
                            "${context.packageName}.fileprovider",
                            imageFile
                        )

                        builder.setStyle(
                            NotificationCompat.BigPictureStyle()
                                .bigPicture(getBitmapFromPath(path))
                                .bigLargeIcon(null as Bitmap?)
                        )

                        builder.addAction(
                            R.drawable.ic_share,
                            "Share",
                            createShareIntent(path)
                        )

                    } catch (e: Exception) {
                        logger.e("Error adding image to notification", e)
                    }
                }
            }

            val notification = builder.build()
            notificationManager.notify(
                ID_ANALYSIS_RESULTS_BASE + plantId.hashCode(),
                notification
            )

            logger.d("Analysis results notification shown for: $plantName")

        } catch (e: Exception) {
            logger.e("Error showing analysis results notification", e)
        }
    }

    /**
     * Show plant care reminder
     */
    fun showPlantCareReminder(
        reminderType: String,
        plantName: String,
        instructions: String,
        plantId: String
    ) {
        if (!areNotificationsEnabled() || !preferences.isRemindersEnabled().first()) {
            return
        }

        try {
            val title = "Reminder: $reminderType"
            val message = "$plantName: $instructions"

            val notification = NotificationCompat.Builder(context, CHANNEL_REMINDERS)
                .setSmallIcon(R.drawable.ic_reminder)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setAutoCancel(true)
                .setWhen(System.currentTimeMillis())
                .setContentIntent(createPlantDetailsIntent(plantId))
                .addAction(
                    R.drawable.ic_check,
                    "Done",
                    createMarkDoneIntent(reminderType, plantId)
                )
                .build()

            notificationManager.notify(
                ID_REMINDER_BASE + (reminderType + plantId).hashCode(),
                notification
            )

            logger.d("Plant care reminder shown: $title")

        } catch (e: Exception) {
            logger.e("Error showing plant care reminder", e)
        }
    }

    /**
     * Show system notification
     */
    fun showSystemNotification(
        title: String,
        message: String,
        priority: Int = NotificationCompat.PRIORITY_LOW
    ) {
        if (!areNotificationsEnabled()) {
            return
        }

        try {
            val notification = NotificationCompat.Builder(context, CHANNEL_SYSTEM)
                .setSmallIcon(R.drawable.ic_system)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(priority)
                .setCategory(NotificationCompat.CATEGORY_SYSTEM)
                .setAutoCancel(true)
                .setContentIntent(createMainActivityIntent())
                .build()

            notificationManager.notify(
                ID_SYSTEM_BASE + title.hashCode(),
                notification
            )

            logger.d("System notification shown: $title")

        } catch (e: Exception) {
            logger.e("Error showing system notification", e)
        }
    }

    /**
     * Show progress notification for long-running operations
     */
    fun showProgressNotification(
        title: String,
        content: String,
        progress: Int,
        maxProgress: Int,
        notificationId: Int
    ) {
        if (!areNotificationsEnabled()) {
            return
        }

        try {
            val notification = NotificationCompat.Builder(context, CHANNEL_SYSTEM)
                .setSmallIcon(R.drawable.ic_system)
                .setContentTitle(title)
                .setContentText(content)
                .setProgress(maxProgress, progress, false)
                .setOngoing(true)
                .setCategory(NotificationCompat.CATEGORY_PROGRESS)
                .build()

            notificationManager.notify(notificationId, notification)

        } catch (e: Exception) {
            logger.e("Error showing progress notification", e)
        }
    }

    /**
     * Cancel notification
     */
    fun cancelNotification(notificationId: Int) {
        try {
            notificationManager.cancel(notificationId)
            logger.d("Notification cancelled: $notificationId")

        } catch (e: Exception) {
            logger.e("Error cancelling notification", e)
        }
    }

    /**
     * Cancel all notifications
     */
    fun cancelAllNotifications() {
        try {
            notificationManager.cancelAll()
            logger.d("All notifications cancelled")

        } catch (e: Exception) {
            logger.e("Error cancelling all notifications", e)
        }
    }

    /**
     * Cancel notifications by channel/tag
     */
    fun cancelNotificationsByChannel(channel: String) {
        // This is a workaround since there's no direct way to cancel by channel
        // We would need to track active notification IDs in our preferences
        logger.d("Cancel notifications by channel not directly supported, consider tracking active notifications")
    }

    // Private helper methods

    private fun createMainActivityIntent(): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }

        return PendingIntent.getActivity(
            context,
            REQUEST_CODE_MAIN_ACTIVITY,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun createPlantDetailsIntent(plantId: String): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("plant_id", plantId)
            putExtra("screen", "plant_details")
        }

        return PendingIntent.getActivity(
            context,
            REQUEST_CODE_PLANT_DETAILS + plantId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun createSensorSettingsIntent(): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("screen", "sensor_settings")
        }

        return PendingIntent.getActivity(
            context,
            REQUEST_CODE_SENSOR_SETTINGS,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun createCameraIntent(): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("screen", "camera")
        }

        return PendingIntent.getActivity(
            context,
            REQUEST_CODE_CAMERA,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun createShareIntent(imagePath: String): PendingIntent {
        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "image/jpeg"
            putExtra(Intent.EXTRA_STREAM, FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                File(imagePath)
            ))
            putExtra(Intent.EXTRA_TEXT, "Plant analysis from CannaAI Pro")
            flags = Intent.FLAG_GRANT_READ_URI_PERMISSION
        }

        val chooserIntent = Intent.createChooser(shareIntent, "Share analysis result")

        return PendingIntent.getActivity(
            context,
            System.currentTimeMillis().toInt(),
            chooserIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun createMarkDoneIntent(reminderType: String, plantId: String): PendingIntent {
        // This would trigger a broadcast receiver to mark the reminder as done
        val intent = Intent(context, ReminderActionReceiver::class.java).apply {
            action = "ACTION_REMINDER_DONE"
            putExtra("reminder_type", reminderType)
            putExtra("plant_id", plantId)
        }

        return PendingIntent.getBroadcast(
            context,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun getBitmapFromPath(path: String): Bitmap? {
        return try {
            BitmapFactory.decodeFile(path)
        } catch (e: Exception) {
            logger.e("Error loading bitmap from path: $path", e)
            null
        }
    }
}