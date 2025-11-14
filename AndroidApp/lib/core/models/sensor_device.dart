import 'package:json_annotation/json_annotation.dart';

part 'sensor_device.g.dart';

@JsonSerializable()
class SensorDevice {
  final String id;
  final String name;
  final String description;
  final String roomId;
  final String type;
  final String manufacturer;
  final String model;
  final String firmwareVersion;
  final String hardwareVersion;
  final String serialNumber;
  final String macAddress;
  final String ipAddress;
  final ConnectionType connectionType;
  final bool isActive;
  final bool isOnline;
  final DeviceStatus status;
  final DateTime lastSeen;
  final DateTime? lastCalibration;
  final bool needsCalibration;
  final Map<String, double> calibrationValues;
  final SensorCapabilities capabilities;
  final DeviceConfiguration configuration;
  final Map<String, dynamic> metadata;
  final DateTime createdAt;
  final DateTime? lastModified;

  SensorDevice({
    required this.id,
    required this.name,
    required this.description,
    required this.roomId,
    required this.type,
    required this.manufacturer,
    required this.model,
    required this.firmwareVersion,
    required this.hardwareVersion,
    required this.serialNumber,
    required this.macAddress,
    required this.ipAddress,
    required this.connectionType,
    required this.isActive,
    required this.isOnline,
    required this.status,
    required this.lastSeen,
    this.lastCalibration,
    required this.needsCalibration,
    required this.calibrationValues,
    required this.capabilities,
    required this.configuration,
    required this.metadata,
    required this.createdAt,
    this.lastModified,
  });

  factory SensorDevice.fromJson(Map<String, dynamic> json) =>
      _$SensorDeviceFromJson(json);

  Map<String, dynamic> toJson() => _$SensorDeviceToJson(this);

  SensorDevice copyWith({
    String? id,
    String? name,
    String? description,
    String? roomId,
    String? type,
    String? manufacturer,
    String? model,
    String? firmwareVersion,
    String? hardwareVersion,
    String? serialNumber,
    String? macAddress,
    String? ipAddress,
    ConnectionType? connectionType,
    bool? isActive,
    bool? isOnline,
    DeviceStatus? status,
    DateTime? lastSeen,
    DateTime? lastCalibration,
    bool? needsCalibration,
    Map<String, double>? calibrationValues,
    SensorCapabilities? capabilities,
    DeviceConfiguration? configuration,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
    DateTime? lastModified,
  }) {
    return SensorDevice(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      roomId: roomId ?? this.roomId,
      type: type ?? this.type,
      manufacturer: manufacturer ?? this.manufacturer,
      model: model ?? this.model,
      firmwareVersion: firmwareVersion ?? this.firmwareVersion,
      hardwareVersion: hardwareVersion ?? this.hardwareVersion,
      serialNumber: serialNumber ?? this.serialNumber,
      macAddress: macAddress ?? this.macAddress,
      ipAddress: ipAddress ?? this.ipAddress,
      connectionType: connectionType ?? this.connectionType,
      isActive: isActive ?? this.isActive,
      isOnline: isOnline ?? this.isOnline,
      status: status ?? this.status,
      lastSeen: lastSeen ?? this.lastSeen,
      lastCalibration: lastCalibration ?? this.lastCalibration,
      needsCalibration: needsCalibration ?? this.needsCalibration,
      calibrationValues: calibrationValues ?? this.calibrationValues,
      capabilities: capabilities ?? this.capabilities,
      configuration: configuration ?? this.configuration,
      metadata: metadata ?? this.metadata,
      createdAt: createdAt ?? this.createdAt,
      lastModified: lastModified ?? DateTime.now(),
    );
  }

  // Check if device is due for calibration
  bool isCalibrationOverdue() {
    if (lastCalibration == null) return true;
    final now = DateTime.now();
    final daysSinceCalibration = now.difference(lastCalibration!).inDays;
    return daysSinceCalibration > capabilities.calibrationIntervalDays;
  }

  // Get device health score (0-100)
  double getHealthScore() {
    double score = 100.0;

    // Penalty for being offline
    if (!isOnline) score -= 50.0;

    // Penalty for errors
    if (status == DeviceStatus.error) score -= 40.0;
    if (status == DeviceStatus.warning) score -= 20.0;

    // Penalty for calibration needed
    if (needsCalibration) score -= 15.0;

    // Penalty for being old (more than 1 year since last seen)
    final daysSinceLastSeen = DateTime.now().difference(lastSeen).inDays;
    if (daysSinceLastSeen > 365) score -= 25.0;

    return score.clamp(0.0, 100.0);
  }

  // Get connection strength indicator (0-100)
  double getConnectionStrength() {
    if (!isOnline) return 0.0;

    // Calculate based on last seen time
    final minutesSinceLastSeen = DateTime.now().difference(lastSeen).inMinutes;
    if (minutesSinceLastSeen < 1) return 100.0;
    if (minutesSinceLastSeen < 5) return 80.0;
    if (minutesSinceLastSeen < 15) return 60.0;
    if (minutesSinceLastSeen < 60) return 40.0;
    return 20.0;
  }

  @override
  String toString() {
    return 'SensorDevice(id: $id, name: $name, type: $type, isOnline: $isOnline, status: $status)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is SensorDevice &&
        other.id == id &&
        other.name == name &&
        other.roomId == roomId &&
        other.type == type;
  }

  @override
  int get hashCode {
    return id.hashCode ^ name.hashCode ^ roomId.hashCode ^ type.hashCode;
  }
}

@JsonSerializable()
class SensorCapabilities {
  final Set<SensorType> supportedSensors;
  final double measurementAccuracy;
  final int calibrationIntervalDays;
  final int responseTimeMs;
  final double operatingTemperatureMin;
  final double operatingTemperatureMax;
  final double operatingHumidityMin;
  final double operatingHumidityMax;
  final bool supportsDataLogging;
  final bool supportsCalibration;
  final bool supportsFirmwareUpdate;
  final int dataBufferSize;
  final PowerRequirements powerRequirements;
  final CommunicationProtocols supportedProtocols;

  SensorCapabilities({
    required this.supportedSensors,
    required this.measurementAccuracy,
    required this.calibrationIntervalDays,
    required this.responseTimeMs,
    required this.operatingTemperatureMin,
    required this.operatingTemperatureMax,
    required this.operatingHumidityMin,
    required this.operatingHumidityMax,
    required this.supportsDataLogging,
    required this.supportsCalibration,
    required this.supportsFirmwareUpdate,
    required this.dataBufferSize,
    required this.powerRequirements,
    required this.supportedProtocols,
  });

  factory SensorCapabilities.fromJson(Map<String, dynamic> json) =>
      _$SensorCapabilitiesFromJson(json);

  Map<String, dynamic> toJson() => _$SensorCapabilitiesToJson(this);

  SensorCapabilities copyWith({
    Set<SensorType>? supportedSensors,
    double? measurementAccuracy,
    int? calibrationIntervalDays,
    int? responseTimeMs,
    double? operatingTemperatureMin,
    double? operatingTemperatureMax,
    double? operatingHumidityMin,
    double? operatingHumidityMax,
    bool? supportsDataLogging,
    bool? supportsCalibration,
    bool? supportsFirmwareUpdate,
    int? dataBufferSize,
    PowerRequirements? powerRequirements,
    CommunicationProtocols? supportedProtocols,
  }) {
    return SensorCapabilities(
      supportedSensors: supportedSensors ?? this.supportedSensors,
      measurementAccuracy: measurementAccuracy ?? this.measurementAccuracy,
      calibrationIntervalDays: calibrationIntervalDays ?? this.calibrationIntervalDays,
      responseTimeMs: responseTimeMs ?? this.responseTimeMs,
      operatingTemperatureMin: operatingTemperatureMin ?? this.operatingTemperatureMin,
      operatingTemperatureMax: operatingTemperatureMax ?? this.operatingTemperatureMax,
      operatingHumidityMin: operatingHumidityMin ?? this.operatingHumidityMin,
      operatingHumidityMax: operatingHumidityMax ?? this.operatingHumidityMax,
      supportsDataLogging: supportsDataLogging ?? this.supportsDataLogging,
      supportsCalibration: supportsCalibration ?? this.supportsCalibration,
      supportsFirmwareUpdate: supportsFirmwareUpdate ?? this.supportsFirmwareUpdate,
      dataBufferSize: dataBufferSize ?? this.dataBufferSize,
      powerRequirements: powerRequirements ?? this.powerRequirements,
      supportedProtocols: supportedProtocols ?? this.supportedProtocols,
    );
  }

  bool supportsSensorType(SensorType type) {
    return supportedSensors.contains(type);
  }

  bool isOperatingConditionsValid(double temperature, double humidity) {
    return temperature >= operatingTemperatureMin &&
        temperature <= operatingTemperatureMax &&
        humidity >= operatingHumidityMin &&
        humidity <= operatingHumidityMax;
  }

  @override
  String toString() {
    return 'SensorCapabilities(supportedSensors: $supportedSensors, accuracy: $measurementAccuracy%)';
  }
}

@JsonSerializable()
class DeviceConfiguration {
  final int samplingIntervalMs;
  final int reportingIntervalMs;
  final bool enableDataCompression;
  final bool enableDataSmoothing;
  final int smoothingWindowSize;
  final bool enableAnomalyDetection;
  final double anomalyThreshold;
  final bool enableAutoCalibration;
  final int autoCalibrationIntervalHours;
  final PowerConfiguration powerConfiguration;
  final NetworkConfiguration networkConfiguration;
  final Map<String, dynamic> customSettings;

  DeviceConfiguration({
    required this.samplingIntervalMs,
    required this.reportingIntervalMs,
    required this.enableDataCompression,
    required this.enableDataSmoothing,
    required this.smoothingWindowSize,
    required this.enableAnomalyDetection,
    required this.anomalyThreshold,
    required this.enableAutoCalibration,
    required this.autoCalibrationIntervalHours,
    required this.powerConfiguration,
    required this.networkConfiguration,
    required this.customSettings,
  });

  factory DeviceConfiguration.fromJson(Map<String, dynamic> json) =>
      _$DeviceConfigurationFromJson(json);

  Map<String, dynamic> toJson() => _$DeviceConfigurationToJson(this);

  DeviceConfiguration copyWith({
    int? samplingIntervalMs,
    int? reportingIntervalMs,
    bool? enableDataCompression,
    bool? enableDataSmoothing,
    int? smoothingWindowSize,
    bool? enableAnomalyDetection,
    double? anomalyThreshold,
    bool? enableAutoCalibration,
    int? autoCalibrationIntervalHours,
    PowerConfiguration? powerConfiguration,
    NetworkConfiguration? networkConfiguration,
    Map<String, dynamic>? customSettings,
  }) {
    return DeviceConfiguration(
      samplingIntervalMs: samplingIntervalMs ?? this.samplingIntervalMs,
      reportingIntervalMs: reportingIntervalMs ?? this.reportingIntervalMs,
      enableDataCompression: enableDataCompression ?? this.enableDataCompression,
      enableDataSmoothing: enableDataSmoothing ?? this.enableDataSmoothing,
      smoothingWindowSize: smoothingWindowSize ?? this.smoothingWindowSize,
      enableAnomalyDetection: enableAnomalyDetection ?? this.enableAnomalyDetection,
      anomalyThreshold: anomalyThreshold ?? this.anomalyThreshold,
      enableAutoCalibration: enableAutoCalibration ?? this.enableAutoCalibration,
      autoCalibrationIntervalHours: autoCalibrationIntervalHours ?? this.autoCalibrationIntervalHours,
      powerConfiguration: powerConfiguration ?? this.powerConfiguration,
      networkConfiguration: networkConfiguration ?? this.networkConfiguration,
      customSettings: customSettings ?? this.customSettings,
    );
  }

  @override
  String toString() {
    return 'DeviceConfiguration(samplingInterval: ${samplingIntervalMs}ms, reportingInterval: ${reportingIntervalMs}ms)';
  }
}

@JsonSerializable()
class PowerRequirements {
  final double voltage; // Volts
  final double current; // Amperes
  final double powerConsumption; // Watts
  final PowerSource powerSource;
  final bool supportsBatteryBackup;
  final double? batteryCapacity; // mAh
  final double? batteryLifeHours;

  PowerRequirements({
    required this.voltage,
    required this.current,
    required this.powerConsumption,
    required this.powerSource,
    required this.supportsBatteryBackup,
    this.batteryCapacity,
    this.batteryLifeHours,
  });

  factory PowerRequirements.fromJson(Map<String, dynamic> json) =>
      _$PowerRequirementsFromJson(json);

  Map<String, dynamic> toJson() => _$PowerRequirementsToJson(this);

  PowerRequirements copyWith({
    double? voltage,
    double? current,
    double? powerConsumption,
    PowerSource? powerSource,
    bool? supportsBatteryBackup,
    double? batteryCapacity,
    double? batteryLifeHours,
  }) {
    return PowerRequirements(
      voltage: voltage ?? this.voltage,
      current: current ?? this.current,
      powerConsumption: powerConsumption ?? this.powerConsumption,
      powerSource: powerSource ?? this.powerSource,
      supportsBatteryBackup: supportsBatteryBackup ?? this.supportsBatteryBackup,
      batteryCapacity: batteryCapacity ?? this.batteryCapacity,
      batteryLifeHours: batteryLifeHours ?? this.batteryLifeHours,
    );
  }

  @override
  String toString() {
    return 'PowerRequirements(${voltage}V, ${current}A, ${powerConsumption}W, source: $powerSource)';
  }
}

@JsonSerializable()
class PowerConfiguration {
  final bool enableLowPowerMode;
  final int lowPowerThreshold; // Battery percentage
  final int sleepIntervalMs;
  final bool enableWakeOnDemand;
  final int batteryWarningThreshold;

  PowerConfiguration({
    required this.enableLowPowerMode,
    required this.lowPowerThreshold,
    required this.sleepIntervalMs,
    required this.enableWakeOnDemand,
    required this.batteryWarningThreshold,
  });

  factory PowerConfiguration.fromJson(Map<String, dynamic> json) =>
      _$PowerConfigurationFromJson(json);

  Map<String, dynamic> toJson() => _$PowerConfigurationToJson(this);

  PowerConfiguration copyWith({
    bool? enableLowPowerMode,
    int? lowPowerThreshold,
    int? sleepIntervalMs,
    bool? enableWakeOnDemand,
    int? batteryWarningThreshold,
  }) {
    return PowerConfiguration(
      enableLowPowerMode: enableLowPowerMode ?? this.enableLowPowerMode,
      lowPowerThreshold: lowPowerThreshold ?? this.lowPowerThreshold,
      sleepIntervalMs: sleepIntervalMs ?? this.sleepIntervalMs,
      enableWakeOnDemand: enableWakeOnDemand ?? this.enableWakeOnDemand,
      batteryWarningThreshold: batteryWarningThreshold ?? this.batteryWarningThreshold,
    );
  }
}

@JsonSerializable()
class NetworkConfiguration {
  final String ssid;
  final String? password;
  final String? securityType;
  final int connectionTimeoutMs;
  final int reconnectIntervalMs;
  final int maxReconnectAttempts;
  final bool enableKeepAlive;
  final int keepAliveIntervalMs;

  NetworkConfiguration({
    required this.ssid,
    this.password,
    this.securityType,
    required this.connectionTimeoutMs,
    required this.reconnectIntervalMs,
    required this.maxReconnectAttempts,
    required this.enableKeepAlive,
    required this.keepAliveIntervalMs,
  });

  factory NetworkConfiguration.fromJson(Map<String, dynamic> json) =>
      _$NetworkConfigurationFromJson(json);

  Map<String, dynamic> toJson() => _$NetworkConfigurationToJson(this);

  NetworkConfiguration copyWith({
    String? ssid,
    String? password,
    String? securityType,
    int? connectionTimeoutMs,
    int? reconnectIntervalMs,
    int? maxReconnectAttempts,
    bool? enableKeepAlive,
    int? keepAliveIntervalMs,
  }) {
    return NetworkConfiguration(
      ssid: ssid ?? this.ssid,
      password: password ?? this.password,
      securityType: securityType ?? this.securityType,
      connectionTimeoutMs: connectionTimeoutMs ?? this.connectionTimeoutMs,
      reconnectIntervalMs: reconnectIntervalMs ?? this.reconnectIntervalMs,
      maxReconnectAttempts: maxReconnectAttempts ?? this.maxReconnectAttempts,
      enableKeepAlive: enableKeepAlive ?? this.enableKeepAlive,
      keepAliveIntervalMs: keepAliveIntervalMs ?? this.keepAliveIntervalMs,
    );
  }
}

@JsonSerializable()
class CommunicationProtocols {
  final bool supportsBluetooth;
  final bool supportsWiFi;
  final bool supportsEthernet;
  final bool supportsModbus;
  final bool supportsRS485;
  final bool supportsUSB;
  final bool supportsGPIO;
  final bool supportsMQTT;
  final bool supportsHTTP;
  final bool supportsWebSocket;

  CommunicationProtocols({
    required this.supportsBluetooth,
    required this.supportsWiFi,
    required this.supportsEthernet,
    required this.supportsModbus,
    required this.supportsRS485,
    required this.supportsUSB,
    required this.supportsGPIO,
    required this.supportsMQTT,
    required this.supportsHTTP,
    required this.supportsWebSocket,
  });

  factory CommunicationProtocols.fromJson(Map<String, dynamic> json) =>
      _$CommunicationProtocolsFromJson(json);

  Map<String, dynamic> toJson() => _$CommunicationProtocolsToJson(this);

  CommunicationProtocols copyWith({
    bool? supportsBluetooth,
    bool? supportsWiFi,
    bool? supportsEthernet,
    bool? supportsModbus,
    bool? supportsRS485,
    bool? supportsUSB,
    bool? supportsGPIO,
    bool? supportsMQTT,
    bool? supportsHTTP,
    bool? supportsWebSocket,
  }) {
    return CommunicationProtocols(
      supportsBluetooth: supportsBluetooth ?? this.supportsBluetooth,
      supportsWiFi: supportsWiFi ?? this.supportsWiFi,
      supportsEthernet: supportsEthernet ?? this.supportsEthernet,
      supportsModbus: supportsModbus ?? this.supportsModbus,
      supportsRS485: supportsRS485 ?? this.supportsRS485,
      supportsUSB: supportsUSB ?? this.supportsUSB,
      supportsGPIO: supportsGPIO ?? this.supportsGPIO,
      supportsMQTT: supportsMQTT ?? this.supportsMQTT,
      supportsHTTP: supportsHTTP ?? this.supportsHTTP,
      supportsWebSocket: supportsWebSocket ?? this.supportsWebSocket,
    );
  }

  List<ConnectionType> getSupportedConnectionTypes() {
    final types = <ConnectionType>[];
    if (supportsBluetooth) types.add(ConnectionType.bluetooth);
    if (supportsWiFi) types.add(ConnectionType.wifi);
    if (supportsEthernet) types.add(ConnectionType.wifi);
    if (supportsModbus) types.add(ConnectionType.modbus);
    if (supportsRS485) types.add(ConnectionType.rs485);
    if (supportsUSB) types.add(ConnectionType.usb);
    if (supportsGPIO) types.add(ConnectionType.gpio);
    return types;
  }

  @override
  String toString() {
    return 'CommunicationProtocols(Bluetooth: $supportsBluetooth, WiFi: $supportsWiFi, USB: $supportsUSB)';
  }
}

// Enums
enum ConnectionType {
  bluetooth,
  wifi,
  ethernet,
  usb,
  gpio,
  modbus,
  rs485,
}

enum DeviceStatus {
  online,
  offline,
  error,
  warning,
  maintenance,
  calibrating,
  updating,
}

enum PowerSource {
  mains,
  battery,
  solar,
  poe, // Power over Ethernet
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
  airPressure,
  windSpeed,
  oxygen,
  nitrogen,
  phosphorus,
  potassium,
  calcium,
  magnesium,
  sulfur,
  iron,
  manganese,
  zinc,
  copper,
  boron,
  molybdenum,
  chlorine,
}

extension ConnectionTypeExtension on ConnectionType {
  String get displayName {
    switch (this) {
      case ConnectionType.bluetooth:
        return 'Bluetooth';
      case ConnectionType.wifi:
        return 'Wi-Fi';
      case ConnectionType.ethernet:
        return 'Ethernet';
      case ConnectionType.usb:
        return 'USB';
      case ConnectionType.gpio:
        return 'GPIO';
      case ConnectionType.modbus:
        return 'Modbus';
      case ConnectionType.rs485:
        return 'RS-485';
    }
  }

  String get description {
    switch (this) {
      case ConnectionType.bluetooth:
        return 'Wireless Bluetooth connection';
      case ConnectionType.wifi:
        return 'Wireless Wi-Fi connection';
      case ConnectionType.ethernet:
        return 'Wired Ethernet connection';
      case ConnectionType.usb:
        return 'Direct USB connection';
      case ConnectionType.gpio:
        return 'GPIO connection (Raspberry Pi)';
      case ConnectionType.modbus:
        return 'Modbus industrial protocol';
      case ConnectionType.rs485:
        return 'RS-485 serial communication';
    }
  }

  bool get isWireless {
    switch (this) {
      case ConnectionType.bluetooth:
      case ConnectionType.wifi:
        return true;
      case ConnectionType.ethernet:
      case ConnectionType.usb:
      case ConnectionType.gpio:
      case ConnectionType.modbus:
      case ConnectionType.rs485:
        return false;
    }
  }

  bool get isIndustrial {
    switch (this) {
      case ConnectionType.modbus:
      case ConnectionType.rs485:
        return true;
      case ConnectionType.bluetooth:
      case ConnectionType.wifi:
      case ConnectionType.ethernet:
      case ConnectionType.usb:
      case ConnectionType.gpio:
        return false;
    }
  }
}

extension DeviceStatusExtension on DeviceStatus {
  String get displayName {
    switch (this) {
      case DeviceStatus.online:
        return 'Online';
      case DeviceStatus.offline:
        return 'Offline';
      case DeviceStatus.error:
        return 'Error';
      case DeviceStatus.warning:
        return 'Warning';
      case DeviceStatus.maintenance:
        return 'Maintenance';
      case DeviceStatus.calibrating:
        return 'Calibrating';
      case DeviceStatus.updating:
        return 'Updating';
    }
  }

  String get description {
    switch (this) {
      case DeviceStatus.online:
        return 'Device is online and functioning normally';
      case DeviceStatus.offline:
        return 'Device is offline or not connected';
      case DeviceStatus.error:
        return 'Device has encountered an error';
      case DeviceStatus.warning:
        return 'Device has warnings but is operational';
      case DeviceStatus.maintenance:
        return 'Device is under maintenance';
      case DeviceStatus.calibrating:
        return 'Device is currently calibrating';
      case DeviceStatus.updating:
        return 'Device firmware is being updated';
    }
  }

  bool get isActive {
    switch (this) {
      case DeviceStatus.online:
      case DeviceStatus.warning:
        return true;
      case DeviceStatus.offline:
      case DeviceStatus.error:
      case DeviceStatus.maintenance:
      case DeviceStatus.calibrating:
      case DeviceStatus.updating:
        return false;
    }
  }

  bool get isHealthy {
    switch (this) {
      case DeviceStatus.online:
        return true;
      case DeviceStatus.offline:
      case DeviceStatus.error:
      case DeviceStatus.warning:
      case DeviceStatus.maintenance:
      case DeviceStatus.calibrating:
      case DeviceStatus.updating:
        return false;
    }
  }
}

extension SensorTypeExtension on SensorType {
  String get displayName {
    switch (this) {
      case SensorType.temperature:
        return 'Temperature';
      case SensorType.humidity:
        return 'Humidity';
      case SensorType.ph:
        return 'pH';
      case SensorType.ec:
        return 'EC';
      case SensorType.co2:
        return 'CO₂';
      case SensorType.vpd:
        return 'VPD';
      case SensorType.lightIntensity:
        return 'Light Intensity';
      case SensorType.soilMoisture:
        return 'Soil Moisture';
      case SensorType.waterLevel:
        return 'Water Level';
      case SensorType.airPressure:
        return 'Air Pressure';
      case SensorType.windSpeed:
        return 'Wind Speed';
      case SensorType.oxygen:
        return 'Dissolved Oxygen';
      case SensorType.nitrogen:
        return 'Nitrogen';
      case SensorType.phosphorus:
        return 'Phosphorus';
      case SensorType.potassium:
        return 'Potassium';
      case SensorType.calcium:
        return 'Calcium';
      case SensorType.magnesium:
        return 'Magnesium';
      case SensorType.sulfur:
        return 'Sulfur';
      case SensorType.iron:
        return 'Iron';
      case SensorType.manganese:
        return 'Manganese';
      case SensorType.zinc:
        return 'Zinc';
      case SensorType.copper:
        return 'Copper';
      case SensorType.boron:
        return 'Boron';
      case SensorType.molybdenum:
        return 'Molybdenum';
      case SensorType.chlorine:
        return 'Chlorine';
    }
  }

  String get unit {
    switch (this) {
      case SensorType.temperature:
        return '°C';
      case SensorType.humidity:
      case SensorType.soilMoisture:
      case SensorType.waterLevel:
        return '%';
      case SensorType.ph:
        return 'pH';
      case SensorType.ec:
        return 'mS/cm';
      case SensorType.co2:
        return 'ppm';
      case SensorType.vpd:
        return 'kPa';
      case SensorType.lightIntensity:
        return 'μmol/m²/s';
      case SensorType.airPressure:
        return 'hPa';
      case SensorType.windSpeed:
        return 'm/s';
      case SensorType.oxygen:
      case SensorType.nitrogen:
      case SensorType.phosphorus:
      case SensorType.potassium:
      case SensorType.calcium:
      case SensorType.magnesium:
      case SensorType.sulfur:
      case SensorType.iron:
      case SensorType.manganese:
      case SensorType.zinc:
      case SensorType.copper:
      case SensorType.boron:
      case SensorType.molybdenum:
      case SensorType.chlorine:
        return 'ppm';
    }
  }

  bool get isEnvironmental {
    switch (this) {
      case SensorType.temperature:
      case SensorType.humidity:
      case SensorType.co2:
      case SensorType.vpd:
      case SensorType.lightIntensity:
      case SensorType.airPressure:
      case SensorType.windSpeed:
        return true;
      case SensorType.ph:
      case SensorType.ec:
      case SensorType.soilMoisture:
      case SensorType.waterLevel:
      case SensorType.oxygen:
      case SensorType.nitrogen:
      case SensorType.phosphorus:
      case SensorType.potassium:
      case SensorType.calcium:
      case SensorType.magnesium:
      case SensorType.sulfur:
      case SensorType.iron:
      case SensorType.manganese:
      case SensorType.zinc:
      case SensorType.copper:
      case SensorType.boron:
      case SensorType.molybdenum:
      case SensorType.chlorine:
        return false;
    }
  }

  bool get isNutrient {
    switch (this) {
      case SensorType.nitrogen:
      case SensorType.phosphorus:
      case SensorType.potassium:
      case SensorType.calcium:
      case SensorType.magnesium:
      case SensorType.sulfur:
      case SensorType.iron:
      case SensorType.manganese:
      case SensorType.zinc:
      case SensorType.copper:
      case SensorType.boron:
      case SensorType.molybdenum:
      case SensorType.chlorine:
        return true;
      case SensorType.temperature:
      case SensorType.humidity:
      case SensorType.ph:
      case SensorType.ec:
      case SensorType.co2:
      case SensorType.vpd:
      case SensorType.lightIntensity:
      case SensorType.soilMoisture:
      case SensorType.waterLevel:
      case SensorType.airPressure:
      case SensorType.windSpeed:
      case SensorType.oxygen:
        return false;
    }
  }
}