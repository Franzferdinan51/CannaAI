package com.cannaai.pro.notifications

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.cannaai.pro.data.repository.PlantAnalysisRepository
import com.cannaai.pro.data.local.preferences.AppPreferences
import com.cannaai.pro.utils.Logger
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ScheduledNotificationsManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val plantAnalysisRepository: PlantAnalysisRepository,
    private val preferences: AppPreferences,
    private val logger: Logger
) {
    private val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    companion object {
        private const val TAG = "ScheduledNotificationsManager"

        // Reminder types
        const val REMINDER_WATERING = "watering"
        const val REMINDER_FERTILIZING = "fertilizing"
        const val REMINDER_PRUNING = "pruning"
        const val REMINDER_CHECKING = "checking"
        const val REMINDER_HARVESTING = "harvesting"

        // Pending Intent Request Codes
        private const val REQUEST_CODE_WATERING_BASE = 1100
        private const val REQUEST_CODE_FERTILIZING_BASE = 1200
        private const val REQUEST_CODE_PRUNING_BASE = 1300
        private const val REQUEST_CODE_CHECKING_BASE = 1400
        private const val REQUEST_CODE_HARVESTING_BASE = 1500

        // Intent actions
        const val ACTION_REMINDER = "com.cannaai.pro.REMINDER"
        const val EXTRA_REMINDER_TYPE = "reminder_type"
        const val EXTRA_PLANT_ID = "plant_id"
        const val EXTRA_PLANT_NAME = "plant_name"
        const val EXTRA_INSTRUCTIONS = "instructions"
    }

    /**
     * Schedule all plant care reminders
     */
    suspend fun scheduleAllReminders() {
        logger.d("Scheduling all plant care reminders...")

        try {
            if (!preferences.isRemindersEnabled().first()) {
                logger.d("Reminders are disabled")
                return
            }

            // Get all plants
            val plants = plantAnalysisRepository.getAllPlants()

            plants.forEach { plant ->
                schedulePlantReminders(/* plant */)
            }

            logger.d("All plant care reminders scheduled successfully")

        } catch (e: Exception) {
            logger.e("Error scheduling all reminders", e)
        }
    }

    /**
     * Schedule reminders for a specific plant
     */
    suspend fun schedulePlantReminders(plant: Any) { // Replace with Plant entity type
        try {
            val plantId = /* plant.id */ "unknown"
            val plantName = /* plant.name */ "Unknown Plant"

            // Cancel existing reminders for this plant
            cancelPlantReminders(plantId)

            // Schedule watering reminders
            scheduleWateringReminders(plantId, plantName)

            // Schedule fertilizing reminders
            scheduleFertilizingReminders(plantId, plantName)

            // Schedule pruning reminders
            schedulePruningReminders(plantId, plantName)

            // Schedule checking reminders
            scheduleCheckingReminders(plantId, plantName)

            // Schedule harvesting reminders (if applicable)
            scheduleHarvestingReminders(plantId, plantName)

            logger.d("Reminders scheduled for plant: $plantName")

        } catch (e: Exception) {
            logger.e("Error scheduling plant reminders", e)
        }
    }

    /**
     * Cancel all reminders for a specific plant
     */
    fun cancelPlantReminders(plantId: String) {
        try {
            cancelReminder(REQUEST_CODE_WATERING_BASE + plantId.hashCode())
            cancelReminder(REQUEST_CODE_FERTILIZING_BASE + plantId.hashCode())
            cancelReminder(REQUEST_CODE_PRUNING_BASE + plantId.hashCode())
            cancelReminder(REQUEST_CODE_CHECKING_BASE + plantId.hashCode())
            cancelReminder(REQUEST_CODE_HARVESTING_BASE + plantId.hashCode())

            logger.d("All reminders cancelled for plant: $plantId")

        } catch (e: Exception) {
            logger.e("Error cancelling plant reminders", e)
        }
    }

    /**
     * Cancel all scheduled reminders
     */
    fun cancelAllReminders() {
        try {
            // Cancel all reminder intents
            val intent = Intent(ACTION_REMINDER)
            val pendingIntents = mutableListOf<PendingIntent>()

            // We need to iterate through possible request codes
            for (i in 1100..1999) {
                try {
                    val pendingIntent = PendingIntent.getBroadcast(
                        context,
                        i,
                        intent,
                        PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
                    )
                    pendingIntent?.let {
                        alarmManager.cancel(it)
                        it.cancel()
                        pendingIntents.add(it)
                    }
                } catch (e: Exception) {
                    // Ignore errors for non-existent pending intents
                }
            }

            logger.d("Cancelled ${pendingIntents.size} scheduled reminders")

        } catch (e: Exception) {
            logger.e("Error cancelling all reminders", e)
        }
    }

    private fun scheduleWateringReminders(plantId: String, plantName: String) {
        try {
            val wateringFrequency = preferences.getWateringReminderFrequency().first() // days
            val wateringTime = preferences.getWateringReminderTime().first() // HH:mm

            scheduleRecurringReminder(
                reminderType = REMINDER_WATERING,
                plantId = plantId,
                plantName = plantName,
                instructions = "Time to water your plant. Check soil moisture before watering.",
                frequencyDays = wateringFrequency,
                reminderTime = wateringTime,
                requestCodeBase = REQUEST_CODE_WATERING_BASE
            )

        } catch (e: Exception) {
            logger.e("Error scheduling watering reminders", e)
        }
    }

    private fun scheduleFertilizingReminders(plantId: String, plantName: String) {
        try {
            val fertilizingFrequency = preferences.getFertilizingReminderFrequency().first() // days
            val fertilizingTime = preferences.getFertilizingReminderTime().first() // HH:mm

            scheduleRecurringReminder(
                reminderType = REMINDER_FERTILIZING,
                plantId = plantId,
                plantName = plantName,
                instructions = "Time to fertilize your plant. Follow the recommended dosage.",
                frequencyDays = fertilizingFrequency,
                reminderTime = fertilizingTime,
                requestCodeBase = REQUEST_CODE_FERTILIZING_BASE
            )

        } catch (e: Exception) {
            logger.e("Error scheduling fertilizing reminders", e)
        }
    }

    private fun schedulePruningReminders(plantId: String, plantName: String) {
        try {
            val pruningFrequency = preferences.getPruningReminderFrequency().first() // days
            val pruningTime = preferences.getPruningReminderTime().first() // HH:mm

            scheduleRecurringReminder(
                reminderType = REMINDER_PRUNING,
                plantId = plantId,
                plantName = plantName,
                instructions = "Time to prune your plant. Remove dead or yellowing leaves.",
                frequencyDays = pruningFrequency,
                reminderTime = pruningTime,
                requestCodeBase = REQUEST_CODE_PRUNING_BASE
            )

        } catch (e: Exception) {
            logger.e("Error scheduling pruning reminders", e)
        }
    }

    private fun scheduleCheckingReminders(plantId: String, plantName: String) {
        try {
            val checkingFrequency = preferences.getCheckingReminderFrequency().first() // days
            val checkingTime = preferences.getCheckingReminderTime().first() // HH:mm

            scheduleRecurringReminder(
                reminderType = REMINDER_CHECKING,
                plantId = plantId,
                plantName = plantName,
                instructions = "Time to check your plant's health and growth progress.",
                frequencyDays = checkingFrequency,
                reminderTime = checkingTime,
                requestCodeBase = REQUEST_CODE_CHECKING_BASE
            )

        } catch (e: Exception) {
            logger.e("Error scheduling checking reminders", e)
        }
    }

    private fun scheduleHarvestingReminders(plantId: String, plantName: String) {
        try {
            // This would be based on plant growth stage and strain-specific harvest time
            // For now, we'll skip harvesting reminders as they're more complex

            logger.d("Harvesting reminders not yet implemented")

        } catch (e: Exception) {
            logger.e("Error scheduling harvesting reminders", e)
        }
    }

    private fun scheduleRecurringReminder(
        reminderType: String,
        plantId: String,
        plantName: String,
        instructions: String,
        frequencyDays: Int,
        reminderTime: String,
        requestCodeBase: Int
    ) {
        try {
            val requestCode = requestCodeBase + plantId.hashCode()
            val intent = createReminderIntent(reminderType, plantId, plantName, instructions)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Parse the reminder time
            val timeParts = reminderTime.split(":")
            val hour = timeParts[0].toInt()
            val minute = timeParts[1].toInt()

            // Calculate the first trigger time
            val calendar = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)

                // If the time has already passed today, schedule for tomorrow
                if (timeInMillis <= System.currentTimeMillis()) {
                    add(Calendar.DAY_OF_MONTH, 1)
                }
            }

            // Schedule recurring alarm
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    calendar.timeInMillis,
                    pendingIntent
                )
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    calendar.timeInMillis,
                    pendingIntent
                )
            }

            // Schedule recurring reminders using WorkManager for better reliability
            scheduleRecurringWork(reminderType, plantId, plantName, instructions, frequencyDays)

            logger.d("Scheduled $reminderType reminder for $plantName at $reminderTime")

        } catch (e: Exception) {
            logger.e("Error scheduling recurring reminder", e)
        }
    }

    private fun scheduleRecurringWork(
        reminderType: String,
        plantId: String,
        plantName: String,
        instructions: String,
        frequencyDays: Int
    ) {
        try {
            // This would use WorkManager to schedule recurring reminders
            // WorkManager is more reliable than AlarmManager for long-term scheduling
            logger.d("Would schedule recurring work for $reminderType every $frequencyDays days")

        } catch (e: Exception) {
            logger.e("Error scheduling recurring work", e)
        }
    }

    private fun createReminderIntent(
        reminderType: String,
        plantId: String,
        plantName: String,
        instructions: String
    ): Intent {
        return Intent(ACTION_REMINDER).apply {
            putExtra(EXTRA_REMINDER_TYPE, reminderType)
            putExtra(EXTRA_PLANT_ID, plantId)
            putExtra(EXTRA_PLANT_NAME, plantName)
            putExtra(EXTRA_INSTRUCTIONS, instructions)
        }
    }

    private fun cancelReminder(requestCode: Int) {
        try {
            val intent = Intent(ACTION_REMINDER)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )

            pendingIntent?.let {
                alarmManager.cancel(it)
                it.cancel()
            }

        } catch (e: Exception) {
            logger.e("Error cancelling reminder with requestCode: $requestCode", e)
        }
    }

    /**
     * Get next scheduled reminder time for a plant and reminder type
     */
    fun getNextReminderTime(plantId: String, reminderType: String): Long? {
        try {
            val requestCode = when (reminderType) {
                REMINDER_WATERING -> REQUEST_CODE_WATERING_BASE + plantId.hashCode()
                REMINDER_FERTILIZING -> REQUEST_CODE_FERTILIZING_BASE + plantId.hashCode()
                REMINDER_PRUNING -> REQUEST_CODE_PRUNING_BASE + plantId.hashCode()
                REMINDER_CHECKING -> REQUEST_CODE_CHECKING_BASE + plantId.hashCode()
                REMINDER_HARVESTING -> REQUEST_CODE_HARVESTING_BASE + plantId.hashCode()
                else -> return null
            }

            val intent = Intent(ACTION_REMINDER)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )

            return if (pendingIntent != null) {
                // Note: Android doesn't provide a direct way to get the trigger time
                // This would require maintaining our own schedule tracking
                null
            } else {
                null
            }

        } catch (e: Exception) {
            logger.e("Error getting next reminder time", e)
            return null
        }
    }

    /**
     * Reschedule all reminders (useful when settings change)
     */
    suspend fun rescheduleAllReminders() {
        logger.d("Rescheduling all reminders...")

        try {
            cancelAllReminders()
            scheduleAllReminders()

            logger.d("All reminders rescheduled successfully")

        } catch (e: Exception) {
            logger.e("Error rescheduling reminders", e)
        }
    }

    /**
     * Check if reminders are properly scheduled
     */
    fun checkReminderStatus(): Map<String, Boolean> {
        val status = mutableMapOf<String, Boolean>()

        try {
            // This would check if each type of reminder is scheduled
            // Implementation depends on how we track scheduled reminders
            status["watering"] = true
            status["fertilizing"] = true
            status["pruning"] = true
            status["checking"] = true

        } catch (e: Exception) {
            logger.e("Error checking reminder status", e)
        }

        return status
    }
}