package com.cannaai.pro.camera

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.cannaai.pro.utils.Logger
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CameraPermissionManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val logger: Logger
) {

    companion object {
        private const val TAG = "CameraPermissionManager"
        private const val REQUEST_CODE_CAMERA_PERMISSION = 1001
        private const val REQUEST_CODE_AUDIO_PERMISSION = 1002
        private const val REQUEST_CODE_CAMERA_AUDIO_PERMISSION = 1003
    }

    /**
     * Check if camera permission is granted
     */
    fun hasCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Check if audio recording permission is granted
     */
    fun hasAudioPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Check if storage permission is granted (for Android < 10)
     */
    fun hasStoragePermission(): Boolean {
        return if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true // Not required on Android 10+
        }
    }

    /**
     * Check if all camera-related permissions are granted
     */
    fun hasAllCameraPermissions(): Boolean {
        return hasCameraPermission() && hasAudioPermission() && hasStoragePermission()
    }

    /**
     * Check if we should show camera permission rationale
     */
    fun shouldShowCameraRationale(activity: Activity): Boolean {
        return ActivityCompat.shouldShowRequestPermissionRationale(
            activity,
            Manifest.permission.CAMERA
        )
    }

    /**
     * Check if we should show audio permission rationale
     */
    fun shouldShowAudioRationale(activity: Activity): Boolean {
        return ActivityCompat.shouldShowRequestPermissionRationale(
            activity,
            Manifest.permission.RECORD_AUDIO
        )
    }

    /**
     * Check if user permanently denied camera permission
     */
    fun isCameraPermanentlyDenied(activity: Activity): Boolean {
        return !ActivityCompat.shouldShowRequestPermissionRationale(
            activity,
            Manifest.permission.CAMERA
        ) && !hasCameraPermission()
    }

    /**
     * Check if user permanently denied audio permission
     */
    fun isAudioPermanentlyDenied(activity: Activity): Boolean {
        return !ActivityCompat.shouldShowRequestPermissionRationale(
            activity,
            Manifest.permission.RECORD_AUDIO
        ) && !hasAudioPermission()
    }

    /**
     * Request camera permission
     */
    fun requestCameraPermission(activity: Activity) {
        ActivityCompat.requestPermissions(
            activity,
            arrayOf(Manifest.permission.CAMERA),
            REQUEST_CODE_CAMERA_PERMISSION
        )
    }

    /**
     * Request audio permission
     */
    fun requestAudioPermission(activity: Activity) {
        ActivityCompat.requestPermissions(
            activity,
            arrayOf(Manifest.permission.RECORD_AUDIO),
            REQUEST_CODE_AUDIO_PERMISSION
        )
    }

    /**
     * Request both camera and audio permissions
     */
    fun requestCameraAndAudioPermissions(activity: Activity) {
        ActivityCompat.requestPermissions(
            activity,
            arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO),
            REQUEST_CODE_CAMERA_AUDIO_PERMISSION
        )
    }

    /**
     * Request all camera-related permissions
     */
    fun requestAllCameraPermissions(activity: Activity) {
        val permissions = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            arrayOf(
                Manifest.permission.CAMERA,
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            )
        } else {
            arrayOf(
                Manifest.permission.CAMERA,
                Manifest.permission.RECORD_AUDIO
            )
        }

        ActivityCompat.requestPermissions(
            activity,
            permissions,
            REQUEST_CODE_CAMERA_AUDIO_PERMISSION
        )
    }

    /**
     * Request camera permission from fragment
     */
    fun requestCameraPermission(fragment: Fragment) {
        fragment.requestPermissions(
            arrayOf(Manifest.permission.CAMERA),
            REQUEST_CODE_CAMERA_PERMISSION
        )
    }

    /**
     * Request audio permission from fragment
     */
    fun requestAudioPermission(fragment: Fragment) {
        fragment.requestPermissions(
            arrayOf(Manifest.permission.RECORD_AUDIO),
            REQUEST_CODE_AUDIO_PERMISSION
        )
    }

    /**
     * Create activity result launcher for camera permission
     */
    fun createCameraPermissionLauncher(
        activity: Activity,
        onPermissionGranted: () -> Unit,
        onPermissionDenied: () -> Unit,
        onPermissionPermanentlyDenied: () -> Unit
    ): ActivityResultLauncher<String> {
        return activity.registerForActivityResult(
            ActivityResultContracts.RequestPermission()
        ) { isGranted ->
            if (isGranted) {
                logger.d("Camera permission granted")
                onPermissionGranted()
            } else {
                logger.d("Camera permission denied")
                if (isCameraPermanentlyDenied(activity)) {
                    onPermissionPermanentlyDenied()
                } else {
                    onPermissionDenied()
                }
            }
        }
    }

    /**
     * Create activity result launcher for audio permission
     */
    fun createAudioPermissionLauncher(
        activity: Activity,
        onPermissionGranted: () -> Unit,
        onPermissionDenied: () -> Unit,
        onPermissionPermanentlyDenied: () -> Unit
    ): ActivityResultLauncher<String> {
        return activity.registerForActivityResult(
            ActivityResultContracts.RequestPermission()
        ) { isGranted ->
            if (isGranted) {
                logger.d("Audio permission granted")
                onPermissionGranted()
            } else {
                logger.d("Audio permission denied")
                if (isAudioPermanentlyDenied(activity)) {
                    onPermissionPermanentlyDenied()
                } else {
                    onPermissionDenied()
                }
            }
        }
    }

    /**
     * Create activity result launcher for multiple permissions
     */
    fun createMultiplePermissionsLauncher(
        activity: Activity,
        onAllPermissionsGranted: () -> Unit,
        onSomePermissionsDenied: (List<String>) -> Unit,
        onPermissionsPermanentlyDenied: (List<String>) -> Unit
    ): ActivityResultLauncher<Array<String>> {
        return activity.registerForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions()
        ) { permissions ->
            val deniedPermissions = permissions.filterValues { !it }.keys.toList()
            val permanentlyDenied = mutableListOf<String>()

            deniedPermissions.forEach { permission ->
                when (permission) {
                    Manifest.permission.CAMERA -> {
                        if (isCameraPermanentlyDenied(activity)) {
                            permanentlyDenied.add(permission)
                        }
                    }
                    Manifest.permission.RECORD_AUDIO -> {
                        if (isAudioPermanentlyDenied(activity)) {
                            permanentlyDenied.add(permission)
                        }
                    }
                    Manifest.permission.WRITE_EXTERNAL_STORAGE -> {
                        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                            val storagePermanentlyDenied = !ActivityCompat.shouldShowRequestPermissionRationale(
                                activity,
                                Manifest.permission.WRITE_EXTERNAL_STORAGE
                            ) && !hasStoragePermission()
                            if (storagePermanentlyDenied) {
                                permanentlyDenied.add(permission)
                            }
                        }
                    }
                }
            }

            when {
                deniedPermissions.isEmpty() -> {
                    logger.d("All camera permissions granted")
                    onAllPermissionsGranted()
                }
                permanentlyDenied.isNotEmpty() -> {
                    logger.d("Some permissions permanently denied: $permanentlyDenied")
                    onPermissionsPermanentlyDenied(permanentlyDenied)
                }
                else -> {
                    logger.d("Some permissions denied: $deniedPermissions")
                    onSomePermissionsDenied(deniedPermissions)
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
        onCameraPermissionGranted: () -> Unit,
        onCameraPermissionDenied: () -> Unit,
        onAudioPermissionGranted: () -> Unit,
        onAudioPermissionDenied: () -> Unit,
        onAllPermissionsGranted: () -> Unit,
        onSomePermissionsDenied: (List<String>) -> Unit
    ): Boolean {
        when (requestCode) {
            REQUEST_CODE_CAMERA_PERMISSION -> {
                val cameraIndex = permissions.indexOf(Manifest.permission.CAMERA)
                if (cameraIndex != -1 && grantResults[cameraIndex] == PackageManager.PERMISSION_GRANTED) {
                    onCameraPermissionGranted()
                } else {
                    onCameraPermissionDenied()
                }
                return true
            }

            REQUEST_CODE_AUDIO_PERMISSION -> {
                val audioIndex = permissions.indexOf(Manifest.permission.RECORD_AUDIO)
                if (audioIndex != -1 && grantResults[audioIndex] == PackageManager.PERMISSION_GRANTED) {
                    onAudioPermissionGranted()
                } else {
                    onAudioPermissionDenied()
                }
                return true
            }

            REQUEST_CODE_CAMERA_AUDIO_PERMISSION -> {
                val grantedPermissions = mutableListOf<String>()
                val deniedPermissions = mutableListOf<String>()

                permissions.forEachIndexed { index, permission ->
                    if (grantResults[index] == PackageManager.PERMISSION_GRANTED) {
                        grantedPermissions.add(permission)
                    } else {
                        deniedPermissions.add(permission)
                    }
                }

                if (deniedPermissions.isEmpty()) {
                    onAllPermissionsGranted()
                } else {
                    onSomePermissionsDenied(deniedPermissions)
                }
                return true
            }
        }
        return false
    }

    /**
     * Open app settings for manual permission granting
     */
    fun openAppSettings(activity: Activity) {
        try {
            val intent = android.content.Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", activity.packageName, null)
                flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
            }
            activity.startActivity(intent)
        } catch (e: Exception) {
            logger.e("Error opening app settings", e)
        }
    }

    /**
     * Get camera permission status information
     */
    fun getCameraPermissionStatus(activity: Activity): CameraPermissionStatus {
        return CameraPermissionStatus(
            cameraGranted = hasCameraPermission(),
            audioGranted = hasAudioPermission(),
            storageGranted = hasStoragePermission(),
            shouldShowCameraRationale = shouldShowCameraRationale(activity),
            shouldShowAudioRationale = shouldShowAudioRationale(activity),
            cameraPermanentlyDenied = isCameraPermanentlyDenied(activity),
            audioPermanentlyDenied = isAudioPermanentlyDenied(activity),
            allPermissionsGranted = hasAllCameraPermissions()
        )
    }

    /**
     * Get missing camera permissions
     */
    fun getMissingPermissions(): List<String> {
        val missingPermissions = mutableListOf<String>()

        if (!hasCameraPermission()) {
            missingPermissions.add(Manifest.permission.CAMERA)
        }

        if (!hasAudioPermission()) {
            missingPermissions.add(Manifest.permission.RECORD_AUDIO)
        }

        if (!hasStoragePermission()) {
            missingPermissions.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
        }

        return missingPermissions
    }

    /**
     * Check if camera is available on device
     */
    fun isCameraAvailable(): Boolean {
        return context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)
    }

    /**
     * Check if camera has autofocus capability
     */
    fun hasCameraAutoFocus(): Boolean {
        return context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_AUTOFOCUS)
    }

    /**
     * Check if camera has flash capability
     */
    fun hasCameraFlash(): Boolean {
        return context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_FLASH)
    }

    /**
     * Get camera capabilities information
     */
    fun getCameraCapabilities(): CameraCapabilities {
        return CameraCapabilities(
            hasCamera = isCameraAvailable(),
            hasAutoFocus = hasCameraAutoFocus(),
            hasFlash = hasCameraFlash(),
            hasFrontCamera = context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_FRONT),
            hasExternalCamera = context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_EXTERNAL)
        )
    }
}

/**
 * Data class for camera permission status
 */
data class CameraPermissionStatus(
    val cameraGranted: Boolean,
    val audioGranted: Boolean,
    val storageGranted: Boolean,
    val shouldShowCameraRationale: Boolean,
    val shouldShowAudioRationale: Boolean,
    val cameraPermanentlyDenied: Boolean,
    val audioPermanentlyDenied: Boolean,
    val allPermissionsGranted: Boolean
) {
    val permissionSummary: String
        get() = when {
            allPermissionsGranted -> "All camera permissions are granted"
            cameraGranted && audioGranted -> "Camera and audio permissions granted"
            cameraGranted -> "Only camera permission granted"
            audioGranted -> "Only audio permission granted"
            else -> "No camera permissions granted"
        }

    val canShowRationale: Boolean
        get() = shouldShowCameraRationale || shouldShowAudioRationale

    val anyPermanentlyDenied: Boolean
        get() = cameraPermanentlyDenied || audioPermanentlyDenied
}

/**
 * Data class for camera capabilities
 */
data class CameraCapabilities(
    val hasCamera: Boolean,
    val hasAutoFocus: Boolean,
    val hasFlash: Boolean,
    val hasFrontCamera: Boolean,
    val hasExternalCamera: Boolean
) {
    val capabilitySummary: String
        get() = when {
            !hasCamera -> "No camera available"
            hasFlash && hasAutoFocus -> "Full-featured camera available"
            hasFlash -> "Camera with flash available"
            hasAutoFocus -> "Camera with autofocus available"
            else -> "Basic camera available"
        }
}