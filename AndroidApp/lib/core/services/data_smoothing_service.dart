import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import '../models/sensor_device.dart';
import '../models/sensor_data.dart';

// Data smoothing provider
final dataSmoothingProvider = StateNotifierProvider<DataSmoothingNotifier, DataSmoothingState>((ref) {
  return DataSmoothingNotifier(ref);
});

class DataSmoothingNotifier extends StateNotifier<DataSmoothingState> {
  final Ref _ref;

  // Data buffers and smoothing parameters
  final Map<String, List<SensorDataPoint>> _dataBuffers = {};
  final Map<String, SmoothingConfiguration> _configurations = {};
  final Map<String, List<double>> _smoothingWindows = {};

  DataSmoothingNotifier(this._ref) : super(const DataSmoothingState()) {
    _initializeConfigurations();
  }

  void _initializeConfigurations() {
    // Default smoothing configurations for different sensor types
    _configurations['temperature'] = SmoothingConfiguration(
      algorithm: SmoothingAlgorithm.exponentialWeightedMoving,
      windowSize: 10,
      alpha: 0.3,
      threshold: 1.0,
      adaptiveWindow: true,
    );

    _configurations['humidity'] = SmoothingConfiguration(
      algorithm: SmoothingAlgorithm.exponentialWeightedMoving,
      windowSize: 8,
      alpha: 0.25,
      threshold: 2.0,
      adaptiveWindow: true,
    );

    _configurations['ph'] = SmoothingConfiguration(
      algorithm: SmoothingAlgorithm.kalman,
      windowSize: 15,
      alpha: 0.1,
      threshold: 0.1,
      adaptiveWindow: true,
    );

    _configurations['ec'] = SmoothingConfiguration(
      algorithm: SmoothingAlgorithm.savitzkyGolay,
      windowSize: 7,
      alpha: 0.2,
      threshold: 0.2,
      adaptiveWindow: false,
    );

    _configurations['co2'] = SmoothingConfiguration(
      algorithm: SmoothingAlgorithm.movingAverage,
      windowSize: 5,
      alpha: 0.4,
      threshold: 50.0,
      adaptiveWindow: true,
    );

    _configurations['vpd'] = SmoothingConfiguration(
      algorithm: SmoothingAlgorithm.exponentialWeightedMoving,
      windowSize: 12,
      alpha: 0.35,
      threshold: 0.2,
      adaptiveWindow: true,
    );

    _configurations['lightIntensity'] = SmoothingConfiguration(
      algorithm: SmoothingAlgorithm.median,
      windowSize: 3,
      alpha: 0.5,
      threshold: 100.0,
      adaptiveWindow: false,
    );

    _configurations['soilMoisture'] = SmoothingConfiguration(
      algorithm: SmoothingAlgorithm.kalman,
      windowSize: 20,
      alpha: 0.15,
      threshold: 1.0,
      adaptiveWindow: true,
    );

    _configurations['waterLevel'] = SmoothingConfiguration(
      algorithm: SmoothingAlgorithm.movingAverage,
      windowSize: 6,
      alpha: 0.3,
      threshold: 5.0,
      adaptiveWindow: false,
    );
  }

  Future<SensorMetrics> smoothData(String deviceId, SensorMetrics metrics) async {
    // Initialize data buffer for this device
    _dataBuffers.putIfAbsent(deviceId, () => []);
    _smoothingWindows.putIfAbsent(deviceId, () => []);

    // Create data point for current metrics
    final dataPoint = SensorDataPoint(
      timestamp: DateTime.now(),
      metrics: metrics,
    );

    // Add to buffer
    _dataBuffers[deviceId]!.add(dataPoint);

    // Limit buffer size
    final maxBufferSize = 1000;
    if (_dataBuffers[deviceId]!.length > maxBufferSize) {
      _dataBuffers[deviceId]!.removeAt(0);
    }

    // Apply smoothing to each metric
    final smoothedMetrics = await _smoothAllMetrics(deviceId, metrics);

    // Update state
    state = state.copyWith(
      lastSmoothingTime: DateTime.now(),
      totalSmoothedPoints: state.totalSmoothedPoints + 1,
    );

    return smoothedMetrics;
  }

  Future<SensorMetrics> _smoothAllMetrics(String deviceId, SensorMetrics metrics) async {
    return SensorMetrics(
      temperature: await _smoothMetric(deviceId, SensorType.temperature, metrics.temperature),
      humidity: await _smoothMetric(deviceId, SensorType.humidity, metrics.humidity),
      ph: await _smoothMetric(deviceId, SensorType.ph, metrics.ph),
      ec: await _smoothMetric(deviceId, SensorType.ec, metrics.ec),
      co2: await _smoothMetric(deviceId, SensorType.co2, metrics.co2),
      vpd: await _smoothMetric(deviceId, SensorType.vpd, metrics.vpd),
      lightIntensity: await _smoothMetric(deviceId, SensorType.lightIntensity, metrics.lightIntensity),
      soilMoisture: await _smoothMetric(deviceId, SensorType.soilMoisture, metrics.soilMoisture),
      waterLevel: await _smoothMetric(deviceId, SensorType.waterLevel, metrics.waterLevel),
      airPressure: await _smoothMetric(deviceId, SensorType.airPressure, metrics.airPressure),
      windSpeed: await _smoothMetric(deviceId, SensorType.windSpeed, metrics.windSpeed),
    );
  }

  Future<double?> _smoothMetric(String deviceId, SensorType sensorType, double? value) async {
    if (value == null) return null;

    final config = _configurations[sensorType.name];
    if (config == null) return value;

    final buffer = _dataBuffers[deviceId];
    if (buffer == null || buffer.length < 2) return value;

    final values = buffer.map((point) => _getValue(point.metrics, sensorType)).where((v) => v != null).cast<double>().toList();
    if (values.length < 2) return value;

    switch (config.algorithm) {
      case SmoothingAlgorithm.exponentialWeightedMoving:
        return _exponentialWeightedMovingAverage(value, values, config);
      case SmoothingAlgorithm.movingAverage:
        return _movingAverage(values, config);
      case SmoothingAlgorithm.median:
        return _medianFilter(values, config);
      case SmoothingAlgorithm.savitzkyGolay:
        return _savitzkyGolayFilter(value, values, config);
      case SmoothingAlgorithm.kalman:
        return _kalmanFilter(value, deviceId, sensorType, config);
      case SmoothingAlgorithm.adaptive:
        return _adaptiveFilter(value, values, config);
      case SmoothingAlgorithm.lowPass:
        return _lowPassFilter(value, values, config);
    }
  }

  double _exponentialWeightedMovingAverage(
    double currentValue,
    List<double> values,
    SmoothingConfiguration config,
  ) {
    if (values.isEmpty) return currentValue;

    final alpha = config.alpha;
    var smoothed = values.first;

    for (int i = 1; i < values.length; i++) {
      smoothed = alpha * values[i] + (1 - alpha) * smoothed;
    }

    // Final smoothing with current value
    smoothed = alpha * currentValue + (1 - alpha) * smoothed;

    return smoothed;
  }

  double _movingAverage(List<double> values, SmoothingConfiguration config) {
    final windowSize = min(config.windowSize, values.length);
    if (windowSize == 0) return values.last;

    final recentValues = values.sublist(values.length - windowSize);
    return recentValues.reduce((a, b) => a + b) / recentValues.length;
  }

  double _medianFilter(List<double> values, SmoothingConfiguration config) {
    final windowSize = min(config.windowSize, values.length);
    if (windowSize == 0) return values.last;

    final recentValues = List<double>.from(values.sublist(values.length - windowSize));
    recentValues.sort();

    if (recentValues.length.isEven) {
      final mid1 = recentValues[recentValues.length ~/ 2 - 1];
      final mid2 = recentValues[recentValues.length ~/ 2];
      return (mid1 + mid2) / 2;
    } else {
      return recentValues[recentValues.length ~/ 2];
    }
  }

  double _savitzkyGolayFilter(
    double currentValue,
    List<double> values,
    SmoothingConfiguration config,
  ) {
    // Simplified Savitzky-Golay filter implementation
    // In practice, this would use polynomial fitting over a sliding window
    final windowSize = min(config.windowSize, values.length);
    if (windowSize < 3) return currentValue;

    final window = values.sublist(values.length - windowSize);

    // Use cubic polynomial coefficients for center point smoothing
    final coefficients = _getSavitzkyGolayCoefficients(windowSize);
    double smoothed = 0.0;

    for (int i = 0; i < window.length; i++) {
      smoothed += window[i] * coefficients[i];
    }

    return smoothed;
  }

  List<double> _getSavitzkyGolayCoefficients(int windowSize) {
    // Pre-calculated Savitzky-Golay coefficients for cubic polynomial
    switch (windowSize) {
      case 3:
        return [-0.33333333, 1.0, -0.33333333];
      case 5:
        return [-0.08571429, 0.34285714, 0.48571429, 0.34285714, -0.08571429];
      case 7:
        return [-0.04761905, 0.28571429, 0.42857143, 0.47619048, 0.42857143, 0.28571429, -0.04761905];
      default:
        // Default to simple moving average coefficients
        return List.filled(windowSize, 1.0 / windowSize);
    }
  }

  double _kalmanFilter(
    double currentValue,
    String deviceId,
    SensorType sensorType,
    SmoothingConfiguration config,
  ) {
    // Simplified Kalman filter implementation
    final key = '${deviceId}_${sensorType.name}';
    final window = _smoothingWindows[key] ?? [];

    // Initialize Kalman parameters
    double q = 0.1; // Process noise
    double r = 0.1; // Measurement noise
    double x = currentValue; // State estimate
    double p = 1.0; // Error covariance

    if (window.isNotEmpty) {
      // Use last value as initial state
      x = window.last;
    }

    // Prediction step
    final xPredict = x;
    final pPredict = p + q;

    // Update step
    final k = pPredict / (pPredict + r); // Kalman gain
    x = xPredict + k * (currentValue - xPredict);
    p = (1 - k) * pPredict;

    // Store smoothed value
    _smoothingWindows[key] = [...window, x]..takeLast(100);

    return x;
  }

  double _adaptiveFilter(
    double currentValue,
    List<double> values,
    SmoothingConfiguration config,
  ) {
    // Adaptive filter that adjusts smoothing based on volatility
    if (values.length < 3) return currentValue;

    final recentValues = values.sublist(values.length - min(10, values.length));

    // Calculate volatility (standard deviation)
    final mean = recentValues.reduce((a, b) => a + b) / recentValues.length;
    final variance = recentValues.map((v) => pow(v - mean, 2)).reduce((a, b) => a + b) / recentValues.length;
    final volatility = sqrt(variance);

    // Adaptive alpha based on volatility
    final baseAlpha = config.alpha;
    final adaptiveAlpha = baseAlpha * (1.0 + volatility);

    // Clamp alpha to reasonable range
    final clampedAlpha = adaptiveAlpha.clamp(0.05, 0.8);

    return _exponentialWeightedMovingAverage(currentValue, values, config.copyWith(alpha: clampedAlpha));
  }

  double _lowPassFilter(
    double currentValue,
    List<double> values,
    SmoothingConfiguration config,
  ) {
    // Simple low-pass filter implementation
    final cutoffFrequency = config.alpha; // Use alpha as cutoff frequency proxy
    final samplingRate = 1.0; // Assuming 1 Hz sampling rate
    final rc = 1.0 / (2 * pi * cutoffFrequency);
    final dt = 1.0 / samplingRate;
    final alpha = dt / (rc + dt);

    if (values.isEmpty) return currentValue;

    final previousValue = values.last;
    return alpha * currentValue + (1 - alpha) * previousValue;
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

  // Advanced smoothing methods
  Future<List<double>> smoothTimeSeries(List<double> series, SmoothingConfiguration config) async {
    if (series.isEmpty) return [];

    final smoothedSeries = <double>[];
    final workingBuffer = <double>[];

    for (final value in series) {
      workingBuffer.add(value);

      double smoothedValue;
      switch (config.algorithm) {
        case SmoothingAlgorithm.exponentialWeightedMoving:
          smoothedValue = _exponentialWeightedMovingAverage(value, workingBuffer, config);
          break;
        case SmoothingAlgorithm.movingAverage:
          smoothedValue = _movingAverage(workingBuffer, config);
          break;
        case SmoothingAlgorithm.median:
          smoothedValue = _medianFilter(workingBuffer, config);
          break;
        case SmoothingAlgorithm.savitzkyGolay:
          smoothedValue = _savitzkyGolayFilter(value, workingBuffer, config);
          break;
        case SmoothingAlgorithm.kalman:
          smoothedValue = _kalmanFilter(value, 'temp', SensorType.temperature, config);
          break;
        case SmoothingAlgorithm.adaptive:
          smoothedValue = _adaptiveFilter(value, workingBuffer, config);
          break;
        case SmoothingAlgorithm.lowPass:
          smoothedValue = _lowPassFilter(value, workingBuffer, config);
          break;
      }

      smoothedSeries.add(smoothedValue);
    }

    return smoothedSeries;
  }

  // Noise reduction techniques
  double reduceNoise(double value, List<double> referenceValues, double noiseLevel) {
    if (referenceValues.isEmpty) return value;

    final mean = referenceValues.reduce((a, b) => a + b) / referenceValues.length;
    final distance = (value - mean).abs();

    // If value is too far from reference mean, reduce it
    if (distance > noiseLevel * 3) {
      return mean + (value - mean).sign * noiseLevel;
    }

    return value;
  }

  // Signal processing utilities
  List<double> applyBandPassFilter(List<double> signal, double lowFreq, double highFreq) {
    // Simplified band-pass filter implementation
    final filteredSignal = <double>[];

    for (int i = 0; i < signal.length; i++) {
      double sum = 0.0;
      int count = 0;

      // Apply convolution with band-pass kernel
      for (int j = max(0, i - 5); j <= min(signal.length - 1, i + 5); j++) {
        final weight = _calculateBandPassWeight(j - i, lowFreq, highFreq);
        sum += signal[j] * weight;
        count++;
      }

      filteredSignal.add(count > 0 ? sum / count : signal[i]);
    }

    return filteredSignal;
  }

  double _calculateBandPassWeight(int offset, double lowFreq, double highFreq) {
    // Simplified band-pass weight calculation
    final distance = offset.abs();
    if (distance == 0) return 1.0;

    // Gaussian-like weighting with frequency characteristics
    final sigma = (highFreq - lowFreq) / 2;
    return exp(-(distance * distance) / (2 * sigma * sigma));
  }

  // Outlier detection and removal
  List<double> removeOutliers(List<double> values, {double threshold = 3.0}) {
    if (values.length < 4) return values;

    final mean = values.reduce((a, b) => a + b) / values.length;
    final variance = values.map((v) => pow(v - mean, 2)).reduce((a, b) => a + b) / values.length;
    final std = sqrt(variance);

    return values.where((v) => (v - mean).abs() <= threshold * std).toList();
  }

  // Configuration management
  void updateSmoothingConfiguration(SensorType sensorType, SmoothingConfiguration config) {
    _configurations[sensorType.name] = config;
  }

  SmoothingConfiguration? getSmoothingConfiguration(SensorType sensorType) {
    return _configurations[sensorType.name];
  }

  // Performance monitoring
  SmoothingStatistics getSmoothingStatistics() {
    final totalBuffers = _dataBuffers.length;
    var totalPoints = 0;
    final avgBufferSize = <String, int>{};

    for (final entry in _dataBuffers.entries) {
      final bufferSize = entry.value.length;
      totalPoints += bufferSize;
      avgBufferSize[entry.key] = bufferSize;
    }

    return SmoothingStatistics(
      totalBuffers: totalBuffers,
      totalDataPoints: totalPoints,
      averageBufferSize: totalBuffers > 0 ? totalPoints / totalBuffers : 0,
      bufferSizes: avgBufferSize,
      lastUpdateTime: state.lastSmoothingTime,
    );
  }

  // Memory management
  void clearDataBuffer(String deviceId) {
    _dataBuffers.remove(deviceId);
    _smoothingWindows.remove(deviceId);
  }

  void clearAllDataBuffers() {
    _dataBuffers.clear();
    _smoothingWindows.clear();
  }

  void optimizeBuffers() {
    for (final entry in _dataBuffers.entries) {
      final buffer = entry.value;
      if (buffer.length > 500) {
        // Keep only recent 500 points
        _dataBuffers[entry.key] = buffer.sublist(buffer.length - 500);
      }
    }

    for (final entry in _smoothingWindows.entries) {
      final window = entry.value;
      if (window.length > 100) {
        // Keep only recent 100 points
        _smoothingWindows[entry.key] = window.sublist(window.length - 100);
      }
    }
  }
}

// Data models
class DataSmoothingState {
  final DateTime? lastSmoothingTime;
  final int totalSmoothedPoints;

  const DataSmoothingState({
    this.lastSmoothingTime,
    this.totalSmoothedPoints = 0,
  });

  DataSmoothingState copyWith({
    DateTime? lastSmoothingTime,
    int? totalSmoothedPoints,
  }) {
    return DataSmoothingState(
      lastSmoothingTime: lastSmoothingTime ?? this.lastSmoothingTime,
      totalSmoothedPoints: totalSmoothedPoints ?? this.totalSmoothedPoints,
    );
  }
}

class SensorDataPoint {
  final DateTime timestamp;
  final SensorMetrics metrics;

  SensorDataPoint({
    required this.timestamp,
    required this.metrics,
  });
}

class SmoothingConfiguration {
  final SmoothingAlgorithm algorithm;
  final int windowSize;
  final double alpha;
  final double threshold;
  final bool adaptiveWindow;

  const SmoothingConfiguration({
    required this.algorithm,
    required this.windowSize,
    required this.alpha,
    required this.threshold,
    this.adaptiveWindow = false,
  });

  SmoothingConfiguration copyWith({
    SmoothingAlgorithm? algorithm,
    int? windowSize,
    double? alpha,
    double? threshold,
    bool? adaptiveWindow,
  }) {
    return SmoothingConfiguration(
      algorithm: algorithm ?? this.algorithm,
      windowSize: windowSize ?? this.windowSize,
      alpha: alpha ?? this.alpha,
      threshold: threshold ?? this.threshold,
      adaptiveWindow: adaptiveWindow ?? this.adaptiveWindow,
    );
  }

  @override
  String toString() {
    return 'SmoothingConfiguration(algorithm: $algorithm, windowSize: $windowSize, alpha: $alpha)';
  }
}

class SmoothingStatistics {
  final int totalBuffers;
  final int totalDataPoints;
  final double averageBufferSize;
  final Map<String, int> bufferSizes;
  final DateTime? lastUpdateTime;

  SmoothingStatistics({
    required this.totalBuffers,
    required this.totalDataPoints,
    required this.averageBufferSize,
    required this.bufferSizes,
    this.lastUpdateTime,
  });
}

enum SmoothingAlgorithm {
  exponentialWeightedMoving,
  movingAverage,
  median,
  savitzkyGolay,
  kalman,
  adaptive,
  lowPass,
}