import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import '../models/room_config.dart';
import '../models/sensor_data.dart';

// AI optimization provider
final aiOptimizationProvider = StateNotifierProvider<AiOptimizationNotifier, AiOptimizationState>((ref) {
  return AiOptimizationNotifier(ref);
});

class AiOptimizationNotifier extends StateNotifier<AiOptimizationState> {
  final Ref _ref;

  // ML models and optimization algorithms
  final Map<String, OptimizationModel> _models = {};
  final Map<String, List<SensorData>> _trainingData = {};
  final Map<String, OptimizationHistory> _optimizationHistory = {};

  // Prediction cache
  final Map<String, CachedPrediction> _predictionCache = {};
  final Duration _cacheTimeout = Duration(minutes: 5);

  AiOptimizationNotifier(this._ref) : super(const AiOptimizationState()) {
    _initializeOptimizationModels();
  }

  void _initializeOptimizationModels() {
    // Initialize ML models for different optimization tasks
    _models['watering_prediction'] = OptimizationModel(
      type: OptimizationType.watering,
      algorithm: MachineLearningAlgorithm.randomForest,
      features: ['soil_moisture', 'temperature', 'humidity', 'light_intensity', 'growth_stage'],
      targetVariable: 'watering_needed',
      accuracy: 0.0,
    );

    _models['climate_optimization'] = OptimizationModel(
      type: OptimizationType.climate,
      algorithm: MachineLearningAlgorithm.gradientBoosting,
      features: ['temperature', 'humidity', 'co2', 'vpd', 'time_of_day', 'growth_stage'],
      targetVariable: 'optimal_setpoints',
      accuracy: 0.0,
    );

    _models['yield_prediction'] = OptimizationModel(
      type: OptimizationType.yield,
      algorithm: MachineLearningAlgorithm.neuralNetwork,
      features: ['environmental_consistency', 'nutrient_levels', 'growth_stage', 'plant_health'],
      targetVariable: 'expected_yield',
      accuracy: 0.0,
    );

    _models['energy_optimization'] = OptimizationModel(
      type: OptimizationType.energy,
      algorithm: MachineLearningAlgorithm.reinforcementLearning,
      features: ['energy_consumption', 'environmental_targets', 'weather_forecast', 'electricity_rates'],
      targetVariable: 'optimal_schedule',
      accuracy: 0.0,
    );

    _models['nutrient_optimization'] = OptimizationModel(
      type: OptimizationType.nutrient,
      algorithm: MachineLearningAlgorithm.randomForest,
      features: ['ph', 'ec', 'growth_stage', 'plant_health', 'water_usage'],
      targetVariable: 'nutrient_recommendations',
      accuracy: 0.0,
    );
  }

  // Watering prediction and optimization
  Future<WateringPrediction> predictWateringNeed(String roomId, SensorMetrics metrics) async {
    final cacheKey = 'watering_${roomId}_${DateTime.now().millisecondsSinceEpoch ~/ 60000}'; // Cache per minute

    // Check cache first
    final cached = _predictionCache[cacheKey];
    if (cached != null && DateTime.now().difference(cached.timestamp) < _cacheTimeout) {
      return cached.prediction as WateringPrediction;
    }

    try {
      final features = _extractWateringFeatures(roomId, metrics);
      final model = _models['watering_prediction'];

      if (model == null || features.isEmpty) {
        return _getDefaultWateringPrediction(metrics);
      }

      // Use trained model to predict watering need
      final prediction = await _predictWateringWithModel(features, model, metrics);

      // Cache the prediction
      _predictionCache[cacheKey] = CachedPrediction(
        prediction: prediction,
        timestamp: DateTime.now(),
      );

      // Update state
      state = state.copyWith(
        lastPredictionTime: DateTime.now(),
        totalPredictions: state.totalPredictions + 1,
      );

      return prediction;
    } catch (e) {
      if (kDebugMode) {
        print('Watering prediction error: $e');
      }
      return _getDefaultWateringPrediction(metrics);
    }
  }

  Map<String, double> _extractWateringFeatures(String roomId, SensorMetrics metrics) {
    final features = <String, double>{};

    // Current sensor readings
    if (metrics.soilMoisture != null) features['current_soil_moisture'] = metrics.soilMoisture!;
    if (metrics.temperature != null) features['temperature'] = metrics.temperature!;
    if (metrics.humidity != null) features['humidity'] = metrics.humidity!;
    if (metrics.lightIntensity != null) features['light_intensity'] = metrics.lightIntensity!;

    // Time-based features
    final now = DateTime.now();
    features['hour_of_day'] = now.hour.toDouble();
    features['day_of_week'] = now.weekday.toDouble();
    features['days_in_cycle'] = _getDaysInGrowthCycle(roomId);

    // Historical trends
    final history = _getRecentHistory(roomId, 24); // Last 24 hours
    if (history.isNotEmpty) {
      features['soil_moisture_trend'] = _calculateTrend(history, 'soilMoisture');
      features['temperature_trend'] = _calculateTrend(history, 'temperature');
      features['humidity_trend'] = _calculateTrend(history, 'humidity');
    }

    // Growth stage factor
    final room = _ref.read(roomManagementProvider).getRoomById(roomId);
    if (room != null) {
      features['growth_stage'] = _getGrowthStageValue(room.environmentalTargets.growthStage);
    }

    return features;
  }

  Future<WateringPrediction> _predictWateringWithModel(
    Map<String, double> features,
    OptimizationModel model,
    SensorMetrics currentMetrics,
  ) async {
    // Simplified ML prediction - in practice, this would use actual ML libraries
    final soilMoisture = currentMetrics.soilMoisture ?? 50.0;
    final temperature = currentMetrics.temperature ?? 22.0;
    final humidity = currentMetrics.humidity ?? 60.0;

    // Rule-based prediction with ML-like scoring
    var wateringScore = 0.0;
    var confidence = 0.5;
    final reasons = <String>[];

    // Soil moisture factors
    if (soilMoisture < 30) {
      wateringScore += 0.8;
      reasons.add('Low soil moisture');
      confidence = 0.9;
    } else if (soilMoisture < 40) {
      wateringScore += 0.5;
      reasons.add('Moderate soil moisture');
      confidence = 0.7;
    } else if (soilMoisture > 70) {
      wateringScore -= 0.6;
      reasons.add('High soil moisture');
    }

    // Temperature factors
    if (temperature > 28) {
      wateringScore += 0.3;
      reasons.add('High temperature increases water needs');
    }

    // Humidity factors
    if (humidity < 40) {
      wateringScore += 0.2;
      reasons.add('Low humidity increases evaporation');
    }

    // Time-based factors
    final hour = DateTime.now().hour;
    if (hour >= 6 && hour <= 10) {
      wateringScore += 0.1;
      reasons.add('Morning watering optimal');
    }

    // Historical trend factors
    if (features.containsKey('soil_moisture_trend')) {
      final trend = features['soil_moisture_trend']!;
      if (trend < -1.0) {
        wateringScore += 0.3;
        reasons.add('Soil moisture decreasing rapidly');
        confidence = min(1.0, confidence + 0.1);
      }
    }

    final shouldWater = wateringScore > 0.5;
    final amount = _calculateWateringAmount(soilMoisture, wateringScore);

    return WateringPrediction(
      shouldWater: shouldWater,
      confidence: confidence,
      amount: amount,
      recommendedTime: _calculateOptimalWateringTime(features),
      reason: reasons.join('; '),
      priority: _calculateWateringPriority(wateringScore),
    );
  }

  WateringPrediction _getDefaultWateringPrediction(SensorMetrics metrics) {
    final soilMoisture = metrics.soilMoisture ?? 50.0;

    return WateringPrediction(
      shouldWater: soilMoisture < 40,
      confidence: 0.5,
      amount: soilMoisture < 30 ? 1.0 : 0.5,
      recommendedTime: DateTime.now().add(Duration(minutes: 30)),
      reason: 'Basic threshold-based prediction',
      priority: soilMoisture < 30 ? 8 : 5,
    );
  }

  // Climate optimization
  Future<ClimateOptimization> optimizeClimateSettings(String roomId, SensorMetrics currentMetrics) async {
    try {
      final room = _ref.read(roomManagementProvider).getRoomById(roomId);
      if (room == null) {
        return _getDefaultClimateOptimization(currentMetrics);
      }

      final features = _extractClimateFeatures(roomId, currentMetrics, room);
      final model = _models['climate_optimization'];

      if (model == null) {
        return _getDefaultClimateOptimization(currentMetrics);
      }

      return await _optimizeClimateWithModel(features, model, room, currentMetrics);
    } catch (e) {
      if (kDebugMode) {
        print('Climate optimization error: $e');
      }
      return _getDefaultClimateOptimization(currentMetrics);
    }
  }

  Map<String, double> _extractClimateFeatures(String roomId, SensorMetrics metrics, RoomConfig room) {
    final features = <String, double>{};

    // Current conditions
    if (metrics.temperature != null) features['current_temperature'] = metrics.temperature!;
    if (metrics.humidity != null) features['current_humidity'] = metrics.humidity!;
    if (metrics.co2 != null) features['current_co2'] = metrics.co2!;
    if (metrics.vpd != null) features['current_vpd'] = metrics.vpd!;
    if (metrics.lightIntensity != null) features['current_light'] = metrics.lightIntensity!;

    // Target conditions
    final targets = room.environmentalTargets;
    features['target_temperature'] = targets.temperature.midPoint;
    features['target_humidity'] = targets.humidity.midPoint;
    features['target_co2'] = targets.co2.midPoint;
    features['target_vpd'] = targets.vpd.midPoint;

    // Deviation from targets
    if (metrics.temperature != null) {
      features['temp_deviation'] = (metrics.temperature! - targets.temperature.midPoint).abs();
    }
    if (metrics.humidity != null) {
      features['humidity_deviation'] = (metrics.humidity! - targets.humidity.midPoint).abs();
    }

    // Time and growth stage
    final now = DateTime.now();
    features['hour_of_day'] = now.hour.toDouble();
    features['growth_stage'] = _getGrowthStageValue(targets.growthStage);

    // Energy cost factors
    features['electricity_rate'] = _getCurrentElectricityRate(now);
    features['outdoor_temperature'] = _getOutdoorTemperature(); // Would integrate with weather API

    return features;
  }

  Future<ClimateOptimization> _optimizeClimateWithModel(
    Map<String, double> features,
    OptimizationModel model,
    RoomConfig room,
    SensorMetrics currentMetrics,
  ) async {
    final currentTemp = currentMetrics.temperature ?? 22.0;
    final currentHumidity = currentMetrics.humidity ?? 60.0;
    final currentCo2 = currentMetrics.co2 ?? 800.0;

    final targets = room.environmentalTargets;

    // Calculate optimal setpoints with AI optimization
    final optimalTemp = _optimizeTemperature(currentTemp, targets, features);
    final optimalHumidity = _optimizeHumidity(currentHumidity, targets, features);
    final optimalCo2 = _optimizeCo2(currentCo2, targets, features);

    // Calculate VPD implications
    final currentVpd = _calculateVpd(currentTemp, currentHumidity);
    final optimalVpd = _calculateVpd(optimalTemp, optimalHumidity);

    // Energy optimization
    final energySavings = _calculateEnergySavings(
      currentMetrics,
      SensorMetrics(
        temperature: optimalTemp,
        humidity: optimalHumidity,
        co2: optimalCo2,
      ),
      features,
    );

    // Implementation priority
    final priority = _calculateClimatePriority(
      currentTemp,
      optimalTemp,
      currentHumidity,
      optimalHumidity,
      currentCo2,
      optimalCo2,
    );

    return ClimateOptimization(
      recommendedTemperature: optimalTemp,
      recommendedHumidity: optimalHumidity,
      recommendedCo2: optimalCo2,
      currentVpd: currentVpd,
      optimalVpd: optimalVpd,
      energySavingsPotential: energySavings,
      priority: priority,
      implementationSteps: _getImplementationSteps(optimalTemp, optimalHumidity, optimalCo2),
      estimatedTimeToOptimal: _estimateTimeToOptimal(currentMetrics, optimalTemp, optimalHumidity, optimalCo2),
      confidence: 0.8, // Would be calculated from model accuracy
    );
  }

  double _optimizeTemperature(double currentTemp, ValueRange targets, Map<String, double> features) {
    final target = targets.midPoint;
    final outdoorTemp = features['outdoor_temperature'] ?? 20.0;
    final electricityRate = features['electricity_rate'] ?? 0.1;

    var optimal = target;

    // Adjust for outdoor temperature (reduce heating/cooling load)
    if (outdoorTemp < 10 && target > 22) {
      optimal = max(target - 1, targets.min); // Reduce heating demand
    } else if (outdoorTemp > 30 && target < 25) {
      optimal = min(target + 1, targets.max); // Reduce cooling demand
    }

    // Adjust for electricity rates
    if (electricityRate > 0.15) {
      // During peak rates, move toward more energy-efficient setpoint
      optimal = (optimal + outdoorTemp) / 2;
    }

    return optimal.clamp(targets.min, targets.max);
  }

  double _optimizeHumidity(double currentHumidity, ValueRange targets, Map<String, double> features) {
    final target = targets.midPoint;
    final outdoorHumidity = features['outdoor_humidity'] ?? 50.0;

    var optimal = target;

    // Consider outdoor humidity to reduce energy consumption
    if ((outdoorHumidity - target).abs() < 10) {
      optimal = outdoorHumidity; // Use outdoor humidity if close to target
    }

    return optimal.clamp(targets.min, targets.max);
  }

  double _optimizeCo2(double currentCo2, ValueRange targets, Map<String, double> features) {
    final hour = DateTime.now().hour;
    final lightLevel = features['current_light'] ?? 0.0;

    // Only optimize CO2 during lights-on period
    if (lightLevel < 100) {
      return 400.0; // Ambient CO2 level during dark period
    }

    final target = targets.midPoint;
    var optimal = target;

    // Adjust for time of day and light intensity
    if (lightLevel > 800) {
      optimal = min(target + 100, targets.max); // Increase CO2 during high light
    }

    return optimal.clamp(targets.min, targets.max);
  }

  double _calculateVpd(double temperature, double humidity) {
    // Simplified VPD calculation
    final svp = 6.112 * exp((17.67 * temperature) / (temperature + 243.5));
    final vpd = svp * (1 - humidity / 100);
    return vpd / 10; // Convert to kPa
  }

  // Yield prediction
  Future<YieldPrediction> predictYield(String roomId) async {
    try {
      final features = _extractYieldFeatures(roomId);
      final model = _models['yield_prediction'];

      if (model == null) {
        return _getDefaultYieldPrediction();
      }

      return await _predictYieldWithModel(features, model);
    } catch (e) {
      if (kDebugMode) {
        print('Yield prediction error: $e');
      }
      return _getDefaultYieldPrediction();
    }
  }

  Map<String, double> _extractYieldFeatures(String roomId) {
    final features = <String, double>{};

    // Get historical data
    final history = _getRecentHistory(roomId, 168); // Last week
    if (history.isEmpty) return features;

    // Calculate environmental consistency
    features['temperature_consistency'] = _calculateConsistency(history, 'temperature');
    features['humidity_consistency'] = _calculateConsistency(history, 'humidity');
    features['co2_consistency'] = _calculateConsistency(history, 'co2');

    // Average conditions
    features['avg_temperature'] = _calculateAverage(history, 'temperature');
    features['avg_humidity'] = _calculateAverage(history, 'humidity');
    features['avg_co2'] = _calculateAverage(history, 'co2');

    // Stress factors
    features['temperature_stress_events'] = _countStressEvents(history, 'temperature');
    features['humidity_stress_events'] = _countStressEvents(history, 'humidity');

    // Growth stage
    final room = _ref.read(roomManagementProvider).getRoomById(roomId);
    if (room != null) {
      features['growth_stage'] = _getGrowthStageValue(room.environmentalTargets.growthStage);
    }

    return features;
  }

  Future<YieldPrediction> _predictYieldWithModel(
    Map<String, double> features,
    OptimizationModel model,
  ) async {
    if (features.isEmpty) {
      return _getDefaultYieldPrediction();
    }

    // Simplified yield prediction model
    var yieldScore = 0.5; // Base yield score (0-1)
    final factors = <String>[];

    // Environmental consistency factors
    if (features.containsKey('temperature_consistency')) {
      final consistency = features['temperature_consistency']!;
      yieldScore *= (1 + consistency * 0.1);
      factors.add('Temperature consistency: ${(consistency * 100).toStringAsFixed(0)}%');
    }

    if (features.containsKey('humidity_consistency')) {
      final consistency = features['humidity_consistency']!;
      yieldScore *= (1 + consistency * 0.08);
      factors.add('Humidity consistency: ${(consistency * 100).toStringAsFixed(0)}%');
    }

    // Optimal conditions factors
    if (features.containsKey('avg_temperature')) {
      final avgTemp = features['avg_temperature']!;
      if (avgTemp >= 22 && avgTemp <= 26) {
        yieldScore *= 1.15;
        factors.add('Optimal temperature range');
      }
    }

    if (features.containsKey('avg_humidity')) {
      final avgHumidity = features['avg_humidity']!;
      if (avgHumidity >= 50 && avgHumidity <= 65) {
        yieldScore *= 1.10;
        factors.add('Optimal humidity range');
      }
    }

    // Stress penalties
    if (features.containsKey('temperature_stress_events')) {
      final stressEvents = features['temperature_stress_events']!;
      if (stressEvents > 5) {
        yieldScore *= 0.85;
        factors.add('High temperature stress: ${stressEvents.toStringAsFixed(0)} events');
      }
    }

    // Growth stage factor
    if (features.containsKey('growth_stage')) {
      final growthStage = features['growth_stage']!;
      yieldScore *= (1 + growthStage * 0.05);
    }

    // Convert to expected yield (grams per square meter)
    final baseYield = 500.0; // Base yield in g/m²
    final expectedYield = baseYield * yieldScore;

    // Calculate confidence based on data quality
    final confidence = _calculatePredictionConfidence(features);

    return YieldPrediction(
      expectedYield: expectedYield,
      yieldClassify: _classifyYield(expectedYield),
      confidence: confidence,
      contributingFactors: factors,
      recommendations: _generateYieldRecommendations(features, yieldScore),
      potentialImprovement: (baseYield - expectedYield).clamp(0.0, baseYield * 0.3),
    );
  }

  YieldPrediction _getDefaultYieldPrediction() {
    return YieldPrediction(
      expectedYield: 450.0,
      yieldClassify: YieldClassify.average,
      confidence: 0.3,
      contributingFactors: ['Insufficient data for accurate prediction'],
      recommendations: ['Collect more environmental data', 'Maintain consistent growing conditions'],
      potentialImprovement: 100.0,
    );
  }

  // Energy optimization
  Future<EnergyOptimization> optimizeEnergyUsage(String roomId) async {
    try {
      final features = _extractEnergyFeatures(roomId);
      final model = _models['energy_optimization'];

      if (model == null) {
        return _getDefaultEnergyOptimization();
      }

      return await _optimizeEnergyWithModel(features, model);
    } catch (e) {
      if (kDebugMode) {
        print('Energy optimization error: $e');
      }
      return _getDefaultEnergyOptimization();
    }
  }

  Map<String, double> _extractEnergyFeatures(String roomId) {
    final features = <String, double>{};

    // Current energy consumption
    features['current_energy_usage'] = _getCurrentEnergyUsage(roomId);

    // Time-based factors
    final now = DateTime.now();
    features['hour_of_day'] = now.hour.toDouble();
    features['day_of_week'] = now.weekday.toDouble();

    // Electricity rates
    features['current_electricity_rate'] = _getCurrentElectricityRate(now);
    features['peak_rate_start'] = _getPeakRateStart();
    features['peak_rate_end'] = _getPeakRateEnd();

    // Weather factors (would integrate with weather API)
    features['outdoor_temperature'] = _getOutdoorTemperature();
    features['solar_radiation'] = _getSolarRadiation();

    // Room factors
    final room = _ref.read(roomManagementProvider).getRoomById(roomId);
    if (room != null) {
      features['room_size'] = room.dimensions.totalArea;
    }

    return features;
  }

  Future<EnergyOptimization> _optimizeEnergyWithModel(
    Map<String, double> features,
    OptimizationModel model,
  ) async {
    final currentUsage = features['current_energy_usage'] ?? 100.0;
    final currentRate = features['current_electricity_rate'] ?? 0.1;
    final hour = DateTime.now().hour;

    // Calculate optimal schedule
    final optimalSchedule = _calculateOptimalEnergySchedule(features);

    // Calculate potential savings
    final savingsPercentage = _calculateEnergySavingsPercentage(features);
    final monthlySavings = (currentUsage * 24 * 30 * currentRate * savingsPercentage / 100);

    // Generate recommendations
    final recommendations = _generateEnergyRecommendations(features, optimalSchedule);

    return EnergyOptimization(
      optimalSchedule: optimalSchedule,
      estimatedSavingsPercent: savingsPercentage,
      estimatedMonthlySavings: monthlySavings,
      recommendations: recommendations,
      priority: _calculateEnergyPriority(hour, currentRate),
      implementationDifficulty: _calculateImplementationDifficulty(optimalSchedule),
      paybackPeriod: _calculatePaybackPeriod(monthlySavings),
    );
  }

  EnergyOptimization _getDefaultEnergyOptimization() {
    return EnergyOptimization(
      optimalSchedule: _getDefaultEnergySchedule(),
      estimatedSavingsPercent: 10.0,
      estimatedMonthlySavings: 50.0,
      recommendations: ['Consider off-peak scheduling', 'Improve insulation'],
      priority: 3,
      implementationDifficulty: 2,
      paybackPeriod: Duration(days: 60),
    );
  }

  // Utility methods
  List<SensorData> _getRecentHistory(String roomId, int hours) {
    // Get historical sensor data for the specified time period
    // This would integrate with the sensor data provider
    return []; // Placeholder
  }

  double _calculateTrend(List<SensorData> history, String metric) {
    // Calculate trend for a specific metric
    if (history.length < 2) return 0.0;

    double firstValue, lastValue;
    switch (metric) {
      case 'soilMoisture':
        firstValue = history.first.metrics.soilMoisture ?? 0.0;
        lastValue = history.last.metrics.soilMoisture ?? 0.0;
        break;
      case 'temperature':
        firstValue = history.first.metrics.temperature ?? 0.0;
        lastValue = history.last.metrics.temperature ?? 0.0;
        break;
      case 'humidity':
        firstValue = history.first.metrics.humidity ?? 0.0;
        lastValue = history.last.metrics.humidity ?? 0.0;
        break;
      default:
        return 0.0;
    }

    return (lastValue - firstValue) / history.length;
  }

  double _calculateConsistency(List<SensorData> history, String metric) {
    // Calculate how consistent a metric has been (0-1, where 1 is very consistent)
    if (history.length < 2) return 0.5;

    List<double> values = [];
    for (final data in history) {
      double? value;
      switch (metric) {
        case 'temperature':
          value = data.metrics.temperature;
          break;
        case 'humidity':
          value = data.metrics.humidity;
          break;
        case 'co2':
          value = data.metrics.co2;
          break;
      }
      if (value != null) values.add(value);
    }

    if (values.length < 2) return 0.5;

    final mean = values.reduce((a, b) => a + b) / values.length;
    final variance = values.map((v) => pow(v - mean, 2)).reduce((a, b) => a + b) / values.length;
    final standardDeviation = sqrt(variance);

    // Normalize standard deviation to 0-1 scale (lower is more consistent)
    return max(0.0, 1.0 - (standardDeviation / mean));
  }

  double _calculateAverage(List<SensorData> history, String metric) {
    if (history.isEmpty) return 0.0;

    double sum = 0.0;
    int count = 0;

    for (final data in history) {
      double? value;
      switch (metric) {
        case 'temperature':
          value = data.metrics.temperature;
          break;
        case 'humidity':
          value = data.metrics.humidity;
          break;
        case 'co2':
          value = data.metrics.co2;
          break;
      }
      if (value != null) {
        sum += value;
        count++;
      }
    }

    return count > 0 ? sum / count : 0.0;
  }

  int _countStressEvents(List<SensorData> history, String metric) {
    // Count number of times metric went outside optimal range
    int stressEvents = 0;

    for (final data in history) {
      double? value;
      double minOptimal, maxOptimal;

      switch (metric) {
        case 'temperature':
          value = data.metrics.temperature;
          minOptimal = 18.0;
          maxOptimal = 30.0;
          break;
        case 'humidity':
          value = data.metrics.humidity;
          minOptimal = 40.0;
          maxOptimal = 80.0;
          break;
        default:
          continue;
      }

      if (value != null && (value < minOptimal || value > maxOptimal)) {
        stressEvents++;
      }
    }

    return stressEvents;
  }

  double _getDaysInGrowthCycle(String roomId) {
    // Calculate days since start of current growth cycle
    // This would integrate with room management data
    return 30.0; // Placeholder
  }

  double _getGrowthStageValue(GrowthStage stage) {
    switch (stage) {
      case GrowthStage.seedling:
        return 0.25;
      case GrowthStage.vegetative:
        return 0.5;
      case GrowthStage.flowering:
        return 0.75;
      case GrowthStage.harvest:
        return 1.0;
    }
  }

  double _calculateWateringAmount(double soilMoisture, double wateringScore) {
    // Calculate watering amount in liters or percentage
    final deficit = max(0.0, 50.0 - soilMoisture); // Target 50% moisture
    return (deficit * wateringScore).clamp(0.1, 2.0);
  }

  DateTime _calculateOptimalWateringTime(Map<String, double> features) {
    final hour = DateTime.now().hour;

    // Optimal watering times: early morning (6-8 AM) or evening (6-8 PM)
    if (hour >= 0 && hour < 6) {
      return DateTime.now().add(Duration(hours: 6 - hour));
    } else if (hour >= 8 && hour < 18) {
      return DateTime.now().add(Duration(hours: 18 - hour));
    } else {
      return DateTime.now().add(Duration(hours: 24 - hour + 6));
    }
  }

  int _calculateWateringPriority(double wateringScore) {
    if (wateringScore >= 0.8) return 9; // Critical
    if (wateringScore >= 0.6) return 7; // High
    if (wateringScore >= 0.4) return 5; // Medium
    return 3; // Low
  }

  double _getCurrentElectricityRate(DateTime now) {
    // Simplified electricity rate calculation
    // Peak hours: 2 PM - 7 PM
    if (now.hour >= 14 && now.hour < 19) {
      return 0.20; // Peak rate
    } else if (now.hour >= 19 && now.hour < 22) {
      return 0.15; // Partial peak
    } else {
      return 0.10; // Off-peak
    }
  }

  double _getOutdoorTemperature() {
    // Would integrate with weather API
    return 20.0; // Placeholder
  }

  double _getOutdoorHumidity() {
    // Would integrate with weather API
    return 50.0; // Placeholder
  }

  double _getSolarRadiation() {
    final hour = DateTime.now().hour;
    if (hour >= 6 && hour <= 18) {
      return 800.0; // High solar radiation during day
    }
    return 0.0;
  }

  double _getPeakRateStart() => 14.0; // 2 PM
  double _getPeakRateEnd() => 19.0; // 7 PM

  double _getCurrentEnergyUsage(String roomId) {
    // Get current energy usage from sensors or smart meters
    return 100.0; // Placeholder in watts
  }

  List<EnergyScheduleSlot> _calculateOptimalEnergySchedule(Map<String, double> features) {
    final slots = <EnergyScheduleSlot>[];
    final currentRate = features['current_electricity_rate'] ?? 0.1;
    final hour = DateTime.now().hour;

    for (int h = 0; h < 24; h++) {
      final rate = _getCurrentElectricityRate(DateTime.now().add(Duration(hours: h - hour)));
      final priority = rate <= 0.12 ? 1 : (rate <= 0.16 ? 2 : 3);

      slots.add(EnergyScheduleSlot(
        hour: h,
        recommendedAction: rate <= 0.12 ? 'High' : 'Low',
        priority: priority,
        expectedSavings: rate > currentRate ? (rate - currentRate) * 100 : 0.0,
      ));
    }

    return slots;
  }

  double _calculateEnergySavingsPercentage(Map<String, double> features) {
    // Calculate potential energy savings based on optimization
    final currentRate = features['current_electricity_rate'] ?? 0.1;
    final outdoorTemp = features['outdoor_temperature'] ?? 20.0;

    var savings = 10.0; // Base savings

    // Increase savings during peak rates
    if (currentRate > 0.15) {
      savings += 15.0;
    }

    // Increase savings when outdoor temperature is favorable
    if (outdoorTemp >= 18 && outdoorTemp <= 24) {
      savings += 5.0;
    }

    return savings.clamp(0.0, 30.0);
  }

  List<String> _generateEnergyRecommendations(Map<String, double> features, List<EnergyScheduleSlot> schedule) {
    final recommendations = <String>[];

    final currentRate = features['current_electricity_rate'] ?? 0.1;
    if (currentRate > 0.15) {
      recommendations.add('Shift non-critical operations to off-peak hours (before 2 PM or after 7 PM)');
    }

    final outdoorTemp = features['outdoor_temperature'] ?? 20.0;
    if (outdoorTemp < 15 || outdoorTemp > 30) {
      recommendations.add('Improve insulation to reduce HVAC load');
    }

    recommendations.add('Consider LED lighting for 40-60% energy reduction');
    recommendations.add('Install variable speed fans for better efficiency');

    return recommendations;
  }

  int _calculateEnergyPriority(int hour, double currentRate) {
    if (currentRate > 0.18) return 8; // Very high priority during peak
    if (currentRate > 0.12) return 5; // Medium priority
    return 2; // Low priority
  }

  int _calculateImplementationDifficulty(List<EnergyScheduleSlot> schedule) {
    // Calculate how difficult it is to implement the energy optimization
    var difficulty = 1;

    final highPrioritySlots = schedule.where((s) => s.priority >= 3).length;
    if (highPrioritySlots > 8) difficulty++;

    return difficulty.clamp(1, 5);
  }

  Duration _calculatePaybackPeriod(double monthlySavings) {
    // Calculate how long it takes to recoup investment costs
    final investmentCost = 500.0; // Estimated cost of energy optimization measures
    final monthsToPayback = investmentCost / max(monthlySavings, 1.0);
    return Duration(days: (monthsToPayback * 30).round());
  }

  List<EnergyScheduleSlot> _getDefaultEnergySchedule() {
    final slots = <EnergyScheduleSlot>[];
    for (int hour = 0; hour < 24; hour++) {
      final rate = _getCurrentElectricityRate(DateTime.now().add(Duration(hours: hour - DateTime.now().hour)));
      final priority = rate <= 0.12 ? 1 : (rate <= 0.16 ? 2 : 3);

      slots.add(EnergyScheduleSlot(
        hour: hour,
        recommendedAction: rate <= 0.12 ? 'High' : 'Low',
        priority: priority,
        expectedSavings: 0.0,
      ));
    }
    return slots;
  }

  double _calculatePredictionConfidence(Map<String, double> features) {
    // Calculate confidence based on feature completeness and quality
    var confidence = 0.5;

    if (features.length >= 5) confidence += 0.2;
    if (features.containsKey('temperature_consistency')) confidence += 0.1;
    if (features.containsKey('humidity_consistency')) confidence += 0.1;
    if (features.containsKey('growth_stage')) confidence += 0.1;

    return confidence.clamp(0.0, 1.0);
  }

  YieldClassify _classifyYield(double expectedYield) {
    if (expectedYield >= 600) return YieldClassify.excellent;
    if (expectedYield >= 500) return YieldClassify.above_average;
    if (expectedYield >= 400) return YieldClassify.average;
    if (expectedYield >= 300) return YieldClassify.below_average;
    return YieldClassify.poor;
  }

  List<String> _generateYieldRecommendations(Map<String, double> features, double yieldScore) {
    final recommendations = <String>[];

    if (yieldScore < 0.7) {
      recommendations.add('Improve environmental consistency');
      recommendations.add('Monitor plant health more frequently');
    }

    if (features.containsKey('temperature_stress_events')) {
      final stressEvents = features['temperature_stress_events']!;
      if (stressEvents > 3) {
        recommendations.add('Address temperature control issues');
      }
    }

    if (yieldScore < 0.8) {
      recommendations.add('Consider adjusting nutrient levels');
      recommendations.add('Review lighting schedule');
    }

    return recommendations;
  }

  double _calculateWateringAmount(double soilMoisture, double wateringScore) {
    // Calculate watering amount in liters or percentage
    final deficit = max(0.0, 50.0 - soilMoisture); // Target 50% moisture
    return (deficit * wateringScore).clamp(0.1, 2.0);
  }

  DateTime _calculateOptimalWateringTime(Map<String, double> features) {
    final hour = DateTime.now().hour;

    // Optimal watering times: early morning (6-8 AM) or evening (6-8 PM)
    if (hour >= 0 && hour < 6) {
      return DateTime.now().add(Duration(hours: 6 - hour));
    } else if (hour >= 8 && hour < 18) {
      return DateTime.now().add(Duration(hours: 18 - hour));
    } else {
      return DateTime.now().add(Duration(hours: 24 - hour + 6));
    }
  }

  int _calculateWateringPriority(double wateringScore) {
    if (wateringScore >= 0.8) return 9; // Critical
    if (wateringScore >= 0.6) return 7; // High
    if (wateringScore >= 0.4) return 5; // Medium
    return 3; // Low
  }

  ClimateOptimization _getDefaultClimateOptimization(SensorMetrics metrics) {
    return ClimateOptimization(
      recommendedTemperature: 24.0,
      recommendedHumidity: 60.0,
      recommendedCo2: 800.0,
      currentVpd: metrics.vpd ?? 1.2,
      optimalVpd: 1.2,
      energySavingsPotential: 5.0,
      priority: 3,
      implementationSteps: ['Adjust temperature setpoint', 'Optimize humidity levels'],
      estimatedTimeToOptimal: Duration(hours: 2),
      confidence: 0.5,
    );
  }

  double _calculateEnergySavings(
    SensorMetrics current,
    SensorMetrics optimal,
    Map<String, double> features,
  ) {
    // Calculate potential energy savings
    var savings = 0.0;

    if (current.temperature != null && optimal.temperature != null) {
      final tempDiff = (current.temperature! - optimal.temperature!).abs();
      if (tempDiff > 2.0) {
        savings += 10.0; // Temperature optimization savings
      }
    }

    return savings;
  }

  int _calculateClimatePriority(
    double currentTemp,
    double optimalTemp,
    double currentHumidity,
    double optimalHumidity,
    double currentCo2,
    double optimalCo2,
  ) {
    var priority = 1;

    final tempDiff = (currentTemp - optimalTemp).abs();
    final humidityDiff = (currentHumidity - optimalHumidity).abs();
    final co2Diff = (currentCo2 - optimalCo2).abs();

    if (tempDiff > 5.0) priority += 3;
    if (humidityDiff > 15.0) priority += 2;
    if (co2Diff > 200.0) priority += 1;

    return priority.clamp(1, 10);
  }

  List<String> _getImplementationSteps(
    double optimalTemp,
    double optimalHumidity,
    double optimalCo2,
  ) {
    return [
      'Set temperature to ${optimalTemp.toStringAsFixed(1)}°C',
      'Set humidity to ${optimalHumidity.toStringAsFixed(0)}%',
      'Set CO2 to ${optimalCo2.toStringAsFixed(0)}ppm',
      'Monitor VPD levels',
    ];
  }

  Duration _estimateTimeToOptimal(
    SensorMetrics current,
    double optimalTemp,
    double optimalHumidity,
    double optimalCo2,
  ) {
    // Estimate time to reach optimal conditions
    var maxTime = 1; // hours

    if (current.temperature != null) {
      final tempDiff = (current.temperature! - optimalTemp).abs();
      maxTime = max(maxTime, (tempDiff / 2).ceil());
    }

    if (current.humidity != null) {
      final humidityDiff = (current.humidity! - optimalHumidity).abs();
      maxTime = max(maxTime, (humidityDiff / 5).ceil());
    }

    return Duration(hours: maxTime);
  }
}

// Data models
class AiOptimizationState {
  final DateTime? lastPredictionTime;
  final int totalPredictions;
  final bool isProcessing;
  final String? error;

  const AiOptimizationState({
    this.lastPredictionTime,
    this.totalPredictions = 0,
    this.isProcessing = false,
    this.error,
  });

  AiOptimizationState copyWith({
    DateTime? lastPredictionTime,
    int? totalPredictions,
    bool? isProcessing,
    String? error,
  }) {
    return AiOptimizationState(
      lastPredictionTime: lastPredictionTime ?? this.lastPredictionTime,
      totalPredictions: totalPredictions ?? this.totalPredictions,
      isProcessing: isProcessing ?? this.isProcessing,
      error: error ?? this.error,
    );
  }
}

class OptimizationModel {
  final OptimizationType type;
  final MachineLearningAlgorithm algorithm;
  final List<String> features;
  final String targetVariable;
  final double accuracy;
  final DateTime? lastTrained;

  OptimizationModel({
    required this.type,
    required this.algorithm,
    required this.features,
    required this.targetVariable,
    required this.accuracy,
    this.lastTrained,
  });
}

class OptimizationHistory {
  final String roomId;
  final OptimizationType type;
  final Map<String, double> inputs;
  final Map<String, dynamic> outputs;
  final double accuracy;
  final DateTime timestamp;

  OptimizationHistory({
    required this.roomId,
    required this.type,
    required this.inputs,
    required this.outputs,
    required this.accuracy,
    required this.timestamp,
  });
}

class CachedPrediction {
  final dynamic prediction;
  final DateTime timestamp;

  CachedPrediction({
    required this.prediction,
    required this.timestamp,
  });
}

class WateringPrediction {
  final bool shouldWater;
  final double confidence;
  final double amount;
  final DateTime recommendedTime;
  final String reason;
  final int priority;

  WateringPrediction({
    required this.shouldWater,
    required this.confidence,
    required this.amount,
    required this.recommendedTime,
    required this.reason,
    required this.priority,
  });
}

class ClimateOptimization {
  final double recommendedTemperature;
  final double recommendedHumidity;
  final double recommendedCo2;
  final double currentVpd;
  final double optimalVpd;
  final double energySavingsPotential;
  final int priority;
  final List<String> implementationSteps;
  final Duration estimatedTimeToOptimal;
  final double confidence;

  ClimateOptimization({
    required this.recommendedTemperature,
    required this.recommendedHumidity,
    required this.recommendedCo2,
    required this.currentVpd,
    required this.optimalVpd,
    required this.energySavingsPotential,
    required this.priority,
    required this.implementationSteps,
    required this.estimatedTimeToOptimal,
    required this.confidence,
  });
}

class YieldPrediction {
  final double expectedYield;
  final YieldClassify yieldClassify;
  final double confidence;
  final List<String> contributingFactors;
  final List<String> recommendations;
  final double potentialImprovement;

  YieldPrediction({
    required this.expectedYield,
    required this.yieldClassify,
    required this.confidence,
    required this.contributingFactors,
    required this.recommendations,
    required this.potentialImprovement,
  });
}

class EnergyOptimization {
  final List<EnergyScheduleSlot> optimalSchedule;
  final double estimatedSavingsPercent;
  final double estimatedMonthlySavings;
  final List<String> recommendations;
  final int priority;
  final int implementationDifficulty;
  final Duration paybackPeriod;

  EnergyOptimization({
    required this.optimalSchedule,
    required this.estimatedSavingsPercent,
    required this.estimatedMonthlySavings,
    required this.recommendations,
    required this.priority,
    required this.implementationDifficulty,
    required this.paybackPeriod,
  });
}

class EnergyScheduleSlot {
  final int hour;
  final String recommendedAction;
  final int priority;
  final double expectedSavings;

  EnergyScheduleSlot({
    required this.hour,
    required this.recommendedAction,
    required this.priority,
    required this.expectedSavings,
  });
}

enum OptimizationType {
  watering,
  climate,
  yield,
  energy,
  nutrient,
  lighting,
}

enum MachineLearningAlgorithm {
  randomForest,
  gradientBoosting,
  neuralNetwork,
  reinforcementLearning,
  supportVectorMachine,
  linearRegression,
}

enum YieldClassify {
  poor,
  below_average,
  average,
  above_average,
  excellent,
}