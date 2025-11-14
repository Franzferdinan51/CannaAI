import 'package:flutter/material.dart';
import 'package:workmanager/workmanager.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:logger/logger.dart';

import '../constants/app_constants.dart';

class BackgroundService {
  static final BackgroundService _instance = BackgroundService._internal();
  factory BackgroundService() => _instance;
  BackgroundService._internal();

  final Logger _logger = Logger();

  static Future<void> initialize() async {
    await _instance._initializeWorkManager();
  }

  Future<void> _initializeWorkManager() async {
    try {
      await Workmanager().initialize(
        _callbackDispatcher,
        isInDebugMode: false, // Set to true for debugging
      );

      // Register periodic task for sensor data sync
      await _registerPeriodicTasks();

      _logger.i('Background service initialized successfully');
    } catch (e) {
      _logger.e('Failed to initialize background service: $e');
    }
  }

  Future<void> _registerPeriodicTasks() async {
    try {
      // Register sensor data sync task
      await Workmanager().registerPeriodicTask(
        'sensorDataSync',
        AppConstants.backgroundTaskName,
        frequency: AppConstants.backgroundTaskInterval,
        constraints: Constraints(
          networkType: NetworkType.connected,
          requiresCharging: false,
          requiresDeviceIdle: false,
          requiresBatteryNotLow: true,
        ),
        initialDelay: const Duration(minutes: 5),
        existingWorkPolicy: ExistingWorkPolicy.replace,
        tag: 'sensor_sync',
        backoffPolicy: BackoffPolicy.exponential,
        backoffDelay: const Duration(minutes: 15),
      );

      _logger.i('Background tasks registered successfully');
    } catch (e) {
      _logger.e('Failed to register background tasks: $e');
    }
  }

  // Callback dispatcher for background tasks
  @pragma('vm:entry-point')
  static void _callbackDispatcher() {
    Workmanager().executeTask((task, inputData) async {
      try {
        switch (task) {
          case 'sensorDataSync':
            return await _performSensorDataSync(inputData);
          default:
            return Future.value(false);
        }
      } catch (e) {
        _logger.e('Error in background task $task: $e');
        return Future.value(false);
      }
    });
  }

  // Perform sensor data synchronization
  static Future<bool> _performSensorDataSync(Map<String, dynamic>? inputData) async {
    try {
      _logger.i('Starting sensor data sync in background');

      // Get preferences
      final prefs = await SharedPreferences.getInstance();
      final isAutoSyncEnabled = prefs.getBool(AppConstants.autoSyncKey) ?? true;
      final serverUrl = prefs.getString(AppConstants.serverUrlKey) ?? AppConstants.baseUrl;

      if (!isAutoSyncEnabled) {
        _logger.i('Auto sync is disabled');
        return true;
      }

      // TODO: Implement actual sensor data sync logic
      // This would:
      // 1. Collect unsynced sensor data from local database
      // 2. Send to server
      // 3. Handle success/failure
      // 4. Update sync status

      // Simulate sync process
      await Future.delayed(const Duration(seconds: 10));

      // Update last sync timestamp
      await prefs.setString(
        AppConstants.lastSyncKey,
        DateTime.now().toIso8601String(),
      );

      _logger.i('Sensor data sync completed successfully');
      return true;
    } catch (e) {
      _logger.e('Sensor data sync failed: $e');
      return false;
    }
  }

  // Start one-time background task
  Future<void> startOneTimeTask({
    required String taskName,
    required Map<String, dynamic> data,
    Duration? initialDelay,
  }) async {
    try {
      await Workmanager().registerOneOffTask(
        '${taskName}_${DateTime.now().millisecondsSinceEpoch}',
        taskName,
        initialDelay: initialDelay ?? Duration.zero,
        inputData: data,
        constraints: Constraints(
          networkType: NetworkType.connected,
          requiresCharging: false,
          requiresDeviceIdle: false,
        ),
        existingWorkPolicy: ExistingWorkPolicy.replace,
      );

      _logger.i('One-time task $taskName started successfully');
    } catch (e) {
      _logger.e('Failed to start one-time task $taskName: $e');
    }
  }

  // Cancel background task
  Future<void> cancelTask(String taskName) async {
    try {
      await Workmanager().cancelByUniqueName(taskName);
      _logger.i('Task $taskName cancelled successfully');
    } catch (e) {
      _logger.e('Failed to cancel task $taskName: $e');
    }
  }

  // Cancel all background tasks
  Future<void> cancelAllTasks() async {
    try {
      await Workmanager().cancelAll();
      _logger.i('All background tasks cancelled successfully');
    } catch (e) {
      _logger.e('Failed to cancel all background tasks: $e');
    }
  }

  // Check if task is running
  Future<bool> isTaskRunning(String taskName) async {
    try {
      final tasks = await Workmanager().getTaskTags();
      return tasks.contains(taskName);
    } catch (e) {
      _logger.e('Failed to check if task $taskName is running: $e');
      return false;
    }
  }

  // Get all registered tasks
  Future<List<String>> getRegisteredTasks() async {
    try {
      return await Workmanager().getTaskTags();
    } catch (e) {
      _logger.e('Failed to get registered tasks: $e');
      return [];
    }
  }

  // Restart background service with new settings
  Future<void> restartWithSettings({
    Duration? interval,
    bool? requiresNetwork,
    bool? requiresCharging,
  }) async {
    try {
      // Cancel existing tasks
      await cancelAllTasks();

      // Re-register tasks with new settings
      await Workmanager().registerPeriodicTask(
        'sensorDataSync',
        AppConstants.backgroundTaskName,
        frequency: interval ?? AppConstants.backgroundTaskInterval,
        constraints: Constraints(
          networkType: requiresNetwork ?? true ? NetworkType.connected : NetworkType.not_required,
          requiresCharging: requiresCharging ?? false,
          requiresDeviceIdle: false,
          requiresBatteryNotLow: true,
        ),
        initialDelay: const Duration(minutes: 1),
        existingWorkPolicy: ExistingWorkPolicy.replace,
        backoffPolicy: BackoffPolicy.exponential,
        backoffDelay: const Duration(minutes: 15),
      );

      _logger.i('Background service restarted with new settings');
    } catch (e) {
      _logger.e('Failed to restart background service: $e');
    }
  }

  // Schedule next sync
  Future<void> scheduleNextSync() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final isAutoSyncEnabled = prefs.getBool(AppConstants.autoSyncKey) ?? true;

      if (isAutoSyncEnabled) {
        await startOneTimeTask(
          taskName: 'nextSync',
          data: {'action': 'sync_sensor_data'},
          initialDelay: const Duration(minutes: 30),
        );
      }
    } catch (e) {
      _logger.e('Failed to schedule next sync: $e');
    }
  }

  // Get last sync timestamp
  Future<DateTime?> getLastSyncTimestamp() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastSyncString = prefs.getString(AppConstants.lastSyncKey);

      if (lastSyncString != null) {
        return DateTime.parse(lastSyncString);
      }

      return null;
    } catch (e) {
      _logger.e('Failed to get last sync timestamp: $e');
      return null;
    }
  }

  // Check if sync is needed
  Future<bool> isSyncNeeded({Duration threshold = const Duration(hours: 1)}) async {
    try {
      final lastSync = await getLastSyncTimestamp();

      if (lastSync == null) {
        return true;
      }

      final now = DateTime.now();
      return now.difference(lastSync) > threshold;
    } catch (e) {
      _logger.e('Failed to check if sync is needed: $e');
      return false;
    }
  }

  // Update task settings from preferences
  Future<void> updateTaskSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final isAutoSyncEnabled = prefs.getBool(AppConstants.autoSyncKey) ?? true;

      if (isAutoSyncEnabled) {
        await restartWithSettings();
      } else {
        await cancelAllTasks();
      }
    } catch (e) {
      _logger.e('Failed to update task settings: $e');
    }
  }

  // Debug: Print current status
  Future<void> debugPrintStatus() async {
    try {
      final tasks = await getRegisteredTasks();
      final lastSync = await getLastSyncTimestamp();
      final syncNeeded = await isSyncNeeded();

      _logger.i('Background Service Status:');
      _logger.i('  Registered tasks: ${tasks.length}');
      _logger.i('  Tasks: $tasks');
      _logger.i('  Last sync: $lastSync');
      _logger.i('  Sync needed: $syncNeeded');
    } catch (e) {
      _logger.e('Failed to debug print status: $e');
    }
  }
}