import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import '../models/sensor_device.dart';
import '../models/sensor_data.dart';

// Data validation provider
final dataValidationProvider = StateNotifierProvider<DataValidationNotifier, DataValidationState>((ref) {
  return DataValidationNotifier(ref);
});

class DataValidationNotifier extends StateNotifier<DataValidationState> {
  final Ref _ref;

  // Validation rules and thresholds
  final Map<String, ValidationRule> _validationRules = {};
  final Map<String, List<SensorMetrics>> _dataHistory = {};
  final Map<String, DateTime> _lastValidation = {};

  DataValidationNotifier(this._ref) : super(const DataValidationState()) {
    _initializeValidationRules();
  }

  void _initializeValidationRules() {
    // Define global validation rules for each sensor type
    _validationRules['temperature'] = ValidationRule(
      sensorType: SensorType.temperature,
      minPhysicalValue: -50.0,
      maxPhysicalValue: 100.0,
      minOperationalValue: -20.0,
      maxOperationalValue: 60.0,
      maxChangeRate: 5.0, // °C per minute
      smoothingWindow: 5,
      outlierThreshold: 3.0,
    );

    _validationRules['humidity'] = ValidationRule(
      sensorType: SensorType.humidity,
      minPhysicalValue: 0.0,
      maxPhysicalValue: 100.0,
      minOperationalValue: 5.0,
      maxOperationalValue: 95.0,
      maxChangeRate: 20.0, // % per minute
      smoothingWindow: 5,
      outlierThreshold: 3.0,
    );

    _validationRules['ph'] = ValidationRule(
      sensorType: SensorType.ph,
      minPhysicalValue: 0.0,
      maxPhysicalValue: 14.0,
      minOperationalValue: 3.0,
      maxOperationalValue: 11.0,
      maxChangeRate: 2.0, // pH units per hour
      smoothingWindow: 10,
      outlierThreshold: 2.5,
    );

    _validationRules['ec'] = ValidationRule(
      sensorType: SensorType.ec,
      minPhysicalValue: 0.0,
      maxPhysicalValue: 10.0,
      minOperationalValue: 0.1,
      maxOperationalValue: 5.0,
      maxChangeRate: 1.0, // mS/cm per hour
      smoothingWindow: 8,
      outlierThreshold: 3.0,
    );

    _validationRules['co2'] = ValidationRule(
      sensorType: SensorType.co2,
      minPhysicalValue: 0.0,
      maxPhysicalValue: 5000.0,
      minOperationalValue: 200.0,
      maxOperationalValue: 2000.0,
      maxChangeRate: 100.0, // ppm per minute
      smoothingWindow: 5,
      outlierThreshold: 3.0,
    );

    _validationRules['vpd'] = ValidationRule(
      sensorType: SensorType.vpd,
      minPhysicalValue: 0.0,
      maxPhysicalValue: 10.0,
      minOperationalValue: 0.2,
      maxOperationalValue: 4.0,
      maxChangeRate: 1.0, // kPa per minute
      smoothingWindow: 5,
      outlierThreshold: 2.5,
    );

    _validationRules['lightIntensity'] = ValidationRule(
      sensorType: SensorType.lightIntensity,
      minPhysicalValue: 0.0,
      maxPhysicalValue: 3000.0,
      minOperationalValue: 0.0,
      maxOperationalValue: 2000.0,
      maxChangeRate: 500.0, // μmol/m²/s per minute
      smoothingWindow: 3,
      outlierThreshold: 3.0,
    );

    _validationRules['soilMoisture'] = ValidationRule(
      sensorType: SensorType.soilMoisture,
      minPhysicalValue: 0.0,
      maxPhysicalValue: 100.0,
      minOperationalValue: 5.0,
      maxOperationalValue: 90.0,
      maxChangeRate: 15.0, // % per hour
      smoothingWindow: 10,
      outlierThreshold: 2.5,
    );

    _validationRules['waterLevel'] = ValidationRule(
      sensorType: SensorType.waterLevel,
      minPhysicalValue: 0.0,
      maxPhysicalValue: 100.0,
      minOperationalValue: 0.0,
      maxOperationalValue: 100.0,
      maxChangeRate: 50.0, // % per hour
      smoothingWindow: 5,
      outlierThreshold: 3.0,
    );

    _validationRules['airPressure'] = ValidationRule(
      sensorType: SensorType.airPressure,
      minPhysicalValue: 800.0,
      maxPhysicalValue: 1200.0,
      minOperationalValue: 900.0,
      maxOperationalValue: 1100.0,
      maxChangeRate: 10.0, // hPa per hour
      smoothingWindow: 10,
      outlierThreshold: 2.0,
    );

    _validationRules['windSpeed'] = ValidationRule(
      sensorType: SensorType.windSpeed,
      minPhysicalValue: 0.0,
      maxPhysicalValue: 50.0,
      minOperationalValue: 0.0,
      maxOperationalValue: 20.0,
      maxChangeRate: 5.0, // m/s per minute
      smoothingWindow: 5,
      outlierThreshold: 3.0,
    );
  }

  Future<double> validateQuality(SensorDevice device, SensorMetrics metrics) async {
    final deviceId = device.id;
    var totalScore = 100.0;
    final validationResults = <ValidationResult>[];

    // Initialize data history for this device
    _dataHistory.putIfAbsent(deviceId, () => []);

    // Validate each sensor metric
    for (final entry in _getMetricEntries(metrics)) {
      final sensorType = entry.key;
      final value = entry.value;

      if (value != null) {
        final result = await _validateSingleMetric(deviceId, sensorType, value);
        validationResults.add(result);
        totalScore *= (result.qualityScore / 100.0);
      }
    }

    // Add to history
    _dataHistory[deviceId]!.add(metrics);
    if (_dataHistory[deviceId]!.length > 100) {
      _dataHistory[deviceId]!.removeAt(0);
    }

    _lastValidation[deviceId] = DateTime.now();

    // Update state
    state = state.copyWith(
      validationResults: validationResults,
      averageQualityScore: totalScore.clamp(0.0, 100.0),
    );

    return totalScore.clamp(0.0, 100.0);
  }

  Future<ValidationResult> _validateSingleMetric(
    String deviceId,
    SensorType sensorType,
    double value,
  ) async {
    final rule = _validationRules[sensorType.name];
    if (rule == null) {
      return ValidationResult(
        sensorType: sensorType,
        value: value,
        qualityScore: 50.0,
        issues: [ValidationIssue('no_validation_rule', 'No validation rule defined')],
      );
    }

    final issues = <ValidationIssue>[];
    var qualityScore = 100.0;

    // 1. Physical plausibility check
    if (value < rule.minPhysicalValue || value > rule.maxPhysicalValue) {
      issues.add(ValidationIssue(
        'physical_impossibility',
        'Value outside physically possible range',
        severity: ValidationSeverity.critical,
      ));
      qualityScore *= 0.1;
    }

    // 2. Operational range check
    if (value < rule.minOperationalValue || value > rule.maxOperationalValue) {
      issues.add(ValidationIssue(
        'operational_out_of_range',
        'Value outside normal operational range',
        severity: ValidationSeverity.warning,
      ));
      qualityScore *= 0.7;
    }

    // 3. Rate of change check
    final changeRateResult = _validateChangeRate(deviceId, sensorType, value, rule);
    if (changeRateResult != null) {
      issues.add(changeRateResult);
      qualityScore *= 0.8;
    }

    // 4. Consistency check with related sensors
    final consistencyResult = await _validateConsistency(deviceId, sensorType, value);
    if (consistencyResult != null) {
      issues.add(consistencyResult);
      qualityScore *= 0.9;
    }

    // 5. Outlier detection using statistical methods
    final outlierResult = _detectOutliers(deviceId, sensorType, value, rule);
    if (outlierResult != null) {
      issues.add(outlierResult);
      qualityScore *= 0.85;
    }

    // 6. Device-specific validation
    final deviceSpecificResult = await _validateDeviceSpecific(deviceId, sensorType, value);
    if (deviceSpecificResult != null) {
      issues.add(deviceSpecificResult);
      qualityScore *= 0.95;
    }

    return ValidationResult(
      sensorType: sensorType,
      value: value,
      qualityScore: qualityScore.clamp(0.0, 100.0),
      issues: issues,
    );
  }

  Map<SensorType, double?> _getMetricEntries(SensorMetrics metrics) {
    return {
      SensorType.temperature: metrics.temperature,
      SensorType.humidity: metrics.humidity,
      SensorType.ph: metrics.ph,
      SensorType.ec: metrics.ec,
      SensorType.co2: metrics.co2,
      SensorType.vpd: metrics.vpd,
      SensorType.lightIntensity: metrics.lightIntensity,
      SensorType.soilMoisture: metrics.soilMoisture,
      SensorType.waterLevel: metrics.waterLevel,
      SensorType.airPressure: metrics.airPressure,
      SensorType.windSpeed: metrics.windSpeed,
    };
  }

  ValidationIssue? _validateChangeRate(
    String deviceId,
    SensorType sensorType,
    double currentValue,
    ValidationRule rule,
  ) {
    final history = _dataHistory[deviceId];
    if (history == null || history.length < 2) return null;

    final lastValue = _getLastValue(history, sensorType);
    if (lastValue == null) return null;

    final timeDiff = DateTime.now().difference(_getLastTimestamp(history)).inMinutes;
    if (timeDiff <= 0) return null;

    final changeRate = (currentValue - lastValue).abs() / timeDiff;

    if (changeRate > rule.maxChangeRate) {
      return ValidationIssue(
        'excessive_change_rate',
        'Rate of change exceeds physical limits: ${changeRate.toStringAsFixed(2)} ${_getUnit(sensorType)}/min',
        severity: ValidationSeverity.warning,
      );
    }

    return null;
  }

  Future<ValidationIssue?> _validateConsistency(
    String deviceId,
    SensorType sensorType,
    double value,
  ) async {
    switch (sensorType) {
      case SensorType.vpd:
        return _validateVpdConsistency(deviceId, value);
      case SensorType.temperature:
        return _validateTemperatureConsistency(deviceId, value);
      case SensorType.humidity:
        return _validateHumidityConsistency(deviceId, value);
      default:
        return null;
    }
  }

  ValidationIssue? _validateVpdConsistency(String deviceId, double vpd) {
    final history = _dataHistory[deviceId];
    if (history == null || history.isEmpty) return null;

    final lastMetrics = history.last;
    final temperature = lastMetrics.temperature;
    final humidity = lastMetrics.humidity;

    if (temperature != null && humidity != null) {
      // Calculate expected VPD from temperature and humidity
      final expectedVpd = _calculateVpd(temperature, humidity);
      final difference = (vpd - expectedVpd).abs();

      if (difference > 0.5) {
        return ValidationIssue(
          'vpd_inconsistency',
          'VPD inconsistent with temperature and humidity: calculated ${expectedVpd.toStringAsFixed(2)}, measured ${vpd.toStringAsFixed(2)}',
          severity: ValidationSeverity.warning,
        );
      }
    }

    return null;
  }

  ValidationIssue? _validateTemperatureConsistency(String deviceId, double temperature) {
    // Check for unrealistic temperature spikes that might indicate sensor errors
    final history = _dataHistory[deviceId];
    if (history == null || history.length < 3) return null;

    final recentValues = history
        .take(3)
        .map((m) => m.temperature)
        .where((t) => t != null)
        .cast<double>()
        .toList();

    if (recentValues.length < 2) return null;

    final average = recentValues.reduce((a, b) => a + b) / recentValues.length;
    final difference = (temperature - average).abs();

    if (difference > 10.0) {
      return ValidationIssue(
        'temperature_spike',
        'Unusual temperature deviation: ${difference.toStringAsFixed(1)}°C from recent average',
        severity: ValidationSeverity.warning,
      );
    }

    return null;
  }

  ValidationIssue? _validateHumidityConsistency(String deviceId, double humidity) {
    // Check for humidity values that don't make sense with current conditions
    final history = _dataHistory[deviceId];
    if (history == null || history.isEmpty) return null;

    final lastMetrics = history.last;
    final temperature = lastMetrics.temperature;

    if (temperature != null) {
      // Very high temperatures with very high humidity might be unrealistic
      if (temperature > 35.0 && humidity > 90.0) {
        return ValidationIssue(
          'humidity_temperature_mismatch',
          'Unlikely combination: high temperature with very high humidity',
          severity: ValidationSeverity.info,
        );
      }

      // Very low temperatures with very low humidity might indicate sensor freezing
      if (temperature < 0.0 && humidity < 10.0) {
        return ValidationIssue(
          'possible_sensor_freeze',
          'Possible sensor freezing: low temperature with very low humidity',
          severity: ValidationSeverity.warning,
        );
      }
    }

    return null;
  }

  ValidationIssue? _detectOutliers(
    String deviceId,
    SensorType sensorType,
    double value,
    ValidationRule rule,
  ) {
    final history = _dataHistory[deviceId];
    if (history == null || history.length < rule.smoothingWindow) return null;

    final values = history
        .take(rule.smoothingWindow)
        .map((m) => _getValue(m, sensorType))
        .where((v) => v != null)
        .cast<double>()
        .toList();

    if (values.length < 3) return null;

    final mean = values.reduce((a, b) => a + b) / values.length;
    final variance = values.map((v) => pow(v - mean, 2)).reduce((a, b) => a + b) / values.length;
    final standardDeviation = sqrt(variance);

    final zScore = (value - mean) / standardDeviation;

    if (zScore.abs() > rule.outlierThreshold) {
      return ValidationIssue(
        'statistical_outlier',
        'Value is ${zScore.abs().toStringAsFixed(1)} standard deviations from recent average',
        severity: zScore.abs() > rule.outlierThreshold * 1.5
            ? ValidationSeverity.warning
            : ValidationSeverity.info,
      );
    }

    return null;
  }

  Future<ValidationIssue?> _validateDeviceSpecific(
    String deviceId,
    SensorType sensorType,
    double value,
  ) async {
    // Get device information and apply device-specific validation
    final device = _ref.read(deviceManagementProvider).getDeviceById(deviceId);
    if (device == null) return null;

    // Check device capabilities
    if (!device.capabilities.supportsSensorType(sensorType)) {
      return ValidationIssue(
        'unsupported_sensor',
        'Device does not support this sensor type',
        severity: ValidationSeverity.critical,
      );
    }

    // Check operating conditions
    if (device.metadata.containsKey('temperature') &&
        device.metadata.containsKey('humidity')) {
      final deviceTemp = device.metadata['temperature'] as double?;
      final deviceHumidity = device.metadata['humidity'] as double?;

      if (deviceTemp != null && deviceHumidity != null) {
        final inOperatingRange = device.capabilities.isOperatingConditionsValid(
          deviceTemp,
          deviceHumidity,
        );

        if (!inOperatingRange) {
          return ValidationIssue(
            'device_out_of_operating_range',
            'Device operating outside specified environmental conditions',
            severity: ValidationSeverity.warning,
          );
        }
      }
    }

    // Check calibration status
    if (device.needsCalibration || device.isCalibrationOverdue()) {
      return ValidationIssue(
        'calibration_needed',
        'Device calibration is overdue or required',
        severity: ValidationSeverity.warning,
      );
    }

    return null;
  }

  double? _getLastValue(List<SensorMetrics> history, SensorType sensorType) {
    for (final metrics in history.reversed) {
      final value = _getValue(metrics, sensorType);
      if (value != null) return value;
    }
    return null;
  }

  DateTime _getLastTimestamp(List<SensorMetrics> history) {
    if (history.isEmpty) return DateTime.now();
    return history.last.timestamp;
  }

  double? _getValue(SensorMetrics metrics, SensorType sensorType) {
    switch (sensorType) {
      case SensorType.temperature:
        return metrics.temperature;
      case SensorType.humidity:
        return metrics.humidity;
      case SensorType.ph:
        return metrics.ph;
      case SensorType.ec:
        return metrics.ec;
      case SensorType.co2:
        return metrics.co2;
      case SensorType.vpd:
        return metrics.vpd;
      case SensorType.lightIntensity:
        return metrics.lightIntensity;
      case SensorType.soilMoisture:
        return metrics.soilMoisture;
      case SensorType.waterLevel:
        return metrics.waterLevel;
      case SensorType.airPressure:
        return metrics.airPressure;
      case SensorType.windSpeed:
        return metrics.windSpeed;
    }
  }

  String _getUnit(SensorType sensorType) {
    switch (sensorType) {
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
    }
  }

  double _calculateVpd(double temperatureCelsius, double relativeHumidity) {
    // Calculate Vapor Pressure Deficit
    // VPD = SVP * (1 - RH/100)

    // Saturation vapor pressure (SVP) in kPa using Tetens formula
    final a = 17.27;
    final b = 237.7;
    final gamma = (a * temperatureCelsius) / (b + temperatureCelsius);
    final svp = 0.6108 * exp(gamma);

    final vpd = svp * (1 - relativeHumidity / 100);
    return vpd;
  }

  // Public API methods
  List<ValidationResult> getValidationResultsForDevice(String deviceId) {
    return state.validationResults.where((result) =>
        _lastValidation[deviceId] != null).toList();
  }

  double getAverageQualityScoreForDevice(String deviceId) {
    final deviceResults = getValidationResultsForDevice(deviceId);
    if (deviceResults.isEmpty) return 100.0;

    final totalScore = deviceResults
        .map((result) => result.qualityScore)
        .reduce((a, b) => a + b);

    return totalScore / deviceResults.length;
  }

  Future<bool> isDataValid(SensorDevice device, SensorMetrics metrics) async {
    final qualityScore = await validateQuality(device, metrics);
    return qualityScore >= 70.0; // Consider data valid if quality score is 70% or higher
  }

  SensorMetrics? correctData(SensorDevice device, SensorMetrics metrics) {
    // Apply data correction based on validation results
    final deviceId = device.id;
    final validationResults = getValidationResultsForDevice(deviceId);

    var correctedMetrics = metrics;

    for (final result in validationResults) {
      correctedMetrics = _applyCorrection(correctedMetrics, result);
    }

    return correctedMetrics;
  }

  SensorMetrics _applyCorrection(SensorMetrics metrics, ValidationResult result) {
    final value = result.value;
    final sensorType = result.sensorType;

    // Apply corrections based on validation issues
    for (final issue in result.issues) {
      switch (issue.code) {
        case 'physical_impossibility':
          // Clamp to physical limits
          return _clampToPhysicalLimits(metrics, sensorType);

        case 'operational_out_of_range':
          // Apply smoothing with historical values
          return _smoothWithHistory(metrics, sensorType);

        case 'excessive_change_rate':
          // Apply rate limiting
          return _applyRateLimiting(metrics, sensorType);

        case 'statistical_outlier':
          // Apply outlier correction
          return _correctOutlier(metrics, sensorType);

        default:
          continue;
      }
    }

    return metrics;
  }

  SensorMetrics _clampToPhysicalLimits(SensorMetrics metrics, SensorType sensorType) {
    final rule = _validationRules[sensorType.name];
    if (rule == null) return metrics;

    final currentValue = _getValue(metrics, sensorType);
    if (currentValue == null) return metrics;

    final clampedValue = currentValue.clamp(
      rule.minPhysicalValue,
      rule.maxPhysicalValue,
    );

    return _updateMetricValue(metrics, sensorType, clampedValue);
  }

  SensorMetrics _smoothWithHistory(SensorMetrics metrics, SensorType sensorType) {
    final deviceId = 'unknown'; // Would be passed in real implementation
    final history = _dataHistory[deviceId];
    if (history == null || history.isEmpty) return metrics;

    final recentValues = history
        .take(5)
        .map((m) => _getValue(m, sensorType))
        .where((v) => v != null)
        .cast<double>()
        .toList();

    if (recentValues.isEmpty) return metrics;

    final average = recentValues.reduce((a, b) => a + b) / recentValues.length;
    final currentValue = _getValue(metrics, sensorType);
    if (currentValue == null) return metrics;

    // Blend current value with historical average
    final smoothedValue = (currentValue * 0.3) + (average * 0.7);

    return _updateMetricValue(metrics, sensorType, smoothedValue);
  }

  SensorMetrics _applyRateLimiting(SensorMetrics metrics, SensorType sensorType) {
    final deviceId = 'unknown'; // Would be passed in real implementation
    final history = _dataHistory[deviceId];
    if (history == null || history.isEmpty) return metrics;

    final rule = _validationRules[sensorType.name];
    if (rule == null) return metrics;

    final lastValue = _getLastValue(history, sensorType);
    if (lastValue == null) return metrics;

    final currentValue = _getValue(metrics, sensorType);
    if (currentValue == null) return metrics;

    final timeDiff = DateTime.now().difference(_getLastTimestamp(history)).inMinutes;
    if (timeDiff <= 0) return metrics;

    final maxChange = rule.maxChangeRate * timeDiff;
    final actualChange = currentValue - lastValue;

    if (actualChange.abs() > maxChange) {
      final limitedValue = lastValue + (actualChange.sign * maxChange);
      return _updateMetricValue(metrics, sensorType, limitedValue);
    }

    return metrics;
  }

  SensorMetrics _correctOutlier(SensorMetrics metrics, SensorType sensorType) {
    // Replace outlier with median of recent values
    final deviceId = 'unknown'; // Would be passed in real implementation
    final history = _dataHistory[deviceId];
    if (history == null || history.isEmpty) return metrics;

    final recentValues = history
        .take(10)
        .map((m) => _getValue(m, sensorType))
        .where((v) => v != null)
        .cast<double>()
        .toList();

    if (recentValues.length < 3) return metrics;

    recentValues.sort();
    final median = recentValues[recentValues.length ~/ 2];

    return _updateMetricValue(metrics, sensorType, median);
  }

  SensorMetrics _updateMetricValue(SensorMetrics metrics, SensorType sensorType, double newValue) {
    switch (sensorType) {
      case SensorType.temperature:
        return metrics.copyWith(temperature: newValue);
      case SensorType.humidity:
        return metrics.copyWith(humidity: newValue);
      case SensorType.ph:
        return metrics.copyWith(ph: newValue);
      case SensorType.ec:
        return metrics.copyWith(ec: newValue);
      case SensorType.co2:
        return metrics.copyWith(co2: newValue);
      case SensorType.vpd:
        return metrics.copyWith(vpd: newValue);
      case SensorType.lightIntensity:
        return metrics.copyWith(lightIntensity: newValue);
      case SensorType.soilMoisture:
        return metrics.copyWith(soilMoisture: newValue);
      case SensorType.waterLevel:
        return metrics.copyWith(waterLevel: newValue);
      case SensorType.airPressure:
        return metrics.copyWith(airPressure: newValue);
      case SensorType.windSpeed:
        return metrics.copyWith(windSpeed: newValue);
    }
  }

  void clearHistoryForDevice(String deviceId) {
    _dataHistory.remove(deviceId);
    _lastValidation.remove(deviceId);
  }

  void clearAllHistory() {
    _dataHistory.clear();
    _lastValidation.clear();
  }

  Map<String, dynamic> getValidationStatistics() {
    final deviceIds = _dataHistory.keys.toList();
    final statistics = <String, dynamic>{};

    for (final deviceId in deviceIds) {
      final history = _dataHistory[deviceId];
      if (history == null || history.isEmpty) continue;

      final validationResults = getValidationResultsForDevice(deviceId);

      statistics[deviceId] = {
        'data_points': history.length,
        'validation_count': validationResults.length,
        'average_quality': getAverageQualityScoreForDevice(deviceId),
        'last_validation': _lastValidation[deviceId]?.toIso8601String(),
        'issues_detected': validationResults
            .expand((result) => result.issues)
            .length,
      };
    }

    return statistics;
  }
}

// Data models
class DataValidationState {
  final List<ValidationResult> validationResults;
  final double averageQualityScore;
  final bool isProcessing;

  const DataValidationState({
    this.validationResults = const [],
    this.averageQualityScore = 100.0,
    this.isProcessing = false,
  });

  DataValidationState copyWith({
    List<ValidationResult>? validationResults,
    double? averageQualityScore,
    bool? isProcessing,
  }) {
    return DataValidationState(
      validationResults: validationResults ?? this.validationResults,
      averageQualityScore: averageQualityScore ?? this.averageQualityScore,
      isProcessing: isProcessing ?? this.isProcessing,
    );
  }
}

class ValidationRule {
  final SensorType sensorType;
  final double minPhysicalValue;
  final double maxPhysicalValue;
  final double minOperationalValue;
  final double maxOperationalValue;
  final double maxChangeRate;
  final int smoothingWindow;
  final double outlierThreshold;

  ValidationRule({
    required this.sensorType,
    required this.minPhysicalValue,
    required this.maxPhysicalValue,
    required this.minOperationalValue,
    required this.maxOperationalValue,
    required this.maxChangeRate,
    required this.smoothingWindow,
    required this.outlierThreshold,
  });
}

class ValidationResult {
  final SensorType sensorType;
  final double value;
  final double qualityScore;
  final List<ValidationIssue> issues;

  ValidationResult({
    required this.sensorType,
    required this.value,
    required this.qualityScore,
    required this.issues,
  });

  bool get isValid => qualityScore >= 70.0;
  bool get hasCriticalIssues => issues.any((issue) => issue.severity == ValidationSeverity.critical);
  bool get hasWarnings => issues.any((issue) => issue.severity == ValidationSeverity.warning);
}

class ValidationIssue {
  final String code;
  final String message;
  final ValidationSeverity severity;

  ValidationIssue(
    this.code,
    this.message, {
    this.severity = ValidationSeverity.info,
  });
}

enum ValidationSeverity {
  info,
  warning,
  critical,
}