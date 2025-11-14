import 'package:json_annotation/json_annotation.dart';

part 'sensor_data.g.dart';

@JsonSerializable()
class SensorData {
  final String id;
  final String deviceId;
  final String roomId;
  final DateTime timestamp;
  final SensorMetrics metrics;
  final Map<String, dynamic>? metadata;

  SensorData({
    required this.id,
    required this.deviceId,
    required this.roomId,
    required this.timestamp,
    required this.metrics,
    this.metadata,
  });

  factory SensorData.fromJson(Map<String, dynamic> json) =>
      _$SensorDataFromJson(json);

  Map<String, dynamic> toJson() => _$SensorDataToJson(this);

  SensorData copyWith({
    String? id,
    String? deviceId,
    String? roomId,
    DateTime? timestamp,
    SensorMetrics? metrics,
    Map<String, dynamic>? metadata,
  }) {
    return SensorData(
      id: id ?? this.id,
      deviceId: deviceId ?? this.deviceId,
      roomId: roomId ?? this.roomId,
      timestamp: timestamp ?? this.timestamp,
      metrics: metrics ?? this.metrics,
      metadata: metadata ?? this.metadata,
    );
  }

  @override
  String toString() {
    return 'SensorData(id: $id, deviceId: $deviceId, roomId: $roomId, timestamp: $timestamp, metrics: $metrics)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is SensorData &&
        other.id == id &&
        other.deviceId == deviceId &&
        other.roomId == roomId &&
        other.timestamp == timestamp &&
        other.metrics == metrics;
  }

  @override
  int get hashCode {
    return id.hashCode ^
        deviceId.hashCode ^
        roomId.hashCode ^
        timestamp.hashCode ^
        metrics.hashCode;
  }
}

@JsonSerializable()
class SensorMetrics {
  final double? temperature; // Celsius
  final double? humidity; // Percentage
  final double? ph; // pH level
  final double? ec; // Electrical conductivity (mS/cm)
  final double? co2; // CO2 level (ppm)
  final double? vpd; // Vapor pressure deficit (kPa)
  final double? lightIntensity; // PAR or PPFD
  final double? soilMoisture; // Percentage
  final double? waterLevel; // Percentage or liters
  final double? airPressure; // hPa
  final double? windSpeed; // m/s (for greenhouse)
  final Map<String, double>? customMetrics;

  SensorMetrics({
    this.temperature,
    this.humidity,
    this.ph,
    this.ec,
    this.co2,
    this.vpd,
    this.lightIntensity,
    this.soilMoisture,
    this.waterLevel,
    this.airPressure,
    this.windSpeed,
    this.customMetrics,
  });

  factory SensorMetrics.fromJson(Map<String, dynamic> json) =>
      _$SensorMetricsFromJson(json);

  Map<String, dynamic> toJson() => _$SensorMetricsToJson(this);

  SensorMetrics copyWith({
    double? temperature,
    double? humidity,
    double? ph,
    double? ec,
    double? co2,
    double? vpd,
    double? lightIntensity,
    double? soilMoisture,
    double? waterLevel,
    double? airPressure,
    double? windSpeed,
    Map<String, double>? customMetrics,
  }) {
    return SensorMetrics(
      temperature: temperature ?? this.temperature,
      humidity: humidity ?? this.humidity,
      ph: ph ?? this.ph,
      ec: ec ?? this.ec,
      co2: co2 ?? this.co2,
      vpd: vpd ?? this.vpd,
      lightIntensity: lightIntensity ?? this.lightIntensity,
      soilMoisture: soilMoisture ?? this.soilMoisture,
      waterLevel: waterLevel ?? this.waterLevel,
      airPressure: airPressure ?? this.airPressure,
      windSpeed: windSpeed ?? this.windSpeed,
      customMetrics: customMetrics ?? this.customMetrics,
    );
  }

  @override
  String toString() {
    return 'SensorMetrics(temperature: $temperature, humidity: $humidity, ph: $ph, ec: $ec, co2: $co2, vpd: $vpd, lightIntensity: $lightIntensity, soilMoisture: $soilMoisture, waterLevel: $waterLevel, airPressure: $airPressure, windSpeed: $windSpeed, customMetrics: $customMetrics)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is SensorMetrics &&
        other.temperature == temperature &&
        other.humidity == humidity &&
        other.ph == ph &&
        other.ec == ec &&
        other.co2 == co2 &&
        other.vpd == vpd &&
        other.lightIntensity == lightIntensity &&
        other.soilMoisture == soilMoisture &&
        other.waterLevel == waterLevel &&
        other.airPressure == airPressure &&
        other.windSpeed == windSpeed &&
        other.customMetrics == customMetrics;
  }

  @override
  int get hashCode {
    return temperature.hashCode ^
        humidity.hashCode ^
        ph.hashCode ^
        ec.hashCode ^
        co2.hashCode ^
        vpd.hashCode ^
        lightIntensity.hashCode ^
        soilMoisture.hashCode ^
        waterLevel.hashCode ^
        airPressure.hashCode ^
        windSpeed.hashCode ^
        customMetrics.hashCode;
  }
}

@JsonSerializable()
class SensorAlert {
  final String id;
  final String deviceId;
  final String roomId;
  final String alertType;
  final String severity; // 'low', 'medium', 'high'
  final String message;
  final String? recommendation;
  final DateTime timestamp;
  final bool acknowledged;
  final DateTime? acknowledgedAt;
  final String? acknowledgedBy;
  final Map<String, dynamic>? metadata;

  SensorAlert({
    required this.id,
    required this.deviceId,
    required this.roomId,
    required this.alertType,
    required this.severity,
    required this.message,
    this.recommendation,
    required this.timestamp,
    this.acknowledged = false,
    this.acknowledgedAt,
    this.acknowledgedBy,
    this.metadata,
  });

  factory SensorAlert.fromJson(Map<String, dynamic> json) =>
      _$SensorAlertFromJson(json);

  Map<String, dynamic> toJson() => _$SensorAlertToJson(this);

  SensorAlert copyWith({
    String? id,
    String? deviceId,
    String? roomId,
    String? alertType,
    String? severity,
    String? message,
    String? recommendation,
    DateTime? timestamp,
    bool? acknowledged,
    DateTime? acknowledgedAt,
    String? acknowledgedBy,
    Map<String, dynamic>? metadata,
  }) {
    return SensorAlert(
      id: id ?? this.id,
      deviceId: deviceId ?? this.deviceId,
      roomId: roomId ?? this.roomId,
      alertType: alertType ?? this.alertType,
      severity: severity ?? this.severity,
      message: message ?? this.message,
      recommendation: recommendation ?? this.recommendation,
      timestamp: timestamp ?? this.timestamp,
      acknowledged: acknowledged ?? this.acknowledged,
      acknowledgedAt: acknowledgedAt ?? this.acknowledgedAt,
      acknowledgedBy: acknowledgedBy ?? this.acknowledgedBy,
      metadata: metadata ?? this.metadata,
    );
  }

  @override
  String toString() {
    return 'SensorAlert(id: $id, deviceId: $deviceId, roomId: $roomId, alertType: $alertType, severity: $severity, message: $message, recommendation: $recommendation, timestamp: $timestamp, acknowledged: $acknowledged, acknowledgedAt: $acknowledgedAt, acknowledgedBy: $acknowledgedBy)';
  }
}