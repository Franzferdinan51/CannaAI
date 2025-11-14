package com.cannaai.pro.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.cannaai.pro.R
import com.cannaai.pro.data.repository.PlantAnalysisRepository
import com.cannaai.pro.utils.Logger
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class ReminderActionReceiver : BroadcastReceiver() {

    @Inject
    lateinit var notificationManager: CannaAINotificationManager

    @Inject
    lateinit var plantAnalysisRepository: PlantAnalysisRepository

    @Inject
    lateinit var logger: Logger

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action

        when (action) {
            ScheduledNotificationsManager.ACTION_REMINDER -> {
                handleReminderNotification(context, intent)
            }
            "ACTION_REMINDER_DONE" -> {
                handleReminderDone(context, intent)
            }
            else -> {
                logger.w("Unknown action received: $action")
            }
        }
    }

    private fun handleReminderNotification(context: Context, intent: Intent) {
        try {
            val reminderType = intent.getStringExtra(ScheduledNotificationsManager.EXTRA_REMINDER_TYPE)
            val plantId = intent.getStringExtra(ScheduledNotificationsManager.EXTRA_PLANT_ID)
            val plantName = intent.getStringExtra(ScheduledNotificationsManager.EXTRA_PLANT_NAME) ?: "Unknown Plant"
            val instructions = intent.getStringExtra(ScheduledNotificationsManager.EXTRA_INSTRUCTIONS) ?: "Time to check your plant"

            logger.d("Handling reminder notification: $reminderType for plant: $plantName")

            // Show the notification
            when (reminderType) {
                ScheduledNotificationsManager.REMINDER_WATERING -> {
                    notificationManager.showPlantCareReminder(
                        reminderType = "Watering",
                        plantName = plantName,
                        instructions = instructions,
                        plantId = plantId ?: ""
                    )
                }
                ScheduledNotificationsManager.REMINDER_FERTILIZING -> {
                    notificationManager.showPlantCareReminder(
                        reminderType = "Fertilizing",
                        plantName = plantName,
                        instructions = instructions,
                        plantId = plantId ?: ""
                    )
                }
                ScheduledNotificationsManager.REMINDER_PRUNING -> {
                    notificationManager.showPlantCareReminder(
                        reminderType = "Pruning",
                        plantName = plantName,
                        instructions = instructions,
                        plantId = plantId ?: ""
                    )
                }
                ScheduledNotificationsManager.REMINDER_CHECKING -> {
                    notificationManager.showPlantCareReminder(
                        reminderType = "Health Check",
                        plantName = plantName,
                        instructions = instructions,
                        plantId = plantId ?: ""
                    )
                }
                ScheduledNotificationsManager.REMINDER_HARVESTING -> {
                    notificationManager.showPlantCareReminder(
                        reminderType = "Harvesting",
                        plantName = plantName,
                        instructions = instructions,
                        plantId = plantId ?: ""
                    )
                }
                else -> {
                    logger.w("Unknown reminder type: $reminderType")
                }
            }

            // Log the reminder event
            logReminderEvent(reminderType, plantId, plantName)

        } catch (e: Exception) {
            logger.e("Error handling reminder notification", e)
        }
    }

    private fun handleReminderDone(context: Context, intent: Intent) {
        try {
            val reminderType = intent.getStringExtra("reminder_type")
            val plantId = intent.getStringExtra("plant_id")

            logger.d("Marking reminder as done: $reminderType for plant: $plantId")

            // Update the reminder status in the database
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    // Mark the reminder as completed in the database
                    plantAnalysisRepository.markReminderCompleted(
                        plantId = plantId ?: "",
                        reminderType = reminderType ?: "",
                        timestamp = System.currentTimeMillis()
                    )

                    // Show a confirmation notification
                    showReminderCompletionNotification(context, reminderType, plantId)

                    logger.d("Reminder marked as completed: $reminderType")

                } catch (e: Exception) {
                    logger.e("Error marking reminder as done", e)
                }
            }

        } catch (e: Exception) {
            logger.e("Error handling reminder done action", e)
        }
    }

    private fun logReminderEvent(reminderType: String?, plantId: String?, plantName: String) {
        try {
            // Log analytics event for reminder notification
            // This could be integrated with Firebase Analytics or other analytics services
            logger.d("Reminder event logged: $reminderType, plant: $plantName, id: $plantId")

        } catch (e: Exception) {
            logger.e("Error logging reminder event", e)
        }
    }

    private fun showReminderCompletionNotification(context: Context, reminderType: String?, plantId: String?) {
        try {
            // Create a simple notification to confirm the reminder was marked as done
            val channelId = "reminder_confirmation"

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    channelId,
                    "Reminder Confirmation",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "Confirms when reminders are marked as done"
                    setShowBadge(false)
                    enableVibration(false)
                }

                val notificationManager = context.getSystemService(NotificationManager::class.java)
                notificationManager.createNotificationChannel(channel)
            }

            val notification = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.ic_check)
                .setContentTitle("Reminder Completed")
                .setContentText("$reminderType reminder marked as done")
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setAutoCancel(true)
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .build()

            with(NotificationManagerCompat.from(context)) {
                notify(System.currentTimeMillis().toInt(), notification)
            }

        } catch (e: Exception) {
            logger.e("Error showing reminder completion notification", e)
        }
    }
}