package com.cannaai.pro.bluetooth

import android.Manifest
import android.app.Activity
import android.bluetooth.BluetoothAdapter
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.LocationManager
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
class BluetoothPermissionManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val logger: Logger
) {

    companion object {
        private const val TAG = "BluetoothPermissionManager"
        private const val REQUEST_CODE_BLUETOOTH_PERMISSIONS = 2001
        private const val REQUEST_CODE_LOCATION_PERMISSIONS = 2002
    }

    /**
     * Get required Bluetooth permissions based on Android version
     */
    fun getRequiredBluetoothPermissions(): Array<String> {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.ACCESS_FINE_LOCATION
            )
        } else {
            arrayOf(
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )
        }
    }

    /**
     * Check if all Bluetooth permissions are granted
     */
    fun hasAllBluetoothPermissions(): Boolean {
        return getRequiredBluetoothPermissions().all { permission ->
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        }
    }

    /**
     * Check if location permissions are granted (required for BLE scanning on Android 6.0+)
     */
    fun hasLocationPermissions(): Boolean {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Check if location services are enabled
     */
    fun isLocationServiceEnabled(): Boolean {
        val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        return locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
    }

    /**
     * Check if we should show Bluetooth permission rationale
     */
    fun shouldShowBluetoothRationale(activity: Activity): Boolean {
        return getRequiredBluetoothPermissions().any { permission ->
            ActivityCompat.shouldShowRequestPermissionRationale(activity, permission)
        }
    }

    /**
     * Check if we should show location permission rationale
     */
    fun shouldShowLocationRationale(activity: Activity): Boolean {
        return ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.ACCESS_FINE_LOCATION) ||
                ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.ACCESS_COARSE_LOCATION)
    }

    /**
     * Check if any permissions are permanently denied
     */
    fun arePermissionsPermanentlyDenied(activity: Activity): Boolean {
        return getRequiredBluetoothPermissions().any { permission ->
            !ActivityCompat.shouldShowRequestPermissionRationale(activity, permission) &&
                    ContextCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED
        }
    }

    /**
     * Request all Bluetooth permissions
     */
    fun requestBluetoothPermissions(activity: Activity) {
        ActivityCompat.requestPermissions(
            activity,
            getRequiredBluetoothPermissions(),
            REQUEST_CODE_BLUETOOTH_PERMISSIONS
        )
    }

    /**
     * Request location permissions
     */
    fun requestLocationPermissions(activity: Activity) {
        val permissions = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
        } else {
            arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        }

        ActivityCompat.requestPermissions(
            activity,
            permissions,
            REQUEST_CODE_LOCATION_PERMISSIONS
        )
    }

    /**
     * Request permissions from fragment
     */
    fun requestBluetoothPermissions(fragment: Fragment) {
        fragment.requestPermissions(
            getRequiredBluetoothPermissions(),
            REQUEST_CODE_BLUETOOTH_PERMISSIONS
        )
    }

    /**
     * Create activity result launcher for Bluetooth permissions
     */
    fun createBluetoothPermissionLauncher(
        activity: Activity,
        onAllPermissionsGranted: () -> Unit,
        onSomePermissionsDenied: (List<String>) -> Unit,
        onPermissionsPermanentlyDenied: (List<String>) -> Unit
    ): ActivityResultLauncher<Array<String>> {
        return activity.registerForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions()
        ) { permissions ->
            val grantedPermissions = permissions.filterValues { it }.keys.toList()
            val deniedPermissions = permissions.filterValues { !it }.keys.toList()
            val permanentlyDenied = mutableListOf<String>()

            deniedPermissions.forEach { permission ->
                if (!ActivityCompat.shouldShowRequestPermissionRationale(activity, permission)) {
                    permanentlyDenied.add(permission)
                }
            }

            when {
                deniedPermissions.isEmpty() -> {
                    logger.d("All Bluetooth permissions granted")
                    onAllPermissionsGranted()
                }
                permanentlyDenied.isNotEmpty() -> {
                    logger.d("Some Bluetooth permissions permanently denied: $permanentlyDenied")
                    onPermissionsPermanentlyDenied(permanentlyDenied)
                }
                else -> {
                    logger.d("Some Bluetooth permissions denied: $deniedPermissions")
                    onSomePermissionsDenied(deniedPermissions)
                }
            }
        }
    }

    /**
     * Create activity result launcher for location permission
     */
    fun createLocationPermissionLauncher(
        activity: Activity,
        onPermissionGranted: () -> Unit,
        onPermissionDenied: () -> Unit,
        onPermissionPermanentlyDenied: () -> Unit
    ): ActivityResultLauncher<String> {
        return activity.registerForActivityResult(
            ActivityResultContracts.RequestPermission()
        ) { isGranted ->
            if (isGranted) {
                logger.d("Location permission granted")
                onPermissionGranted()
            } else {
                logger.d("Location permission denied")
                if (!ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.ACCESS_FINE_LOCATION)) {
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
        onBluetoothPermissionsGranted: () -> Unit,
        onBluetoothPermissionsDenied: (List<String>) -> Unit,
        onLocationPermissionsGranted: () -> Unit,
        onLocationPermissionsDenied: () -> Unit
    ): Boolean {
        when (requestCode) {
            REQUEST_CODE_BLUETOOTH_PERMISSIONS -> {
                val requiredPermissions = getRequiredBluetoothPermissions()
                val grantedPermissions = mutableListOf<String>()
                val deniedPermissions = mutableListOf<String>()

                permissions.forEachIndexed { index, permission ->
                    if (index < grantResults.size && grantResults[index] == PackageManager.PERMISSION_GRANTED) {
                        grantedPermissions.add(permission)
                    } else {
                        deniedPermissions.add(permission)
                    }
                }

                if (grantedPermissions.containsAll(requiredPermissions.toList())) {
                    onBluetoothPermissionsGranted()
                } else {
                    onBluetoothPermissionsDenied(deniedPermissions)
                }
                return true
            }

            REQUEST_CODE_LOCATION_PERMISSIONS -> {
                val locationGranted = grantResults.isNotEmpty() &&
                        grantResults[0] == PackageManager.PERMISSION_GRANTED

                if (locationGranted) {
                    onLocationPermissionsGranted()
                } else {
                    onLocationPermissionsDenied()
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
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", activity.packageName, null)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            activity.startActivity(intent)
        } catch (e: Exception) {
            logger.e("Error opening app settings", e)
        }
    }

    /**
     * Open location settings
     */
    fun openLocationSettings(activity: Activity) {
        try {
            val intent = Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)
            activity.startActivity(intent)
        } catch (e: Exception) {
            logger.e("Error opening location settings", e)
        }
    }

    /**
     * Request to enable Bluetooth
     */
    fun requestEnableBluetooth(): Intent {
        return Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
    }

    /**
     * Get comprehensive permission status
     */
    fun getPermissionStatus(activity: Activity): BluetoothPermissionStatus {
        val requiredPermissions = getRequiredBluetoothPermissions()
        val grantedPermissions = requiredPermissions.filter { permission ->
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        }
        val deniedPermissions = requiredPermissions.filterNot { grantedPermissions.contains(it) }

        val hasLocationPermission = hasLocationPermissions()
        val isLocationEnabled = isLocationServiceEnabled()

        return BluetoothPermissionStatus(
            allBluetoothPermissionsGranted = grantedPermissions.size == requiredPermissions.size,
            bluetoothPermissionsGranted = grantedPermissions,
            bluetoothPermissionsDenied = deniedPermissions,
            locationPermissionGranted = hasLocationPermission,
            locationServiceEnabled = isLocationEnabled,
            shouldShowRationale = shouldShowBluetoothRationale(activity),
            anyPermanentlyDenied = arePermissionsPermanentlyDenied(activity),
            canScanForDevices = grantedPermissions.size == requiredPermissions.size && isLocationEnabled,
            canConnectToDevices = grantedPermissions.containsAll(
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    listOf(Manifest.permission.BLUETOOTH_CONNECT)
                } else {
                    listOf(Manifest.permission.BLUETOOTH)
                }
            )
        )
    }

    /**
     * Get missing permissions
     */
    fun getMissingPermissions(): List<String> {
        val requiredPermissions = getRequiredBluetoothPermissions()
        return requiredPermissions.filter { permission ->
            ContextCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED
        }
    }

    /**
     * Check if Bluetooth is available on device
     */
    fun isBluetoothAvailable(): Boolean {
        return context.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH)
    }

    /**
     * Check if Bluetooth LE is available
     */
    fun isBluetoothLeAvailable(): Boolean {
        return context.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)
    }

    /**
     * Check if location is available (required for BLE scanning)
     */
    fun isLocationAvailable(): Boolean {
        return context.packageManager.hasSystemFeature(PackageManager.FEATURE_LOCATION) ||
                context.packageManager.hasSystemFeature(PackageManager.FEATURE_LOCATION_GPS) ||
                context.packageManager.hasSystemFeature(PackageManager.FEATURE_LOCATION_NETWORK)
    }

    /**
     * Get Bluetooth capabilities information
     */
    fun getBluetoothCapabilities(): BluetoothCapabilities {
        return BluetoothCapabilities(
            hasBluetooth = isBluetoothAvailable(),
            hasBluetoothLe = isBluetoothLeAvailable(),
            hasLocation = isLocationAvailable(),
            requiresLocationPermission = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M,
            requiresNewBluetoothPermissions = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S,
            supportsMultipleBluetoothDevices = true,
            supportsBackgroundBluetooth = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
        )
    }
}

/**
 * Data class for Bluetooth permission status
 */
data class BluetoothPermissionStatus(
    val allBluetoothPermissionsGranted: Boolean,
    val bluetoothPermissionsGranted: List<String>,
    val bluetoothPermissionsDenied: List<String>,
    val locationPermissionGranted: Boolean,
    val locationServiceEnabled: Boolean,
    val shouldShowRationale: Boolean,
    val anyPermanentlyDenied: Boolean,
    val canScanForDevices: Boolean,
    val canConnectToDevices: Boolean
) {
    val permissionSummary: String
        get() = when {
            allBluetoothPermissionsGranted && locationPermissionGranted && locationServiceEnabled ->
                "All Bluetooth permissions granted and location enabled"
            allBluetoothPermissionsGranted && locationPermissionGranted && !locationServiceEnabled ->
                "Bluetooth permissions granted but location disabled"
            allBluetoothPermissionsGranted && !locationPermissionGranted ->
                "Bluetooth permissions granted but location permission missing"
            else -> "Some Bluetooth permissions missing"
        }

    val isFullyConfigured: Boolean
        get() = allBluetoothPermissionsGranted && locationPermissionGranted && locationServiceEnabled

    val needsUserAction: Boolean
        get() = anyPermanentlyDenied || !locationServiceEnabled
}

/**
 * Data class for Bluetooth capabilities
 */
data class BluetoothCapabilities(
    val hasBluetooth: Boolean,
    val hasBluetoothLe: Boolean,
    val hasLocation: Boolean,
    val requiresLocationPermission: Boolean,
    val requiresNewBluetoothPermissions: Boolean,
    val supportsMultipleBluetoothDevices: Boolean,
    val supportsBackgroundBluetooth: Boolean
) {
    val capabilitySummary: String
        get() = when {
            !hasBluetooth -> "Bluetooth not available"
            !hasBluetoothLe -> "Classic Bluetooth only"
            requiresNewBluetoothPermissions -> "Requires new Bluetooth permissions (Android 12+)"
            requiresLocationPermission -> "Requires location permission for scanning"
            else -> "Full Bluetooth capabilities available"
        }

    val canUseAllFeatures: Boolean
        get() = hasBluetooth && hasBluetoothLe && hasLocation
}