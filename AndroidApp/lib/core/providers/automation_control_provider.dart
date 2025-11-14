import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/room_config.dart';
import '../models/sensor_data.dart';
import '../models/sensor_device.dart';
import '../services/hardware_integration_service.dart';
import '../services/ai_optimization_service.dart';

// Automation control provider
final automationControlProvider = StateNotifierProvider<AutomationControlNotifier, AutomationControlState>((ref) {
  return AutomationControlNotifier(ref);
});

class AutomationControlNotifier extends StateNotifier<AutomationControlState> {
  final Ref _ref;

  // Control system state
  final Map<String, AutomationController> _controllers = {};
  final Map<String, Timer> _controlTimers = {};
  final Map<String, AutomationSchedule> _schedules = {};
  final Map<String, List<AutomationRule>> _rules = {};

  // Performance metrics
  final Map<String, AutomationPerformanceMetrics> _performanceMetrics = {};

  // Safety and emergency systems
  final Map<String, EmergencyState> _emergencyStates = {};
  final List<EmergencyShutdown> _emergencyHistory = [];

  AutomationControlNotifier(this._ref) : super(const AutomationControlState()) {
    _initializeAutomationSystem();
  }

  Future<void> _initializeAutomationSystem() async {
    try {
      // Initialize control timers for different automation frequencies
      _controlTimers['climate'] = Timer.periodic(const Duration(minutes: 1), (_) => _executeClimateControl());
      _controlTimers['watering'] = Timer.periodic(const Duration(minutes: 5), (_) => _executeWateringControl());
      _controlTimers['lighting'] = Timer.periodic(const Duration(minutes: 1), (_) => _executeLightingControl());
      _controlTimers['co2'] = Timer.periodic(const Duration(minutes: 2), (_) => _executeCo2Control());
      _controlTimers['monitoring'] = Timer.periodic(const Duration(seconds: 30), (_) => _executeSystemMonitoring());

      state = state.copyWith(
        isSystemActive: true,
        lastSystemUpdate: DateTime.now(),
      );

      if (kDebugMode) {
        print('Automation control system initialized');
      }
    } catch (e) {
      state = state.copyWith(
        systemError: 'Failed to initialize automation system: ${e.toString()}',
        isSystemActive: false,
      );
    }
  }

  // Climate Control System
  Future<void> _executeClimateControl() async {
    try {
      final rooms = _ref.read(roomManagementProvider).activeRooms;

      for (final room in rooms) {
        if (!room.settings.enableAutomation || !room.settings.automationSettings.enableClimateControl) {
          continue;
        }

        final controller = _getOrCreateController(room.id, AutomationType.climate);
        final currentData = _ref.read(enhancedSensorDataProvider).currentRoomData[room.id];

        if (currentData != null) {
          await _controlClimate(room, currentData, controller);
        }
      }
    } catch (e) {
      _logAutomationError('climate_control', e);
    }
  }

  Future<void> _controlClimate(RoomConfig room, SensorData currentData, AutomationController controller) async {
    final metrics = currentData.metrics;
    final settings = room.settings.automationSettings.climateSettings;
    final targets = room.environmentalTargets;

    // Temperature control
    await _controlTemperature(room, metrics.temperature, targets.temperature, settings, controller);

    // Humidity control
    await _controlHumidity(room, metrics.humidity, targets.humidity, settings, controller);

    // Air circulation control
    await _controlAirCirculation(room, metrics, targets, controller);

    // Update controller metrics
    _updateControllerMetrics(room.id, controller);
  }

  Future<void> _controlTemperature(
    RoomConfig room,
    double? currentTemp,
    ValueRange targetRange,
    ClimateSettings settings,
    AutomationController controller,
  ) async {
    if (currentTemp == null) return;

    final tolerance = settings.temperatureTolerance;
    final minTarget = targetRange.min - tolerance;
    final maxTarget = targetRange.max + tolerance;

    var actions = <AutomationAction>[];

    if (currentTemp < minTarget) {
      // Need heating
      actions.add(AutomationAction(
        type: AutomationActionType.heating,
        value: _calculateHeatingLevel(minTarget - currentTemp, settings),
        reason: 'Temperature below minimum: ${currentTemp.toStringAsFixed(1)}°C',
        priority: _calculateTemperaturePriority(currentTemp, targetRange),
      ));

      // Pre-heating if needed
      if (settings.enableTemperatureControl) {
        await _schedulePreHeating(room, settings);
      }
    } else if (currentTemp > maxTarget) {
      // Need cooling
      actions.add(AutomationAction(
        type: AutomationActionType.cooling,
        value: _calculateCoolingLevel(currentTemp - maxTarget, settings),
        reason: 'Temperature above maximum: ${currentTemp.toStringAsFixed(1)}°C',
        priority: _calculateTemperaturePriority(currentTemp, targetRange),
      ));

      // Pre-cooling if needed
      if (settings.enableTemperatureControl) {
        await _schedulePreCooling(room, settings);
      }
    } else {
      // Temperature is in range - maintain
      actions.add(AutomationAction(
        type: AutomationActionType.maintain,
        value: 0.0,
        reason: 'Temperature in optimal range',
        priority: 1,
      ));
    }

    // Execute actions
    await _executeAutomationActions(room.id, actions, controller);
  }

  Future<void> _controlHumidity(
    RoomConfig room,
    double? currentHumidity,
    ValueRange targetRange,
    ClimateSettings settings,
    AutomationController controller,
  ) async {
    if (currentHumidity == null || !settings.enableHumidityControl) return;

    final tolerance = settings.humidityTolerance;
    final minTarget = targetRange.min - tolerance;
    final maxTarget = targetRange.max + tolerance;

    var actions = <AutomationAction>[];

    if (currentHumidity < minTarget) {
      // Need humidification
      actions.add(AutomationAction(
        type: AutomationActionType.humidification,
        value: _calculateHumidificationLevel(minTarget - currentHumidity),
        reason: 'Humidity below minimum: ${currentHumidity.toStringAsFixed(1)}%',
        priority: _calculateHumidityPriority(currentHumidity, targetRange),
      ));
    } else if (currentHumidity > maxTarget) {
      // Need dehumidification
      actions.add(AutomationAction(
        type: AutomationActionType.dehumidification,
        value: _calculateDehumidificationLevel(currentHumidity - maxTarget),
        reason: 'Humidity above maximum: ${currentHumidity.toStringAsFixed(1)}%',
        priority: _calculateHumidityPriority(currentHumidity, targetRange),
      ));
    } else {
      // Humidity is in range
      actions.add(AutomationAction(
        type: AutomationActionType.maintain,
        value: 0.0,
        reason: 'Humidity in optimal range',
        priority: 1,
      ));
    }

    await _executeAutomationActions(room.id, actions, controller);
  }

  Future<void> _controlAirCirculation(
    RoomConfig room,
    SensorMetrics metrics,
    RoomEnvironmentalTargets targets,
    AutomationController controller,
  ) async {
    final circulationRange = targets.airCirculation;
    var actions = <AutomationAction>[];

    // Calculate optimal fan speed based on conditions
    var fanSpeed = circulationRange.min;
    final reason = <String>[];

    // Increase fan speed if temperature is high
    if (metrics.temperature != null && metrics.temperature! > targets.temperature.max * 0.9) {
      fanSpeed = max(fanSpeed, circulationRange.max * 0.7);
      reason.add('High temperature');
    }

    // Increase fan speed if humidity is high
    if (metrics.humidity != null && metrics.humidity! > targets.humidity.max * 0.9) {
      fanSpeed = max(fanSpeed, circulationRange.max * 0.6);
      reason.add('High humidity');
    }

    // Increase fan speed if CO2 is high
    if (metrics.co2 != null && metrics.co2! > targets.co2.max * 0.8) {
      fanSpeed = max(fanSpeed, circulationRange.max * 0.8);
      reason.add('High CO2');
    }

    actions.add(AutomationAction(
      type: AutomationActionType.airCirculation,
      value: fanSpeed,
      reason: reason.isNotEmpty ? reason.join(', ') : 'Normal circulation',
      priority: 2,
    ));

    await _executeAutomationActions(room.id, actions, controller);
  }

  // Watering Control System
  Future<void> _executeWateringControl() async {
    try {
      final rooms = _ref.read(roomManagementProvider).activeRooms;

      for (final room in rooms) {
        if (!room.settings.enableAutomation || !room.settings.automationSettings.enableWatering) {
          continue;
        }

        final controller = _getOrCreateController(room.id, AutomationType.watering);
        final currentData = _ref.read(enhancedSensorDataProvider).currentRoomData[room.id];

        if (currentData != null) {
          await _controlWatering(room, currentData, controller);
        }
      }
    } catch (e) {
      _logAutomationError('watering_control', e);
    }
  }

  Future<void> _controlWatering(
    RoomConfig room,
    SensorData currentData,
    AutomationController controller,
  ) async {
    final metrics = currentData.metrics;
    final settings = room.settings.automationSettings.wateringSettings;
    final targets = room.environmentalTargets;

    if (metrics.soilMoisture == null) return;

    var actions = <AutomationAction>[];

    // Check if watering is needed
    if (metrics.soilMoisture! < settings.soilMoistureThreshold.min) {
      // Check daily watering limit
      if (controller.dailyWateringCount < settings.maxWateringsPerDay) {
        actions.add(AutomationAction(
          type: AutomationActionType.watering,
          value: 1.0, // Full watering cycle
          reason: 'Soil moisture below threshold: ${metrics.soilMoisture!.toStringAsFixed(1)}%',
          priority: _calculateWateringPriority(metrics.soilMoisture!, settings),
          duration: settings.wateringDuration,
        ));

        controller.dailyWateringCount++;
        controller.lastWateringTime = DateTime.now();
      } else {
        actions.add(AutomationAction(
          type: AutomationActionType.alert,
          value: 0.0,
          reason: 'Daily watering limit reached (${settings.maxWateringsPerDay})',
          priority: 5,
        ));
      }
    } else if (settings.enableSmartWatering) {
      // Smart watering - check trends
      final smartWateringDecision = await _evaluateSmartWatering(room, metrics, controller);
      if (smartWateringDecision != null) {
        actions.add(smartWateringDecision);
      }
    }

    // Drainage monitoring
    if (settings.enableDrainageMonitoring && metrics.waterLevel != null) {
      await _monitorDrainage(room, metrics.waterLevel!, settings, actions);
    }

    await _executeAutomationActions(room.id, actions, controller);
  }

  Future<AutomationAction?> _evaluateSmartWatering(
    RoomConfig room,
    SensorMetrics metrics,
    AutomationController controller,
  ) async {
    // Use AI to predict watering needs
    final aiService = _ref.read(aiOptimizationProvider);
    final wateringPrediction = await aiService.predictWateringNeed(room.id, metrics);

    if (wateringPrediction.confidence > 0.7 && wateringPrediction.shouldWater) {
      return AutomationAction(
        type: AutomationActionType.watering,
        value: wateringPrediction.amount,
        reason: 'AI prediction: ${wateringPrediction.reason}',
        priority: 3,
      );
    }

    return null;
  }

  Future<void> _monitorDrainage(
    RoomConfig room,
    double waterLevel,
    WateringSettings settings,
    List<AutomationAction> actions,
  ) async {
    // Check for drainage issues
    if (waterLevel > settings.drainageThreshold) {
      actions.add(AutomationAction(
        type: AutomationActionType.drainage,
        value: 1.0,
        reason: 'Water level above drainage threshold: ${waterLevel.toStringAsFixed(1)}%',
        priority: 6,
      ));
    }
  }

  // Lighting Control System
  Future<void> _executeLightingControl() async {
    try {
      final rooms = _ref.read(roomManagementProvider).activeRooms;

      for (final room in rooms) {
        if (!room.settings.enableAutomation || !room.settings.automationSettings.enableLightingControl) {
          continue;
        }

        final controller = _getOrCreateController(room.id, AutomationType.lighting);
        await _controlLighting(room, controller);
      }
    } catch (e) {
      _logAutomationError('lighting_control', e);
    }
  }

  Future<void> _controlLighting(RoomConfig room, AutomationController controller) async {
    final settings = room.settings.automationSettings.lightingSettings;
    final targets = room.environmentalTargets;
    final now = DateTime.now();

    var actions = <AutomationAction>[];

    // Check lighting schedule
    final lightOnHours = targets.lightOnHours ?? 18;
    final lightOffHours = targets.lightOffHours ?? 6;
    final currentHour = now.hour;

    var shouldBeOn = false;
    var intensity = 0.0;

    if (lightOnHours > 0) {
      // Calculate light period based on growth stage
      final (startHour, endHour) = _calculateLightSchedule(lightOnHours, now);

      if (currentHour >= startHour && currentHour < endHour) {
        shouldBeOn = true;
        intensity = 1.0; // Full intensity by default
      }
    }

    // Apply sunrise/sunset simulation
    if (shouldBeOn && settings.enableSunriseSimulation) {
      intensity = _applySunriseSimulation(currentHour, settings);
    } else if (!shouldBeOn && settings.enableSunsetSimulation) {
      intensity = _applySunsetSimulation(currentHour, settings);
    }

    // Apply dimming based on light intensity sensor
    final currentData = _ref.read(enhancedSensorDataProvider).currentRoomData[room.id];
    if (currentData?.metrics.lightIntensity != null) {
      intensity = _applyLightSensorDimming(
        intensity,
        currentData!.metrics.lightIntensity!,
        targets.lightIntensity,
        settings,
      );
    }

    actions.add(AutomationAction(
      type: shouldBeOn ? AutomationActionType.lighting : AutomationActionType.lightingOff,
      value: intensity,
      reason: shouldBeOn ? 'Scheduled lighting period' : 'Scheduled dark period',
      priority: 2,
      duration: shouldBeOn ? null : Duration.zero,
    ));

    await _executeAutomationActions(room.id, actions, controller);
  }

  (int, int) _calculateLightSchedule(int lightOnHours, DateTime now) {
    // Calculate light schedule based on growth stage preferences
    // Default: lights on at 6 AM, off based on duration
    final startHour = 6; // 6 AM start
    final endHour = (startHour + lightOnHours) % 24;
    return (startHour, endHour);
  }

  double _applySunriseSimulation(int currentHour, LightingSettings settings) {
    // Gradually increase light intensity during sunrise period
    final sunriseDuration = settings.sunriseDuration.inMinutes;
    final minutesIntoHour = DateTime.now().minute;
    final totalMinutes = currentHour * 60 + minutesIntoHour;

    if (totalMinutes < sunriseDuration) {
      return totalMinutes / sunriseDuration;
    }

    return 1.0; // Full intensity after sunrise
  }

  double _applySunsetSimulation(int currentHour, LightingSettings settings) {
    // Gradually decrease light intensity during sunset period
    final sunsetDuration = settings.sunsetDuration.inMinutes;
    final minutesIntoHour = DateTime.now().minute;

    // This is simplified - would need proper timing logic
    return max(0.0, 1.0 - (minutesIntoHour / sunsetDuration));
  }

  double _applyLightSensorDimming(
    double currentIntensity,
    double measuredLight,
    ValueRange targetRange,
    LightingSettings settings,
  ) {
    if (!settings.enableDimming) return currentIntensity;

    final maxIntensity = settings.maxIntensity / 1000.0; // Convert to PPFD range
    final targetIntensity = targetRange.midPoint / 1000.0;

    // Adjust intensity based on measured vs target
    if (measuredLight < targetRange.min) {
      return min(1.0, currentIntensity * 1.1); // Increase by 10%
    } else if (measuredLight > targetRange.max) {
      return max(0.0, currentIntensity * 0.9); // Decrease by 10%
    }

    return currentIntensity;
  }

  // CO2 Control System
  Future<void> _executeCo2Control() async {
    try {
      final rooms = _ref.read(roomManagementProvider).activeRooms;

      for (final room in rooms) {
        if (!room.settings.enableAutomation || !room.settings.automationSettings.enableCo2Enrichment) {
          continue;
        }

        final controller = _getOrCreateController(room.id, AutomationType.co2);
        final currentData = _ref.read(enhancedSensorDataProvider).currentRoomData[room.id];

        if (currentData != null) {
          await _controlCo2(room, currentData, controller);
        }
      }
    } catch (e) {
      _logAutomationError('co2_control', e);
    }
  }

  Future<void> _controlCo2(
    RoomConfig room,
    SensorData currentData,
    AutomationController controller,
  ) async {
    final metrics = currentData.metrics;
    final settings = room.settings.automationSettings.co2Settings;
    final targets = room.environmentalTargets;

    if (metrics.co2 == null) return;

    var actions = <AutomationAction>[];

    // Check tank monitoring
    if (settings.enableTankMonitoring) {
      final tankLevel = await _getCo2TankLevel(room.id);
      if (tankLevel < settings.tankLevelThreshold) {
        actions.add(AutomationAction(
          type: AutomationActionType.alert,
          value: tankLevel,
          reason: 'CO2 tank level low: ${tankLevel.toStringAsFixed(1)}%',
          priority: 4,
        ));
      }
    }

    // CO2 enrichment control
    if (metrics.co2! < targets.co2.min) {
      // Check if conditions are suitable for CO2 enrichment
      if (await _areConditionsSuitableForCo2(room, metrics)) {
        actions.add(AutomationAction(
          type: AutomationActionType.co2Enrichment,
          value: settings.enrichmentRate,
          reason: 'CO2 below minimum: ${metrics.co2!.toStringAsFixed(0)}ppm',
          priority: 3,
          duration: settings.enrichmentDuration,
        ));
      }
    } else if (metrics.co2! > targets.co2.max) {
      actions.add(AutomationAction(
        type: AutomationActionType.ventilation,
        value: 1.0,
        reason: 'CO2 above maximum: ${metrics.co2!.toStringAsFixed(0)}ppm',
        priority: 4,
      ));
    }

    await _executeAutomationActions(room.id, actions, controller);
  }

  Future<bool> _areConditionsSuitableForCo2(RoomConfig room, SensorMetrics metrics) async {
    // CO2 enrichment is most effective during lights-on period
    final currentHour = DateTime.now().hour;
    final targets = room.environmentalTargets;
    final lightOnHours = targets.lightOnHours ?? 18;

    if (lightOnHours > 0) {
      final (startHour, endHour) = _calculateLightSchedule(lightOnHours, DateTime.now());
      if (currentHour < startHour || currentHour >= endHour) {
        return false; // Dark period
      }
    }

    // Check temperature and humidity are in optimal ranges
    if (metrics.temperature != null &&
        (metrics.temperature! < targets.temperature.min || metrics.temperature! > targets.temperature.max)) {
      return false;
    }

    if (metrics.humidity != null &&
        (metrics.humidity! < targets.humidity.min || metrics.humidity! > targets.humidity.max)) {
      return false;
    }

    return true;
  }

  // System Monitoring
  Future<void> _executeSystemMonitoring() async {
    try {
      await _monitorSystemHealth();
      await _monitorPerformanceMetrics();
      await _checkSafetyConditions();
      await _updateSystemStatus();
    } catch (e) {
      _logAutomationError('system_monitoring', e);
    }
  }

  Future<void> _monitorSystemHealth() async {
    final rooms = _ref.read(roomManagementProvider).activeRooms;

    for (final room in rooms) {
      final controller = _controllers[room.id];
      if (controller == null) continue;

      // Check controller health
      final timeSinceLastAction = DateTime.now().difference(controller.lastActionTime);
      if (timeSinceLastAction.inMinutes > 30) {
        _logWarning('Controller inactivity', 'Room ${room.name} controller inactive for ${timeSinceLastAction.inMinutes} minutes');
      }

      // Check error rates
      if (controller.errorCount > 10) {
        _logWarning('High error rate', 'Room ${room.name} controller has ${controller.errorCount} errors');
      }
    }
  }

  Future<void> _monitorPerformanceMetrics() async {
    for (final entry in _controllers.entries) {
      final roomId = entry.key;
      final controller = entry.value;

      _performanceMetrics[roomId] = AutomationPerformanceMetrics(
        roomId: roomId,
        actionsExecuted: controller.totalActions,
        errorsEncountered: controller.errorCount,
        averageResponseTime: controller.averageResponseTime,
        energyConsumed: controller.energyConsumed,
        resourceUsage: controller.resourceUsage,
        uptime: controller.uptime,
        lastUpdate: DateTime.now(),
      );
    }
  }

  Future<void> _checkSafetyConditions() async {
    final rooms = _ref.read(roomManagementProvider).activeRooms;

    for (final room in rooms) {
      final currentData = _ref.read(enhancedSensorDataProvider).currentRoomData[room.id];
      if (currentData == null) continue;

      final safetyIssues = <SafetyIssue>[];

      // Check for dangerous temperature
      if (currentData.metrics.temperature != null) {
        if (currentData.metrics.temperature! > 40.0) {
          safetyIssues.add(SafetyIssue(
            type: SafetyIssueType.highTemperature,
            severity: SafetySeverity.critical,
            description: 'Dangerously high temperature: ${currentData.metrics.temperature}°C',
            recommendation: 'Emergency cooling required',
          ));
        } else if (currentData.metrics.temperature! > 35.0) {
          safetyIssues.add(SafetyIssue(
            type: SafetyIssueType.highTemperature,
            severity: SafetySeverity.warning,
            description: 'High temperature: ${currentData.metrics.temperature}°C',
            recommendation: 'Increase ventilation',
          ));
        }
      }

      // Check for dangerous humidity
      if (currentData.metrics.humidity != null) {
        if (currentData.metrics.humidity! > 90.0) {
          safetyIssues.add(SafetyIssue(
            type: SafetyIssueType.highHumidity,
            severity: SafetySeverity.warning,
            description: 'Very high humidity: ${currentData.metrics.humidity}%',
            recommendation: 'Increase dehumidification and ventilation',
          ));
        }
      }

      // Check for very low humidity
      if (currentData.metrics.humidity != null && currentData.metrics.humidity! < 20.0) {
        safetyIssues.add(SafetyIssue(
          type: SafetyIssueType.lowHumidity,
          severity: SafetySeverity.warning,
          description: 'Very low humidity: ${currentData.metrics.humidity}%',
          recommendation: 'Increase humidification',
        ));
      }

      // Process safety issues
      if (safetyIssues.isNotEmpty) {
        await _handleSafetyIssues(room.id, safetyIssues);
      }
    }
  }

  Future<void> _handleSafetyIssues(String roomId, List<SafetyIssue> issues) async {
    for (final issue in issues) {
      switch (issue.severity) {
        case SafetySeverity.critical:
          await _executeEmergencyShutdown(roomId, issue);
          break;
        case SafetySeverity.warning:
          await _executeSafetyProtocol(roomId, issue);
          break;
        case SafetySeverity.info:
          _logSafetyIssue(roomId, issue);
          break;
      }
    }
  }

  Future<void> _executeEmergencyShutdown(String roomId, SafetyIssue issue) async {
    final emergency = EmergencyShutdown(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      roomId: roomId,
      reason: issue.description,
      timestamp: DateTime.now(),
      resolved: false,
    );

    _emergencyHistory.add(emergency);
    _emergencyStates[roomId] = EmergencyState(
      isActive: true,
      reason: issue.description,
      initiatedAt: DateTime.now(),
    );

    // Execute emergency actions
    final emergencyActions = [
      AutomationAction(
        type: AutomationActionType.emergencyShutdown,
        value: 1.0,
        reason: issue.description,
        priority: 10,
      ),
    ];

    final controller = _getOrCreateController(roomId, AutomationType.emergency);
    await _executeAutomationActions(roomId, emergencyActions, controller);

    state = state.copyWith(
      emergencyStates: Map.from(_emergencyStates),
      emergencyHistory: List.from(_emergencyHistory),
    );

    _logEmergency('Emergency shutdown', 'Room $roomId: ${issue.description}');
  }

  Future<void> _executeSafetyProtocol(String roomId, SafetyIssue issue) async {
    // Execute safety-specific actions based on issue type
    switch (issue.type) {
      case SafetyIssueType.highTemperature:
        await _executeHighTemperatureProtocol(roomId);
        break;
      case SafetyIssueType.lowHumidity:
        await _executeLowHumidityProtocol(roomId);
        break;
      case SafetyIssueType.highHumidity:
        await _executeHighHumidityProtocol(roomId);
        break;
    }

    _logSafetyIssue(roomId, issue);
  }

  Future<void> _executeHighTemperatureProtocol(String roomId) async {
    final actions = [
      AutomationAction(
        type: AutomationActionType.cooling,
        value: 1.0,
        reason: 'Safety protocol: High temperature',
        priority: 8,
      ),
      AutomationAction(
        type: AutomationActionType.airCirculation,
        value: 1.0,
        reason: 'Safety protocol: High temperature',
        priority: 8,
      ),
      AutomationAction(
        type: AutomationActionType.lightingOff,
        value: 0.0,
        reason: 'Safety protocol: High temperature',
        priority: 7,
      ),
    ];

    final controller = _getOrCreateController(roomId, AutomationType.safety);
    await _executeAutomationActions(roomId, actions, controller);
  }

  Future<void> _executeLowHumidityProtocol(String roomId) async {
    final actions = [
      AutomationAction(
        type: AutomationActionType.humidification,
        value: 1.0,
        reason: 'Safety protocol: Low humidity',
        priority: 7,
      ),
    ];

    final controller = _getOrCreateController(roomId, AutomationType.safety);
    await _executeAutomationActions(roomId, actions, controller);
  }

  Future<void> _executeHighHumidityProtocol(String roomId) async {
    final actions = [
      AutomationAction(
        type: AutomationActionType.dehumidification,
        value: 1.0,
        reason: 'Safety protocol: High humidity',
        priority: 7,
      ),
      AutomationAction(
        type: AutomationActionType.airCirculation,
        value: 1.0,
        reason: 'Safety protocol: High humidity',
        priority: 7,
      ),
    ];

    final controller = _getOrCreateController(roomId, AutomationType.safety);
    await _executeAutomationActions(roomId, actions, controller);
  }

  // Utility methods
  AutomationController _getOrCreateController(String roomId, AutomationType type) {
    final key = '${roomId}_${type.name}';
    return _controllers.putIfAbsent(
      key,
      () => AutomationController(
        roomId: roomId,
        type: type,
        createdAt: DateTime.now(),
      ),
    );
  }

  Future<void> _executeAutomationActions(
    String roomId,
    List<AutomationAction> actions,
    AutomationController controller,
  ) async {
    for (final action in actions) {
      try {
        await _executeAction(roomId, action);
        controller.recordAction(action);
      } catch (e) {
        controller.recordError(action, e);
        _logAutomationError('action_execution', e, action: action);
      }
    }
  }

  Future<void> _executeAction(String roomId, AutomationAction action) async {
    // Send commands to hardware devices
    final devices = _ref.read(deviceManagementProvider).getDevicesForRoom(roomId);

    for (final device in devices) {
      if (!device.isActive) continue;

      final command = _createDeviceCommand(action);
      if (command != null) {
        await _ref.read(hardwareIntegrationProvider.notifier).sendCommandToDevice(device, command);
      }
    }
  }

  Map<String, dynamic>? _createDeviceCommand(AutomationAction action) {
    switch (action.type) {
      case AutomationActionType.heating:
        return {'type': 'heating', 'value': action.value};
      case AutomationActionType.cooling:
        return {'type': 'cooling', 'value': action.value};
      case AutomationActionType.humidification:
        return {'type': 'humidification', 'value': action.value};
      case AutomationActionType.dehumidification:
        return {'type': 'dehumidification', 'value': action.value};
      case AutomationActionType.watering:
        return {'type': 'watering', 'value': action.value, 'duration': action.duration?.inSeconds};
      case AutomationActionType.lighting:
        return {'type': 'lighting', 'value': action.value};
      case AutomationActionType.lightingOff:
        return {'type': 'lighting', 'value': 0};
      case AutomationActionType.co2Enrichment:
        return {'type': 'co2', 'value': action.value, 'duration': action.duration?.inSeconds};
      case AutomationActionType.airCirculation:
        return {'type': 'fan', 'value': action.value};
      case AutomationActionType.ventilation:
        return {'type': 'ventilation', 'value': action.value};
      case AutomationActionType.emergencyShutdown:
        return {'type': 'emergency_stop', 'value': 1};
      default:
        return null;
    }
  }

  double _calculateHeatingLevel(double tempDifference, ClimateSettings settings) {
    // Calculate heating level (0-1) based on temperature difference
    return (tempDifference / 10.0).clamp(0.0, 1.0);
  }

  double _calculateCoolingLevel(double tempDifference, ClimateSettings settings) {
    // Calculate cooling level (0-1) based on temperature difference
    return (tempDifference / 10.0).clamp(0.0, 1.0);
  }

  double _calculateHumidificationLevel(double humidityDifference) {
    // Calculate humidification level based on humidity difference
    return (humidityDifference / 30.0).clamp(0.0, 1.0);
  }

  double _calculateDehumidificationLevel(double humidityDifference) {
    // Calculate dehumidification level based on humidity difference
    return (humidityDifference / 30.0).clamp(0.0, 1.0);
  }

  int _calculateTemperaturePriority(double currentTemp, ValueRange targetRange) {
    if (currentTemp < targetRange.min - 5 || currentTemp > targetRange.max + 5) {
      return 8; // High priority for extreme temperatures
    } else if (currentTemp < targetRange.min - 2 || currentTemp > targetRange.max + 2) {
      return 6; // Medium priority for moderate deviations
    }
    return 3; // Low priority for small deviations
  }

  int _calculateHumidityPriority(double currentHumidity, ValueRange targetRange) {
    if (currentHumidity < targetRange.min - 10 || currentHumidity > targetRange.max + 10) {
      return 7;
    } else if (currentHumidity < targetRange.min - 5 || currentHumidity > targetRange.max + 5) {
      return 5;
    }
    return 2;
  }

  int _calculateWateringPriority(double soilMoisture, WateringSettings settings) {
    if (soilMoisture < settings.soilMoistureThreshold.min - 10) {
      return 9; // Critical watering priority
    } else if (soilMoisture < settings.soilMoistureThreshold.min) {
      return 6; // High watering priority
    }
    return 3;
  }

  Future<void> _schedulePreHeating(RoomConfig room, ClimateSettings settings) async {
    // Schedule pre-heating if needed
    final now = DateTime.now();
    // Implementation would depend on specific scheduling requirements
  }

  Future<void> _schedulePreCooling(RoomConfig room, ClimateSettings settings) async {
    // Schedule pre-cooling if needed
    final now = DateTime.now();
    // Implementation would depend on specific scheduling requirements
  }

  Future<double> _getCo2TankLevel(String roomId) async {
    // Get CO2 tank level from sensors or API
    return 75.0; // Placeholder
  }

  void _updateControllerMetrics(String roomId, AutomationController controller) {
    // Update performance metrics for the controller
    controller.updateMetrics();
  }

  Future<void> _updateSystemStatus() async {
    state = state.copyWith(
      lastSystemUpdate: DateTime.now(),
      activeControllers: _controllers.length,
    );
  }

  void _logAutomationError(String context, dynamic error, {AutomationAction? action}) {
    if (kDebugMode) {
      print('Automation Error [$context]: $error');
      if (action != null) {
        print('  Action: ${action.type}, Value: ${action.value}');
      }
    }
  }

  void _logWarning(String context, String message) {
    if (kDebugMode) {
      print('Automation Warning [$context]: $message');
    }
  }

  void _logEmergency(String context, String message) {
    if (kDebugMode) {
      print('EMERGENCY [$context]: $message');
    }
  }

  void _logSafetyIssue(String roomId, SafetyIssue issue) {
    if (kDebugMode) {
      print('Safety Issue [Room $roomId]: ${issue.description}');
    }
  }

  // Public API methods
  Future<void> enableAutomationForRoom(String roomId) async {
    final controller = _controllers.values.firstWhere(
      (c) => c.roomId == roomId,
      orElse: () => AutomationController(roomId: roomId, type: AutomationType.general, createdAt: DateTime.now()),
    );
    controller.isEnabled = true;
  }

  Future<void> disableAutomationForRoom(String roomId) async {
    final controller = _controllers.values.firstWhere(
      (c) => c.roomId == roomId,
      orElse: () => AutomationController(roomId: roomId, type: AutomationType.general, createdAt: DateTime.now()),
    );
    controller.isEnabled = false;
  }

  Future<void> executeManualAction(String roomId, AutomationAction action) async {
    final controller = _getOrCreateController(roomId, AutomationType.manual);
    await _executeAutomationActions(roomId, [action], controller);
  }

  Future<void> resolveEmergency(String emergencyId) async {
    final emergency = _emergencyHistory.cast<EmergencyShutdown?>().firstWhere(
      (e) => e?.id == emergencyId,
      orElse: () => null,
    );

    if (emergency != null) {
      final resolvedEmergency = emergency.copyWith(resolved: true, resolvedAt: DateTime.now());
      _emergencyHistory.remove(emergency);
      _emergencyHistory.add(resolvedEmergency);

      // Clear emergency state
      final roomId = emergency.roomId;
      _emergencyStates.remove(roomId);

      state = state.copyWith(
        emergencyStates: Map.from(_emergencyStates),
        emergencyHistory: List.from(_emergencyHistory),
      );
    }
  }

  AutomationPerformanceMetrics? getPerformanceMetrics(String roomId) {
    return _performanceMetrics[roomId];
  }

  List<EmergencyShutdown> getEmergencyHistory({Duration? timeRange}) {
    if (timeRange == null) return _emergencyHistory;

    final cutoff = DateTime.now().subtract(timeRange);
    return _emergencyHistory.where((e) => e.timestamp.isAfter(cutoff)).toList();
  }

  // Additional properties for state access
  int get totalActions => _controllers.values.fold(0, (sum, controller) => sum + controller.totalActions);
  int get errorCount => _controllers.values.fold(0, (sum, controller) => sum + controller.errorCount);
  double get errorRate => totalActions > 0 ? errorCount / totalActions : 0.0;
  double get uptime {
    if (_controllers.isEmpty) return 100.0;
    final totalUptime = _controllers.values.fold(0.0, (sum, controller) => sum + controller.uptimePercent);
    return totalUptime / _controllers.length;
  }

  @override
  void dispose() {
    for (final timer in _controlTimers.values) {
      timer.cancel();
    }
    super.dispose();
  }
}

// Data models
class AutomationControlState {
  final bool isSystemActive;
  final String? systemError;
  final DateTime? lastSystemUpdate;
  final int activeControllers;
  final Map<String, EmergencyState> emergencyStates;
  final List<EmergencyShutdown> emergencyHistory;

  const AutomationControlState({
    this.isSystemActive = false,
    this.systemError,
    this.lastSystemUpdate,
    this.activeControllers = 0,
    this.emergencyStates = const {},
    this.emergencyHistory = const [],
  });

  AutomationControlState copyWith({
    bool? isSystemActive,
    String? systemError,
    DateTime? lastSystemUpdate,
    int? activeControllers,
    Map<String, EmergencyState>? emergencyStates,
    List<EmergencyShutdown>? emergencyHistory,
  }) {
    return AutomationControlState(
      isSystemActive: isSystemActive ?? this.isSystemActive,
      systemError: systemError ?? this.systemError,
      lastSystemUpdate: lastSystemUpdate ?? this.lastSystemUpdate,
      activeControllers: activeControllers ?? this.activeControllers,
      emergencyStates: emergencyStates ?? this.emergencyStates,
      emergencyHistory: emergencyHistory ?? this.emergencyHistory,
    );
  }
}

class AutomationController {
  final String roomId;
  final AutomationType type;
  final DateTime createdAt;
  bool isEnabled;
  int totalActions;
  int errorCount;
  Duration averageResponseTime;
  double energyConsumed;
  Map<String, double> resourceUsage;
  DateTime lastActionTime;
  int dailyWateringCount;
  DateTime? lastWateringTime;
  DateTime uptime;

  AutomationController({
    required this.roomId,
    required this.type,
    required this.createdAt,
    this.isEnabled = true,
    this.totalActions = 0,
    this.errorCount = 0,
    this.averageResponseTime = Duration.zero,
    this.energyConsumed = 0.0,
    this.resourceUsage = const {},
    this.lastActionTime = const Duration(microseconds: 0),
    this.dailyWateringCount = 0,
    this.lastWateringTime,
    DateTime? uptime,
  }) : uptime = uptime ?? DateTime.now();

  void recordAction(AutomationAction action) {
    totalActions++;
    lastActionTime = DateTime.now();
    // Update energy consumption and resource usage based on action
  }

  void recordError(AutomationAction action, dynamic error) {
    errorCount++;
    if (kDebugMode) {
      print('Automation error in ${type.name}: $error');
    }
  }

  void updateMetrics() {
    // Update performance metrics
  }
}

class AutomationAction {
  final AutomationActionType type;
  final double value;
  final String reason;
  final int priority;
  final Duration? duration;
  final DateTime timestamp;

  AutomationAction({
    required this.type,
    required this.value,
    required this.reason,
    required this.priority,
    this.duration,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();
}

class AutomationSchedule {
  final String id;
  final String roomId;
  final AutomationActionType actionType;
  final TimeOfDay startTime;
  final TimeOfDay? endTime;
  final List<int> daysOfWeek;
  final Map<String, dynamic> parameters;
  final bool isActive;

  AutomationSchedule({
    required this.id,
    required this.roomId,
    required this.actionType,
    required this.startTime,
    this.endTime,
    required this.daysOfWeek,
    required this.parameters,
    required this.isActive,
  });
}

class AutomationRule {
  final String id;
  final String roomId;
  final String name;
  final String description;
  final List<AutomationCondition> conditions;
  final List<AutomationAction> actions;
  final bool isActive;
  final DateTime createdAt;

  AutomationRule({
    required this.id,
    required this.roomId,
    required this.name,
    required this.description,
    required this.conditions,
    required this.actions,
    required this.isActive,
    required this.createdAt,
  });
}

class AutomationCondition {
  final String sensorType;
  final String operator; // '>', '<', '>=', '<=', '=='
  final double value;
  final String logicalOperator; // 'AND', 'OR'

  AutomationCondition({
    required this.sensorType,
    required this.operator,
    required this.value,
    required this.logicalOperator,
  });
}

class AutomationPerformanceMetrics {
  final String roomId;
  final int actionsExecuted;
  final int errorsEncountered;
  final Duration averageResponseTime;
  final double energyConsumed;
  final Map<String, double> resourceUsage;
  final Duration uptime;
  final DateTime lastUpdate;

  AutomationPerformanceMetrics({
    required this.roomId,
    required this.actionsExecuted,
    required this.errorsEncountered,
    required this.averageResponseTime,
    required this.energyConsumed,
    required this.resourceUsage,
    required this.uptime,
    required this.lastUpdate,
  });
}

class EmergencyState {
  final bool isActive;
  final String reason;
  final DateTime initiatedAt;

  EmergencyState({
    required this.isActive,
    required this.reason,
    required this.initiatedAt,
  });
}

class EmergencyShutdown {
  final String id;
  final String roomId;
  final String reason;
  final DateTime timestamp;
  final bool resolved;
  final DateTime? resolvedAt;

  EmergencyShutdown({
    required this.id,
    required this.roomId,
    required this.reason,
    required this.timestamp,
    this.resolved = false,
    this.resolvedAt,
  });

  EmergencyShutdown copyWith({
    String? id,
    String? roomId,
    String? reason,
    DateTime? timestamp,
    bool? resolved,
    DateTime? resolvedAt,
  }) {
    return EmergencyShutdown(
      id: id ?? this.id,
      roomId: roomId ?? this.roomId,
      reason: reason ?? this.reason,
      timestamp: timestamp ?? this.timestamp,
      resolved: resolved ?? this.resolved,
      resolvedAt: resolvedAt ?? this.resolvedAt,
    );
  }
}

class SafetyIssue {
  final SafetyIssueType type;
  final SafetySeverity severity;
  final String description;
  final String recommendation;

  SafetyIssue({
    required this.type,
    required this.severity,
    required this.description,
    required this.recommendation,
  });
}

enum AutomationType {
  climate,
  watering,
  lighting,
  co2,
  safety,
  emergency,
  manual,
  general,
}

enum AutomationActionType {
  heating,
  cooling,
  humidification,
  dehumidification,
  watering,
  drainage,
  lighting,
  lightingOff,
  co2Enrichment,
  airCirculation,
  ventilation,
  nutrientDosing,
  maintain,
  alert,
  emergencyShutdown,
}

enum SafetyIssueType {
  highTemperature,
  lowTemperature,
  highHumidity,
  lowHumidity,
  lowWaterLevel,
  highWaterLevel,
  powerFailure,
  sensorFailure,
  deviceOffline,
}

enum SafetySeverity {
  info,
  warning,
  critical,
}