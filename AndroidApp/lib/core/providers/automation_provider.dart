import 'package:flutter_riverpod/flutter_riverpod.dart';

final automationProvider = StateNotifierProvider<AutomationNotifier, AutomationState>((ref) {
  return AutomationNotifier();
});

class AutomationNotifier extends StateNotifier<AutomationState> {
  AutomationNotifier() : super(const AutomationState()) {
    _loadSettings();
  }

  void _loadSettings() {
    state = state.copyWith(
      isConnected: true,
      wateringEnabled: true,
      lightingEnabled: true,
      climateControlEnabled: true,
      waterThreshold: 45.0,
      temperatureMin: 20.0,
      temperatureMax: 28.0,
      humidityMin: 50.0,
      humidityMax: 70.0,
      lightsOnTime: '06:00',
      lightsOffTime: '18:00',
      activeAutomations: 3,
    );
  }

  void toggleWatering(bool? value) {
    state = state.copyWith(wateringEnabled: value ?? !state.wateringEnabled);
  }

  void toggleLights() {
    state = state.copyWith(lightsOn: !state.lightsOn);
  }

  void toggleLighting(bool? value) {
    state = state.copyWith(lightingEnabled: value ?? !state.lightingEnabled);
  }

  void toggleClimateControl(bool? value) {
    state = state.copyWith(climateControlEnabled: value ?? !state.climateControlEnabled);
  }

  void updateWaterThreshold(double threshold) {
    state = state.copyWith(waterThreshold: threshold);
  }

  void updateTemperatureRange(double min, double max) {
    state = state.copyWith(
      temperatureMin: min,
      temperatureMax: max,
    );
  }

  void updateHumidityRange(double min, double max) {
    state = state.copyWith(
      humidityMin: min,
      humidityMax: max,
    );
  }

  void updateLightSchedule(String onTime, String offTime) {
    state = state.copyWith(
      lightsOnTime: onTime,
      lightsOffTime: offTime,
    );
  }

  void startWateringCycle() {
    state = state.copyWith(isWatering: true);
    // Simulate watering cycle
    Future.delayed(const Duration(seconds: 30), () {
      state = state.copyWith(isWatering: false);
    });
  }

  void updateLastWateringTime() {
    state = state.copyWith(lastWateringTime: DateTime.now());
  }

  void setFanSpeed(int speed) {
    state = state.copyWith(fanSpeed: speed);
  }

  void setNutrientPump(bool enabled) {
    state = state.copyWith(nutrientPumpEnabled: enabled);
  }

  void setCo2Injector(bool enabled) {
    state = state.copyWith(co2InjectorEnabled: enabled);
  }
}

class AutomationState {
  final bool isConnected;
  final bool wateringEnabled;
  final bool lightingEnabled;
  final bool climateControlEnabled;
  final bool lightsOn;
  final bool isWatering;
  final bool nutrientPumpEnabled;
  final bool co2InjectorEnabled;
  final double waterThreshold;
  final double temperatureMin;
  final double temperatureMax;
  final double humidityMin;
  final double humidityMax;
  final String lightsOnTime;
  final String lightsOffTime;
  final int fanSpeed;
  final DateTime? lastWateringTime;
  final int activeAutomations;

  const AutomationState({
    this.isConnected = false,
    this.wateringEnabled = false,
    this.lightingEnabled = false,
    this.climateControlEnabled = false,
    this.lightsOn = false,
    this.isWatering = false,
    this.nutrientPumpEnabled = false,
    this.co2InjectorEnabled = false,
    this.waterThreshold = 50.0,
    this.temperatureMin = 20.0,
    this.temperatureMax = 28.0,
    this.humidityMin = 50.0,
    this.humidityMax = 70.0,
    this.lightsOnTime = '06:00',
    this.lightsOffTime = '18:00',
    this.fanSpeed = 3,
    this.lastWateringTime,
    this.activeAutomations = 0,
  });

  AutomationState copyWith({
    bool? isConnected,
    bool? wateringEnabled,
    bool? lightingEnabled,
    bool? climateControlEnabled,
    bool? lightsOn,
    bool? isWatering,
    bool? nutrientPumpEnabled,
    bool? co2InjectorEnabled,
    double? waterThreshold,
    double? temperatureMin,
    double? temperatureMax,
    double? humidityMin,
    double? humidityMax,
    String? lightsOnTime,
    String? lightsOffTime,
    int? fanSpeed,
    DateTime? lastWateringTime,
    int? activeAutomations,
  }) {
    return AutomationState(
      isConnected: isConnected ?? this.isConnected,
      wateringEnabled: wateringEnabled ?? this.wateringEnabled,
      lightingEnabled: lightingEnabled ?? this.lightingEnabled,
      climateControlEnabled: climateControlEnabled ?? this.climateControlEnabled,
      lightsOn: lightsOn ?? this.lightsOn,
      isWatering: isWatering ?? this.isWatering,
      nutrientPumpEnabled: nutrientPumpEnabled ?? this.nutrientPumpEnabled,
      co2InjectorEnabled: co2InjectorEnabled ?? this.co2InjectorEnabled,
      waterThreshold: waterThreshold ?? this.waterThreshold,
      temperatureMin: temperatureMin ?? this.temperatureMin,
      temperatureMax: temperatureMax ?? this.temperatureMax,
      humidityMin: humidityMin ?? this.humidityMin,
      humidityMax: humidityMax ?? this.humidityMax,
      lightsOnTime: lightsOnTime ?? this.lightsOnTime,
      lightsOffTime: lightsOffTime ?? this.lightsOffTime,
      fanSpeed: fanSpeed ?? this.fanSpeed,
      lastWateringTime: lastWateringTime ?? this.lastWateringTime,
      activeAutomations: activeAutomations ?? this.activeAutomations,
    );
  }
}