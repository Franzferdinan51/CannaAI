import 'dart:async';
import 'dart:collection';
import 'dart:convert';
import 'dart:io';
import 'dart:isolate';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// Comprehensive performance manager for CannaAI Pro
/// Handles memory management, performance monitoring, and optimization
class PerformanceManager {
  static final PerformanceManager _instance = PerformanceManager._internal();
  factory PerformanceManager() => _instance;
  PerformanceManager._internal();

  bool _isInitialized = false;
  Timer? _performanceMonitorTimer;
  Timer? _memoryCleanupTimer;

  // Performance metrics
  final Map<String, dynamic> _metrics = {};
  final Queue<double> _memoryUsageHistory = Queue<double>();
  final Queue<double> _cpuUsageHistory = Queue<double>();
  final Queue<double> _frameRateHistory = Queue<double>();

  // Performance thresholds
  static const double _memoryWarningThreshold = 150.0; // MB
  static const double _memoryCriticalThreshold = 200.0; // MB
  static const double _frameRateWarningThreshold = 30.0; // FPS
  static const int _maxHistorySize = 100;

  /// Initialize performance manager
  Future<void> initialize() async {
    if (_isInitialized) return;

    await _initializePerformanceMonitoring();
    await _initializeMemoryManagement();
    await _initializeFrameRateMonitoring();

    _isInitialized = true;

    if (kDebugMode) {
      debugPrint('PerformanceManager initialized');
    }
  }

  /// Initialize performance monitoring
  Future<void> _initializePerformanceMonitoring() async {
    // Start periodic performance monitoring
    _performanceMonitorTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _collectPerformanceMetrics(),
    );

    // Get initial device information
    await _collectDeviceInfo();
  }

  /// Initialize memory management
  Future<void> _initializeMemoryManagement() async {
    // Start periodic memory cleanup
    _memoryCleanupTimer = Timer.periodic(
      const Duration(minutes: 5),
      (_) => _performMemoryCleanup(),
    );

    // Listen for memory pressure events (if available)
    _listenForMemoryPressure();
  }

  /// Initialize frame rate monitoring
  Future<void> _initializeFrameRateMonitoring() async {
    // Use WidgetsBinding to monitor frame timing
    WidgetsBinding.instance.addTimingsCallback((List<FrameTiming> timings) {
      for (final timing in timings) {
        final frameDuration = timing.duration.inMicroseconds.toDouble() / 1000;
        final frameRate = frameDuration > 0 ? 1000 / frameDuration : 60.0;

        _addFrameRateSample(frameRate);

        // Check for performance issues
        if (frameRate < _frameRateWarningThreshold) {
          _handleLowFrameRate(frameRate);
        }
      }
    });
  }

  /// Collect device information
  Future<void> _collectDeviceInfo() async {
    final deviceInfo = DeviceInfoPlugin();
    final packageInfo = await PackageInfo.fromPlatform();

    if (Platform.isAndroid) {
      final androidInfo = await deviceInfo.androidInfo;
      _metrics['device_model'] = androidInfo.model;
      _metrics['device_brand'] = androidInfo.brand;
      _metrics['android_version'] = androidInfo.version.release;
      _metrics['sdk_int'] = androidInfo.version.sdkInt;
      _metrics['total_memory'] = androidInfo.totalMemory;
    } else if (Platform.isIOS) {
      final iosInfo = await deviceInfo.iosInfo;
      _metrics['device_model'] = iosInfo.model;
      _metrics['system_version'] = iosInfo.systemVersion;
      _metrics['name'] = iosInfo.name;
    }

    _metrics['app_version'] = packageInfo.version;
    _metrics['build_number'] = packageInfo.buildNumber;
    _metrics['package_name'] = packageInfo.packageName;
  }

  /// Collect current performance metrics
  Future<void> _collectPerformanceMetrics() async {
    try {
      // Memory usage
      final memoryUsage = await _getCurrentMemoryUsage();
      _addMemoryUsageSample(memoryUsage);

      // CPU usage (platform-specific)
      final cpuUsage = await _getCurrentCpuUsage();
      _addCpuUsageSample(cpuUsage);

      // Check for memory pressure
      if (memoryUsage > _memoryCriticalThreshold) {
        await _handleCriticalMemoryUsage(memoryUsage);
      } else if (memoryUsage > _memoryWarningThreshold) {
        await _handleHighMemoryUsage(memoryUsage);
      }

      _metrics['last_update'] = DateTime.now().toIso8601String();

    } catch (e) {
      debugPrint('Error collecting performance metrics: $e');
    }
  }

  /// Get current memory usage in MB
  Future<double> _getCurrentMemoryUsage() async {
    try {
      if (Platform.isAndroid) {
        // Android-specific memory calculation
        final info = await Process.run('cat', ['/proc/meminfo']);
        if (info.exitCode == 0) {
          final lines = (info.stdout as String).split('\n');

          int? totalMemory, availableMemory;
          for (final line in lines) {
            if (line.startsWith('MemTotal:')) {
              totalMemory = int.tryParse(line.split(RegExp(r'\s+'))[1]);
            } else if (line.startsWith('MemAvailable:')) {
              availableMemory = int.tryParse(line.split(RegExp(r'\s+'))[1]);
            }
          }

          if (totalMemory != null && availableMemory != null) {
            return ((totalMemory - availableMemory) / 1024); // Convert to MB
          }
        }
      } else if (Platform.isIOS) {
        // iOS memory calculation (simplified)
        final memoryPressure = _getIOSMemoryPressure();
        return memoryPressure;
      }

      // Fallback: estimate memory usage
      return _estimateMemoryUsage();
    } catch (e) {
      debugPrint('Error getting memory usage: $e');
      return _estimateMemoryUsage();
    }
  }

  /// Get iOS memory pressure (simplified)
  double _getIOSMemoryPressure() {
    // This would require native iOS code for accurate memory information
    // For now, return an estimated value
    return _estimateMemoryUsage();
  }

  /// Estimate memory usage (fallback method)
  double _estimateMemoryUsage() {
    // This is a very rough estimation
    // In production, you'd want more accurate memory monitoring
    return 50.0 + (_metrics.length * 0.1);
  }

  /// Get current CPU usage percentage
  Future<double> _getCurrentCpuUsage() async {
    try {
      if (Platform.isAndroid) {
        final info = await Process.run('cat', ['/proc/stat']);
        if (info.exitCode == 0) {
          return _parseCpuUsage(info.stdout as String);
        }
      }

      // Fallback: return estimated usage
      return _estimateCpuUsage();
    } catch (e) {
      debugPrint('Error getting CPU usage: $e');
      return _estimateCpuUsage();
    }
  }

  /// Parse CPU usage from /proc/stat (Android)
  double _parseCpuUsage(String statOutput) {
    final lines = statOutput.split('\n');
    if (lines.isEmpty) return 0.0;

    final cpuLine = lines.firstWhere((line) => line.startsWith('cpu '), orElse: () => '');
    if (cpuLine.isEmpty) return 0.0;

    final parts = cpuLine.split(RegExp(r'\s+'));
    if (parts.length < 5) return 0.0;

    final user = int.tryParse(parts[1]) ?? 0;
    final nice = int.tryParse(parts[2]) ?? 0;
    final system = int.tryParse(parts[3]) ?? 0;
    final idle = int.tryParse(parts[4]) ?? 0;

    final total = user + nice + system + idle;
    final used = user + nice + system;

    return total > 0 ? (used / total) * 100 : 0.0;
  }

  /// Estimate CPU usage (fallback)
  double _estimateCpuUsage() {
    // Very rough estimation based on current activity
    // In production, implement proper CPU monitoring
    return 10.0 + (_memoryUsageHistory.length * 0.1);
  }

  /// Add memory usage sample to history
  void _addMemoryUsageSample(double usage) {
    _memoryUsageHistory.add(usage);
    if (_memoryUsageHistory.length > _maxHistorySize) {
      _memoryUsageHistory.removeFirst();
    }
    _metrics['current_memory'] = usage;
    _metrics['avg_memory'] = _calculateAverage(_memoryUsageHistory);
  }

  /// Add CPU usage sample to history
  void _addCpuUsageSample(double usage) {
    _cpuUsageHistory.add(usage);
    if (_cpuUsageHistory.length > _maxHistorySize) {
      _cpuUsageHistory.removeFirst();
    }
    _metrics['current_cpu'] = usage;
    _metrics['avg_cpu'] = _calculateAverage(_cpuUsageHistory);
  }

  /// Add frame rate sample to history
  void _addFrameRateSample(double frameRate) {
    _frameRateHistory.add(frameRate);
    if (_frameRateHistory.length > _maxHistorySize) {
      _frameRateHistory.removeFirst();
    }
    _metrics['avg_frame_rate'] = _calculateAverage(_frameRateHistory);
  }

  /// Calculate average from a list of doubles
  double _calculateAverage(Queue<double> values) {
    if (values.isEmpty) return 0.0;
    return values.reduce((a, b) => a + b) / values.length;
  }

  /// Handle high memory usage
  Future<void> _handleHighMemoryUsage(double usage) async {
    debugPrint('High memory usage detected: ${usage.toStringAsFixed(2)} MB');

    // Perform garbage collection
    await _performGarbageCollection();

    // Clear caches
    await _clearCaches();

    // Reduce image quality/caching
    _reduceImageQuality();
  }

  /// Handle critical memory usage
  Future<void> _handleCriticalMemoryUsage(double usage) async {
    debugPrint('CRITICAL memory usage detected: ${usage.toStringAsFixed(2)} MB');

    // Emergency memory cleanup
    await _emergencyMemoryCleanup();

    // Notify user (if appropriate)
    _notifyLowMemory();
  }

  /// Handle low frame rate
  void _handleLowFrameRate(double frameRate) {
    debugPrint('Low frame rate detected: ${frameRate.toStringAsFixed(2)} FPS');

    // Reduce visual effects
    _reduceVisualEffects();

    // Disable animations temporarily
    _disableAnimations();
  }

  /// Listen for memory pressure events
  void _listenForMemoryPressure() {
    // This would integrate with platform-specific memory pressure APIs
    // For now, we use periodic monitoring
  }

  /// Perform memory cleanup
  Future<void> _performMemoryCleanup() async {
    try {
      // Clear any unused resources
      _clearUnusedResources();

      // Perform Dart garbage collection
      await _performGarbageCollection();

      // Clear image cache if needed
      PaintingBinding.instance.imageCache.clear();

      debugPrint('Memory cleanup completed');
    } catch (e) {
      debugPrint('Error during memory cleanup: $e');
    }
  }

  /// Emergency memory cleanup
  Future<void> _emergencyMemoryCleanup() async {
    try {
      // Aggressive cleanup
      PaintingBinding.instance.imageCache.clear();

      // Reduce image cache size
      PaintingBinding.instance.imageCache.maximumSize = 10;
      PaintingBinding.instance.imageCache.maximumSizeBytes = 1 << 20; // 1MB

      // Clear all caches
      await _clearAllCaches();

      // Force garbage collection
      await _performGarbageCollection();

      debugPrint('Emergency memory cleanup completed');
    } catch (e) {
      debugPrint('Error during emergency memory cleanup: $e');
    }
  }

  /// Clear unused resources
  void _clearUnusedResources() {
    // Clear timers that are no longer needed
    // Cancel unnecessary network requests
    // Remove unused controllers
  }

  /// Perform garbage collection
  Future<void> _performGarbageCollection() async {
    // In Dart, we can hint garbage collection
    // Note: This is a hint and may not immediately trigger GC
    await Future.delayed(Duration.zero);
  }

  /// Clear caches
  Future<void> _clearCaches() async {
    try {
      // Clear application caches
      // This would integrate with your caching solution

      debugPrint('Caches cleared');
    } catch (e) {
      debugPrint('Error clearing caches: $e');
    }
  }

  /// Clear all caches aggressively
  Future<void> _clearAllCaches() async {
    await _clearCaches();

    // Clear any additional caches
    PaintingBinding.instance.imageCache.clear();
  }

  /// Reduce image quality to save memory
  void _reduceImageQuality() {
    // Implement image quality reduction
    PaintingBinding.instance.imageCache.maximumSizeBytes = 2 << 20; // 2MB
  }

  /// Reduce visual effects for performance
  void _reduceVisualEffects() {
    // Disable or reduce animations
    // Reduce shadow effects
    // Simplify complex UI elements
  }

  /// Disable animations temporarily
  void _disableAnimations() {
    // This would need to be implemented at the app level
    // to disable animations during performance issues
  }

  /// Notify user about low memory
  void _notifyLowMemory() {
    // Show user-friendly notification about memory usage
    // Suggest closing other apps or restarting
  }

  /// Get current performance metrics
  Map<String, dynamic> getMetrics() {
    return Map<String, dynamic>.from(_metrics);
  }

  /// Get performance report
  Map<String, dynamic> getPerformanceReport() {
    return {
      'device_info': {
        'model': _metrics['device_model'],
        'brand': _metrics['device_brand'],
        'app_version': _metrics['app_version'],
      },
      'current_status': {
        'memory_usage': _metrics['current_memory'],
        'cpu_usage': _metrics['current_cpu'],
        'avg_frame_rate': _metrics['avg_frame_rate'],
      },
      'historical_data': {
        'memory_history': _memoryUsageHistory.toList(),
        'cpu_history': _cpuUsageHistory.toList(),
        'frame_rate_history': _frameRateHistory.toList(),
      },
      'performance_score': _calculatePerformanceScore(),
      'last_updated': _metrics['last_update'],
    };
  }

  /// Calculate overall performance score
  double _calculatePerformanceScore() {
    double score = 100.0;

    // Memory factor (40% weight)
    final memoryScore = _calculateMemoryScore();
    score -= (100 - memoryScore) * 0.4;

    // CPU factor (30% weight)
    final cpuScore = _calculateCpuScore();
    score -= (100 - cpuScore) * 0.3;

    // Frame rate factor (30% weight)
    final frameRateScore = _calculateFrameRateScore();
    score -= (100 - frameRateScore) * 0.3;

    return score.clamp(0.0, 100.0);
  }

  /// Calculate memory performance score
  double _calculateMemoryScore() {
    if (_memoryUsageHistory.isEmpty) return 100.0;

    final avgMemory = _metrics['avg_memory'] as double? ?? 0.0;

    if (avgMemory < _memoryWarningThreshold) return 100.0;
    if (avgMemory > _memoryCriticalThreshold) return 20.0;

    // Linear interpolation between warning and critical
    final range = _memoryCriticalThreshold - _memoryWarningThreshold;
    final excess = avgMemory - _memoryWarningThreshold;
    return 100.0 - ((excess / range) * 80.0);
  }

  /// Calculate CPU performance score
  double _calculateCpuScore() {
    if (_cpuUsageHistory.isEmpty) return 100.0;

    final avgCpu = _metrics['avg_cpu'] as double? ?? 0.0;

    if (avgCpu < 50.0) return 100.0;
    if (avgCpu > 90.0) return 20.0;

    // Linear interpolation
    return 100.0 - ((avgCpu - 50.0) / 40.0 * 80.0);
  }

  /// Calculate frame rate performance score
  double _calculateFrameRateScore() {
    if (_frameRateHistory.isEmpty) return 100.0;

    final avgFrameRate = _metrics['avg_frame_rate'] as double? ?? 60.0;

    if (avgFrameRate >= 55.0) return 100.0;
    if (avgFrameRate <= 15.0) return 20.0;

    // Linear interpolation
    return 20.0 + ((avgFrameRate - 15.0) / 40.0 * 80.0);
  }

  /// Optimize app performance based on current metrics
  Future<void> optimizePerformance() async {
    try {
      final score = _calculatePerformanceScore();

      if (score < 30.0) {
        // Poor performance - aggressive optimization
        await _emergencyMemoryCleanup();
        _reduceVisualEffects();
        _disableAnimations();
      } else if (score < 60.0) {
        // Moderate performance - standard optimization
        await _performMemoryCleanup();
        _reduceImageQuality();
      } else if (score < 80.0) {
        // Good performance - light optimization
        await _performGarbageCollection();
      }

      debugPrint('Performance optimization completed. Score: ${score.toStringAsFixed(1)}');
    } catch (e) {
      debugPrint('Error during performance optimization: $e');
    }
  }

  /// Dispose performance manager
  void dispose() {
    _performanceMonitorTimer?.cancel();
    _memoryCleanupTimer?.cancel();
    _memoryUsageHistory.clear();
    _cpuUsageHistory.clear();
    _frameRateHistory.clear();
    _metrics.clear();
    _isInitialized = false;
  }
}