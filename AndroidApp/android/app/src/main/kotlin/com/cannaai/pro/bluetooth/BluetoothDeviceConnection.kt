package com.cannaai.pro.bluetooth

import android.bluetooth.*
import android.content.Context
import android.util.Log
import com.cannaai.pro.data.model.SensorDevice
import com.cannaai.pro.utils.Logger
import kotlinx.coroutines.*
import java.io.IOException
import java.util.*
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages connection to a single Bluetooth device
 */
class BluetoothDeviceConnection(
    private val gatt: BluetoothGatt,
    private val context: Context
) {
    companion object {
        private const val TAG = "BluetoothDeviceConnection"
        private const val CONNECTION_TIMEOUT_MS = 10000L
        private const val MAX_RETRY_ATTEMPTS = 3
        private const val WRITE_DELAY_MS = 100L
    }

    private val logger = Logger()
    private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // Connection state
    private var isConnected = false
    private var isConnecting = false
    private var retryCount = 0

    // Characteristic cache
    private val characteristicCache = ConcurrentHashMap<UUID, BluetoothGattCharacteristic>()

    // Notification subscriptions
    private val notifications = ConcurrentHashMap<UUID, Boolean>()

    // Device information
    private var deviceInfo: SensorDevice? = null
    private var lastHeartbeat = System.currentTimeMillis()

    init {
        // Cache characteristics
        cacheCharacteristics()
    }

    /**
     * Disconnect from the device
     */
    fun disconnect() {
        try {
            isConnected = false
            isConnecting = false
            gatt.disconnect()
            logger.d("Disconnected from device: ${gatt.device.address}")

        } catch (e: Exception) {
            logger.e("Error during disconnect", e)
        }
    }

    /**
     * Read a characteristic
     */
    fun readCharacteristic(characteristic: BluetoothGattCharacteristic): Boolean {
        if (!isConnected) {
            logger.e("Cannot read characteristic - device not connected")
            return false
        }

        return try {
            // Add small delay to prevent command queuing issues
            Thread.sleep(WRITE_DELAY_MS)
            gatt.readCharacteristic(characteristic)

        } catch (e: Exception) {
            logger.e("Error reading characteristic", e)
            false
        }
    }

    /**
     * Write data to a characteristic
     */
    fun writeCharacteristic(characteristic: BluetoothGattCharacteristic, value: ByteArray): Boolean {
        if (!isConnected) {
            logger.e("Cannot write characteristic - device not connected")
            return false
        }

        return try {
            // Add small delay to prevent command queuing issues
            Thread.sleep(WRITE_DELAY_MS)
            characteristic.value = value
            gatt.writeCharacteristic(characteristic)

        } catch (e: Exception) {
            logger.e("Error writing characteristic", e)
            false
        }
    }

    /**
     * Subscribe to characteristic notifications
     */
    fun subscribeToCharacteristic(characteristic: BluetoothGattCharacteristic): Boolean {
        if (!isConnected) {
            logger.e("Cannot subscribe to characteristic - device not connected")
            return false
        }

        return try {
            // Enable notifications
            gatt.setCharacteristicNotification(characteristic, true)

            // Write descriptor to enable notifications
            val descriptor = characteristic.getDescriptor(UUID.fromString("00002902-0000-1000-8000-00805F9B34FB"))
            if (descriptor != null) {
                descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                gatt.writeDescriptor(descriptor)
            }

            notifications[characteristic.uuid] = true
            logger.d("Subscribed to characteristic: ${characteristic.uuid}")
            true

        } catch (e: Exception) {
            logger.e("Error subscribing to characteristic", e)
            false
        }
    }

    /**
     * Unsubscribe from characteristic notifications
     */
    fun unsubscribeFromCharacteristic(characteristic: BluetoothGattCharacteristic): Boolean {
        if (!isConnected) {
            return false
        }

        return try {
            // Disable notifications
            gatt.setCharacteristicNotification(characteristic, false)

            // Write descriptor to disable notifications
            val descriptor = characteristic.getDescriptor(UUID.fromString("00002902-0000-1000-8000-00805F9B34FB"))
            if (descriptor != null) {
                descriptor.value = BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE
                gatt.writeDescriptor(descriptor)
            }

            notifications.remove(characteristic.uuid)
            logger.d("Unsubscribed from characteristic: ${characteristic.uuid}")
            true

        } catch (e: Exception) {
            logger.e("Error unsubscribing from characteristic", e)
            false
        }
    }

    /**
     * Get cached characteristic by UUID
     */
    fun getCharacteristic(uuid: UUID): BluetoothGattCharacteristic? {
        return characteristicCache[uuid]
    }

    /**
     * Get device information
     */
    fun getDeviceInfo(): SensorDevice? {
        if (deviceInfo == null) {
            deviceInfo = createDeviceInfo()
        }
        return deviceInfo
    }

    /**
     * Check if connection is healthy
     */
    fun isConnectionHealthy(): Boolean {
        return isConnected && (System.currentTimeMillis() - lastHeartbeat < CONNECTION_TIMEOUT_MS)
    }

    /**
     * Update heartbeat timestamp
     */
    fun updateHeartbeat() {
        lastHeartbeat = System.currentTimeMillis()
    }

    /**
     * Get connection statistics
     */
    fun getConnectionStats(): ConnectionStats {
        return ConnectionStats(
            isConnected = isConnected,
            isConnecting = isConnecting,
            retryCount = retryCount,
            lastHeartbeat = lastHeartbeat,
            connectionTime = System.currentTimeMillis() - (lastHeartbeat - CONNECTION_TIMEOUT_MS),
            subscribedCharacteristics = notifications.keys.toList()
        )
    }

    // Private helper methods

    private fun cacheCharacteristics() {
        try {
            gatt.services?.forEach { service ->
                service.characteristics?.forEach { characteristic ->
                    characteristicCache[characteristic.uuid] = characteristic
                }
            }
            logger.d("Cached ${characteristicCache.size} characteristics")

        } catch (e: Exception) {
            logger.e("Error caching characteristics", e)
        }
    }

    private fun createDeviceInfo(): SensorDevice {
        return try {
            val device = gatt.device
            val name = device.name ?: "Unknown Device"
            val address = device.address
            val deviceType = when (device.type) {
                BluetoothDevice.DEVICE_TYPE_CLASSIC -> "Classic"
                BluetoothDevice.DEVICE_TYPE_LE -> "BLE"
                BluetoothDevice.DEVICE_TYPE_DUAL -> "Dual"
                else -> "Unknown"
            }

            // Try to read device information characteristics
            val manufacturerName = readManufacturerName()
            val modelNumber = readModelNumber()
            val firmwareVersion = readFirmwareVersion()
            val hardwareVersion = readHardwareVersion()
            val serialNumber = readSerialNumber()

            // Determine sensor capabilities based on services
            val capabilities = detectSensorCapabilities()

            SensorDevice(
                id = address,
                name = name,
                address = address,
                type = deviceType,
                manufacturer = manufacturerName,
                model = modelNumber,
                firmwareVersion = firmwareVersion,
                hardwareVersion = hardwareVersion,
                serialNumber = serialNumber,
                capabilities = capabilities,
                isActive = true,
                lastSeen = System.currentTimeMillis()
            )

        } catch (e: Exception) {
            logger.e("Error creating device info", e)
            SensorDevice(
                id = gatt.device.address,
                name = gatt.device.name ?: "Unknown",
                address = gatt.device.address,
                type = "Unknown",
                isActive = true,
                lastSeen = System.currentTimeMillis()
            )
        }
    }

    private fun readManufacturerName(): String? {
        return try {
            val characteristic = getCharacteristic(UUID.fromString("00002A29-0000-1000-8000-00805F9B34FB"))
            characteristic?.value?.let { String(it) }
        } catch (e: Exception) {
            logger.e("Error reading manufacturer name", e)
            null
        }
    }

    private fun readModelNumber(): String? {
        return try {
            val characteristic = getCharacteristic(UUID.fromString("00002A24-0000-1000-8000-00805F9B34FB"))
            characteristic?.value?.let { String(it) }
        } catch (e: Exception) {
            logger.e("Error reading model number", e)
            null
        }
    }

    private fun readFirmwareVersion(): String? {
        return try {
            val characteristic = getCharacteristic(UUID.fromString("00002A26-0000-1000-8000-00805F9B34FB"))
            characteristic?.value?.let { String(it) }
        } catch (e: Exception) {
            logger.e("Error reading firmware version", e)
            null
        }
    }

    private fun readHardwareVersion(): String? {
        return try {
            val characteristic = getCharacteristic(UUID.fromString("00002A27-0000-1000-8000-00805F9B34FB"))
            characteristic?.value?.let { String(it) }
        } catch (e: Exception) {
            logger.e("Error reading hardware version", e)
            null
        }
    }

    private fun readSerialNumber(): String? {
        return try {
            val characteristic = getCharacteristic(UUID.fromString("00002A25-0000-1000-8000-00805F9B34FB"))
            characteristic?.value?.let { String(it) }
        } catch (e: Exception) {
            logger.e("Error reading serial number", e)
            null
        }
    }

    private fun detectSensorCapabilities(): List<String> {
        val capabilities = mutableListOf<String>()

        try {
            gatt.services?.forEach { service ->
                when (service.uuid) {
                    UUID.fromString("0000180A-0000-1000-8000-00805F9B34FB") -> {
                        capabilities.add("device_info")
                    }
                    UUID.fromString("0000180F-0000-1000-8000-00805F9B34FB") -> {
                        capabilities.add("battery")
                    }
                    UUID.fromString("0000181A-0000-1000-8000-00805F9B34FB") -> {
                        capabilities.add("environmental_sensing")
                    }
                    UUID.fromString("0000181C-0000-1000-8000-00805F9B34FB") -> {
                        capabilities.add("user_data")
                    }
                    // Custom CannaAI service
                    BluetoothManager.CANNAI_SERVICE_UUID -> {
                        capabilities.add("cannaai_sensor")
                        // Check for specific sensor characteristics
                        service.characteristics?.forEach { characteristic ->
                            when (characteristic.uuid) {
                                BluetoothManager.SENSOR_DATA_CHARACTERISTIC -> {
                                    capabilities.add("sensor_data")
                                }
                                else -> {
                                    capabilities.add("sensor_${characteristic.uuid}")
                                }
                            }
                        }
                    }
                }
            }

        } catch (e: Exception) {
            logger.e("Error detecting sensor capabilities", e)
        }

        return capabilities
    }

    /**
     * Set connection state
     */
    fun setConnectionState(connected: Boolean) {
        isConnected = connected
        if (connected) {
            isConnecting = false
            retryCount = 0
            updateHeartbeat()
        }
    }

    /**
     * Set connecting state
     */
    fun setConnectingState(connecting: Boolean) {
        isConnecting = connecting
        if (connecting) {
            retryCount++
        }
    }

    /**
     * Check if connection can be retried
     */
    fun canRetryConnection(): Boolean {
        return retryCount < MAX_RETRY_ATTEMPTS && !isConnected && !isConnecting
    }

    /**
     * Get retry count
     */
    fun getRetryCount(): Int {
        return retryCount
    }

    /**
     * Get GATT instance (for advanced operations)
     */
    fun getGatt(): BluetoothGatt {
        return gatt
    }

    /**
     * Cleanup resources
     */
    fun cleanup() {
        try {
            coroutineScope.cancel()
            notifications.clear()
            characteristicCache.clear()
            logger.d("Bluetooth device connection cleaned up")

        } catch (e: Exception) {
            logger.e("Error during cleanup", e)
        }
    }
}

/**
 * Data class for connection statistics
 */
data class ConnectionStats(
    val isConnected: Boolean,
    val isConnecting: Boolean,
    val retryCount: Int,
    val lastHeartbeat: Long,
    val connectionTime: Long,
    val subscribedCharacteristics: List<UUID>
) {
    val connectionDuration: Long
        get() = if (isConnected) System.currentTimeMillis() - connectionTime else 0L

    val timeSinceLastHeartbeat: Long
        get() = System.currentTimeMillis() - lastHeartbeat

    val isHealthy: Boolean
        get() = isConnected && timeSinceLastHeartbeat < 30000L // 30 seconds timeout
}

/**
 * Data class for sensor device information
 */
data class SensorDevice(
    val id: String,
    val name: String,
    val address: String,
    val type: String,
    val manufacturer: String? = null,
    val model: String? = null,
    val firmwareVersion: String? = null,
    val hardwareVersion: String? = null,
    val serialNumber: String? = null,
    val capabilities: List<String> = emptyList(),
    val isActive: Boolean = true,
    val lastSeen: Long = System.currentTimeMillis()
)