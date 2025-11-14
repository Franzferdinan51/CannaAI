import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/sensor_data.dart';
import '../models/room_config.dart';
import '../models/sensor_device.dart';
import '../services/hardware_integration_service.dart';
import '../services/data_validation_service.dart';
import '../services/anomaly_detection_service.dart';
import '../services/data_smoothing_service.dart';

// Advanced sensor data management provider
final enhancedSensorDataProvider = StateNotifierProvider<EnhancedSensorDataNotifier, EnhancedSensorDataState>((ref) {
  return EnhancedSensorDataNotifier(ref);
});

// Room management provider
final roomManagementProvider = StateNotifierProvider<RoomManagementNotifier, RoomManagementState>((ref) {
  return RoomManagementNotifier(ref);
});

// Device management provider
final deviceManagementProvider = StateNotifierProvider<DeviceManagementNotifier, DeviceManagementState>((ref) {
  return DeviceManagementNotifier(ref);
});

class EnhancedSensorDataNotifier extends StateNotifier<EnhancedSensorDataState> {
  final Ref _ref;
  Timer? _dataCollectionTimer;
  Timer? _validationTimer;
  Timer? _backupTimer;
  Database? _database;
  Map<String, List<double>> _dataBuffers = {};
  Map<String, DateTime> _lastReadTimes = {};

  // Performance optimization
  static const int _maxHistoryLength = 1000;
  static const int _backupInterval = 300; // 5 minutes
  static const Duration _collectionInterval = Duration(seconds: 1);
  static const Duration _validationInterval = Duration(seconds: 10);

  // Sensor frequency optimization based on criticality
  static const Map<SensorType, Duration> _sensorFrequencies = {
    SensorType.temperature: Duration(seconds: 5),
    SensorType.humidity: Duration(seconds: 5),
    SensorType.co2: Duration(seconds: 30),
    SensorType.vpd: Duration(seconds: 10),
    SensorType.lightIntensity: Duration(seconds: 1),
    SensorType.soilMoisture: Duration(seconds: 60),
    SensorType.ph: Duration(seconds: 30),
    SensorType.ec: Duration(seconds: 30),
    SensorType.waterLevel: Duration(seconds: 120),
  };

  EnhancedSensorDataNotifier(this._ref) : super(const EnhancedSensorDataState()) {
    _initializeSystem();
  }

  Future<void> _initializeSystem() async {
    try {
      state = state.copyWith(isLoading: true);

      // Initialize database
      await _initializeDatabase();

      // Load historical data
      await _loadHistoricalData();

      // Initialize hardware service
      await _ref.read(hardwareServiceProvider.notifier).initialize();

      // Start data collection
      _startDataCollection();

      // Start validation routines
      _startValidationRoutines();

      // Start backup service
      _startBackupService();

      state = state.copyWith(isLoading: false, systemStatus: SystemStatus.operational);

    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'System initialization failed: ${e.toString()}',
        systemStatus: SystemStatus.error,
      );
    }
  }

  Future<void> _initializeDatabase() async {
    final databasesPath = await getDatabasesPath();
    final path = join(databasesPath, 'sensor_data.db');

    _database = await openDatabase(
      path,
      version: 1,
      onCreate: (Database db, int version) async {
        await db.execute('''
          CREATE TABLE sensor_readings (
            id TEXT PRIMARY KEY,
            device_id TEXT,
            room_id TEXT,
            timestamp INTEGER,
            data TEXT,
            quality_score REAL,
            is_anomaly INTEGER,
            metadata TEXT
          )
        ''');

        await db.execute('''
          CREATE TABLE sensor_data_summary (
            room_id TEXT,
            sensor_type TEXT,
            timestamp INTEGER,
            min_value REAL,
            max_value REAL,
            avg_value REAL,
            count INTEGER,
            PRIMARY KEY (room_id, sensor_type, timestamp)
          )
        ''');

        await db.execute('''
          CREATE INDEX idx_sensor_readings_timestamp ON sensor_readings(timestamp);
          CREATE INDEX idx_sensor_readings_room_device ON sensor_readings(room_id, device_id);
        ''');
      },
    );
  }

  Future<void> _loadHistoricalData() async {
    if (_database == null) return;

    final now = DateTime.now().millisecondsSinceEpoch;
    final twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);

    final List<Map<String, dynamic>> maps = await _database!.query(
      'sensor_readings',
      where: 'timestamp >= ?',
      whereArgs: [twentyFourHoursAgo],
      orderBy: 'timestamp DESC',
      limit: _maxHistoryLength,
    );

    final historicalData = maps.map((map) {
      final dataJson = jsonDecode(map['data'] as String);
      return SensorData.fromJson(dataJson);
    }).toList();

    state = state.copyWith(historicalData: historicalData);
  }

  void _startDataCollection() {
    _dataCollectionTimer = Timer.periodic(_collectionInterval, (_) {
      _collectSensorData();
    });
  }

  void _startValidationRoutines() {
    _validationTimer = Timer.periodic(_validationInterval, (_) {
      _validateSensorData();
    });
  }

  void _startBackupService() {
    _backupTimer = Timer.periodic(Duration(seconds: _backupInterval), (_) {
      _backupData();
    });
  }

  Future<void> _collectSensorData() async {
    try {
      final timestamp = DateTime.now();
      final rooms = _ref.read(roomManagementProvider).activeRooms;

      for (final room in rooms) {
        final devices = _ref.read(deviceManagementProvider).getDevicesForRoom(room.id);

        for (final device in devices) {
          if (!device.isActive) continue;

          final sensorData = await _collectFromDevice(device, room);
          if (sensorData != null) {
            await _processSensorData(sensorData);
          }
        }
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error collecting sensor data: $e');
      }
    }
  }

  Future<SensorData?> _collectFromDevice(SensorDevice device, RoomConfig room) async {
    try {
      // Check if we should collect from this sensor based on its frequency
      final sensorType = _getPrimarySensorType(device);
      final lastRead = _lastReadTimes[device.id] ?? DateTime.fromMillisecondsSinceEpoch(0);
      final frequency = _sensorFrequencies[sensorType] ?? Duration(seconds: 30);

      if (DateTime.now().difference(lastRead) < frequency) {
        return null;
      }

      final hardwareService = _ref.read(hardwareServiceProvider);
      final rawMetrics = await hardwareService.readFromDevice(device);

      if (rawMetrics == null) return null;

      _lastReadTimes[device.id] = DateTime.now();

      // Apply data smoothing
      final smoothedMetrics = await _applyDataSmoothing(device.id, rawMetrics);

      // Validate data quality
      final qualityScore = await _validateDataQuality(device, smoothedMetrics);

      // Check for anomalies
      final isAnomaly = await _detectAnomalies(device, smoothedMetrics);

      return SensorData(
        id: '${device.id}_${DateTime.now().millisecondsSinceEpoch}',
        deviceId: device.id,
        roomId: room.id,
        timestamp: DateTime.now(),
        metrics: smoothedMetrics,
        metadata: {
          'quality_score': qualityScore,
          'is_anomaly': isAnomaly,
          'device_type': device.type,
          'collection_method': hardwareService.getDeviceConnectionType(device.id),
        },
      );

    } catch (e) {
      if (kDebugMode) {
        print('Error collecting from device ${device.id}: $e');
      }
      return null;
    }
  }

  SensorType _getPrimarySensorType(SensorDevice device) {
    switch (device.type.toLowerCase()) {
      case 'temperature':
        return SensorType.temperature;
      case 'humidity':
        return SensorType.humidity;
      case 'ph':
        return SensorType.ph;
      case 'ec':
        return SensorType.ec;
      case 'co2':
        return SensorType.co2;
      case 'light':
      case 'par':
        return SensorType.lightIntensity;
      case 'soil_moisture':
        return SensorType.soilMoisture;
      case 'water_level':
        return SensorType.waterLevel;
      default:
        return SensorType.temperature;
    }
  }

  Future<SensorMetrics> _applyDataSmoothing(String deviceId, SensorMetrics rawMetrics) async {
    return _ref.read(dataSmoothingServiceProvider).smoothData(deviceId, rawMetrics);
  }

  Future<double> _validateDataQuality(SensorDevice device, SensorMetrics metrics) async {
    return _ref.read(dataValidationServiceProvider).validateQuality(device, metrics);
  }

  Future<bool> _detectAnomalies(SensorDevice device, SensorMetrics metrics) async {
    return _ref.read(anomalyDetectionServiceProvider).detectAnomaly(device, metrics);
  }

  Future<void> _processSensorData(SensorData sensorData) async {
    // Update current data for the room
    final currentRoomData = Map<String, SensorData>.from(state.currentRoomData);
    currentRoomData[sensorData.roomId] = sensorData;

    // Update historical data
    final updatedHistory = List<SensorData>.from(state.historicalData);
    updatedHistory.insert(0, sensorData);

    // Limit history length for performance
    if (updatedHistory.length > _maxHistoryLength) {
      updatedHistory.removeRange(_maxHistoryLength, updatedHistory.length);
    }

    // Update state
    state = state.copyWith(
      currentRoomData: currentRoomData,
      historicalData: updatedHistory,
      lastUpdateTime: DateTime.now(),
    );

    // Store in database
    await _storeSensorData(sensorData);

    // Trigger alerts if needed
    await _checkAlerts(sensorData);

    // Update aggregations
    await _updateAggregations(sensorData);
  }

  Future<void> _storeSensorData(SensorData sensorData) async {
    if (_database == null) return;

    await _database!.insert(
      'sensor_readings',
      {
        'id': sensorData.id,
        'device_id': sensorData.deviceId,
        'room_id': sensorData.roomId,
        'timestamp': sensorData.timestamp.millisecondsSinceEpoch,
        'data': jsonEncode(sensorData.toJson()),
        'quality_score': sensorData.metadata?['quality_score'] ?? 1.0,
        'is_anomaly': sensorData.metadata?['is_anomaly'] == true ? 1 : 0,
        'metadata': jsonEncode(sensorData.metadata ?? {}),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> _checkAlerts(SensorData sensorData) async {
    final roomConfig = _ref.read(roomManagementProvider).getRoomById(sensorData.roomId);
    if (roomConfig == null) return;

    final metrics = sensorData.metrics;
    final alerts = <SensorAlert>[];

    // Check each sensor against thresholds
    _checkThresholdAlerts(sensorData, roomConfig, alerts);

    if (alerts.isNotEmpty) {
      final updatedAlerts = List<SensorAlert>.from(state.activeAlerts);
      updatedAlerts.addAll(alerts);
      state = state.copyWith(activeAlerts: updatedAlerts);
    }
  }

  void _checkThresholdAlerts(SensorData sensorData, RoomConfig room, List<SensorAlert> alerts) {
    final metrics = sensorData.metrics;

    // Temperature checks
    if (metrics.temperature != null) {
      if (metrics.temperature! < room.temperatureRange.min) {
        alerts.add(_createAlert(
          sensorData,
          'temperature_low',
          AlertSeverity.warning,
          'Temperature below minimum threshold',
          'Increase heating or check ventilation',
        ));
      } else if (metrics.temperature! > room.temperatureRange.max) {
        alerts.add(_createAlert(
          sensorData,
          'temperature_high',
          AlertSeverity.critical,
          'Temperature above maximum threshold',
          'Increase ventilation or cooling',
        ));
      }
    }

    // Humidity checks
    if (metrics.humidity != null) {
      if (metrics.humidity! < room.humidityRange.min) {
        alerts.add(_createAlert(
          sensorData,
          'humidity_low',
          AlertSeverity.warning,
          'Humidity below minimum threshold',
          'Increase humidification or reduce ventilation',
        ));
      } else if (metrics.humidity! > room.humidityRange.max) {
        alerts.add(_createAlert(
          sensorData,
          'humidity_high',
          AlertSeverity.critical,
          'Humidity above maximum threshold',
          'Increase ventilation or dehumidification',
        ));
      }
    }

    // CO2 checks
    if (metrics.co2 != null) {
      if (metrics.co2! < room.co2Range.min) {
        alerts.add(_createAlert(
          sensorData,
          'co2_low',
          AlertSeverity.info,
          'CO2 below minimum threshold',
          'Consider CO2 enrichment for better growth',
        ));
      } else if (metrics.co2! > room.co2Range.max) {
        alerts.add(_createAlert(
          sensorData,
          'co2_high',
          AlertSeverity.critical,
          'CO2 above maximum threshold',
          'Increase ventilation immediately',
        ));
      }
    }

    // VPD checks
    if (metrics.vpd != null) {
      if (metrics.vpd! < room.vpdRange.min || metrics.vpd! > room.vpdRange.max) {
        alerts.add(_createAlert(
          sensorData,
          'vpd_out_of_range',
          AlertSeverity.warning,
          'VPD outside optimal range',
          'Adjust temperature and humidity balance',
        ));
      }
    }

    // Soil moisture checks
    if (metrics.soilMoisture != null) {
      if (metrics.soilMoisture! < room.soilMoistureRange.min) {
        alerts.add(_createAlert(
          sensorData,
          'soil_moisture_low',
          AlertSeverity.critical,
          'Soil moisture critically low',
          'Irrigation needed immediately',
        ));
      } else if (metrics.soilMoisture! > room.soilMoistureRange.max) {
        alerts.add(_createAlert(
          sensorData,
          'soil_moisture_high',
          AlertSeverity.warning,
          'Soil moisture too high',
          'Risk of root rot, reduce watering',
        ));
      }
    }

    // pH checks
    if (metrics.ph != null) {
      if (metrics.ph! < room.phRange.min || metrics.ph! > room.phRange.max) {
        alerts.add(_createAlert(
          sensorData,
          'ph_out_of_range',
          AlertSeverity.warning,
          'pH outside optimal range',
          'Adjust nutrient solution pH',
        ));
      }
    }

    // EC checks
    if (metrics.ec != null) {
      if (metrics.ec! < room.ecRange.min || metrics.ec! > room.ecRange.max) {
        alerts.add(_createAlert(
          sensorData,
          'ec_out_of_range',
          AlertSeverity.warning,
          'EC outside optimal range',
          'Adjust nutrient concentration',
        ));
      }
    }
  }

  SensorAlert _createAlert(
    SensorData sensorData,
    String alertType,
    AlertSeverity severity,
    String message,
    String recommendation,
  ) {
    return SensorAlert(
      id: '${alertType}_${sensorData.id}',
      deviceId: sensorData.deviceId,
      roomId: sensorData.roomId,
      alertType: alertType,
      severity: severity.name,
      message: message,
      recommendation: recommendation,
      timestamp: DateTime.now(),
    );
  }

  Future<void> _updateAggregations(SensorData sensorData) async {
    // Update hourly, daily summaries
    // This would be implemented with background processing
  }

  Future<void> _validateSensorData() async {
    // Run comprehensive validation on all sensors
    // Check sensor health, calibration status, data trends
  }

  Future<void> _backupData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastBackup = prefs.getInt('last_sensor_backup') ?? 0;
      final now = DateTime.now().millisecondsSinceEpoch;

      if (now - lastBackup > _backupInterval * 1000) {
        // Perform incremental backup
        await _performIncrementalBackup();
        await prefs.setInt('last_sensor_backup', now);
      }
    } catch (e) {
      if (kDebugMode) {
        print('Backup failed: $e');
      }
    }
  }

  Future<void> _performIncrementalBackup() async {
    // Implement incremental backup logic
    // Export new data since last backup
  }

  // Public API methods
  Future<void> acknowledgeAlert(String alertId) async {
    final updatedAlerts = state.activeAlerts.map((alert) {
      if (alert.id == alertId) {
        return alert.copyWith(
          acknowledged: true,
          acknowledgedAt: DateTime.now(),
        );
      }
      return alert;
    }).toList();

    state = state.copyWith(activeAlerts: updatedAlerts);
  }

  Future<void> dismissAlert(String alertId) async {
    final updatedAlerts = state.activeAlerts.where((alert) => alert.id != alertId).toList();
    state = state.copyWith(activeAlerts: updatedAlerts);
  }

  Future<List<SensorData>> getHistoricalDataForRoom(
    String roomId, {
    DateTime? startTime,
    DateTime? endTime,
    SensorType? sensorType,
    int? limit,
  }) async {
    if (_database == null) return [];

    String whereClause = 'room_id = ?';
    List<dynamic> whereArgs = [roomId];

    if (startTime != null) {
      whereClause += ' AND timestamp >= ?';
      whereArgs.add(startTime.millisecondsSinceEpoch);
    }

    if (endTime != null) {
      whereClause += ' AND timestamp <= ?';
      whereArgs.add(endTime.millisecondsSinceEpoch);
    }

    final maps = await _database!.query(
      'sensor_readings',
      where: whereClause,
      whereArgs: whereArgs,
      orderBy: 'timestamp DESC',
      limit: limit,
    );

    return maps.map((map) {
      final dataJson = jsonDecode(map['data'] as String);
      return SensorData.fromJson(dataJson);
    }).toList();
  }

  double? getCurrentValue(String roomId, SensorType sensorType) {
    final roomData = state.currentRoomData[roomId];
    if (roomData == null) return null;

    switch (sensorType) {
      case SensorType.temperature:
        return roomData.metrics.temperature;
      case SensorType.humidity:
        return roomData.metrics.humidity;
      case SensorType.ph:
        return roomData.metrics.ph;
      case SensorType.ec:
        return roomData.metrics.ec;
      case SensorType.co2:
        return roomData.metrics.co2;
      case SensorType.vpd:
        return roomData.metrics.vpd;
      case SensorType.lightIntensity:
        return roomData.metrics.lightIntensity;
      case SensorType.soilMoisture:
        return roomData.metrics.soilMoisture;
      case SensorType.waterLevel:
        return roomData.metrics.waterLevel;
    }
  }

  SensorStatus getSensorStatus(String roomId, SensorType sensorType) {
    final value = getCurrentValue(roomId, sensorType);
    if (value == null) return SensorStatus.unknown;

    final room = _ref.read(roomManagementProvider).getRoomById(roomId);
    if (room == null) return SensorStatus.unknown;

    switch (sensorType) {
      case SensorType.temperature:
        if (value < room.temperatureRange.min || value > room.temperatureRange.max) {
          return SensorStatus.critical;
        }
        return SensorStatus.optimal;
      case SensorType.humidity:
        if (value < room.humidityRange.min || value > room.humidityRange.max) {
          return SensorStatus.critical;
        }
        return SensorStatus.optimal;
      case SensorType.co2:
        if (value < room.co2Range.min || value > room.co2Range.max) {
          return SensorStatus.critical;
        }
        return SensorStatus.optimal;
      case SensorType.vpd:
        if (value < room.vpdRange.min || value > room.vpdRange.max) {
          return SensorStatus.warning;
        }
        return SensorStatus.optimal;
      case SensorType.soilMoisture:
        if (value < room.soilMoistureRange.min || value > room.soilMoistureRange.max) {
          return SensorStatus.critical;
        }
        return SensorStatus.optimal;
      case SensorType.ph:
        if (value < room.phRange.min || value > room.phRange.max) {
          return SensorStatus.warning;
        }
        return SensorStatus.optimal;
      case SensorType.ec:
        if (value < room.ecRange.min || value > room.ecRange.max) {
          return SensorStatus.warning;
        }
        return SensorStatus.optimal;
      default:
        return SensorStatus.optimal;
    }
  }

  Future<void> calibrateSensor(String deviceId, Map<String, double> calibrationValues) async {
    final device = _ref.read(deviceManagementProvider).getDeviceById(deviceId);
    if (device == null) return;

    await _ref.read(hardwareServiceProvider).calibrateDevice(device, calibrationValues);

    // Update device calibration status
    await _ref.read(deviceManagementProvider.notifier).updateCalibration(deviceId, calibrationValues);
  }

  Future<void> recalibrateAllSensors() async {
    final devices = _ref.read(deviceManagementProvider).devices;

    for (final device in devices) {
      if (device.needsCalibration) {
        await calibrateSensor(device.id, device.calibrationValues);
      }
    }
  }

  void _processIncomingData(String deviceId, SensorMetrics metrics) {
    // Process incoming sensor data from hardware integration
    // This would be called by the hardware integration service

    // Find the room for this device
    final device = _ref.read(deviceManagementProvider).getDeviceById(deviceId);
    if (device == null) return;

    final roomId = device.roomId;

    // Create sensor data point
    final now = DateTime.now();
    final sensorData = SensorData(
      id: '${deviceId}_${now.millisecondsSinceEpoch}',
      deviceId: deviceId,
      roomId: roomId,
      timestamp: now,
      metrics: metrics,
    );

    // Process through the standard pipeline
    _processSensorData(sensorData);
  }

  Future<void> _refreshSensorData() async {
    // Refresh sensor data from all connected devices
    try {
      final devices = _ref.read(deviceManagementProvider).activeDevices;

      for (final device in devices) {
        final metrics = await _ref.read(hardwareIntegrationProvider.notifier).readFromDevice(device);
        if (metrics != null) {
          _processIncomingData(device.id, metrics);
        }
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error refreshing sensor data: $e');
      }
    }
  }

  @override
  void dispose() {
    _dataCollectionTimer?.cancel();
    _validationTimer?.cancel();
    _backupTimer?.cancel();
    _database?.close();
    super.dispose();
  }
}

class RoomManagementNotifier extends StateNotifier<RoomManagementState> {
  final Ref _ref;

  RoomManagementNotifier(this._ref) : super(const RoomManagementState()) {
    _loadRooms();
  }

  Future<void> _loadRooms() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final roomsJson = prefs.getStringList('rooms') ?? [];

      final rooms = roomsJson.map((json) {
        return RoomConfig.fromJson(jsonDecode(json));
      }).toList();

      state = state.copyWith(rooms: rooms);
    } catch (e) {
      if (kDebugMode) {
        print('Error loading rooms: $e');
      }
    }
  }

  Future<void> addRoom(RoomConfig room) async {
    final updatedRooms = List<RoomConfig>.from(state.rooms)..add(room);
    await _saveRooms(updatedRooms);
    state = state.copyWith(rooms: updatedRooms);
  }

  Future<void> updateRoom(RoomConfig room) async {
    final updatedRooms = state.rooms.map((r) => r.id == room.id ? room : r).toList();
    await _saveRooms(updatedRooms);
    state = state.copyWith(rooms: updatedRooms);
  }

  Future<void> deleteRoom(String roomId) async {
    final updatedRooms = state.rooms.where((r) => r.id != roomId).toList();
    await _saveRooms(updatedRooms);
    state = state.copyWith(rooms: updatedRooms);
  }

  Future<void> toggleRoomActivation(String roomId) async {
    final room = getRoomById(roomId);
    if (room == null) return;

    final updatedRoom = room.copyWith(isActive: !room.isActive);
    await updateRoom(updatedRoom);
  }

  Future<void> _saveRooms(List<RoomConfig> rooms) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final roomsJson = rooms.map((room) => jsonEncode(room.toJson())).toList();
      await prefs.setStringList('rooms', roomsJson);
    } catch (e) {
      if (kDebugMode) {
        print('Error saving rooms: $e');
      }
    }
  }

  RoomConfig? getRoomById(String roomId) {
    try {
      return state.rooms.firstWhere((room) => room.id == roomId);
    } catch (e) {
      return null;
    }
  }

  List<RoomConfig> get activeRooms =>
      state.rooms.where((room) => room.isActive).toList();
}

class DeviceManagementNotifier extends StateNotifier<DeviceManagementState> {
  final Ref _ref;

  DeviceManagementNotifier(this._ref) : super(const DeviceManagementState()) {
    _loadDevices();
  }

  Future<void> _loadDevices() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final devicesJson = prefs.getStringList('sensor_devices') ?? [];

      final devices = devicesJson.map((json) {
        return SensorDevice.fromJson(jsonDecode(json));
      }).toList();

      state = state.copyWith(devices: devices);
    } catch (e) {
      if (kDebugMode) {
        print('Error loading devices: $e');
      }
    }
  }

  Future<void> addDevice(SensorDevice device) async {
    final updatedDevices = List<SensorDevice>.from(state.devices)..add(device);
    await _saveDevices(updatedDevices);
    state = state.copyWith(devices: updatedDevices);
  }

  Future<void> updateDevice(SensorDevice device) async {
    final updatedDevices = state.devices.map((d) => d.id == device.id ? device : d).toList();
    await _saveDevices(updatedDevices);
    state = state.copyWith(devices: updatedDevices);
  }

  Future<void> deleteDevice(String deviceId) async {
    final updatedDevices = state.devices.where((d) => d.id != deviceId).toList();
    await _saveDevices(updatedDevices);
    state = state.copyWith(devices: updatedDevices);
  }

  Future<void> toggleDeviceActivation(String deviceId) async {
    final device = getDeviceById(deviceId);
    if (device == null) return;

    final updatedDevice = device.copyWith(isActive: !device.isActive);
    await updateDevice(updatedDevice);
  }

  Future<void> updateCalibration(String deviceId, Map<String, double> calibrationValues) async {
    final device = getDeviceById(deviceId);
    if (device == null) return;

    final updatedDevice = device.copyWith(
      calibrationValues: calibrationValues,
      lastCalibration: DateTime.now(),
      needsCalibration: false,
    );

    await updateDevice(updatedDevice);
  }

  Future<void> _saveDevices(List<SensorDevice> devices) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final devicesJson = devices.map((device) => jsonEncode(device.toJson())).toList();
      await prefs.setStringList('sensor_devices', devicesJson);
    } catch (e) {
      if (kDebugMode) {
        print('Error saving devices: $e');
      }
    }
  }

  SensorDevice? getDeviceById(String deviceId) {
    try {
      return state.devices.firstWhere((device) => device.id == deviceId);
    } catch (e) {
      return null;
    }
  }

  List<SensorDevice> getDevicesForRoom(String roomId) {
    return state.devices.where((device) => device.roomId == roomId).toList();
  }

  List<SensorDevice> get activeDevices =>
      state.devices.where((device) => device.isActive).toList();
}

// Enhanced data models
class EnhancedSensorDataState {
  final Map<String, SensorData> currentRoomData;
  final List<SensorData> historicalData;
  final List<SensorAlert> activeAlerts;
  final bool isLoading;
  final String? error;
  final SystemStatus systemStatus;
  final DateTime? lastUpdateTime;

  const EnhancedSensorDataState({
    this.currentRoomData = const {},
    this.historicalData = const [],
    this.activeAlerts = const [],
    this.isLoading = false,
    this.error,
    this.systemStatus = SystemStatus.initializing,
    this.lastUpdateTime,
  });

  EnhancedSensorDataState copyWith({
    Map<String, SensorData>? currentRoomData,
    List<SensorData>? historicalData,
    List<SensorAlert>? activeAlerts,
    bool? isLoading,
    String? error,
    SystemStatus? systemStatus,
    DateTime? lastUpdateTime,
  }) {
    return EnhancedSensorDataState(
      currentRoomData: currentRoomData ?? this.currentRoomData,
      historicalData: historicalData ?? this.historicalData,
      activeAlerts: activeAlerts ?? this.activeAlerts,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
      systemStatus: systemStatus ?? this.systemStatus,
      lastUpdateTime: lastUpdateTime ?? this.lastUpdateTime,
    );
  }
}

class RoomManagementState {
  final List<RoomConfig> rooms;
  final bool isLoading;
  final String? error;

  const RoomManagementState({
    this.rooms = const [],
    this.isLoading = false,
    this.error,
  });

  RoomManagementState copyWith({
    List<RoomConfig>? rooms,
    bool? isLoading,
    String? error,
  }) {
    return RoomManagementState(
      rooms: rooms ?? this.rooms,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

class DeviceManagementState {
  final List<SensorDevice> devices;
  final bool isLoading;
  final String? error;

  const DeviceManagementState({
    this.devices = const [],
    this.isLoading = false,
    this.error,
  });

  DeviceManagementState copyWith({
    List<SensorDevice>? devices,
    bool? isLoading,
    String? error,
  }) {
    return DeviceManagementState(
      devices: devices ?? this.devices,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

// Enums and supporting classes
enum SystemStatus {
  initializing,
  operational,
  warning,
  error,
  maintenance,
}

enum AlertSeverity {
  info,
  warning,
  critical,
}

enum SensorType {
  temperature,
  humidity,
  ph,
  ec,
  co2,
  vpd,
  lightIntensity,
  soilMoisture,
  waterLevel,
}

enum SensorStatus {
  optimal,
  warning,
  critical,
  unknown,
}

enum ConnectionType {
  bluetooth,
  wifi,
  usb,
  gpio,
  modbus,
  rs485,
}