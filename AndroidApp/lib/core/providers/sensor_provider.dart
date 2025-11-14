import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/sensor_data.dart';
import 'dart:math';

// Mock sensor data provider
final sensorDataProvider = StateNotifierProvider<SensorDataNotifier, SensorDataState>((ref) {
  return SensorDataNotifier();
});

class SensorDataNotifier extends StateNotifier<SensorDataState> {
  SensorDataNotifier() : super(const SensorDataState()) {
    _initializeMockData();
    _startSimulation();
  }

  void _initializeMockData() {
    final now = DateTime.now();
    final mockData = List.generate(24, (index) {
      final hourOffset = 23 - index;
      return SensorData(
        id: 'sensor_${index}',
        deviceId: 'device_001',
        roomId: 'room_main',
        timestamp: now.subtract(Duration(hours: hourOffset)),
        metrics: SensorMetrics(
          temperature: 22.0 + sin(hourOffset * 0.3) * 3,
          humidity: 65.0 + cos(hourOffset * 0.2) * 10,
          ph: 6.2 + Random().nextDouble() * 0.4 - 0.2,
          ec: 1.8 + Random().nextDouble() * 0.4,
          co2: 800 + sin(hourOffset * 0.1) * 100,
          vpd: 1.2 + Random().nextDouble() * 0.3,
          lightIntensity: hourOffset >= 6 && hourOffset <= 18 ? 600 + Random().nextInt(200) : 0,
          soilMoisture: 70.0 + cos(hourOffset * 0.15) * 8,
          waterLevel: 85.0,
          airPressure: 1013.25,
        ),
      );
    });

    state = state.copyWith(
      currentData: mockData.last,
      historicalData: mockData.reversed.toList(),
    );
  }

  void _startSimulation() {
    Stream.periodic(const Duration(seconds: 3), (_) {
      _updateSensorData();
    }).listen((_) {});
  }

  void _updateSensorData() {
    final now = DateTime.now();
    final lastTemp = state.currentData?.metrics.temperature ?? 22.0;
    final lastHumidity = state.currentData?.metrics.humidity ?? 65.0;

    final newData = SensorData(
      id: 'sensor_${now.millisecondsSinceEpoch}',
      deviceId: 'device_001',
      roomId: 'room_main',
      timestamp: now,
      metrics: SensorMetrics(
        temperature: lastTemp + (Random().nextDouble() - 0.5) * 0.5,
        humidity: lastHumidity + (Random().nextDouble() - 0.5) * 2,
        ph: 6.2 + (Random().nextDouble() - 0.5) * 0.1,
        ec: 1.8 + (Random().nextDouble() - 0.5) * 0.1,
        co2: 800 + (Random().nextDouble() - 0.5) * 50,
        vpd: 1.2 + (Random().nextDouble() - 0.5) * 0.1,
        lightIntensity: now.hour >= 6 && now.hour <= 18 ? 600 + Random().nextInt(200) : 0,
        soilMoisture: 70.0 + (Random().nextDouble() - 0.5) * 2,
        waterLevel: 85.0 + (Random().nextDouble() - 0.5) * 1,
        airPressure: 1013.25 + (Random().nextDouble() - 0.5) * 2,
      ),
    );

    final updatedHistory = [...state.historicalData, newData];
    if (updatedHistory.length > 100) {
      updatedHistory.removeAt(0);
    }

    state = state.copyWith(
      currentData: newData,
      historicalData: updatedHistory,
    );
  }

  double? getLatestValue(SensorType type) {
    final metrics = state.currentData?.metrics;
    switch (type) {
      case SensorType.temperature:
        return metrics?.temperature;
      case SensorType.humidity:
        return metrics?.humidity;
      case SensorType.ph:
        return metrics?.ph;
      case SensorType.ec:
        return metrics?.ec;
      case SensorType.co2:
        return metrics?.co2;
      case SensorType.vpd:
        return metrics?.vpd;
      case SensorType.lightIntensity:
        return metrics?.lightIntensity;
      case SensorType.soilMoisture:
        return metrics?.soilMoisture;
      case SensorType.waterLevel:
        return metrics?.waterLevel;
    }
  }

  SensorStatus getSensorStatus(SensorType type) {
    final value = getLatestValue(type);
    if (value == null) return SensorStatus.unknown;

    switch (type) {
      case SensorType.temperature:
        if (value < 18 || value > 30) return SensorStatus.critical;
        if (value < 20 || value > 28) return SensorStatus.warning;
        return SensorStatus.optimal;
      case SensorType.humidity:
        if (value < 40 || value > 80) return SensorStatus.critical;
        if (value < 50 || value > 70) return SensorStatus.warning;
        return SensorStatus.optimal;
      case SensorType.ph:
        if (value < 5.5 || value > 7.0) return SensorStatus.critical;
        if (value < 5.8 || value > 6.5) return SensorStatus.warning;
        return SensorStatus.optimal;
      case SensorType.ec:
        if (value < 0.8 || value > 3.0) return SensorStatus.critical;
        if (value < 1.2 || value > 2.4) return SensorStatus.warning;
        return SensorStatus.optimal;
      case SensorType.co2:
        if (value < 400 || value > 1500) return SensorStatus.critical;
        if (value < 600 || value > 1200) return SensorStatus.warning;
        return SensorStatus.optimal;
      case SensorType.soilMoisture:
        if (value < 30 || value > 80) return SensorStatus.critical;
        if (value < 50 || value > 70) return SensorStatus.warning;
        return SensorStatus.optimal;
      default:
        return SensorStatus.optimal;
    }
  }

  List<double> get temperatureHistory =>
      state.historicalData.map((data) => data.metrics.temperature ?? 0).toList();

  List<double> get humidityHistory =>
      state.historicalData.map((data) => data.metrics.humidity ?? 0).toList();

  List<double> get phHistory =>
      state.historicalData.map((data) => data.metrics.ph ?? 0).toList();
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

class SensorDataState {
  final SensorData? currentData;
  final List<SensorData> historicalData;
  final bool isLoading;
  final String? error;

  const SensorDataState({
    this.currentData,
    this.historicalData = const [],
    this.isLoading = false,
    this.error,
  });

  SensorDataState copyWith({
    SensorData? currentData,
    List<SensorData>? historicalData,
    bool? isLoading,
    String? error,
  }) {
    return SensorDataState(
      currentData: currentData ?? this.currentData,
      historicalData: historicalData ?? this.historicalData,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}