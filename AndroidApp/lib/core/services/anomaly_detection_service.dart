import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import '../models/sensor_device.dart';
import '../models/sensor_data.dart';

// Anomaly detection provider
final anomalyDetectionProvider = StateNotifierProvider<AnomalyDetectionNotifier, AnomalyDetectionState>((ref) {
  return AnomalyDetectionNotifier(ref);
});

class AnomalyDetectionNotifier extends StateNotifier<AnomalyDetectionState> {
  final Ref _ref;

  // Detection models and parameters
  final Map<String, AnomalyModel> _models = {};
  final Map<String, List<SensorMetrics>> _historicalData = {};
  final Map<String, AnomalyDetectionConfig> _configs = {};
  final Map<String, List<AnomalyEvent>> _anomalyHistory = {};

  AnomalyDetectionNotifier(this._ref) : super(const AnomalyDetectionState()) {
    _initializeDetectionModels();
  }

  void _initializeDetectionModels() {
    // Initialize detection models for different sensor types
    _models['temperature'] = AnomalyModel(
      sensorType: SensorType.temperature,
      algorithm: AnomalyAlgorithm.isolationForest,
      sensitivity: 0.7,
      windowSize: 50,
      seasonalPeriod: 144, // Daily seasonality (10-min intervals)
    );

    _models['humidity'] = AnomalyModel(
      sensorType: SensorType.humidity,
      algorithm: AnomalyAlgorithm.isolationForest,
      sensitivity: 0.6,
      windowSize: 50,
      seasonalPeriod: 144,
    );

    _models['co2'] = AnomalyModel(
      sensorType: SensorType.co2,
      algorithm: AnomalyAlgorithm.isolationForest,
      sensitivity: 0.8,
      windowSize: 30,
      seasonalPeriod: 144,
    );

    _models['ph'] = AnomalyModel(
      sensorType: SensorType.ph,
      algorithm: AnomalyAlgorithm.isolationForest,
      sensitivity: 0.5,
      windowSize: 100,
      seasonalPeriod: 0, // No seasonality for pH
    );

    _models['soilMoisture'] = AnomalyModel(
      sensorType: SensorType.soilMoisture,
      algorithm: AnomalyAlgorithm.isolationForest,
      sensitivity: 0.6,
      windowSize: 80,
      seasonalPeriod: 72, // 12-hour seasonality
    );
  }

  Future<bool> detectAnomaly(SensorDevice device, SensorMetrics metrics) async {
    final deviceId = device.id;
    var isAnomalous = false;
    final detectedAnomalies = <AnomalyEvent>[];

    // Initialize data structures for this device
    _historicalData.putIfAbsent(deviceId, () => []);
    _anomalyHistory.putIfAbsent(deviceId, () => []);

    // Update historical data
    _historicalData[deviceId]!.add(metrics);
    if (_historicalData[deviceId]!.length > 1000) {
      _historicalData[deviceId]!.removeAt(0);
    }

    // Detect anomalies for each sensor metric
    for (final entry in _getMetricEntries(metrics)) {
      final sensorType = entry.key;
      final value = entry.value;

      if (value != null) {
        final anomaly = await _detectAnomalyForSensor(deviceId, sensorType, value);
        if (anomaly != null) {
          detectedAnomalies.add(anomaly);
          isAnomalous = true;
        }
      }
    }

    // Update anomaly history
    _anomalyHistory[deviceId]!.addAll(detectedAnomalies);

    // Keep only recent anomalies (last 7 days)
    final cutoffDate = DateTime.now().subtract(const Duration(days: 7));
    _anomalyHistory[deviceId]!.removeWhere(
      (anomaly) => anomaly.timestamp.isBefore(cutoffDate),
    );

    // Update state
    state = state.copyWith(
      recentAnomalies: detectedAnomalies,
      anomalyCount: state.anomalyCount + detectedAnomalies.length,
    );

    // Log anomalies for debugging
    if (kDebugMode && detectedAnomalies.isNotEmpty) {
      print('Anomalies detected for device $deviceId: ${detectedAnomalies.map((a) => a.toString())}');
    }

    return isAnomalous;
  }

  Future<AnomalyEvent?> _detectAnomalyForSensor(
    String deviceId,
    SensorType sensorType,
    double value,
  ) async {
    final model = _models[sensorType.name];
    if (model == null) return null;

    final history = _historicalData[deviceId];
    if (history == null || history.length < model.windowSize) return null;

    // Extract time series data for this sensor type
    final timeSeries = history
        .map((m) => _getValue(m, sensorType))
        .where((v) => v != null)
        .cast<double>()
        .toList();

    if (timeSeries.length < model.windowSize) return null;

    // Multiple anomaly detection algorithms
    final results = await <Future<AnomalyResult?>>[
      _statisticalAnomalyDetection(sensorType, value, timeSeries, model),
      _seasonalAnomalyDetection(sensorType, value, timeSeries, model),
      _patternAnomalyDetection(sensorType, value, timeSeries, model),
      _changePointDetection(sensorType, value, timeSeries, model),
    ];

    final detectionResults = await Future.wait(results);
    final validResults = detectionResults.where((r) => r != null).cast<AnomalyResult>().toList();

    if (validResults.isEmpty) return null;

    // Combine results using weighted voting
    final combinedScore = _combineAnomalyScores(validResults);
    final finalScore = _applyThreshold(combinedScore, model.sensitivity);

    if (finalScore > 0.5) {
      return AnomalyEvent(
        id: '${deviceId}_${sensorType.name}_${DateTime.now().millisecondsSinceEpoch}',
        deviceId: deviceId,
        sensorType: sensorType,
        value: value,
        anomalyScore: finalScore,
        timestamp: DateTime.now(),
        severity: _determineSeverity(finalScore),
        description: _generateAnomalyDescription(sensorType, value, finalScore, validResults),
        recommendations: _generateRecommendations(sensorType, finalScore, validResults),
        detectionResults: validResults,
      );
    }

    return null;
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

  Future<AnomalyResult?> _statisticalAnomalyDetection(
    SensorType sensorType,
    double currentValue,
    List<double> timeSeries,
    AnomalyModel model,
  ) async {
    if (timeSeries.length < 10) return null;

    // Calculate statistics on historical data
    final mean = timeSeries.reduce((a, b) => a + b) / timeSeries.length;
    final variance = timeSeries.map((v) => pow(v - mean, 2)).reduce((a, b) => a + b) / timeSeries.length;
    final standardDeviation = sqrt(variance);

    // Calculate Z-score
    final zScore = (currentValue - mean).abs() / standardDeviation;

    // Apply threshold based on sensitivity
    final threshold = 3.0 / model.sensitivity;

    if (zScore > threshold) {
      return AnomalyResult(
        algorithm: 'statistical_zscore',
        score: zScore.clamp(0.0, 10.0) / 10.0,
        confidence: _calculateConfidence(zScore, threshold),
        details: {
          'z_score': zScore,
          'mean': mean,
          'std_dev': standardDeviation,
          'threshold': threshold,
        },
      );
    }

    return null;
  }

  Future<AnomalyResult?> _seasonalAnomalyDetection(
    SensorType sensorType,
    double currentValue,
    List<double> timeSeries,
    AnomalyModel model,
  ) async {
    if (model.seasonalPeriod == 0 || timeSeries.length < model.seasonalPeriod * 2) {
      return null;
    }

    // Calculate seasonal decomposition
    final decomposition = _seasonalDecompose(timeSeries, model.seasonalPeriod);
    if (decomposition == null) return null;

    // Calculate residual for current value
    final seasonalComponent = _getSeasonalComponent(decomposition, timeSeries.length);
    final trendComponent = decomposition['trend']?.last ?? currentValue;
    final expectedValue = seasonalComponent + trendComponent;
    final residual = currentValue - expectedValue;

    // Calculate residual statistics
    final residuals = decomposition['residual'] ?? [];
    if (residuals.isEmpty) return null;

    final residualMean = residuals.reduce((a, b) => a + b) / residuals.length;
    final residualVariance = residuals.map((r) => pow(r - residualMean, 2)).reduce((a, b) => a + b) / residuals.length;
    final residualStd = sqrt(residualVariance);

    final residualZScore = residual.abs() / (residualStd + 1e-8);
    final threshold = 2.5 / model.sensitivity;

    if (residualZScore > threshold) {
      return AnomalyResult(
        algorithm: 'seasonal_decomposition',
        score: residualZScore.clamp(0.0, 10.0) / 10.0,
        confidence: _calculateConfidence(residualZScore, threshold),
        details: {
          'residual': residual,
          'expected_value': expectedValue,
          'seasonal_component': seasonalComponent,
          'trend_component': trendComponent,
          'residual_z_score': residualZScore,
        },
      );
    }

    return null;
  }

  Future<AnomalyResult?> _patternAnomalyDetection(
    SensorType sensorType,
    double currentValue,
    List<double> timeSeries,
    AnomalyModel model,
  ) async {
    if (timeSeries.length < model.windowSize) return null;

    // Use sliding window to detect unusual patterns
    final windowSize = model.windowSize;
    final currentWindow = timeSeries.sublist(timeSeries.length - windowSize);

    // Calculate pattern features
    final currentFeatures = _extractPatternFeatures(currentWindow);

    // Compare with historical windows
    final historicalWindows = <List<double>>[];
    for (int i = 0; i <= timeSeries.length - windowSize; i++) {
      historicalWindows.add(timeSeries.sublist(i, i + windowSize));
    }

    // Remove the current window from historical data
    historicalWindows.removeLast();

    if (historicalWindows.length < 5) return null;

    // Calculate feature distances
    final distances = historicalWindows.map((window) {
      final features = _extractPatternFeatures(window);
      return _calculateFeatureDistance(currentFeatures, features);
    }).toList();

    // Calculate anomaly score based on distance percentiles
    distances.sort();
    final percentile = distances.indexWhere((d) => d >= distances.last) / distances.length;

    final threshold = 0.95 / model.sensitivity;

    if (percentile > threshold) {
      return AnomalyResult(
        algorithm: 'pattern_matching',
        score: percentile,
        confidence: _calculateConfidence(percentile, threshold),
        details: {
          'percentile': percentile,
          'threshold': threshold,
          'pattern_distance': distances.last,
          'features': currentFeatures,
        },
      );
    }

    return null;
  }

  Future<AnomalyResult?> _changePointDetection(
    SensorType sensorType,
    double currentValue,
    List<double> timeSeries,
    AnomalyModel model,
  ) async {
    if (timeSeries.length < model.windowSize * 2) return null;

    // Use CUSUM (Cumulative Sum) algorithm for change point detection
    final recentData = timeSeries.sublist(timeSeries.length - model.windowSize);
    final baselineData = timeSeries.sublist(
      timeSeries.length - model.windowSize * 2,
      timeSeries.length - model.windowSize,
    );

    final baselineMean = baselineData.reduce((a, b) => a + b) / baselineData.length;
    final recentMean = recentData.reduce((a, b) => a + b) / recentData.length;

    // Calculate cumulative sum
    var cusum = 0.0;
    final maxCusum = 0.0;

    for (final value in recentData) {
      cusum += (value - baselineMean);
      if (cusum > maxCusum) {
        cusum = maxCusum;
      }
    }

    // Normalize CUSUM score
    final cusumScore = cusum / (recentData.length * baselineMean.abs() + 1e-8);
    final threshold = 2.0 / model.sensitivity;

    if (cusumScore.abs() > threshold) {
      return AnomalyResult(
        algorithm: 'cusum_change_point',
        score: cusumScore.abs().clamp(0.0, 1.0),
        confidence: _calculateConfidence(cusumScore.abs(), threshold),
        details: {
          'cusum_score': cusumScore,
          'baseline_mean': baselineMean,
          'recent_mean': recentMean,
          'mean_change': recentMean - baselineMean,
          'threshold': threshold,
        },
      );
    }

    return null;
  }

  Map<String, List<double>>? _seasonalDecompose(List<double> timeSeries, int period) {
    if (timeSeries.length < period * 2) return null;

    // Simple seasonal decomposition using moving averages
    final trend = <double>[];
    final seasonal = <double>[];
    final residual = <double>[];

    // Calculate trend using moving average
    final halfPeriod = period ~/ 2;
    for (int i = halfPeriod; i < timeSeries.length - halfPeriod; i++) {
      final windowStart = i - halfPeriod;
      final windowEnd = i + halfPeriod + 1;
      final window = timeSeries.sublist(windowStart, windowEnd);
      final avg = window.reduce((a, b) => a + b) / window.length;
      trend.add(avg);
    }

    // Calculate seasonal components
    for (int i = 0; i < period; i++) {
      final seasonalValues = <double>[];
      for (int j = i; j < timeSeries.length; j += period) {
        if (j < trend.length + halfPeriod) {
          seasonalValues.add(timeSeries[j] - trend[j - halfPeriod]);
        }
      }
      if (seasonalValues.isNotEmpty) {
        seasonal.add(seasonalValues.reduce((a, b) => a + b) / seasonalValues.length);
      } else {
        seasonal.add(0.0);
      }
    }

    // Calculate residuals
    for (int i = 0; i < timeSeries.length; i++) {
      if (i < trend.length + halfPeriod) {
        final trendValue = i >= halfPeriod && i - halfPeriod < trend.length
            ? trend[i - halfPeriod]
            : 0.0;
        final seasonalValue = seasonal[i % period];
        residual.add(timeSeries[i] - trendValue - seasonalValue);
      }
    }

    return {
      'trend': trend,
      'seasonal': seasonal,
      'residual': residual,
    };
  }

  double _getSeasonalComponent(Map<String, List<double>> decomposition, int index) {
    final seasonal = decomposition['seasonal'];
    if (seasonal == null || seasonal.isEmpty) return 0.0;
    return seasonal[index % seasonal.length];
  }

  Map<String, double> _extractPatternFeatures(List<double> window) {
    if (window.isEmpty) return {};

    final mean = window.reduce((a, b) => a + b) / window.length;
    final variance = window.map((v) => pow(v - mean, 2)).reduce((a, b) => a + b) / window.length;
    final std = sqrt(variance);

    // Calculate autocorrelation
    var autocorr = 0.0;
    if (window.length > 1) {
      for (int i = 1; i < window.length; i++) {
        autocorr += (window[i] - mean) * (window[i - 1] - mean);
      }
      autocorr /= (window.length - 1) * variance;
    }

    // Calculate trend (slope)
    var trend = 0.0;
    if (window.length > 1) {
      final n = window.length.toDouble();
      final sumX = n * (n - 1) / 2;
      final sumY = window.reduce((a, b) => a + b);
      final sumXY = window.asMap().entries.map((e) => e.key.toDouble() * e.value).reduce((a, b) => a + b);
      final sumX2 = (n - 1) * n * (2 * n - 1) / 6;

      trend = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }

    return {
      'mean': mean,
      'std': std,
      'autocorr': autocorr,
      'trend': trend,
      'min': window.reduce(min),
      'max': window.reduce(max),
      'range': window.reduce(max) - window.reduce(min),
    };
  }

  double _calculateFeatureDistance(Map<String, double> features1, Map<String, double> features2) {
    double distance = 0.0;
    int count = 0;

    for (final key in features1.keys) {
      if (features2.containsKey(key)) {
        final diff = features1[key]! - features2[key]!;
        distance += diff * diff;
        count++;
      }
    }

    return count > 0 ? sqrt(distance / count) : double.infinity;
  }

  double _combineAnomalyScores(List<AnomalyResult> results) {
    if (results.isEmpty) return 0.0;

    // Weighted combination of different algorithms
    final weights = <String, double>{
      'statistical_zscore': 0.3,
      'seasonal_decomposition': 0.25,
      'pattern_matching': 0.25,
      'cusum_change_point': 0.2,
    };

    var weightedSum = 0.0;
    var totalWeight = 0.0;

    for (final result in results) {
      final weight = weights[result.algorithm] ?? 0.1;
      weightedSum += result.score * weight * result.confidence;
      totalWeight += weight * result.confidence;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0.0;
  }

  double _applyThreshold(double score, double sensitivity) {
    // Apply sensitivity-based threshold
    final threshold = 0.3 / sensitivity;
    return (score - threshold).clamp(0.0, 1.0);
  }

  double _calculateConfidence(double value, double threshold) {
    // Calculate confidence based on how far the value exceeds the threshold
    if (value <= threshold) return 0.0;
    return (value / threshold - 1.0).clamp(0.0, 1.0);
  }

  AnomalySeverity _determineSeverity(double anomalyScore) {
    if (anomalyScore >= 0.8) return AnomalySeverity.critical;
    if (anomalyScore >= 0.6) return AnomalySeverity.high;
    if (anomalyScore >= 0.4) return AnomalySeverity.medium;
    return AnomalySeverity.low;
  }

  String _generateAnomalyDescription(
    SensorType sensorType,
    double value,
    double score,
    List<AnomalyResult> results,
  ) {
    final severity = _determineSeverity(score);
    final severityText = severity.name.toUpperCase();

    final detectedAlgorithms = results.map((r) => r.algorithm).join(', ');

    return '$severityText anomaly detected in $sensorType: value $value (score: ${(score * 100).toStringAsFixed(1)}%). '
           'Detected by: $detectedAlgorithms';
  }

  List<String> _generateRecommendations(
    SensorType sensorType,
    double score,
    List<AnomalyResult> results,
  ) {
    final recommendations = <String>[];
    final severity = _determineSeverity(score);

    if (severity == AnomalySeverity.critical) {
      recommendations.add('IMMEDIATE ATTENTION REQUIRED: Check sensor calibration');
      recommendations.add('Verify physical sensor condition and connections');
    }

    if (severity == AnomalySeverity.high) {
      recommendations.add('Investigate potential sensor malfunction');
      recommendations.add('Check for environmental changes');
    }

    // Sensor-specific recommendations
    switch (sensorType) {
      case SensorType.temperature:
        recommendations.add('Check HVAC system operation');
        recommendations.add('Verify ventilation and insulation');
        break;
      case SensorType.humidity:
        recommendations.add('Check humidifier/dehumidifier operation');
        recommendations.add('Inspect for water leaks or condensation');
        break;
      case SensorType.co2:
        recommendations.add('Check CO2 enrichment system');
        recommendations.add('Verify ventilation rates');
        break;
      case SensorType.ph:
        recommendations.add('Check nutrient solution mixing');
        recommendations.add('Calibrate pH sensor');
        break;
      case SensorType.soilMoisture:
        recommendations.add('Check irrigation system');
        recommendations.add('Inspect for drainage issues');
        break;
    }

    if (results.any((r) => r.algorithm.contains('seasonal'))) {
      recommendations.add('Consider seasonal environmental changes');
    }

    if (results.any((r) => r.algorithm.contains('pattern'))) {
      recommendations.add('Investigate recurring operational patterns');
    }

    return recommendations;
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

  // Public API methods
  List<AnomalyEvent> getAnomaliesForDevice(String deviceId, {Duration? timeRange}) {
    final anomalies = _anomalyHistory[deviceId] ?? [];

    if (timeRange != null) {
      final cutoff = DateTime.now().subtract(timeRange);
      return anomalies.where((a) => a.timestamp.isAfter(cutoff)).toList();
    }

    return anomalies;
  }

  Map<SensorType, int> getAnomalyCountsForDevice(String deviceId, {Duration? timeRange}) {
    final anomalies = getAnomaliesForDevice(deviceId, timeRange: timeRange);
    final counts = <SensorType, int>{};

    for (final anomaly in anomalies) {
      counts[anomaly.sensorType] = (counts[anomaly.sensorType] ?? 0) + 1;
    }

    return counts;
  }

  AnomalyStatistics getAnomalyStatistics({Duration? timeRange}) {
    final allAnomalies = <AnomalyEvent>[];

    for (final deviceAnomalies in _anomalyHistory.values) {
      final filteredAnomalies = timeRange != null
          ? deviceAnomalies.where((a) => a.timestamp.isAfter(DateTime.now().subtract(timeRange))).toList()
          : deviceAnomalies;
      allAnomalies.addAll(filteredAnomalies);
    }

    final severityCounts = <AnomalySeverity, int>{};
    final sensorTypeCounts = <SensorType, int>{};
    var totalScore = 0.0;

    for (final anomaly in allAnomalies) {
      severityCounts[anomaly.severity] = (severityCounts[anomaly.severity] ?? 0) + 1;
      sensorTypeCounts[anomaly.sensorType] = (sensorTypeCounts[anomaly.sensorType] ?? 0) + 1;
      totalScore += anomaly.anomalyScore;
    }

    return AnomalyStatistics(
      totalAnomalies: allAnomalies.length,
      severityCounts: severityCounts,
      sensorTypeCounts: sensorTypeCounts,
      averageAnomalyScore: allAnomalies.isNotEmpty ? totalScore / allAnomalies.length : 0.0,
      mostAffectedSensorType: sensorTypeCounts.entries.isNotEmpty
          ? sensorTypeCounts.entries.reduce((a, b) => a.value > b.value ? a : b).key
          : SensorType.temperature,
    );
  }

  void acknowledgeAnomaly(String anomalyId) {
    for (final deviceAnomalies in _anomalyHistory.values) {
      final anomaly = deviceAnomalies.cast<AnomalyEvent?>().firstWhere(
        (a) => a?.id == anomalyId,
        orElse: () => null,
      );

      if (anomaly != null) {
        deviceAnomalies.remove(anomaly);
        deviceAnomalies.add(anomaly.copyWith(acknowledged: true));
        break;
      }
    }
  }

  void clearAnomalyHistory(String deviceId) {
    _anomalyHistory[deviceId]?.clear();
  }

  void clearAllAnomalyHistory() {
    _anomalyHistory.clear();
  }

  void updateModelConfiguration(SensorType sensorType, AnomalyDetectionConfig config) {
    _configs[sensorType.name] = config;

    final model = _models[sensorType.name];
    if (model != null) {
      _models[sensorType.name] = model.copyWith(
        sensitivity: config.sensitivity,
        windowSize: config.windowSize,
        seasonalPeriod: config.seasonalPeriod,
      );
    }
  }

  Future<void> trainModel(SensorType sensorType, List<double> trainingData) async {
    // Model training would be implemented here
    // For now, we'll use statistical parameters from training data
    final model = _models[sensorType.name];
    if (model == null || trainingData.isEmpty) return;

    final mean = trainingData.reduce((a, b) => a + b) / trainingData.length;
    final variance = trainingData.map((v) => pow(v - mean, 2)).reduce((a, b) => a + b) / trainingData.length;
    final std = sqrt(variance);

    if (kDebugMode) {
      print('Trained model for $sensorType: mean=$mean, std=$std');
    }
  }
}

// Data models
class AnomalyDetectionState {
  final List<AnomalyEvent> recentAnomalies;
  final int anomalyCount;
  final bool isProcessing;

  const AnomalyDetectionState({
    this.recentAnomalies = const [],
    this.anomalyCount = 0,
    this.isProcessing = false,
  });

  AnomalyDetectionState copyWith({
    List<AnomalyEvent>? recentAnomalies,
    int? anomalyCount,
    bool? isProcessing,
  }) {
    return AnomalyDetectionState(
      recentAnomalies: recentAnomalies ?? this.recentAnomalies,
      anomalyCount: anomalyCount ?? this.anomalyCount,
      isProcessing: isProcessing ?? this.isProcessing,
    );
  }
}

class AnomalyModel {
  final SensorType sensorType;
  final AnomalyAlgorithm algorithm;
  final double sensitivity;
  final int windowSize;
  final int seasonalPeriod;

  AnomalyModel({
    required this.sensorType,
    required this.algorithm,
    required this.sensitivity,
    required this.windowSize,
    required this.seasonalPeriod,
  });

  AnomalyModel copyWith({
    SensorType? sensorType,
    AnomalyAlgorithm? algorithm,
    double? sensitivity,
    int? windowSize,
    int? seasonalPeriod,
  }) {
    return AnomalyModel(
      sensorType: sensorType ?? this.sensorType,
      algorithm: algorithm ?? this.algorithm,
      sensitivity: sensitivity ?? this.sensitivity,
      windowSize: windowSize ?? this.windowSize,
      seasonalPeriod: seasonalPeriod ?? this.seasonalPeriod,
    );
  }
}

class AnomalyDetectionConfig {
  final double sensitivity;
  final int windowSize;
  final int seasonalPeriod;
  final bool enableSeasonal;
  final bool enablePattern;
  final bool enableChangePoint;

  AnomalyDetectionConfig({
    required this.sensitivity,
    required this.windowSize,
    required this.seasonalPeriod,
    this.enableSeasonal = true,
    this.enablePattern = true,
    this.enableChangePoint = true,
  });
}

class AnomalyEvent {
  final String id;
  final String deviceId;
  final SensorType sensorType;
  final double value;
  final double anomalyScore;
  final DateTime timestamp;
  final AnomalySeverity severity;
  final String description;
  final List<String> recommendations;
  final List<AnomalyResult> detectionResults;
  final bool acknowledged;

  AnomalyEvent({
    required this.id,
    required this.deviceId,
    required this.sensorType,
    required this.value,
    required this.anomalyScore,
    required this.timestamp,
    required this.severity,
    required this.description,
    required this.recommendations,
    required this.detectionResults,
    this.acknowledged = false,
  });

  AnomalyEvent copyWith({
    String? id,
    String? deviceId,
    SensorType? sensorType,
    double? value,
    double? anomalyScore,
    DateTime? timestamp,
    AnomalySeverity? severity,
    String? description,
    List<String>? recommendations,
    List<AnomalyResult>? detectionResults,
    bool? acknowledged,
  }) {
    return AnomalyEvent(
      id: id ?? this.id,
      deviceId: deviceId ?? this.deviceId,
      sensorType: sensorType ?? this.sensorType,
      value: value ?? this.value,
      anomalyScore: anomalyScore ?? this.anomalyScore,
      timestamp: timestamp ?? this.timestamp,
      severity: severity ?? this.severity,
      description: description ?? this.description,
      recommendations: recommendations ?? this.recommendations,
      detectionResults: detectionResults ?? this.detectionResults,
      acknowledged: acknowledged ?? this.acknowledged,
    );
  }

  @override
  String toString() {
    return 'AnomalyEvent(sensorType: $sensorType, score: ${(anomalyScore * 100).toStringAsFixed(1)}%, severity: $severity)';
  }
}

class AnomalyResult {
  final String algorithm;
  final double score;
  final double confidence;
  final Map<String, dynamic> details;

  AnomalyResult({
    required this.algorithm,
    required this.score,
    required this.confidence,
    required this.details,
  });
}

class AnomalyStatistics {
  final int totalAnomalies;
  final Map<AnomalySeverity, int> severityCounts;
  final Map<SensorType, int> sensorTypeCounts;
  final double averageAnomalyScore;
  final SensorType mostAffectedSensorType;

  AnomalyStatistics({
    required this.totalAnomalies,
    required this.severityCounts,
    required this.sensorTypeCounts,
    required this.averageAnomalyScore,
    required this.mostAffectedSensorType,
  });
}

enum AnomalyAlgorithm {
  isolationForest,
  oneClassSVM,
  localOutlierFactor,
  statistical,
  seasonalDecomposition,
  cusum,
}

enum AnomalySeverity {
  low,
  medium,
  high,
  critical,
}