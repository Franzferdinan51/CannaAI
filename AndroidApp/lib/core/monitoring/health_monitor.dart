import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:battery_plus/battery_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'performance_manager.dart';
import 'analytics_service.dart';

/// Health monitoring service for CannaAI Pro
/// Monitors app health, performance, and system status
class HealthMonitor {
  static final HealthMonitor _instance = HealthMonitor._internal();
  factory HealthMonitor() => _instance;
  HealthMonitor._internal();

  final PerformanceManager _performanceManager = PerformanceManager();
  final AnalyticsService _analyticsService = AnalyticsService();

  bool _isInitialized = false;
  Timer? _healthCheckTimer;
  Timer? _networkCheckTimer;

  // Health metrics
  final Map<String, dynamic> _healthMetrics = {};
  final List<Map<String, dynamic>> _healthHistory = [];
  final Map<String, dynamic> _thresholds = {};

  // Health status
  HealthStatus _currentStatus = HealthStatus.good;
  String _lastHealthCheck = '';
  int _consecutiveFailures = 0;

  // Configuration
  static const Duration _healthCheckInterval = Duration(minutes: 2);
  static const Duration _networkCheckInterval = Duration(seconds: 30);
  static const int _maxHealthHistorySize = 100;
  static const int _maxConsecutiveFailures = 3;

  /// Initialize health monitor
  Future<void> initialize() async {
    if (_isInitialized) return;

    await _initializeThresholds();
    await _performInitialHealthCheck();
    await _startHealthMonitoring();

    _isInitialized = true;

    if (kDebugMode) {
      debugPrint('HealthMonitor initialized');
    }
  }

  /// Initialize health thresholds
  Future<void> _initializeThresholds() async {
    _thresholds = {
      'memory_warning': 150.0, // MB
      'memory_critical': 200.0, // MB
      'cpu_warning': 80.0, // %
      'cpu_critical': 95.0, // %
      'battery_warning': 20.0, // %
      'battery_critical': 10.0, // %
      'storage_warning': 85.0, // % used
      'storage_critical': 95.0, // % used
      'response_time_warning': 3000, // ms
      'response_time_critical': 10000, // ms
      'error_rate_warning': 5.0, // %
      'error_rate_critical': 15.0, // %
    };
  }

  /// Perform initial health check
  Future<void> _performInitialHealthCheck() async {
    await _collectHealthMetrics();
    await _assessOverallHealth();
  }

  /// Start health monitoring
  Future<void> _startHealthMonitoring() async {
    // Start periodic health checks
    _healthCheckTimer = Timer.periodic(_healthCheckInterval, (_) {
      _performHealthCheck();
    });

    // Start network monitoring
    _networkCheckTimer = Timer.periodic(_networkCheckInterval, (_) {
      _checkNetworkHealth();
    });
  }

  /// Perform comprehensive health check
  Future<void> _performHealthCheck() async {
    try {
      await _collectHealthMetrics();
      await _assessOverallHealth();

      // Log health status
      await _logHealthStatus();

      // Take action if needed
      await _handleHealthIssues();

    } catch (e) {
      debugPrint('Error during health check: $e');
      await _handleHealthCheckFailure(e);
    }
  }

  /// Collect all health metrics
  Future<void> _collectHealthMetrics() async {
    final timestamp = DateTime.now().toIso8601String();

    _healthMetrics['timestamp'] = timestamp;
    _healthMetrics['platform'] = Platform.operatingSystem;

    // Performance metrics
    final performanceMetrics = _performanceManager.getMetrics();
    _healthMetrics.addAll(performanceMetrics);

    // Device metrics
    await _collectDeviceMetrics();

    // App metrics
    await _collectAppMetrics();

    // Network metrics
    await _collectNetworkMetrics();

    // Error metrics
    await _collectErrorMetrics();
  }

  /// Collect device-specific metrics
  Future<void> _collectDeviceMetrics() async {
    try {
      final deviceInfo = DeviceInfoPlugin();
      final battery = Battery();

      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        _healthMetrics['device_model'] = androidInfo.model;
        _healthMetrics['device_brand'] = androidInfo.brand;
        _healthMetrics['android_version'] = androidInfo.version.release;
        _healthMetrics['sdk_int'] = androidInfo.version.sdkInt;
        _healthMetrics['total_memory'] = androidInfo.totalMemory;
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        _healthMetrics['device_model'] = iosInfo.model;
        _healthMetrics['system_version'] = iosInfo.systemVersion;
        _healthMetrics['name'] = iosInfo.name;
      }

      // Battery status
      final batteryLevel = await battery.batteryLevel;
      _healthMetrics['battery_level'] = batteryLevel;
      final batteryState = await battery.batteryState;
      _healthMetrics['battery_state'] = batteryState.toString();

      // Storage usage (simplified)
      _healthMetrics['storage_usage'] = await _getStorageUsage();

    } catch (e) {
      debugPrint('Error collecting device metrics: $e');
    }
  }

  /// Collect app-specific metrics
  Future<void> _collectAppMetrics() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      _healthMetrics['app_version'] = packageInfo.version;
      _healthMetrics['build_number'] = packageInfo.buildNumber;
      _healthMetrics['package_name'] = packageInfo.packageName;

      // App uptime (simplified)
      _healthMetrics['app_uptime'] = DateTime.now().difference(_getAppStartTime()).inMinutes;

    } catch (e) {
      debugPrint('Error collecting app metrics: $e');
    }
  }

  /// Collect network metrics
  Future<void> _collectNetworkMetrics() async {
    try {
      final connectivity = Connectivity();
      final result = await connectivity.checkConnectivity();

      _healthMetrics['connectivity_status'] = result.toString();

      // Network latency (simplified test)
      final latency = await _measureNetworkLatency();
      _healthMetrics['network_latency'] = latency;

    } catch (e) {
      debugPrint('Error collecting network metrics: $e');
    }
  }

  /// Collect error metrics
  Future<void> _collectErrorMetrics() async {
    try {
      // This would integrate with your error tracking system
      _healthMetrics['error_count_24h'] = _getRecentErrorCount();
      _healthMetrics['crash_count_24h'] = _getRecentCrashCount();
      _healthMetrics['error_rate'] = _calculateErrorRate();

    } catch (e) {
      debugPrint('Error collecting error metrics: $e');
    }
  }

  /// Measure network latency
  Future<int> _measureNetworkLatency() async {
    try {
      final stopwatch = Stopwatch()..start();

      // Simple ping test to Google DNS
      final socket = await Socket.connect('8.8.8.8', 53).timeout(Duration(seconds: 5));
      stopwatch.stop();
      socket.destroy();

      return stopwatch.elapsedMilliseconds;
    } catch (e) {
      return -1; // Indicates network error
    }
  }

  /// Get storage usage percentage
  Future<double> _getStorageUsage() async {
    // This is a simplified implementation
    // In production, you'd use platform-specific storage APIs
    return Random().nextDouble() * 100; // Simulated value
  }

  /// Get app start time
  DateTime _getAppStartTime() {
    // This should be set when the app starts
    return DateTime.now().subtract(Duration(minutes: Random().nextInt(120)));
  }

  /// Get recent error count
  int _getRecentErrorCount() {
    // This would integrate with your error tracking system
    return Random().nextInt(10);
  }

  /// Get recent crash count
  int _getRecentCrashCount() {
    // This would integrate with your crash reporting system
    return Random().nextInt(3);
  }

  /// Calculate error rate
  double _calculateErrorRate() {
    final errorCount = _getRecentErrorCount();
    final totalRequests = Random().nextInt(1000) + 100; // Simulated
    return totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0.0;
  }

  /// Assess overall health
  Future<void> _assessOverallHealth() async {
    int healthScore = 100;
    final issues = <String>[];

    // Check memory usage
    final memoryUsage = _healthMetrics['current_memory'] as double? ?? 0.0;
    if (memoryUsage > _thresholds['memory_critical']) {
      healthScore -= 30;
      issues.add('Critical memory usage');
    } else if (memoryUsage > _thresholds['memory_warning']) {
      healthScore -= 15;
      issues.add('High memory usage');
    }

    // Check CPU usage
    final cpuUsage = _healthMetrics['current_cpu'] as double? ?? 0.0;
    if (cpuUsage > _thresholds['cpu_critical']) {
      healthScore -= 25;
      issues.add('Critical CPU usage');
    } else if (cpuUsage > _thresholds['cpu_warning']) {
      healthScore -= 10;
      issues.add('High CPU usage');
    }

    // Check battery level
    final batteryLevel = _healthMetrics['battery_level'] as int? ?? 100;
    if (batteryLevel < _thresholds['battery_critical']) {
      healthScore -= 20;
      issues.add('Critical battery level');
    } else if (batteryLevel < _thresholds['battery_warning']) {
      healthScore -= 10;
      issues.add('Low battery level');
    }

    // Check network connectivity
    final networkLatency = _healthMetrics['network_latency'] as int? ?? 0;
    if (networkLatency == -1) {
      healthScore -= 40;
      issues.add('No network connectivity');
    } else if (networkLatency > _thresholds['response_time_critical']) {
      healthScore -= 20;
      issues.add('Very slow network');
    } else if (networkLatency > _thresholds['response_time_warning']) {
      healthScore -= 10;
      issues.add('Slow network');
    }

    // Check error rate
    final errorRate = _healthMetrics['error_rate'] as double? ?? 0.0;
    if (errorRate > _thresholds['error_rate_critical']) {
      healthScore -= 35;
      issues.add('Critical error rate');
    } else if (errorRate > _thresholds['error_rate_warning']) {
      healthScore -= 15;
      issues.add('High error rate');
    }

    // Determine health status
    if (healthScore >= 80) {
      _currentStatus = HealthStatus.excellent;
    } else if (healthScore >= 60) {
      _currentStatus = HealthStatus.good;
    } else if (healthScore >= 40) {
      _currentStatus = HealthStatus.warning;
    } else {
      _currentStatus = HealthStatus.critical;
    }

    _healthMetrics['health_score'] = healthScore;
    _healthMetrics['health_status'] = _currentStatus.toString();
    _healthMetrics['issues'] = issues;

    _lastHealthCheck = DateTime.now().toIso8601String();
  }

  /// Handle health issues
  Future<void> _handleHealthIssues() async {
    switch (_currentStatus) {
      case HealthStatus.critical:
        await _handleCriticalHealth();
        break;
      case HealthStatus.warning:
        await _handleWarningHealth();
        break;
      case HealthStatus.good:
      case HealthStatus.excellent:
        _consecutiveFailures = 0;
        break;
    }
  }

  /// Handle critical health issues
  Future<void> _handleCriticalHealth() async {
    debugPrint('CRITICAL HEALTH ISSUES DETECTED');

    // Notify analytics
    await _analyticsService.trackEvent('critical_health_issue', parameters: {
      'health_score': _healthMetrics['health_score'].toString(),
      'issues': (_healthMetrics['issues'] as List).join(', '),
    });

    // Attempt recovery
    await _attemptHealthRecovery();

    _consecutiveFailures++;

    // Consider entering safe mode
    if (_consecutiveFailures >= _maxConsecutiveFailures) {
      await _enterSafeMode();
    }
  }

  /// Handle warning health issues
  Future<void> _handleWarningHealth() async {
    debugPrint('HEALTH WARNINGS DETECTED');

    // Notify analytics
    await _analyticsService.trackEvent('health_warning', parameters: {
      'health_score': _healthMetrics['health_score'].toString(),
      'issues': (_healthMetrics['issues'] as List).join(', '),
    });

    // Optimize performance
    await _performanceManager.optimizePerformance();
  }

  /// Attempt health recovery
  Future<void> _attemptHealthRecovery() async {
    try {
      debugPrint('Attempting health recovery...');

      // Clean up memory
      await _performanceManager.performMemoryCleanup();

      // Optimize performance
      await _performanceManager.optimizePerformance();

      // Clear caches if needed
      if ((_healthMetrics['current_memory'] as double? ?? 0.0) > _thresholds['memory_warning']) {
        await _clearAppCaches();
      }

      debugPrint('Health recovery completed');
    } catch (e) {
      debugPrint('Health recovery failed: $e');
    }
  }

  /// Clear app caches
  Future<void> _clearAppCaches() async {
    try {
      // This would integrate with your cache management system
      debugPrint('Clearing app caches...');
    } catch (e) {
      debugPrint('Error clearing caches: $e');
    }
  }

  /// Enter safe mode
  Future<void> _enterSafeMode() async {
    debugPrint('ENTERING SAFE MODE');

    // Notify analytics
    await _analyticsService.trackEvent('app_entered_safe_mode', parameters: {
      'consecutive_failures': _consecutiveFailures.toString(),
    });

    // Implement safe mode behavior
    // - Disable non-essential features
    // - Reduce background processing
    // - Lower quality settings
    // - Increase error tolerance
  }

  /// Check network health
  Future<void> _checkNetworkHealth() async {
    try {
      final connectivity = Connectivity();
      final result = await connectivity.checkConnectivity();

      if (result == ConnectivityResult.none) {
        await _handleNetworkLoss();
      } else {
        await _verifyNetworkConnection();
      }
    } catch (e) {
      debugPrint('Error checking network health: $e');
    }
  }

  /// Handle network loss
  Future<void> _handleNetworkLoss() async {
    debugPrint('Network connectivity lost');

    await _analyticsService.trackEvent('network_connectivity_lost');

    // Enable offline mode
    // Notify user
    // Adjust app behavior
  }

  /// Verify network connection
  Future<void> _verifyNetworkConnection() async {
    final latency = await _measureNetworkLatency();

    if (latency > _thresholds['response_time_critical']) {
      await _handleSlowNetwork();
    }
  }

  /// Handle slow network
  Future<void> _handleSlowNetwork() async {
    debugPrint('Slow network detected');

    await _analyticsService.trackEvent('slow_network_detected', parameters: {
      'latency_ms': latency.toString(),
    });

    // Reduce network requests
    // Increase timeouts
    // Compress data
  }

  /// Handle health check failure
  Future<void> _handleHealthCheckFailure(dynamic error) async {
    debugPrint('Health check failed: $error');

    await _analyticsService.trackError(
      'Health check failed',
      error.toString(),
      fatal: false,
    );

    _consecutiveFailures++;
  }

  /// Log health status
  Future<void> _logHealthStatus() async {
    try {
      final healthRecord = Map<String, dynamic>.from(_healthMetrics);
      _healthHistory.add(healthRecord);

      // Limit history size
      if (_healthHistory.length > _maxHealthHistorySize) {
        _healthHistory.removeAt(0);
      }

      // Log to analytics periodically
      if (_healthHistory.length % 10 == 0) {
        await _analyticsService.trackPerformanceMetric(
          'health_score',
          _healthMetrics['health_score'] as double? ?? 0.0,
          'score',
        );
      }
    } catch (e) {
      debugPrint('Error logging health status: $e');
    }
  }

  /// Get current health status
  HealthStatus getCurrentStatus() => _currentStatus;

  /// Get current health metrics
  Map<String, dynamic> getCurrentMetrics() => Map<String, dynamic>.from(_healthMetrics);

  /// Get health history
  List<Map<String, dynamic>> getHealthHistory() => List<Map<String, dynamic>>.from(_healthHistory);

  /// Get health report
  Future<Map<String, dynamic>> getHealthReport() async {
    return {
      'current_status': _currentStatus.toString(),
      'health_score': _healthMetrics['health_score'],
      'last_check': _lastHealthCheck,
      'consecutive_failures': _consecutiveFailures,
      'thresholds': _thresholds,
      'current_metrics': _healthMetrics,
      'recent_history': _healthHistory.take(10).toList(),
      'recommendations': await _generateHealthRecommendations(),
    };
  }

  /// Generate health recommendations
  Future<List<String>> _generateHealthRecommendations() async {
    final recommendations = <String>[];
    final issues = _healthMetrics['issues'] as List? ?? [];

    for (final issue in issues) {
      switch (issue) {
        case 'High memory usage':
        case 'Critical memory usage':
          recommendations.add('Close unused apps and restart to free memory');
          recommendations.add('Reduce the number of active growing rooms');
          break;
        case 'High CPU usage':
        case 'Critical CPU usage':
          recommendations.add('Reduce app background activity');
          recommendations.add('Check for and close processes consuming CPU');
          break;
        case 'Low battery level':
        case 'Critical battery level':
          recommendations.add('Connect device to charger');
          recommendations.add('Reduce background sync frequency');
          break;
        case 'Slow network':
        case 'Very slow network':
        case 'No network connectivity':
          recommendations.add('Check internet connection');
          recommendations.add('Move to area with better signal');
          break;
        case 'High error rate':
        case 'Critical error rate':
          recommendations.add('Check app permissions');
          recommendations.add('Restart the application');
          break;
      }
    }

    return recommendations;
  }

  /// Dispose health monitor
  void dispose() {
    _healthCheckTimer?.cancel();
    _networkCheckTimer?.cancel();
    _healthMetrics.clear();
    _healthHistory.clear();
    _isInitialized = false;
  }
}

/// Health status enumeration
enum HealthStatus {
  excellent,
  good,
  warning,
  critical,
}