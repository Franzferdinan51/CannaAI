package com.cannaai.pro.notifications

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.cannaai.pro.data.local.preferences.AppPreferences
import com.cannaai.pro.utils.Logger
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationPermissionManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val preferences: AppPreferences,
    private val logger: Logger
) {

    /**
     * Check if notifications are enabled
     */
    fun areNotificationsEnabled(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            // Before Android 13, notifications don't require runtime permission
            true
        }
    }

    /**
     * Check if we should show notification permission rationale
     */
    fun shouldShowRationale(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return false
        }

        return ActivityCompat.shouldShowRequestPermissionRationale(
            context as Activity,
            Manifest.permission.POST_NOTIFICATIONS
        )
    }

    /**
     * Check if user permanently denied notification permission
     */
    fun isPermanentlyDenied(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return false
        }

        return !ActivityCompat.shouldShowRequestPermissionRationale(
            context as Activity,
            Manifest.permission.POST_NOTIFICATIONS
        ) && !areNotificationsEnabled()
    }

    /**
     * Request notification permission from activity
     */
    fun requestNotificationPermission(activity: Activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                REQUEST_CODE_NOTIFICATION_PERMISSION
            )
        }
    }

    /**
     * Request notification permission from fragment
     */
    fun requestNotificationPermission(fragment: Fragment) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            fragment.requestPermissions(
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                REQUEST_CODE_NOTIFICATION_PERMISSION
            )
        }
    }

    /**
     * Create activity result launcher for notification permission
     */
    fun createPermissionLauncher(
        activity: Activity,
        onPermissionGranted: () -> Unit,
        onPermissionDenied: () -> Unit,
        onPermissionPermanentlyDenied: () -> Unit
    ): ActivityResultLauncher<String> {
        return activity.registerForActivityResult(
            ActivityResultContracts.RequestPermission()
        ) { isGranted ->
            if (isGranted) {
                logger.d("Notification permission granted")
                preferences.setNotificationPermissionGranted(true)
                onPermissionGranted()
            } else {
                logger.d("Notification permission denied")
                preferences.setNotificationPermissionGranted(false)

                if (isPermanentlyDenied()) {
                    onPermissionPermanentlyDenied()
                } else {
                    onPermissionDenied()
                }
            }
        }
    }

    /**
     * Handle permission result from onRequestPermissionsResult
     */
    fun handlePermissionResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
        onPermissionGranted: () -> Unit,
        onPermissionDenied: () -> Unit,
        onPermissionPermanentlyDenied: () -> Unit
    ): Boolean {
        if (requestCode == REQUEST_CODE_NOTIFICATION_PERMISSION) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val index = permissions.indexOf(Manifest.permission.POST_NOTIFICATIONS)
                if (index != -1 && grantResults[index] == PackageManager.PERMISSION_GRANTED) {
                    logger.d("Notification permission granted via result")
                    preferences.setNotificationPermissionGranted(true)
                    onPermissionGranted()
                    return true
                } else {
                    logger.d("Notification permission denied via result")
                    preferences.setNotificationPermissionGranted(false)

                    if (isPermanentlyDenied()) {
                        onPermissionPermanentlyDenied()
                    } else {
                        onPermissionDenied()
                    }
                    return true
                }
            }
        }
        return false
    }

    /**
     * Get notification permission status information
     */
    suspend fun getPermissionStatus(): NotificationPermissionStatus {
        return if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            NotificationPermissionStatus(
                isRequired = false,
                isGranted = true,
                shouldShowRationale = false,
                isPermanentlyDenied = false,
                canRequestPermission = false
            )
        } else {
            val granted = areNotificationsEnabled()
            val rationale = shouldShowRationale()
            val permanentlyDenied = isPermanentlyDenied()

            NotificationPermissionStatus(
                isRequired = true,
                isGranted = granted,
                shouldShowRationale = rationale,
                isPermanentlyDenied = permanentlyDenied,
                canRequestPermission = !granted && !permanentlyDenied
            )
        }
    }

    /**
     * Check if any notification-related permissions are missing
     */
    fun getMissingPermissions(): List<String> {
        val missingPermissions = mutableListOf<String>()

        // Check notification permission (Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                missingPermissions.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        // Check wake lock permission (for background work)
        if (ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.WAKE_LOCK
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            missingPermissions.add(Manifest.permission.WAKE_LOCK)
        }

        // Check vibrate permission
        if (ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.VIBRATE
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            missingPermissions.add(Manifest.permission.VIBRATE)
        }

        return missingPermissions
    }

    /**
     * Check all notification-related permissions
     */
    fun checkAllPermissions(): NotificationPermissionsInfo {
        val requiredPermissions = mapOf(
            Manifest.permission.POST_NOTIFICATIONS to "Notifications" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                areNotificationsEnabled()
            } else {
                true // Not required before Android 13
            },
            Manifest.permission.WAKE_LOCK to "Wake Lock" to ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.WAKE_LOCK
            ) == PackageManager.PERMISSION_GRANTED,
            Manifest.permission.VIBRATE to "Vibration" to ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.VIBRATE
            ) == PackageManager.PERMISSION_GRANTED
        )

        val missing = requiredPermissions.filterValues { !it }.keys.toList()
        val allGranted = missing.isEmpty()

        return NotificationPermissionsInfo(
            allGranted = allGranted,
            grantedPermissions = requiredPermissions.filterValues { it }.map { (permission, _) ->
                requiredPermissions.entries.find { it.key == permission }?.value ?: "Unknown"
            },
            missingPermissions = missing.map { permission ->
                requiredPermissions.entries.find { it.key == permission }?.value ?: permission
            },
            requiresNotificationPermission = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
        )
    }

    /**
     * Reset notification permission preferences (useful for testing)
     */
    fun resetPermissionPreferences() {
        preferences.setNotificationPermissionGranted(false)
        preferences.setNotificationPermissionAsked(false)
        logger.d("Notification permission preferences reset")
    }

    /**
     * Mark that notification permission has been asked
     */
    fun setPermissionAsked() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            preferences.setNotificationPermissionAsked(true)
        }
    }

    /**
     * Check if notification permission has been asked before
     */
    suspend fun hasPermissionBeenAsked(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            preferences.hasNotificationPermissionBeenAsked().first()
        } else {
            true // Not applicable before Android 13
        }
    }

    companion object {
        private const val TAG = "NotificationPermissionManager"
        private const val REQUEST_CODE_NOTIFICATION_PERMISSION = 1001
    }
}

/**
 * Data class for notification permission status
 */
data class NotificationPermissionStatus(
    val isRequired: Boolean,
    val isGranted: Boolean,
    val shouldShowRationale: Boolean,
    val isPermanentlyDenied: Boolean,
    val canRequestPermission: Boolean
)

/**
 * Data class for comprehensive notification permissions information
 */
data class NotificationPermissionsInfo(
    val allGranted: Boolean,
    val grantedPermissions: List<String>,
    val missingPermissions: List<String>,
    val requiresNotificationPermission: Boolean
) {
    val permissionSummary: String
        get() = when {
            allGranted -> "All notification permissions are granted"
            missingPermissions.isEmpty() -> "All available permissions are granted"
            requiresNotificationPermission && missingPermissions.contains("Notifications") ->
                "Notification permission required for alerts and reminders"
            else -> "Missing permissions: ${missingPermissions.joinToString(", ")}"
        }
}