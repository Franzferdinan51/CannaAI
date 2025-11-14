import 'package:json_annotation/json_annotation.dart';

part 'room_config.g.dart';

@JsonSerializable()
class RoomConfig {
  final String id;
  final String name;
  final String description;
  final bool isActive;
  final RoomDimensions dimensions;
  final RoomEnvironmentalTargets environmentalTargets;
  final RoomSettings settings;
  final DateTime createdAt;
  final DateTime? lastModified;
  final Map<String, dynamic>? metadata;

  RoomConfig({
    required this.id,
    required this.name,
    required this.description,
    required this.isActive,
    required this.dimensions,
    required this.environmentalTargets,
    required this.settings,
    required this.createdAt,
    this.lastModified,
    this.metadata,
  });

  factory RoomConfig.fromJson(Map<String, dynamic> json) =>
      _$RoomConfigFromJson(json);

  Map<String, dynamic> toJson() => _$RoomConfigToJson(this);

  RoomConfig copyWith({
    String? id,
    String? name,
    String? description,
    bool? isActive,
    RoomDimensions? dimensions,
    RoomEnvironmentalTargets? environmentalTargets,
    RoomSettings? settings,
    DateTime? createdAt,
    DateTime? lastModified,
    Map<String, dynamic>? metadata,
  }) {
    return RoomConfig(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      isActive: isActive ?? this.isActive,
      dimensions: dimensions ?? this.dimensions,
      environmentalTargets: environmentalTargets ?? this.environmentalTargets,
      settings: settings ?? this.settings,
      createdAt: createdAt ?? this.createdAt,
      lastModified: lastModified ?? DateTime.now(),
      metadata: metadata ?? this.metadata,
    );
  }

  // Convenience getters for accessing common target ranges
  ValueRange get temperatureRange => environmentalTargets.temperature;
  ValueRange get humidityRange => environmentalTargets.humidity;
  ValueRange get co2Range => environmentalTargets.co2;
  ValueRange get vpdRange => environmentalTargets.vpd;
  ValueRange get soilMoistureRange => environmentalTargets.soilMoisture;
  ValueRange get phRange => environmentalTargets.ph;
  ValueRange get ecRange => environmentalTargets.ec;
  ValueRange get lightIntensityRange => environmentalTargets.lightIntensity;

  @override
  String toString() {
    return 'RoomConfig(id: $id, name: $name, isActive: $isActive, dimensions: $dimensions)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is RoomConfig &&
        other.id == id &&
        other.name == name &&
        other.description == description &&
        other.isActive == isActive &&
        other.dimensions == dimensions &&
        other.environmentalTargets == environmentalTargets &&
        other.settings == settings;
  }

  @override
  int get hashCode {
    return id.hashCode ^
        name.hashCode ^
        description.hashCode ^
        isActive.hashCode ^
        dimensions.hashCode ^
        environmentalTargets.hashCode ^
        settings.hashCode;
  }
}

@JsonSerializable()
class RoomDimensions {
  final double length; // meters
  final double width; // meters
  final double height; // meters
  final double? canopyHeight; // meters (optional, for indoor growing)
  final double totalArea; // square meters (calculated)
  final double totalVolume; // cubic meters (calculated)

  RoomDimensions({
    required this.length,
    required this.width,
    required this.height,
    this.canopyHeight,
  }) : totalArea = length * width,
       totalVolume = length * width * height;

  factory RoomDimensions.fromJson(Map<String, dynamic> json) =>
      _$RoomDimensionsFromJson(json);

  Map<String, dynamic> toJson() => _$RoomDimensionsToJson(this);

  RoomDimensions copyWith({
    double? length,
    double? width,
    double? height,
    double? canopyHeight,
  }) {
    return RoomDimensions(
      length: length ?? this.length,
      width: width ?? this.width,
      height: height ?? this.height,
      canopyHeight: canopyHeight ?? this.canopyHeight,
    );
  }

  // Calculate air exchange rate based on volume
  double getAirExchangeRatePerHour(double fanCFM) {
    // Convert CFM to cubic meters per hour
    final fanCubicMetersPerHour = fanCFM * 1.699;
    return fanCubicMetersPerHour / totalVolume;
  }

  // Calculate lighting requirements based on area
  double getLightingRequirementPPFD() {
    // Standard PPFD requirement for cannabis: 600-1000 μmol/m²/s
    // Adjust based on room characteristics
    final baseRequirement = 800.0; // μmol/m²/s
    final heightFactor = height > 3.0 ? 1.2 : 1.0; // Taller rooms need more light
    final areaFactor = totalArea > 10.0 ? 1.1 : 1.0; // Larger areas need more uniform light

    return baseRequirement * heightFactor * areaFactor;
  }

  @override
  String toString() {
    return 'RoomDimensions(length: $length, width: $width, height: $height, totalArea: $totalArea, totalVolume: $totalVolume)';
  }
}

@JsonSerializable()
class RoomEnvironmentalTargets {
  final ValueRange temperature; // Celsius
  final ValueRange humidity; // Percentage
  final ValueRange co2; // ppm
  final ValueRange vpd; // kPa (Vapor Pressure Deficit)
  final ValueRange soilMoisture; // Percentage
  final ValueRange ph; // pH level
  final ValueRange ec; // mS/cm (Electrical Conductivity)
  final ValueRange lightIntensity; // PPFD
  final ValueRange airCirculation; // m/s
  final int? lightOnHours; // Hours per day
  final int? lightOffHours; // Hours per day
  final GrowthStage growthStage;

  RoomEnvironmentalTargets({
    required this.temperature,
    required this.humidity,
    required this.co2,
    required this.vpd,
    required this.soilMoisture,
    required this.ph,
    required this.ec,
    required this.lightIntensity,
    required this.airCirculation,
    this.lightOnHours,
    this.lightOffHours,
    required this.growthStage,
  });

  factory RoomEnvironmentalTargets.fromJson(Map<String, dynamic> json) =>
      _$RoomEnvironmentalTargetsFromJson(json);

  Map<String, dynamic> toJson() => _$RoomEnvironmentalTargetsToJson(this);

  RoomEnvironmentalTargets copyWith({
    ValueRange? temperature,
    ValueRange? humidity,
    ValueRange? co2,
    ValueRange? vpd,
    ValueRange? soilMoisture,
    ValueRange? ph,
    ValueRange? ec,
    ValueRange? lightIntensity,
    ValueRange? airCirculation,
    int? lightOnHours,
    int? lightOffHours,
    GrowthStage? growthStage,
  }) {
    return RoomEnvironmentalTargets(
      temperature: temperature ?? this.temperature,
      humidity: humidity ?? this.humidity,
      co2: co2 ?? this.co2,
      vpd: vpd ?? this.vpd,
      soilMoisture: soilMoisture ?? this.soilMoisture,
      ph: ph ?? this.ph,
      ec: ec ?? this.ec,
      lightIntensity: lightIntensity ?? this.lightIntensity,
      airCirculation: airCirculation ?? this.airCirculation,
      lightOnHours: lightOnHours ?? this.lightOnHours,
      lightOffHours: lightOffHours ?? this.lightOffHours,
      growthStage: growthStage ?? this.growthStage,
    );
  }

  // Get optimal targets for current growth stage
  RoomEnvironmentalTargets getOptimalForGrowthStage(GrowthStage stage) {
    switch (stage) {
      case GrowthStage.seedling:
        return RoomEnvironmentalTargets(
          temperature: ValueRange(min: 20.0, max: 25.0),
          humidity: ValueRange(min: 65.0, max: 80.0),
          co2: ValueRange(min: 400.0, max: 800.0),
          vpd: ValueRange(min: 0.6, max: 1.0),
          soilMoisture: ValueRange(min: 65.0, max: 75.0),
          ph: ValueRange(min: 5.8, max: 6.3),
          ec: ValueRange(min: 0.8, max: 1.2),
          lightIntensity: ValueRange(min: 200.0, max: 400.0),
          airCirculation: ValueRange(min: 0.2, max: 0.5),
          lightOnHours: 18,
          lightOffHours: 6,
          growthStage: stage,
        );
      case GrowthStage.vegetative:
        return RoomEnvironmentalTargets(
          temperature: ValueRange(min: 22.0, max: 28.0),
          humidity: ValueRange(min: 50.0, max: 70.0),
          co2: ValueRange(min: 800.0, max: 1200.0),
          vpd: ValueRange(min: 0.8, max: 1.2),
          soilMoisture: ValueRange(min: 60.0, max: 70.0),
          ph: ValueRange(min: 5.8, max: 6.3),
          ec: ValueRange(min: 1.2, max: 1.8),
          lightIntensity: ValueRange(min: 600.0, max: 800.0),
          airCirculation: ValueRange(min: 0.3, max: 0.6),
          lightOnHours: 18,
          lightOffHours: 6,
          growthStage: stage,
        );
      case GrowthStage.flowering:
        return RoomEnvironmentalTargets(
          temperature: ValueRange(min: 20.0, max: 26.0),
          humidity: ValueRange(min: 40.0, max: 60.0),
          co2: ValueRange(min: 1000.0, max: 1500.0),
          vpd: ValueRange(min: 1.0, max: 1.5),
          soilMoisture: ValueRange(min: 55.0, max: 65.0),
          ph: ValueRange(min: 6.0, max: 6.5),
          ec: ValueRange(min: 1.5, max: 2.2),
          lightIntensity: ValueRange(min: 800.0, max: 1000.0),
          airCirculation: ValueRange(min: 0.4, max: 0.8),
          lightOnHours: 12,
          lightOffHours: 12,
          growthStage: stage,
        );
      case GrowthStage.harvest:
        return RoomEnvironmentalTargets(
          temperature: ValueRange(min: 18.0, max: 24.0),
          humidity: ValueRange(min: 45.0, max: 55.0),
          co2: ValueRange(min: 400.0, max: 600.0),
          vpd: ValueRange(min: 1.0, max: 1.3),
          soilMoisture: ValueRange(min: 45.0, max: 55.0),
          ph: ValueRange(min: 6.0, max: 6.5),
          ec: ValueRange(min: 0.5, max: 1.0),
          lightIntensity: ValueRange(min: 0.0, max: 100.0),
          airCirculation: ValueRange(min: 0.2, max: 0.4),
          lightOnHours: 0,
          lightOffHours: 24,
          growthStage: stage,
        );
    }
  }

  @override
  String toString() {
    return 'RoomEnvironmentalTargets(temperature: $temperature, humidity: $humidity, co2: $co2, growthStage: $growthStage)';
  }
}

@JsonSerializable()
class RoomSettings {
  final bool enableAutomation;
  final bool enableAlerts;
  final bool enableDataLogging;
  final bool enablePredictiveAlerts;
  final bool enableMachineLearning;
  final String alertLevel; // 'all', 'warning', 'critical'
  final int dataRetentionDays;
  final int alertCooldownMinutes;
  final bool enableNightMode;
  final bool enableEnergySaving;
  final Map<String, bool> enabledFeatures;
  final AutomationSettings automationSettings;

  RoomSettings({
    required this.enableAutomation,
    required this.enableAlerts,
    required this.enableDataLogging,
    required this.enablePredictiveAlerts,
    required this.enableMachineLearning,
    required this.alertLevel,
    required this.dataRetentionDays,
    required this.alertCooldownMinutes,
    required this.enableNightMode,
    required this.enableEnergySaving,
    required this.enabledFeatures,
    required this.automationSettings,
  });

  factory RoomSettings.fromJson(Map<String, dynamic> json) =>
      _$RoomSettingsFromJson(json);

  Map<String, dynamic> toJson() => _$RoomSettingsToJson(this);

  RoomSettings copyWith({
    bool? enableAutomation,
    bool? enableAlerts,
    bool? enableDataLogging,
    bool? enablePredictiveAlerts,
    bool? enableMachineLearning,
    String? alertLevel,
    int? dataRetentionDays,
    int? alertCooldownMinutes,
    bool? enableNightMode,
    bool? enableEnergySaving,
    Map<String, bool>? enabledFeatures,
    AutomationSettings? automationSettings,
  }) {
    return RoomSettings(
      enableAutomation: enableAutomation ?? this.enableAutomation,
      enableAlerts: enableAlerts ?? this.enableAlerts,
      enableDataLogging: enableDataLogging ?? this.enableDataLogging,
      enablePredictiveAlerts: enablePredictiveAlerts ?? this.enablePredictiveAlerts,
      enableMachineLearning: enableMachineLearning ?? this.enableMachineLearning,
      alertLevel: alertLevel ?? this.alertLevel,
      dataRetentionDays: dataRetentionDays ?? this.dataRetentionDays,
      alertCooldownMinutes: alertCooldownMinutes ?? this.alertCooldownMinutes,
      enableNightMode: enableNightMode ?? this.enableNightMode,
      enableEnergySaving: enableEnergySaving ?? this.enableEnergySaving,
      enabledFeatures: enabledFeatures ?? this.enabledFeatures,
      automationSettings: automationSettings ?? this.automationSettings,
    );
  }

  @override
  String toString() {
    return 'RoomSettings(enableAutomation: $enableAutomation, enableAlerts: $enableAlerts)';
  }
}

@JsonSerializable()
class AutomationSettings {
  final bool enableWatering;
  final bool enableClimateControl;
  final bool enableLightingControl;
  final bool enableCo2Enrichment;
  final bool enableVentilationControl;
  final bool enableNutrientDosing;
  final WateringSettings wateringSettings;
  final ClimateSettings climateSettings;
  final LightingSettings lightingSettings;
  final Co2Settings co2Settings;
  final VentilationSettings ventilationSettings;
  final NutrientSettings nutrientSettings;

  AutomationSettings({
    required this.enableWatering,
    required this.enableClimateControl,
    required this.enableLightingControl,
    required this.enableCo2Enrichment,
    required this.enableVentilationControl,
    required this.enableNutrientDosing,
    required this.wateringSettings,
    required this.climateSettings,
    required this.lightingSettings,
    required this.co2Settings,
    required this.ventilationSettings,
    required this.nutrientSettings,
  });

  factory AutomationSettings.fromJson(Map<String, dynamic> json) =>
      _$AutomationSettingsFromJson(json);

  Map<String, dynamic> toJson() => _$AutomationSettingsToJson(this);

  AutomationSettings copyWith({
    bool? enableWatering,
    bool? enableClimateControl,
    bool? enableLightingControl,
    bool? enableCo2Enrichment,
    bool? enableVentilationControl,
    bool? enableNutrientDosing,
    WateringSettings? wateringSettings,
    ClimateSettings? climateSettings,
    LightingSettings? lightingSettings,
    Co2Settings? co2Settings,
    VentilationSettings? ventilationSettings,
    NutrientSettings? nutrientSettings,
  }) {
    return AutomationSettings(
      enableWatering: enableWatering ?? this.enableWatering,
      enableClimateControl: enableClimateControl ?? this.enableClimateControl,
      enableLightingControl: enableLightingControl ?? this.enableLightingControl,
      enableCo2Enrichment: enableCo2Enrichment ?? this.enableCo2Enrichment,
      enableVentilationControl: enableVentilationControl ?? this.enableVentilationControl,
      enableNutrientDosing: enableNutrientDosing ?? this.enableNutrientDosing,
      wateringSettings: wateringSettings ?? this.wateringSettings,
      climateSettings: climateSettings ?? this.climateSettings,
      lightingSettings: lightingSettings ?? this.lightingSettings,
      co2Settings: co2Settings ?? this.co2Settings,
      ventilationSettings: ventilationSettings ?? this.ventilationSettings,
      nutrientSettings: nutrientSettings ?? this.nutrientSettings,
    );
  }

  @override
  String toString() {
    return 'AutomationSettings(enableWatering: $enableWatering, enableClimateControl: $enableClimateControl)';
  }
}

@JsonSerializable()
class WateringSettings {
  final ValueRange soilMoistureThreshold;
  final Duration wateringDuration;
  final int maxWateringsPerDay;
  final bool enableSmartWatering;
  final bool enableDrainageMonitoring;
  final double drainageThreshold;

  WateringSettings({
    required this.soilMoistureThreshold,
    required this.wateringDuration,
    required this.maxWateringsPerDay,
    required this.enableSmartWatering,
    required this.enableDrainageMonitoring,
    required this.drainageThreshold,
  });

  factory WateringSettings.fromJson(Map<String, dynamic> json) =>
      _$WateringSettingsFromJson(json);

  Map<String, dynamic> toJson() => _$WateringSettingsToJson(this);

  WateringSettings copyWith({
    ValueRange? soilMoistureThreshold,
    Duration? wateringDuration,
    int? maxWateringsPerDay,
    bool? enableSmartWatering,
    bool? enableDrainageMonitoring,
    double? drainageThreshold,
  }) {
    return WateringSettings(
      soilMoistureThreshold: soilMoistureThreshold ?? this.soilMoistureThreshold,
      wateringDuration: wateringDuration ?? this.wateringDuration,
      maxWateringsPerDay: maxWateringsPerDay ?? this.maxWateringsPerDay,
      enableSmartWatering: enableSmartWatering ?? this.enableSmartWatering,
      enableDrainageMonitoring: enableDrainageMonitoring ?? this.enableDrainageMonitoring,
      drainageThreshold: drainageThreshold ?? this.drainageThreshold,
    );
  }
}

@JsonSerializable()
class ClimateSettings {
  final double temperatureTolerance;
  final double humidityTolerance;
  final bool enableHumidityControl;
  final bool enableTemperatureControl;
  final Duration preHeatTime;
  final Duration preCoolTime;

  ClimateSettings({
    required this.temperatureTolerance,
    required this.humidityTolerance,
    required this.enableHumidityControl,
    required this.enableTemperatureControl,
    required this.preHeatTime,
    required this.preCoolTime,
  });

  factory ClimateSettings.fromJson(Map<String, dynamic> json) =>
      _$ClimateSettingsFromJson(json);

  Map<String, dynamic> toJson() => _$ClimateSettingsToJson(this);

  ClimateSettings copyWith({
    double? temperatureTolerance,
    double? humidityTolerance,
    bool? enableHumidityControl,
    bool? enableTemperatureControl,
    Duration? preHeatTime,
    Duration? preCoolTime,
  }) {
    return ClimateSettings(
      temperatureTolerance: temperatureTolerance ?? this.temperatureTolerance,
      humidityTolerance: humidityTolerance ?? this.humidityTolerance,
      enableHumidityControl: enableHumidityControl ?? this.enableHumidityControl,
      enableTemperatureControl: enableTemperatureControl ?? this.enableTemperatureControl,
      preHeatTime: preHeatTime ?? this.preHeatTime,
      preCoolTime: preCoolTime ?? this.preCoolTime,
    );
  }
}

@JsonSerializable()
class LightingSettings {
  final bool enableDimming;
  final bool enableSunriseSimulation;
  final bool enableSunsetSimulation;
  final Duration sunriseDuration;
  final Duration sunsetDuration;
  final int maxIntensity;

  LightingSettings({
    required this.enableDimming,
    required this.enableSunriseSimulation,
    required this.enableSunsetSimulation,
    required this.sunriseDuration,
    required this.sunsetDuration,
    required this.maxIntensity,
  });

  factory LightingSettings.fromJson(Map<String, dynamic> json) =>
      _$LightingSettingsFromJson(json);

  Map<String, dynamic> toJson() => _$LightingSettingsToJson(this);

  LightingSettings copyWith({
    bool? enableDimming,
    bool? enableSunriseSimulation,
    bool? enableSunsetSimulation,
    Duration? sunriseDuration,
    Duration? sunsetDuration,
    int? maxIntensity,
  }) {
    return LightingSettings(
      enableDimming: enableDimming ?? this.enableDimming,
      enableSunriseSimulation: enableSunriseSimulation ?? this.enableSunriseSimulation,
      enableSunsetSimulation: enableSunsetSimulation ?? this.enableSunsetSimulation,
      sunriseDuration: sunriseDuration ?? this.sunriseDuration,
      sunsetDuration: sunsetDuration ?? this.sunsetDuration,
      maxIntensity: maxIntensity ?? this.maxIntensity,
    );
  }
}

@JsonSerializable()
class Co2Settings {
  final double enrichmentRate;
  final Duration enrichmentDuration;
  final bool enableTankMonitoring;
  final double tankCapacity;
  final double tankLevelThreshold;

  Co2Settings({
    required this.enrichmentRate,
    required this.enrichmentDuration,
    required this.enableTankMonitoring,
    required this.tankCapacity,
    required this.tankLevelThreshold,
  });

  factory Co2Settings.fromJson(Map<String, dynamic> json) =>
      _$Co2SettingsFromJson(json);

  Map<String, dynamic> toJson() => _$Co2SettingsToJson(this);

  Co2Settings copyWith({
    double? enrichmentRate,
    Duration? enrichmentDuration,
    bool? enableTankMonitoring,
    double? tankCapacity,
    double? tankLevelThreshold,
  }) {
    return Co2Settings(
      enrichmentRate: enrichmentRate ?? this.enrichmentRate,
      enrichmentDuration: enrichmentDuration ?? this.enrichmentDuration,
      enableTankMonitoring: enableTankMonitoring ?? this.enableTankMonitoring,
      tankCapacity: tankCapacity ?? this.tankCapacity,
      tankLevelThreshold: tankLevelThreshold ?? this.tankLevelThreshold,
    );
  }
}

@JsonSerializable()
class VentilationSettings {
  final double minFanSpeed;
  final double maxFanSpeed;
  final bool enableVariableSpeed;
  final Duration ventilationCycleDuration;
  final bool enableAirExchangeMonitoring;

  VentilationSettings({
    required this.minFanSpeed,
    required this.maxFanSpeed,
    required this.enableVariableSpeed,
    required this.ventilationCycleDuration,
    required this.enableAirExchangeMonitoring,
  });

  factory VentilationSettings.fromJson(Map<String, dynamic> json) =>
      _$VentilationSettingsFromJson(json);

  Map<String, dynamic> toJson() => _$VentilationSettingsToJson(this);

  VentilationSettings copyWith({
    double? minFanSpeed,
    double? maxFanSpeed,
    bool? enableVariableSpeed,
    Duration? ventilationCycleDuration,
    bool? enableAirExchangeMonitoring,
  }) {
    return VentilationSettings(
      minFanSpeed: minFanSpeed ?? this.minFanSpeed,
      maxFanSpeed: maxFanSpeed ?? this.maxFanSpeed,
      enableVariableSpeed: enableVariableSpeed ?? this.enableVariableSpeed,
      ventilationCycleDuration: ventilationCycleDuration ?? this.ventilationCycleDuration,
      enableAirExchangeMonitoring: enableAirExchangeMonitoring ?? this.enableAirExchangeMonitoring,
    );
  }
}

@JsonSerializable()
class NutrientSettings {
  final bool enableAutoDosing;
  final ValueRange ecTarget;
  final ValueRange phTarget;
  final double maxDailyDose;
  final bool enableMixingCycle;
  final Duration mixingDuration;

  NutrientSettings({
    required this.enableAutoDosing,
    required this.ecTarget,
    required this.phTarget,
    required this.maxDailyDose,
    required this.enableMixingCycle,
    required this.mixingDuration,
  });

  factory NutrientSettings.fromJson(Map<String, dynamic> json) =>
      _$NutrientSettingsFromJson(json);

  Map<String, dynamic> toJson() => _$NutrientSettingsToJson(this);

  NutrientSettings copyWith({
    bool? enableAutoDosing,
    ValueRange? ecTarget,
    ValueRange? phTarget,
    double? maxDailyDose,
    bool? enableMixingCycle,
    Duration? mixingDuration,
  }) {
    return NutrientSettings(
      enableAutoDosing: enableAutoDosing ?? this.enableAutoDosing,
      ecTarget: ecTarget ?? this.ecTarget,
      phTarget: phTarget ?? this.phTarget,
      maxDailyDose: maxDailyDose ?? this.maxDailyDose,
      enableMixingCycle: enableMixingCycle ?? this.enableMixingCycle,
      mixingDuration: mixingDuration ?? this.mixingDuration,
    );
  }
}

@JsonSerializable()
class ValueRange {
  final double min;
  final double max;

  ValueRange({
    required this.min,
    required this.max,
  });

  factory ValueRange.fromJson(Map<String, dynamic> json) =>
      _$ValueRangeFromJson(json);

  Map<String, dynamic> toJson() => _$ValueRangeToJson(this);

  bool contains(double value) {
    return value >= min && value <= max;
  }

  bool isBelow(double value) {
    return value < min;
  }

  bool isAbove(double value) {
    return value > max;
  }

  double get midPoint => (min + max) / 2;
  double get range => max - min;

  ValueRange copyWith({
    double? min,
    double? max,
  }) {
    return ValueRange(
      min: min ?? this.min,
      max: max ?? this.max,
    );
  }

  @override
  String toString() {
    return 'ValueRange(min: $min, max: $max)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is ValueRange &&
        other.min == min &&
        other.max == max;
  }

  @override
  int get hashCode {
    return min.hashCode ^ max.hashCode;
  }
}

enum GrowthStage {
  seedling,
  vegetative,
  flowering,
  harvest,
}

extension GrowthStageExtension on GrowthStage {
  String get displayName {
    switch (this) {
      case GrowthStage.seedling:
        return 'Seedling';
      case GrowthStage.vegetative:
        return 'Vegetative';
      case GrowthStage.flowering:
        return 'Flowering';
      case GrowthStage.harvest:
        return 'Harvest';
    }
  }

  String get description {
    switch (this) {
      case GrowthStage.seedling:
        return 'Early growth stage with high humidity needs';
      case GrowthStage.vegetative:
        return 'Rapid growth stage with high light and nutrient needs';
      case GrowthStage.flowering:
        return 'Budding stage with specific light and nutrient requirements';
      case GrowthStage.harvest:
        return 'Final stage preparing for harvest';
    }
  }

  Duration get typicalDuration {
    switch (this) {
      case GrowthStage.seedling:
        return Duration(days: 14);
      case GrowthStage.vegetative:
        return Duration(days: 28);
      case GrowthStage.flowering:
        return Duration(days: 56);
      case GrowthStage.harvest:
        return Duration(days: 7);
    }
  }
}