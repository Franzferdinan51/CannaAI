package com.cannaai.pro.bluetooth

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.*
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.core.content.ContextCompat
import com.cannaai.pro.data.model.SensorDevice
import com.cannaai.pro.data.model.SensorReading
import com.cannaai.pro.utils.Logger
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BluetoothManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val logger: Logger
) {

    companion object {
        private const val TAG = "BluetoothManager"

        // Bluetooth permissions
        private val BLUETOOTH_PERMISSIONS = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.ACCESS_FINE_LOCATION
            )
        } else {
            arrayOf(
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.ACCESS_FINE_LOCATION
            )
        }

        // Service UUID for CannaAI sensor devices
        val CANNAI_SERVICE_UUID = UUID.fromString("0000180A-0000-1000-8000-00805F9B34FB")
        val SENSOR_DATA_CHARACTERISTIC = UUID.fromString("00002A58-0000-1000-8000-00805F9B34FB")
        val DEVICE_INFO_CHARACTERISTIC = UUID.fromString("00002A29-0000-1000-8000-00805F9B34FB")
        val BATTERY_LEVEL_CHARACTERISTIC = UUID.fromString("00002A19-0000-1000-8000-00805F9B34FB")

        // Connection states
        enum class ConnectionState {
            DISCONNECTED,
            CONNECTING,
            CONNECTED,
            DISCONNECTING,
            ERROR
        }

        // Device types
        enum class DeviceType {
            TEMPERATURE_SENSOR,
            HUMIDITY_SENSOR,
            PH_SENSOR,
            LIGHT_SENSOR,
            COMBINED_SENSOR,
            CONTROLLER
        }
    }

    // Bluetooth adapters
    private val bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()
    private var bluetoothLeScanner: BluetoothLeScanner? = null

    // GATT components
    private var bluetoothGatt: BluetoothGatt? = null
    private var gattCallback: BluetoothGattCallback? = null

    // Connected devices
    private val connectedDevices = mutableMapOf<String, BluetoothDeviceConnection>()
    private val discoveredDevices = mutableMapOf<String, BluetoothDevice>()

    // State flows
    private val _isScanning = MutableStateFlow(false)
    val isScanning: StateFlow<Boolean> = _isScanning.asStateFlow()

    private val _discoveredDevices = MutableStateFlow<List<BluetoothDevice>>(emptyList())
    val discoveredDevices: StateFlow<List<BluetoothDevice>> = _discoveredDevices.asStateFlow()

    private val _connectionState = MutableStateFlow<ConnectionState>(ConnectionState.DISCONNECTED)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private val _sensorReadings = MutableStateFlow<Map<String, SensorReading>>(emptyMap())
    val sensorReadings: StateFlow<Map<String, SensorReading>> = _sensorReadings.asStateFlow()

    // Callbacks
    private var onDeviceDiscoveredListener: ((BluetoothDevice) -> Unit)? = null
    private var onDeviceConnectedListener: ((String) -> Unit)? = null
    private var onDeviceDisconnectedListener: ((String) -> Unit)? = null
    private var onSensorDataReceivedListener: ((String, SensorReading) -> Unit)? = null
    private var onErrorListener: ((String) -> Unit)? = null

    // Background scanning
    private var scanCallback: ScanCallback? = null
    private val handler = Handler(Looper.getMainLooper())
    private val scanTimeoutRunnable = Runnable {
        stopScanning()
    }

    init {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
            bluetoothLeScanner = bluetoothAdapter?.bluetoothLeScanner
        }
    }

    // Permission checking

    /**
     * Check if all required Bluetooth permissions are granted
     */
    fun hasBluetoothPermissions(): Boolean {
        return BLUETOOTH_PERMISSIONS.all { permission ->
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        }
    }

    /**
     * Check if Bluetooth is enabled
     */
    fun isBluetoothEnabled(): Boolean {
        return bluetoothAdapter?.isEnabled == true
    }

    /**
     * Check if Bluetooth LE is available
     */
    fun isBluetoothLeAvailable(): Boolean {
        return context.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)
    }

    /**
     * Request to enable Bluetooth
     */
    fun requestEnableBluetooth(): Intent {
        return Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
    }

    // Device scanning

    /**
     * Start scanning for Bluetooth LE devices
     */
    @RequiresApi(Build.VERSION_CODES.JELLY_BEAN_MR2)
    fun startScanning() {
        if (!hasBluetoothPermissions()) {
            onErrorListener?.invoke("Bluetooth permissions not granted")
            return
        }

        if (!isBluetoothEnabled()) {
            onErrorListener?.invoke("Bluetooth is not enabled")
            return
        }

        if (isScanning.value) {
            logger.d("Already scanning for devices")
            return
        }

        try {
            bluetoothLeScanner?.let { scanner ->
                _isScanning.value = true
                _discoveredDevices.value = emptyList()

                val scanFilters = listOf(
                    ScanFilter.Builder()
                        .setServiceUuid(ParcelUuid(CANNAI_SERVICE_UUID))
                        .build()
                )

                val scanSettings = ScanSettings.Builder()
                    .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                    .setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES)
                    .setMatchMode(ScanSettings.MATCH_MODE_AGGRESSIVE)
                    .setNumOfMatches(ScanSettings.MATCH_NUM_MAX_ADVERTISEMENT)
                    .setReportDelay(0)
                    .build()

                scanCallback = createScanCallback()
                scanner.startScan(scanFilters, scanSettings, scanCallback)

                // Set scan timeout (30 seconds)
                handler.postDelayed(scanTimeoutRunnable, 30000)

                logger.d("Started scanning for Bluetooth LE devices")

            } ?: run {
                onErrorListener?.invoke("Bluetooth LE scanner not available")
            }

        } catch (e: SecurityException) {
            logger.e("Security exception during scanning", e)
            onErrorListener?.invoke("Security error: ${e.message}")
        } catch (e: Exception) {
            logger.e("Error starting scan", e)
            onErrorListener?.invoke("Failed to start scan: ${e.message}")
        }
    }

    /**
     * Stop scanning for devices
     */
    @RequiresApi(Build.VERSION_CODES.JELLY_BEAN_MR2)
    fun stopScanning() {
        if (!isScanning.value) return

        try {
            scanCallback?.let { callback ->
                bluetoothLeScanner?.stopScan(callback)
            }

            handler.removeCallbacks(scanTimeoutRunnable)
            _isScanning.value = false
            logger.d("Stopped scanning for Bluetooth LE devices")

        } catch (e: Exception) {
            logger.e("Error stopping scan", e)
        }
    }

    // Device connection

    /**
     * Connect to a Bluetooth device
     */
    fun connectToDevice(device: BluetoothDevice) {
        if (connectedDevices.containsKey(device.address)) {
            logger.d("Device already connected: ${device.address}")
            return
        }

        if (!hasBluetoothPermissions()) {
            onErrorListener?.invoke("Bluetooth permissions not granted")
            return
        }

        try {
            _connectionState.value = ConnectionState.CONNECTING

            gattCallback = createGattCallback(device.address)
            bluetoothGatt = device.connectGatt(context, false, gattCallback, BluetoothDevice.TRANSPORT_LE)

            logger.d("Connecting to device: ${device.address}")

        } catch (e: SecurityException) {
            logger.e("Security exception during connection", e)
            _connectionState.value = ConnectionState.ERROR
            onErrorListener?.invoke("Security error: ${e.message}")
        } catch (e: Exception) {
            logger.e("Error connecting to device", e)
            _connectionState.value = ConnectionState.ERROR
            onErrorListener?.invoke("Failed to connect: ${e.message}")
        }
    }

    /**
     * Disconnect from a Bluetooth device
     */
    fun disconnectFromDevice(deviceAddress: String) {
        try {
            _connectionState.value = ConnectionState.DISCONNECTING

            connectedDevices[deviceAddress]?.disconnect()
            connectedDevices.remove(deviceAddress)

            if (bluetoothGatt?.device?.address == deviceAddress) {
                bluetoothGatt?.disconnect()
                bluetoothGatt?.close()
                bluetoothGatt = null
            }

            _connectionState.value = ConnectionState.DISCONNECTED
            onDeviceDisconnectedListener?.invoke(deviceAddress)

            logger.d("Disconnected from device: $deviceAddress")

        } catch (e: Exception) {
            logger.e("Error disconnecting from device", e)
            _connectionState.value = ConnectionState.ERROR
        }
    }

    /**
     * Disconnect from all connected devices
     */
    fun disconnectAllDevices() {
        val deviceAddresses = connectedDevices.keys.toList()
        deviceAddresses.forEach { address ->
            disconnectFromDevice(address)
        }
    }

    // Data operations

    /**
     * Read characteristic from device
     */
    fun readCharacteristic(deviceAddress: String, characteristic: BluetoothGattCharacteristic): Boolean {
        return try {
            connectedDevices[deviceAddress]?.readCharacteristic(characteristic) ?: false
        } catch (e: Exception) {
            logger.e("Error reading characteristic", e)
            false
        }
    }

    /**
     * Write characteristic to device
     */
    fun writeCharacteristic(
        deviceAddress: String,
        characteristic: BluetoothGattCharacteristic,
        value: ByteArray
    ): Boolean {
        return try {
            connectedDevices[deviceAddress]?.writeCharacteristic(characteristic, value) ?: false
        } catch (e: Exception) {
            logger.e("Error writing characteristic", e)
            false
        }
    }

    /**
     * Subscribe to characteristic notifications
     */
    fun subscribeToCharacteristic(
        deviceAddress: String,
        characteristic: BluetoothGattCharacteristic
    ): Boolean {
        return try {
            connectedDevices[deviceAddress]?.subscribeToCharacteristic(characteristic) ?: false
        } catch (e: Exception) {
            logger.e("Error subscribing to characteristic", e)
            false
        }
    }

    /**
     * Get device information
     */
    @SuppressLint("MissingPermission")
    fun getDeviceInfo(deviceAddress: String): SensorDevice? {
        return connectedDevices[deviceAddress]?.getDeviceInfo()
    }

    /**
     * Get connection status for a specific device
     */
    fun getConnectionStatus(deviceAddress: String): ConnectionState {
        return if (connectedDevices.containsKey(deviceAddress)) {
            ConnectionState.CONNECTED
        } else {
            ConnectionState.DISCONNECTED
        }
    }

    // Private helper methods

    @RequiresApi(Build.VERSION_CODES.JELLY_BEAN_MR2)
    private fun createScanCallback(): ScanCallback {
        return object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                super.onScanResult(callbackType, result)
                handleScanResult(result)
            }

            override fun onBatchScanResults(results: MutableList<ScanResult>) {
                super.onBatchScanResults(results)
                results.forEach { handleScanResult(it) }
            }

            override fun onScanFailed(errorCode: Int) {
                super.onScanFailed(errorCode)
                logger.e("Scan failed with error code: $errorCode")
                onErrorListener?.invoke("Scan failed: $errorCode")
                _isScanning.value = false
            }
        }
    }

    private fun handleScanResult(result: ScanResult) {
        val device = result.device
        val scanRecord = result.scanRecord
        val name = scanRecord?.deviceName ?: "Unknown"
        val rssi = result.rssi
        val serviceUuids = scanRecord?.serviceUuids

        // Check if this is a CannaAI sensor device
        val isCannaaiDevice = serviceUuids?.any { it.uuid == CANNAI_SERVICE_UUID } == true

        if (isCannaaiDevice || device.name?.contains("CannaAI", true) == true) {
            val bluetoothDevice = BluetoothDevice(
                name = name,
                address = device.address,
                rssi = rssi,
                isCannaaiDevice = isCannaaiDevice
            )

            discoveredDevices[device.address] = bluetoothDevice
            _discoveredDevices.value = discoveredDevices.values.toList()

            onDeviceDiscoveredListener?.invoke(bluetoothDevice)

            logger.d("Discovered device: $name (${device.address})")
        }
    }

    private fun createGattCallback(deviceAddress: String): BluetoothGattCallback {
        return object : BluetoothGattCallback() {
            override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
                when (newState) {
                    BluetoothProfile.STATE_CONNECTED -> {
                        logger.d("Device connected: $deviceAddress")
                        gatt.discoverServices()
                        _connectionState.value = ConnectionState.CONNECTED
                        onDeviceConnectedListener?.invoke(deviceAddress)
                    }
                    BluetoothProfile.STATE_DISCONNECTED -> {
                        logger.d("Device disconnected: $deviceAddress")
                        connectedDevices.remove(deviceAddress)
                        _connectionState.value = ConnectionState.DISCONNECTED
                        onDeviceDisconnectedListener?.invoke(deviceAddress)
                    }
                }
            }

            override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    logger.d("Services discovered for device: $deviceAddress")
                    setupDeviceConnection(gatt, deviceAddress)
                } else {
                    logger.e("Service discovery failed: $status")
                    _connectionState.value = ConnectionState.ERROR
                }
            }

            override fun onCharacteristicRead(
                gatt: BluetoothGatt,
                characteristic: BluetoothGattCharacteristic,
                status: Int
            ) {
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    handleCharacteristicRead(deviceAddress, characteristic)
                }
            }

            override fun onCharacteristicChanged(
                gatt: BluetoothGatt,
                characteristic: BluetoothGattCharacteristic
            ) {
                handleCharacteristicChanged(deviceAddress, characteristic)
            }

            override fun onCharacteristicWrite(
                gatt: BluetoothGatt,
                characteristic: BluetoothGattCharacteristic,
                status: Int
            ) {
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    logger.d("Characteristic written: ${characteristic.uuid}")
                }
            }
        }
    }

    private fun setupDeviceConnection(gatt: BluetoothGatt, deviceAddress: String) {
        try {
            val connection = BluetoothDeviceConnection(gatt, context)
            connectedDevices[deviceAddress] = connection

            // Subscribe to sensor data characteristic
            val sensorCharacteristic = gatt.getService(CANNAI_SERVICE_UUID)
                ?.getCharacteristic(SENSOR_DATA_CHARACTERISTIC)

            sensorCharacteristic?.let { characteristic ->
                connection.subscribeToCharacteristic(characteristic)
            }

            // Read device info
            val deviceInfoCharacteristic = gatt.getService(CANNAI_SERVICE_UUID)
                ?.getCharacteristic(DEVICE_INFO_CHARACTERISTIC)

            deviceInfoCharacteristic?.let { characteristic ->
                connection.readCharacteristic(characteristic)
            }

        } catch (e: Exception) {
            logger.e("Error setting up device connection", e)
            _connectionState.value = ConnectionState.ERROR
        }
    }

    private fun handleCharacteristicRead(deviceAddress: String, characteristic: BluetoothGattCharacteristic) {
        val value = characteristic.value
        when (characteristic.uuid) {
            DEVICE_INFO_CHARACTERISTIC -> {
                // Handle device info reading
                logger.d("Device info read for $deviceAddress")
            }
            BATTERY_LEVEL_CHARACTERISTIC -> {
                // Handle battery level reading
                val batteryLevel = value?.getOrNull(0)?.toInt() ?: 0
                logger.d("Battery level for $deviceAddress: $batteryLevel%")
            }
        }
    }

    private fun handleCharacteristicChanged(deviceAddress: String, characteristic: BluetoothGattCharacteristic) {
        when (characteristic.uuid) {
            SENSOR_DATA_CHARACTERISTIC -> {
                val reading = parseSensorData(characteristic.value)
                if (reading != null) {
                    val currentReadings = _sensorReadings.value.toMutableMap()
                    currentReadings[deviceAddress] = reading
                    _sensorReadings.value = currentReadings
                    onSensorDataReceivedListener?.invoke(deviceAddress, reading)
                }
            }
        }
    }

    private fun parseSensorData(data: ByteArray?): SensorReading? {
        if (data == null || data.size < 16) return null

        return try {
            // Parse sensor data based on CannaAI protocol
            // Format: [type(1), timestamp(4), value(4), battery(1), checksum(1), ...]
            val type = data[0].toInt() and 0xFF
            val timestamp = ((data[1].toInt() and 0xFF shl 24) or
                    (data[2].toInt() and 0xFF shl 16) or
                    (data[3].toInt() and 0xFF shl 8) or
                    (data[4].toInt() and 0xFF)).toLong()
            val value = ((data[5].toInt() and 0xFF shl 24) or
                    (data[6].toInt() and 0xFF shl 16) or
                    (data[7].toInt() and 0xFF shl 8) or
                    (data[8].toInt() and 0xFF)).toFloat() / 100f
            val battery = data[9].toInt() and 0xFF

            SensorReading(
                sensorType = when (type) {
                    0x01 -> "temperature"
                    0x02 -> "humidity"
                    0x03 -> "ph"
                    0x04 -> "light"
                    0x05 -> "co2"
                    else -> "unknown"
                },
                value = value,
                unit = when (type) {
                    0x01 -> "°C"
                    0x02 -> "%"
                    0x03 -> "pH"
                    0x04 -> "lux"
                    0x05 -> "ppm"
                    else -> ""
                },
                timestamp = timestamp,
                batteryLevel = battery
            )

        } catch (e: Exception) {
            logger.e("Error parsing sensor data", e)
            null
        }
    }

    // Setters for listeners

    fun setOnDeviceDiscoveredListener(listener: (BluetoothDevice) -> Unit) {
        onDeviceDiscoveredListener = listener
    }

    fun setOnDeviceConnectedListener(listener: (String) -> Unit) {
        onDeviceConnectedListener = listener
    }

    fun setOnDeviceDisconnectedListener(listener: (String) -> Unit) {
        onDeviceDisconnectedListener = listener
    }

    fun setOnSensorDataReceivedListener(listener: (String, SensorReading) -> Unit) {
        onSensorDataReceivedListener = listener
    }

    fun setOnErrorListener(listener: (String) -> Unit) {
        onErrorListener = listener
    }

    /**
     * Cleanup resources
     */
    fun cleanup() {
        try {
            stopScanning()
            disconnectAllDevices()
            handler.removeCallbacks(scanTimeoutRunnable)
            logger.d("Bluetooth manager cleaned up")

        } catch (e: Exception) {
            logger.e("Error during cleanup", e)
        }
    }
}

/**
 * Data class for Bluetooth device information
 */
data class BluetoothDevice(
    val name: String,
    val address: String,
    val rssi: Int,
    val isCannaAIDevice: Boolean = false,
    val deviceType: BluetoothManager.DeviceType = BluetoothManager.DeviceType.COMBINED_SENSOR
)

/**
 * Data class for sensor reading
 */
data class SensorReading(
    val sensorType: String,
    val value: Float,
    val unit: String,
    val timestamp: Long = System.currentTimeMillis(),
    val batteryLevel: Int? = null
)