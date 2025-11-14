import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_reactive_ble/flutter_reactive_ble.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:http/http.dart' as http;
import 'package:network_info_plus/network_info_plus.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/sensor_device.dart';
import '../models/sensor_data.dart';
import '../providers/bluetooth_provider.dart';
import '../providers/wifi_provider.dart';

// Hardware integration provider
final hardwareIntegrationProvider = StateNotifierProvider<HardwareIntegrationNotifier, HardwareIntegrationState>((ref) {
  return HardwareIntegrationNotifier(ref);
});

class HardwareIntegrationNotifier extends StateNotifier<HardwareIntegrationState> {
  final Ref _ref;

  // Connection management
  final Map<String, DeviceConnection> _activeConnections = {};
  final Map<String, StreamSubscription> _dataSubscriptions = {};
  final Map<String, Timer> _heartbeatTimers = {};

  // Service instances
  late FlutterReactiveBle _ble;
  late NetworkInfo _networkInfo;

  // Configuration
  static const Duration _connectionTimeout = Duration(seconds: 30);
  static const Duration _heartbeatInterval = Duration(seconds: 10);
  static const Duration _scanTimeout = Duration(seconds: 30);
  static const int _maxReconnectAttempts = 3;

  HardwareIntegrationNotifier(this._ref) : super(const HardwareIntegrationState()) {
    _initializeServices();
  }

  Future<void> _initializeServices() async {
    try {
      _ble = FlutterReactiveBle();
      _networkInfo = NetworkInfo();

      // Request permissions
      await _requestPermissions();

      // Load saved connections
      await _loadSavedConnections();

      state = state.copyWith(isInitialized: true);
    } catch (e) {
      state = state.copyWith(
        error: 'Hardware integration initialization failed: ${e.toString()}',
        isInitialized: false,
      );
    }
  }

  Future<void> _requestPermissions() async {
    final permissions = [
      Permission.bluetooth,
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
      Permission.bluetoothAdvertise,
      Permission.location,
      Permission.nearbyWifiDevices,
      Permission.wifi,
      Permission.internet,
    ];

    for (final permission in permissions) {
      final status = await permission.request();
      if (status.isDenied && kDebugMode) {
        print('Permission denied: $permission');
      }
    }
  }

  Future<void> _loadSavedConnections() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final connectionsJson = prefs.getStringList('saved_connections') ?? [];

      for (final connectionJson in connectionsJson) {
        final connection = DeviceConnection.fromJson(jsonDecode(connectionJson));
        _activeConnections[connection.deviceId] = connection;
      }

      state = state.copyWith(
        connectedDevices: _activeConnections.values.toList(),
      );
    } catch (e) {
      if (kDebugMode) {
        print('Error loading saved connections: $e');
      }
    }
  }

  Future<void> _saveConnections() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final connectionsJson = _activeConnections.values
          .map((connection) => jsonEncode(connection.toJson()))
          .toList();
      await prefs.setStringList('saved_connections', connectionsJson);
    } catch (e) {
      if (kDebugMode) {
        print('Error saving connections: $e');
      }
    }
  }

  // Device discovery and connection
  Future<List<SensorDevice>> scanForDevices({
    ConnectionType? connectionType,
    Duration? timeout,
  }) async {
    try {
      state = state.copyWith(isScanning: true);

      final discoveredDevices = <SensorDevice>[];
      final scanTimeout = timeout ?? _scanTimeout;

      switch (connectionType) {
        case ConnectionType.bluetooth:
          final bleDevices = await _scanBluetoothDevices(scanTimeout);
          discoveredDevices.addAll(bleDevices);
          break;
        case ConnectionType.wifi:
          final wifiDevices = await _scanWifiDevices(scanTimeout);
          discoveredDevices.addAll(wifiDevices);
          break;
        case ConnectionType.usb:
          final usbDevices = await _scanUsbDevices();
          discoveredDevices.addAll(usbDevices);
          break;
        case ConnectionType.modbus:
          final modbusDevices = await _scanModbusDevices();
          discoveredDevices.addAll(modbusDevices);
          break;
        default:
          // Scan all supported types
          final bleDevices = await _scanBluetoothDevices(scanTimeout);
          final wifiDevices = await _scanWifiDevices(scanTimeout);
          final usbDevices = await _scanUsbDevices();

          discoveredDevices.addAll(bleDevices);
          discoveredDevices.addAll(wifiDevices);
          discoveredDevices.addAll(usbDevices);
      }

      state = state.copyWith(
        discoveredDevices: discoveredDevices,
        isScanning: false,
      );

      return discoveredDevices;
    } catch (e) {
      state = state.copyWith(
        isScanning: false,
        error: 'Device scan failed: ${e.toString()}',
      );
      return [];
    }
  }

  Future<List<SensorDevice>> _scanBluetoothDevices(Duration timeout) async {
    final devices = <SensorDevice>[];
    final completer = Completer<List<SensorDevice>>();

    _ble.scanForDevices(
      withServices: [],
      scanMode: ScanMode.lowLatency,
      requireLocationServicesEnabled: true,
    ).listen(
      (device) {
        // Check if device is a known sensor type
        if (_isKnownSensorDevice(device)) {
          final sensorDevice = _createBluetoothDevice(device);
          if (sensorDevice != null) {
            devices.add(sensorDevice);
          }
        }
      },
      onError: (error) {
        if (!completer.isCompleted) {
          completer.completeError(error);
        }
      },
      onDone: () {
        if (!completer.isCompleted) {
          completer.complete(devices);
        }
      },
    );

    // Set timeout
    Timer(timeout, () {
      if (!completer.isCompleted) {
        completer.complete(devices);
      }
    });

    return completer.future;
  }

  Future<List<SensorDevice>> _scanWifiDevices(Duration timeout) async {
    final devices = <SensorDevice>[];

    try {
      // Get connected WiFi info
      final wifiInfo = await _networkInfo.getWifiName();
      final wifiBSSID = await _networkInfo.getWifiBSSID();
      final wifiIP = await _networkInfo.getWifiIP();

      // Scan network for IoT devices
      final networkDevices = await _scanNetworkForDevices(timeout);

      for (final device in networkDevices) {
        if (_isKnownWifiSensor(device)) {
          final sensorDevice = await _createWifiDevice(device);
          if (sensorDevice != null) {
            devices.add(sensorDevice);
          }
        }
      }
    } catch (e) {
      if (kDebugMode) {
        print('WiFi scan error: $e');
      }
    }

    return devices;
  }

  Future<List<SensorDevice>> _scanUsbDevices() async {
    final devices = <SensorDevice>[];

    try {
      // Use platform-specific USB scanning
      if (Platform.isAndroid) {
        final usbDevices = await _scanAndroidUsbDevices();
        devices.addAll(usbDevices);
      } else if (Platform.isWindows) {
        final usbDevices = await _scanWindowsUsbDevices();
        devices.addAll(usbDevices);
      }
    } catch (e) {
      if (kDebugMode) {
        print('USB scan error: $e');
      }
    }

    return devices;
  }

  Future<List<SensorDevice>> _scanModbusDevices() async {
    final devices = <SensorDevice>[];

    try {
      // Scan common Modbus TCP ports on the local network
      final modbusPorts = [502, 5020];
      final networkDevices = await _scanNetworkForDevices(const Duration(seconds: 10));

      for (final device in networkDevices) {
        for (final port in modbusPorts) {
          if (await _testModbusConnection(device, port)) {
            final modbusDevice = await _createModbusDevice(device, port);
            if (modbusDevice != null) {
              devices.add(modbusDevice);
            }
          }
        }
      }
    } catch (e) {
      if (kDebugMode) {
        print('Modbus scan error: $e');
      }
    }

    return devices;
  }

  bool _isKnownSensorDevice(DiscoveredDevice device) {
    final name = device.name.toLowerCase();
    final serviceData = device.serviceData;

    // Check for known sensor manufacturers and patterns
    final knownPatterns = [
      'sensor', 'temp', 'humid', 'co2', 'ph', 'ec',
      'par', 'light', 'soil', 'water', 'air',
      'sense', 'monitor', 'meter', 'probe'
    ];

    // Check device name
    for (final pattern in knownPatterns) {
      if (name.contains(pattern)) {
        return true;
      }
    }

    // Check service data for known sensor service UUIDs
    for (final serviceId in serviceData.keys) {
      if (_isKnownSensorService(serviceId.toString())) {
        return true;
      }
    }

    return false;
  }

  bool _isKnownSensorService(String serviceUuid) {
    final knownServices = [
      '1819', // Environmental Sensing
      '181A', // Location and Navigation
      '181C', // User Data
      '181D', // Weight Scale
      '181F', // Physical Activity Monitor
      '1812', // HID Service
      '1813', // Scan Parameters
      '1814', // Running Speed and Cadence
      '1816', // Cycling Speed and Cadence
    ];

    return knownServices.any((uuid) => serviceUuid.toLowerCase().contains(uuid.toLowerCase()));
  }

  SensorDevice? _createBluetoothDevice(DiscoveredDevice device) {
    try {
      final capabilities = _detectBluetoothCapabilities(device);

      return SensorDevice(
        id: device.id,
        name: device.name.isNotEmpty ? device.name : 'Unknown Bluetooth Device',
        description: 'Bluetooth environmental sensor',
        roomId: '', // Will be assigned later
        type: _detectDeviceType(device),
        manufacturer: 'Unknown',
        model: device.name,
        firmwareVersion: 'Unknown',
        hardwareVersion: 'Unknown',
        serialNumber: device.id,
        macAddress: device.id,
        ipAddress: '',
        connectionType: ConnectionType.bluetooth,
        isActive: false,
        isOnline: false,
        status: DeviceStatus.offline,
        lastSeen: DateTime.now(),
        needsCalibration: false,
        calibrationValues: {},
        capabilities: capabilities,
        configuration: DeviceConfiguration(
          samplingIntervalMs: 5000,
          reportingIntervalMs: 30000,
          enableDataCompression: true,
          enableDataSmoothing: false,
          smoothingWindowSize: 5,
          enableAnomalyDetection: false,
          anomalyThreshold: 2.0,
          enableAutoCalibration: false,
          autoCalibrationIntervalHours: 24,
          powerConfiguration: PowerConfiguration(
            enableLowPowerMode: true,
            lowPowerThreshold: 20,
            sleepIntervalMs: 60000,
            enableWakeOnDemand: true,
            batteryWarningThreshold: 15,
          ),
          networkConfiguration: NetworkConfiguration(
            ssid: '',
            connectionTimeoutMs: 30000,
            reconnectIntervalMs: 5000,
            maxReconnectAttempts: 3,
            enableKeepAlive: true,
            keepAliveIntervalMs: 30000,
          ),
          customSettings: {},
        ),
        metadata: {
          'rssi': device.rssi.toString(),
          'service_data': jsonEncode(device.serviceData),
        },
        createdAt: DateTime.now(),
      );
    } catch (e) {
      if (kDebugMode) {
        print('Error creating Bluetooth device: $e');
      }
      return null;
    }
  }

  String _detectDeviceType(DiscoveredDevice device) {
    final name = device.name.toLowerCase();

    if (name.contains('temp')) return 'temperature';
    if (name.contains('humid')) return 'humidity';
    if (name.contains('co2')) return 'co2';
    if (name.contains('ph')) return 'ph';
    if (name.contains('ec')) return 'ec';
    if (name.contains('light') || name.contains('par')) return 'light_intensity';
    if (name.contains('soil')) return 'soil_moisture';
    if (name.contains('water')) return 'water_level';

    return 'multi_sensor';
  }

  SensorCapabilities _detectBluetoothCapabilities(DiscoveredDevice device) {
    final supportedSensors = <SensorType>{};
    final name = device.name.toLowerCase();

    // Detect supported sensors based on device name and services
    if (name.contains('temp') || _hasEnvironmentalService(device)) {
      supportedSensors.add(SensorType.temperature);
    }
    if (name.contains('humid') || _hasEnvironmentalService(device)) {
      supportedSensors.add(SensorType.humidity);
    }
    if (name.contains('co2')) {
      supportedSensors.add(SensorType.co2);
    }
    if (name.contains('ph')) {
      supportedSensors.add(SensorType.ph);
    }
    if (name.contains('ec')) {
      supportedSensors.add(SensorType.ec);
    }
    if (name.contains('light') || name.contains('par')) {
      supportedSensors.add(SensorType.lightIntensity);
    }
    if (name.contains('soil')) {
      supportedSensors.add(SensorType.soilMoisture);
    }
    if (name.contains('water')) {
      supportedSensors.add(SensorType.waterLevel);
    }

    // Default to temperature sensor if no specific type detected
    if (supportedSensors.isEmpty) {
      supportedSensors.add(SensorType.temperature);
    }

    return SensorCapabilities(
      supportedSensors: supportedSensors,
      measurementAccuracy: 95.0,
      calibrationIntervalDays: 30,
      responseTimeMs: 2000,
      operatingTemperatureMin: -20.0,
      operatingTemperatureMax: 60.0,
      operatingHumidityMin: 10.0,
      operatingHumidityMax: 95.0,
      supportsDataLogging: true,
      supportsCalibration: true,
      supportsFirmwareUpdate: false,
      dataBufferSize: 1000,
      powerRequirements: PowerRequirements(
        voltage: 3.3,
        current: 0.01,
        powerConsumption: 0.033,
        powerSource: PowerSource.battery,
        supportsBatteryBackup: false,
        batteryCapacity: 500.0,
        batteryLifeHours: 24.0,
      ),
      supportedProtocols: CommunicationProtocols(
        supportsBluetooth: true,
        supportsWiFi: false,
        supportsEthernet: false,
        supportsModbus: false,
        supportsRS485: false,
        supportsUSB: false,
        supportsGPIO: false,
        supportsMQTT: false,
        supportsHTTP: false,
        supportsWebSocket: false,
      ),
    );
  }

  bool _hasEnvironmentalService(DiscoveredDevice device) {
    return device.serviceData.keys.any((serviceId) =>
        serviceId.toString().toLowerCase().contains('1819')); // Environmental Sensing UUID
  }

  Future<List<Map<String, String>>> _scanNetworkForDevices(Duration timeout) async {
    // Simplified network scanning - in a real implementation, this would
    // use proper network discovery protocols like mDNS, UPnP, or network scanning
    final devices = <Map<String, String>>[];

    try {
      // Get local network info
      final localIp = await _networkInfo.getWifiIP();
      if (localIp == null) return devices;

      // Parse network segment
      final parts = localIp.split('.');
      if (parts.length != 4) return devices;

      final networkBase = '${parts[0]}.${parts[1]}.${parts[2]}';

      // Scan common IoT device IPs (limited range for performance)
      final commonIps = [
        '1', '10', '20', '30', '40', '50', '100', '101', '102',
        '200', '201', '202', '254'
      ];

      final futures = <Future<Map<String, String>?>>[];

      for (final lastOctet in commonIps) {
        final ip = '$networkBase.$lastOctet';
        futures.add(_testNetworkDevice(ip));
      }

      final results = await Future.wait(futures);
      for (final result in results) {
        if (result != null) {
          devices.add(result);
        }
      }
    } catch (e) {
      if (kDebugMode) {
        print('Network scan error: $e');
      }
    }

    return devices;
  }

  Future<Map<String, String>?> _testNetworkDevice(String ip) async {
    try {
      final result = await InternetAddress.lookup(ip)
          .timeout(const Duration(seconds: 2));

      if (result.isNotEmpty && result[0].address == ip) {
        return {
          'ip': ip,
          'hostname': result[0].host,
        };
      }
    } catch (e) {
      // Device not reachable
    }
    return null;
  }

  bool _isKnownWifiSensor(Map<String, String> device) {
    final hostname = device['hostname']?.toLowerCase() ?? '';

    final knownPatterns = [
      'sensor', 'arduino', 'esp', 'raspberry', 'pi',
      'temp', 'humid', 'co2', 'monitor', 'iot'
    ];

    return knownPatterns.any((pattern) => hostname.contains(pattern));
  }

  Future<SensorDevice?> _createWifiDevice(Map<String, String> device) async {
    try {
      final ip = device['ip']!;
      final hostname = device['hostname']!;

      // Try to detect device type via HTTP API
      final deviceType = await _detectWifiDeviceType(ip);
      final capabilities = _getWifiDeviceCapabilities(deviceType);

      return SensorDevice(
        id: ip,
        name: hostname.isNotEmpty ? hostname : 'WiFi Sensor',
        description: 'WiFi-based environmental sensor',
        roomId: '',
        type: deviceType,
        manufacturer: 'Unknown',
        model: 'WiFi Device',
        firmwareVersion: 'Unknown',
        hardwareVersion: 'Unknown',
        serialNumber: ip,
        macAddress: '',
        ipAddress: ip,
        connectionType: ConnectionType.wifi,
        isActive: false,
        isOnline: false,
        status: DeviceStatus.offline,
        lastSeen: DateTime.now(),
        needsCalibration: false,
        calibrationValues: {},
        capabilities: capabilities,
        configuration: DeviceConfiguration(
          samplingIntervalMs: 5000,
          reportingIntervalMs: 30000,
          enableDataCompression: true,
          enableDataSmoothing: false,
          smoothingWindowSize: 5,
          enableAnomalyDetection: false,
          anomalyThreshold: 2.0,
          enableAutoCalibration: false,
          autoCalibrationIntervalHours: 24,
          powerConfiguration: PowerConfiguration(
            enableLowPowerMode: true,
            lowPowerThreshold: 20,
            sleepIntervalMs: 60000,
            enableWakeOnDemand: true,
            batteryWarningThreshold: 15,
          ),
          networkConfiguration: NetworkConfiguration(
            ssid: '',
            connectionTimeoutMs: 30000,
            reconnectIntervalMs: 5000,
            maxReconnectAttempts: 3,
            enableKeepAlive: true,
            keepAliveIntervalMs: 30000,
          ),
          customSettings: {},
        ),
        metadata: {
          'network_discovery': 'true',
        },
        createdAt: DateTime.now(),
      );
    } catch (e) {
      if (kDebugMode) {
        print('Error creating WiFi device: $e');
      }
      return null;
    }
  }

  Future<String> _detectWifiDeviceType(String ip) async {
    try {
      // Try common sensor API endpoints
      final endpoints = [
        '/api/info',
        '/info',
        '/status',
        '/data',
        '/sensor',
      ];

      for (final endpoint in endpoints) {
        try {
          final response = await http.get(
            Uri.parse('http://$ip$endpoint'),
          ).timeout(const Duration(seconds: 2));

          if (response.statusCode == 200) {
            // Parse response to determine device type
            final data = jsonDecode(response.body);
            if (data['type'] != null) {
              return data['type'].toString();
            }
          }
        } catch (e) {
          // Continue to next endpoint
        }
      }
    } catch (e) {
      // Unable to determine type
    }

    return 'multi_sensor';
  }

  SensorCapabilities _getWifiDeviceCapabilities(String deviceType) {
    switch (deviceType.toLowerCase()) {
      case 'temperature':
        return SensorCapabilities(
          supportedSensors: {SensorType.temperature},
          measurementAccuracy: 98.0,
          calibrationIntervalDays: 90,
          responseTimeMs: 1000,
          operatingTemperatureMin: -40.0,
          operatingTemperatureMax: 85.0,
          operatingHumidityMin: 0.0,
          operatingHumidityMax: 100.0,
          supportsDataLogging: true,
          supportsCalibration: true,
          supportsFirmwareUpdate: true,
          dataBufferSize: 10000,
          powerRequirements: PowerRequirements(
            voltage: 5.0,
            current: 0.1,
            powerConsumption: 0.5,
            powerSource: PowerSource.mains,
            supportsBatteryBackup: true,
          ),
          supportedProtocols: CommunicationProtocols(
            supportsBluetooth: false,
            supportsWiFi: true,
            supportsEthernet: true,
            supportsModbus: false,
            supportsRS485: false,
            supportsUSB: false,
            supportsGPIO: false,
            supportsMQTT: true,
            supportsHTTP: true,
            supportsWebSocket: true,
          ),
        );
      default:
        return SensorCapabilities(
          supportedSensors: {
            SensorType.temperature,
            SensorType.humidity,
            SensorType.soilMoisture,
          },
          measurementAccuracy: 95.0,
          calibrationIntervalDays: 30,
          responseTimeMs: 2000,
          operatingTemperatureMin: -20.0,
          operatingTemperatureMax: 60.0,
          operatingHumidityMin: 10.0,
          operatingHumidityMax: 95.0,
          supportsDataLogging: true,
          supportsCalibration: true,
          supportsFirmwareUpdate: true,
          dataBufferSize: 5000,
          powerRequirements: PowerRequirements(
            voltage: 5.0,
            current: 0.2,
            powerConsumption: 1.0,
            powerSource: PowerSource.mains,
            supportsBatteryBackup: false,
          ),
          supportedProtocols: CommunicationProtocols(
            supportsBluetooth: false,
            supportsWiFi: true,
            supportsEthernet: true,
            supportsModbus: false,
            supportsRS485: false,
            supportsUSB: false,
            supportsGPIO: false,
            supportsMQTT: true,
            supportsHTTP: true,
            supportsWebSocket: true,
          ),
        );
    }
  }

  // Device connection management
  Future<bool> connectToDevice(SensorDevice device) async {
    try {
      state = state.copyWith(isConnecting: true);

      DeviceConnection? connection;

      switch (device.connectionType) {
        case ConnectionType.bluetooth:
          connection = await _connectBluetoothDevice(device);
          break;
        case ConnectionType.wifi:
          connection = await _connectWifiDevice(device);
          break;
        case ConnectionType.usb:
          connection = await _connectUsbDevice(device);
          break;
        case ConnectionType.modbus:
          connection = await _connectModbusDevice(device);
          break;
        default:
          throw UnsupportedError('Connection type ${device.connectionType} not supported');
      }

      if (connection != null) {
        _activeConnections[device.id] = connection;

        // Start data collection
        _startDataCollection(device.id, connection);

        // Start heartbeat monitoring
        _startHeartbeat(device.id);

        // Save connection
        await _saveConnections();

        state = state.copyWith(
          isConnecting: false,
          connectedDevices: _activeConnections.values.toList(),
        );

        return true;
      } else {
        state = state.copyWith(isConnecting: false);
        return false;
      }
    } catch (e) {
      state = state.copyWith(
        isConnecting: false,
        error: 'Failed to connect to device: ${e.toString()}',
      );
      return false;
    }
  }

  Future<DeviceConnection?> _connectBluetoothDevice(SensorDevice device) async {
    try {
      final connectionInfo = await _ble.connectToDevice(
        id: device.id,
        servicesWithCharacteristicsToDiscover: {},
        connectionTimeout: _connectionTimeout,
      );

      return DeviceConnection(
        deviceId: device.id,
        connectionType: ConnectionType.bluetooth,
        connectionInfo: connectionInfo,
        isConnected: true,
        lastActivity: DateTime.now(),
      );
    } catch (e) {
      if (kDebugMode) {
        print('Bluetooth connection error: $e');
      }
      return null;
    }
  }

  Future<DeviceConnection?> _connectWifiDevice(SensorDevice device) async {
    try {
      // Test connection with HTTP request
      final response = await http.get(
        Uri.parse('http://${device.ipAddress}/api/status'),
      ).timeout(_connectionTimeout);

      if (response.statusCode == 200) {
        return DeviceConnection(
          deviceId: device.id,
          connectionType: ConnectionType.wifi,
          connectionInfo: {'ip': device.ipAddress, 'port': 80},
          isConnected: true,
          lastActivity: DateTime.now(),
        );
      }
    } catch (e) {
      if (kDebugMode) {
        print('WiFi connection error: $e');
      }
    }
    return null;
  }

  Future<DeviceConnection?> _connectUsbDevice(SensorDevice device) async {
    // USB connection would be platform-specific
    // This is a placeholder implementation
    try {
      if (Platform.isAndroid) {
        final connection = await _connectAndroidUsbDevice(device);
        return connection;
      }
    } catch (e) {
      if (kDebugMode) {
        print('USB connection error: $e');
      }
    }
    return null;
  }

  Future<DeviceConnection?> _connectModbusDevice(SensorDevice device) async {
    // Modbus TCP connection implementation
    try {
      final connection = await _connectModbusTcp(device);
      return connection;
    } catch (e) {
      if (kDebugMode) {
        print('Modbus connection error: $e');
      }
    }
    return null;
  }

  void _startDataCollection(String deviceId, DeviceConnection connection) {
    // Start data stream based on connection type
    Stream<SensorMetrics> dataStream;

    switch (connection.connectionType) {
      case ConnectionType.bluetooth:
        dataStream = _createBluetoothDataStream(deviceId, connection);
        break;
      case ConnectionType.wifi:
        dataStream = _createWifiDataStream(deviceId, connection);
        break;
      case ConnectionType.modbus:
        dataStream = _createModbusDataStream(deviceId, connection);
        break;
      default:
        return;
    }

    final subscription = dataStream.listen(
      (metrics) {
        _handleSensorData(deviceId, metrics);
      },
      onError: (error) {
        _handleDataError(deviceId, error);
      },
    );

    _dataSubscriptions[deviceId] = subscription;
  }

  Stream<SensorMetrics> _createBluetoothDataStream(String deviceId, DeviceConnection connection) {
    // Implementation for Bluetooth data streaming
    // This would use BLE characteristic notifications
    return Stream.periodic(const Duration(seconds: 5), (_) {
      // Return mock data for now
      return SensorMetrics(
        temperature: 20.0 + (DateTime.now().millisecond % 10),
        humidity: 60.0 + (DateTime.now().millisecond % 20),
      );
    });
  }

  Stream<SensorMetrics> _createWifiDataStream(String deviceId, DeviceConnection connection) {
    // Implementation for WiFi data streaming via HTTP polling
    return Stream.periodic(const Duration(seconds: 5), (_) async* {
      try {
        final ip = connection.connectionInfo['ip'] as String;
        final response = await http.get(
          Uri.parse('http://$ip/api/data'),
        ).timeout(const Duration(seconds: 5));

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          yield _parseSensorMetrics(data);
        }
      } catch (e) {
        if (kDebugMode) {
          print('WiFi data stream error: $e');
        }
      }
    }).asyncMap((event) => event);
  }

  Stream<SensorMetrics> _createModbusDataStream(String deviceId, DeviceConnection connection) {
    // Implementation for Modbus data streaming
    return Stream.periodic(const Duration(seconds: 10), (_) {
      // Return mock data for now
      return SensorMetrics(
        temperature: 22.0 + (DateTime.now().millisecond % 8),
        humidity: 55.0 + (DateTime.now().millisecond % 15),
      );
    });
  }

  SensorMetrics _parseSensorMetrics(Map<String, dynamic> data) {
    return SensorMetrics(
      temperature: data['temperature']?.toDouble(),
      humidity: data['humidity']?.toDouble(),
      ph: data['ph']?.toDouble(),
      ec: data['ec']?.toDouble(),
      co2: data['co2']?.toDouble(),
      vpd: data['vpd']?.toDouble(),
      lightIntensity: data['light_intensity']?.toDouble(),
      soilMoisture: data['soil_moisture']?.toDouble(),
      waterLevel: data['water_level']?.toDouble(),
      airPressure: data['air_pressure']?.toDouble(),
      windSpeed: data['wind_speed']?.toDouble(),
    );
  }

  void _handleSensorData(String deviceId, SensorMetrics metrics) {
    final connection = _activeConnections[deviceId];
    if (connection != null) {
      _activeConnections[deviceId] = connection.copyWith(
        lastActivity: DateTime.now(),
        lastData: metrics,
      );
    }

    // Update state
    state = state.copyWith(
      connectedDevices: _activeConnections.values.toList(),
    );

    // Notify data providers
    _ref.read(enhancedSensorDataProvider.notifier)._processIncomingData(deviceId, metrics);
  }

  void _handleDataError(String deviceId, dynamic error) {
    if (kDebugMode) {
      print('Data stream error for device $deviceId: $error');
    }

    // Attempt reconnection
    _attemptReconnection(deviceId);
  }

  void _startHeartbeat(String deviceId) {
    _heartbeatTimers[deviceId] = Timer.periodic(_heartbeatInterval, (_) {
      _checkDeviceHeartbeat(deviceId);
    });
  }

  void _checkDeviceHeartbeat(String deviceId) {
    final connection = _activeConnections[deviceId];
    if (connection == null) return;

    final timeSinceLastActivity = DateTime.now().difference(connection.lastActivity);

    if (timeSinceLastActivity > Duration(seconds: 30)) {
      // Device appears to be offline
      _markDeviceOffline(deviceId);
    }
  }

  void _markDeviceOffline(String deviceId) {
    final connection = _activeConnections[deviceId];
    if (connection != null) {
      _activeConnections[deviceId] = connection.copyWith(
        isConnected: false,
      );
    }

    state = state.copyWith(
      connectedDevices: _activeConnections.values.toList(),
    );
  }

  void _attemptReconnection(String deviceId) {
    if (_activeConnections[deviceId]?.reconnectAttempts ?? 0 >= _maxReconnectAttempts) {
      return;
    }

    // Increment reconnect attempts
    final connection = _activeConnections[deviceId];
    if (connection != null) {
      _activeConnections[deviceId] = connection.copyWith(
        reconnectAttempts: (connection.reconnectAttempts ?? 0) + 1,
      );
    }

    // Schedule reconnection attempt
    Future.delayed(const Duration(seconds: 5), () {
      _reconnectDevice(deviceId);
    });
  }

  Future<void> _reconnectDevice(String deviceId) async {
    final device = _ref.read(deviceManagementProvider).getDeviceById(deviceId);
    if (device == null) return;

    await connectToDevice(device);
  }

  // Public API methods
  Future<SensorMetrics?> readFromDevice(SensorDevice device) async {
    try {
      final connection = _activeConnections[device.id];
      if (connection?.isConnected != true) {
        return null;
      }

      switch (device.connectionType) {
        case ConnectionType.bluetooth:
          return await _readBluetoothData(device);
        case ConnectionType.wifi:
          return await _readWifiData(device);
        case ConnectionType.modbus:
          return await _readModbusData(device);
        default:
          return null;
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error reading from device: $e');
      }
      return null;
    }
  }

  Future<SensorMetrics?> _readBluetoothData(SensorDevice device) async {
    // Implementation for reading data via BLE characteristics
    return null; // Placeholder
  }

  Future<SensorMetrics?> _readWifiData(SensorDevice device) async {
    try {
      final response = await http.get(
        Uri.parse('http://${device.ipAddress}/api/data'),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return _parseSensorMetrics(data);
      }
    } catch (e) {
      if (kDebugMode) {
        print('WiFi data read error: $e');
      }
    }
    return null;
  }

  Future<SensorMetrics?> _readModbusData(SensorDevice device) async {
    // Implementation for reading Modbus registers
    return null; // Placeholder
  }

  Future<bool> sendCommandToDevice(SensorDevice device, Map<String, dynamic> command) async {
    try {
      final connection = _activeConnections[device.id];
      if (connection?.isConnected != true) {
        return false;
      }

      switch (device.connectionType) {
        case ConnectionType.bluetooth:
          return await _sendBluetoothCommand(device, command);
        case ConnectionType.wifi:
          return await _sendWifiCommand(device, command);
        case ConnectionType.modbus:
          return await _sendModbusCommand(device, command);
        default:
          return false;
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error sending command to device: $e');
      }
      return false;
    }
  }

  Future<bool> _sendBluetoothCommand(SensorDevice device, Map<String, dynamic> command) async {
    // Implementation for sending commands via BLE characteristics
    return false; // Placeholder
  }

  Future<bool> _sendWifiCommand(SensorDevice device, Map<String, dynamic> command) async {
    try {
      final response = await http.post(
        Uri.parse('http://${device.ipAddress}/api/command'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(command),
      ).timeout(const Duration(seconds: 10));

      return response.statusCode == 200;
    } catch (e) {
      if (kDebugMode) {
        print('WiFi command error: $e');
      }
    }
    return false;
  }

  Future<bool> _sendModbusCommand(SensorDevice device, Map<String, dynamic> command) async {
    // Implementation for sending Modbus commands
    return false; // Placeholder
  }

  Future<void> calibrateDevice(SensorDevice device, Map<String, double> calibrationValues) async {
    final command = {
      'type': 'calibrate',
      'values': calibrationValues,
    };

    await sendCommandToDevice(device, command);
  }

  String getDeviceConnectionType(String deviceId) {
    final connection = _activeConnections[deviceId];
    return connection?.connectionType.name ?? 'none';
  }

  Future<void> disconnectDevice(String deviceId) async {
    try {
      // Cancel data subscription
      final subscription = _dataSubscriptions.remove(deviceId);
      await subscription?.cancel();

      // Cancel heartbeat timer
      final timer = _heartbeatTimers.remove(deviceId);
      timer?.cancel();

      // Disconnect based on type
      final connection = _activeConnections[deviceId];
      if (connection != null) {
        await _disconnectByType(connection);
        _activeConnections.remove(deviceId);
      }

      await _saveConnections();

      state = state.copyWith(
        connectedDevices: _activeConnections.values.toList(),
      );
    } catch (e) {
      if (kDebugMode) {
        print('Error disconnecting device: $e');
      }
    }
  }

  Future<void> _disconnectByType(DeviceConnection connection) async {
    switch (connection.connectionType) {
      case ConnectionType.bluetooth:
        await _ble.disconnectDevice(id: connection.deviceId);
        break;
      case ConnectionType.wifi:
        // WiFi connections are stateless, no explicit disconnect needed
        break;
      case ConnectionType.usb:
        // USB disconnect would be platform-specific
        break;
      case ConnectionType.modbus:
        // Close Modbus TCP connection
        break;
    }
  }

  Future<void> disconnectAllDevices() async {
    final deviceIds = _activeConnections.keys.toList();
    for (final deviceId in deviceIds) {
      await disconnectDevice(deviceId);
    }
  }

  // Placeholder methods for platform-specific implementations
  Future<List<SensorDevice>> _scanAndroidUsbDevices() async => [];
  Future<List<SensorDevice>> _scanWindowsUsbDevices() async => [];
  Future<List<SensorDevice>> _scanModbusDevices() async => [];
  Future<bool> _testModbusConnection(Map<String, String> device, int port) async => false;
  Future<SensorDevice?> _createModbusDevice(Map<String, String> device, int port) async => null;
  Future<DeviceConnection?> _connectAndroidUsbDevice(SensorDevice device) async => null;
  Future<DeviceConnection?> _connectModbusTcp(SensorDevice device) async => null;

  @override
  void dispose() {
    for (final subscription in _dataSubscriptions.values) {
      subscription.cancel();
    }
    for (final timer in _heartbeatTimers.values) {
      timer.cancel();
    }
    super.dispose();
  }
}

// Data models
class HardwareIntegrationState {
  final bool isInitialized;
  final bool isScanning;
  final bool isConnecting;
  final List<SensorDevice> discoveredDevices;
  final List<DeviceConnection> connectedDevices;
  final String? error;

  const HardwareIntegrationState({
    this.isInitialized = false,
    this.isScanning = false,
    this.isConnecting = false,
    this.discoveredDevices = const [],
    this.connectedDevices = const [],
    this.error,
  });

  HardwareIntegrationState copyWith({
    bool? isInitialized,
    bool? isScanning,
    bool? isConnecting,
    List<SensorDevice>? discoveredDevices,
    List<DeviceConnection>? connectedDevices,
    String? error,
  }) {
    return HardwareIntegrationState(
      isInitialized: isInitialized ?? this.isInitialized,
      isScanning: isScanning ?? this.isScanning,
      isConnecting: isConnecting ?? this.isConnecting,
      discoveredDevices: discoveredDevices ?? this.discoveredDevices,
      connectedDevices: connectedDevices ?? this.connectedDevices,
      error: error ?? this.error,
    );
  }
}

@JsonSerializable()
class DeviceConnection {
  final String deviceId;
  final ConnectionType connectionType;
  final dynamic connectionInfo;
  final bool isConnected;
  final DateTime lastActivity;
  final SensorMetrics? lastData;
  final int? reconnectAttempts;

  DeviceConnection({
    required this.deviceId,
    required this.connectionType,
    required this.connectionInfo,
    required this.isConnected,
    required this.lastActivity,
    this.lastData,
    this.reconnectAttempts,
  });

  factory DeviceConnection.fromJson(Map<String, dynamic> json) =>
      _$DeviceConnectionFromJson(json);

  Map<String, dynamic> toJson() => _$DeviceConnectionToJson(this);

  DeviceConnection copyWith({
    String? deviceId,
    ConnectionType? connectionType,
    dynamic connectionInfo,
    bool? isConnected,
    DateTime? lastActivity,
    SensorMetrics? lastData,
    int? reconnectAttempts,
  }) {
    return DeviceConnection(
      deviceId: deviceId ?? this.deviceId,
      connectionType: connectionType ?? this.connectionType,
      connectionInfo: connectionInfo ?? this.connectionInfo,
      isConnected: isConnected ?? this.isConnected,
      lastActivity: lastActivity ?? this.lastActivity,
      lastData: lastData ?? this.lastData,
      reconnectAttempts: reconnectAttempts ?? this.reconnectAttempts,
    );
  }

  @override
  String toString() {
    return 'DeviceConnection(deviceId: $deviceId, connectionType: $connectionType, isConnected: $isConnected)';
  }
}

// Extensions to enhance the sensor provider with incoming data processing
extension EnhancedSensorDataNotifierExtension on EnhancedSensorDataNotifier {
  void _processIncomingData(String deviceId, SensorMetrics metrics) {
    // Process incoming sensor data from hardware integration
    // This would be called by the hardware integration service
  }
}