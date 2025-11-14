import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:canna_ai/core/security/security_manager.dart';

/// Comprehensive analytics service for CannaAI Pro
/// Handles user analytics, performance metrics, and crash reporting
class AnalyticsService {
  static final AnalyticsService _instance = AnalyticsService._internal();
  factory AnalyticsService() => _instance;
  AnalyticsService._internal();

  FirebaseAnalytics? _analytics;
  SecurityManager? _securityManager;
  bool _isInitialized = false;
  bool _enableAnalytics = true;
  bool _enableCrashReporting = true;

  /// Initialize analytics service
  Future<void> initialize({bool enableAnalytics = true, bool enableCrashReporting = true}) async {
    if (_isInitialized) return;

    _enableAnalytics = enableAnalytics;
    _enableCrashReporting = enableCrashReporting;

    try {
      _analytics = FirebaseAnalytics.instance;

      // Configure crash reporting
      if (_enableCrashReporting) {
        await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(true);

        // Set user identifier (if available and permitted)
        await _setUserIdentifier();
      }

      // Configure analytics
      if (_enableAnalytics) {
        await _analytics!.setAnalyticsCollectionEnabled(true);
        await _setUserProperties();
      }

      // Initialize security manager for secure event tracking
      _securityManager = SecurityManager();
      await _securityManager!.initialize();

      _isInitialized = true;

      if (kDebugMode) {
        debugPrint('AnalyticsService initialized');
        debugPrint('Analytics enabled: $_enableAnalytics');
        debugPrint('Crash reporting enabled: $_enableCrashReporting');
      }
    } catch (e) {
      debugPrint('Error initializing analytics: $e');
    }
  }

  /// Set user identifier for crash reporting
  Future<void> _setUserIdentifier() async {
    try {
      // Generate anonymous user identifier for crash reporting
      final deviceFingerprint = await _securityManager?.getDeviceFingerprint();
      if (deviceFingerprint != null) {
        await FirebaseCrashlytics.instance.setUserIdentifier(deviceFingerprint);
      }
    } catch (e) {
      debugPrint('Error setting user identifier: $e');
    }
  }

  /// Set user properties for analytics
  Future<void> _setUserProperties() async {
    try {
      final deviceInfo = DeviceInfoPlugin();
      final packageInfo = await PackageInfo.fromPlatform();

      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        await _analytics!.setUserProperty({
          'device_brand': androidInfo.brand,
          'device_model': androidInfo.model,
          'android_version': androidInfo.version.release,
          'app_version': packageInfo.version,
        });
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        await _analytics!.setUserProperty({
          'device_model': iosInfo.model,
          'ios_version': iosInfo.systemVersion,
          'app_version': packageInfo.version,
        });
      }
    } catch (e) {
      debugPrint('Error setting user properties: $e');
    }
  }

  /// Track screen view
  Future<void> trackScreenView(String screenName, {Map<String, String>? parameters}) async {
    if (!_enableAnalytics || !_isInitialized) return;

    try {
      await _analytics!.logScreenView(
        screenName: screenName,
        screenClassOverride: screenName,
        parameters: parameters,
      );
    } catch (e) {
      debugPrint('Error tracking screen view: $e');
    }
  }

  /// Track user event
  Future<void> trackEvent(String eventName, {Map<String, Object>? parameters}) async {
    if (!_enableAnalytics || !_isInitialized) return;

    try {
      // Sanitize parameters to remove sensitive information
      final sanitizedParams = await _sanitizeParameters(parameters);

      await _analytics!.logEvent(
        name: eventName,
        parameters: sanitizedParams,
      );
    } catch (e) {
      debugPrint('Error tracking event: $e');
    }
  }

  /// Track sensor data event
  Future<void> trackSensorData(String roomId, Map<String, dynamic> sensorData) async {
    if (!_enableAnalytics || !_isInitialized) return;

    try {
      // Create anonymized sensor data for analytics
      final analyticsData = {
        'room_id': _hashString(roomId),
        'temperature_range': _getTemperatureRange(sensorData['temperature']),
        'humidity_range': _getHumidityRange(sensorData['humidity']),
        'ph_status': _getPhStatus(sensorData['ph']),
        'data_quality': _assessDataQuality(sensorData),
      };

      await trackEvent('sensor_data_received', parameters: analyticsData);
    } catch (e) {
      debugPrint('Error tracking sensor data: $e');
    }
  }

  /// Track plant analysis event
  Future<void> trackPlantAnalysis(String strain, String confidence, List<String> issues) async {
    if (!_enableAnalytics || !_isInitialized) return;

    try {
      await trackEvent('plant_analysis_completed', parameters: {
        'strain_hash': _hashString(strain),
        'confidence_range': _getConfidenceRange(confidence),
        'issue_count': issues.length,
        'has_critical_issues': issues.any((issue) => _isCriticalIssue(issue)),
      });
    } catch (e) {
      debugPrint('Error tracking plant analysis: $e');
    }
  }

  /// Track automation event
  Future<void> trackAutomationEvent(String action, String roomId, bool success) async {
    if (!_enableAnalytics || !_isInitialized) return;

    try {
      await trackEvent('automation_executed', parameters: {
        'action': action,
        'room_id': _hashString(roomId),
        'success': success,
      });
    } catch (e) {
      debugPrint('Error tracking automation event: $e');
    }
  }

  /// Track performance metrics
  Future<void> trackPerformanceMetric(String metricName, double value, String unit) async {
    if (!_enableAnalytics || !_isInitialized) return;

    try {
      await trackEvent('performance_metric', parameters: {
        'metric_name': metricName,
        'value': value.round().toString(),
        'unit': unit,
      });
    } catch (e) {
      debugPrint('Error tracking performance metric: $e');
    }
  }

  /// Track app startup time
  Future<void> trackAppStartup(int startupTimeMs) async {
    if (!_enableAnalytics || !_isInitialized) return;

    try {
      await trackEvent('app_startup', parameters: {
        'startup_time_ms': startupTimeMs.toString(),
        'startup_category': _getStartupCategory(startupTimeMs),
      });
    } catch (e) {
      debugPrint('Error tracking app startup: $e');
    }
  }

  /// Track user engagement metrics
  Future<void> trackEngagement(String feature, String duration) async {
    if (!_enableAnalytics || !_isInitialized) return;

    try {
      await trackEvent('user_engagement', parameters: {
        'feature': feature,
        'duration_category': _getDurationCategory(duration),
      });
    } catch (e) {
      debugPrint('Error tracking user engagement: $e');
    }
  }

  /// Track error event
  Future<void> trackError(String error, String? stackTrace, {bool fatal = false}) async {
    if (!_enableAnalytics || !_isInitialized) return;

    try {
      await trackEvent('app_error', parameters: {
        'error_type': _getErrorType(error),
        'error_hash': _hashString(error),
        'fatal': fatal,
      });
    } catch (e) {
      debugPrint('Error tracking error: $e');
    }

    // Also report to Crashlytics if fatal
    if (_enableCrashReporting && fatal) {
      await FirebaseCrashlytics.instance.recordError(
        error,
        stackTrace,
        fatal: true,
        information: [
          DiagnosticsProperty('platform', Platform.operatingSystem),
          DiagnosticsProperty('error_type', _getErrorType(error)),
        ],
      );
    }
  }

  /// Track network request
  Future<void> trackNetworkRequest(String endpoint, int statusCode, int duration) async {
    if (!_enableAnalytics || !_isInitialized) return;

    try {
      await trackEvent('network_request', parameters: {
        'endpoint_hash': _hashString(endpoint),
        'status_code_category': _getStatusCodeCategory(statusCode),
        'duration_category': _getNetworkDurationCategory(duration),
      });
    } catch (e) {
      debugPrint('Error tracking network request: $e');
    }
  }

  /// Set user ID for analytics
  Future<void> setUserId(String userId) async {
    if (!_enableAnalytics || !_isInitialized) return;

    try {
      await _analytics!.setUserId(_hashString(userId));
    } catch (e) {
      debugPrint('Error setting user ID: $e');
    }
  }

  /// Log custom exception to Crashlytics
  Future<void> logException(Exception exception, StackTrace? stackTrace, {Map<String, String>? context}) async {
    if (!_enableCrashReporting) return;

    try {
      await FirebaseCrashlytics.instance.recordError(
        exception,
        stackTrace,
        information: context?.entries.map((e) => DiagnosticsProperty(e.key, e.value)).toList(),
      );
    } catch (e) {
      debugPrint('Error logging exception: $e');
    }
  }

  /// Log custom message to Crashlytics
  Future<void> logMessage(String message, {Map<String, String>? context}) async {
    if (!_enableCrashReporting) return;

    try {
      await FirebaseCrashlytics.instance.log('$message${context != null ? ' | ${context.toString()}' : ''}');
    } catch (e) {
      debugPrint('Error logging message: $e');
    }
  }

  /// Set custom key/value in Crashlytics
  Future<void> setCustomKey(String key, String value) async {
    if (!_enableCrashReporting) return;

    try {
      await FirebaseCrashlytics.instance.setCustomKey(key, value);
    } catch (e) {
      debugPrint('Error setting custom key: $e');
    }
  }

  /// Generate analytics report
  Future<Map<String, dynamic>> generateAnalyticsReport() async {
    try {
      return {
        'analytics_enabled': _enableAnalytics,
        'crash_reporting_enabled': _enableCrashReporting,
        'initialization_status': _isInitialized,
        'platform': Platform.operatingSystem,
        'last_event_time': DateTime.now().toIso8601String(),
        'session_analytics': await _getSessionAnalytics(),
      };
    } catch (e) {
      debugPrint('Error generating analytics report: $e');
      return {};
    }
  }

  /// Sanitize parameters to remove sensitive information
  Future<Map<String, Object>> _sanitizeParameters(Map<String, Object>? parameters) async {
    if (parameters == null) return {};

    final sanitized = <String, Object>{};

    for (final entry in parameters.entries) {
      if (_isSafeField(entry.key)) {
        sanitized[entry.key] = await _sanitizeValue(entry.value);
      }
    }

    return sanitized;
  }

  /// Check if field is safe for analytics
  bool _isSafeField(String fieldName) {
    final sensitiveFields = [
      'email', 'password', 'token', 'secret', 'key', 'id',
      'user_id', 'phone', 'address', 'location', 'coordinates',
      'name', 'full_name', 'first_name', 'last_name'
    ];

    return !sensitiveFields.any((sensitive) =>
      fieldName.toLowerCase().contains(sensitive));
  }

  /// Sanitize individual value
  Future<Object> _sanitizeValue(Object value) async {
    if (value is String) {
      // Hash sensitive strings
      if (_containsSensitiveData(value)) {
        return _hashString(value);
      }
      return value;
    } else if (value is Map) {
      final sanitizedMap = <String, Object>{};
      for (final entry in value.entries) {
        if (_isSafeField(entry.key.toString())) {
          sanitizedMap[entry.key.toString()] = await _sanitizeValue(entry.value);
        }
      }
      return sanitizedMap;
    } else if (value is List) {
      return value.map((item) => _sanitizeValue(item)).toList();
    }

    return value;
  }

  /// Check if string contains sensitive data
  bool _containsSensitiveData(String value) {
    final sensitivePatterns = [
      RegExp(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b'), // Credit card
      RegExp(r'\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b'), // SSN
      RegExp(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'), // Email
    ];

    return sensitivePatterns.any((pattern) => pattern.hasMatch(value));
  }

  /// Hash string for privacy
  String _hashString(String input) {
    return _securityManager?.hashData(input) ??
           input.hashCode.toString();
  }

  // Helper methods for categorizing data

  String _getTemperatureRange(dynamic temperature) {
    final temp = double.tryParse(temperature.toString()) ?? 0.0;
    if (temp < 15) return 'low';
    if (temp < 25) return 'normal';
    if (temp < 35) return 'high';
    return 'extreme';
  }

  String _getHumidityRange(dynamic humidity) {
    final hum = double.tryParse(humidity.toString()) ?? 0.0;
    if (hum < 30) return 'low';
    if (hum < 70) return 'normal';
    return 'high';
  }

  String _getPhStatus(dynamic ph) {
    final phValue = double.tryParse(ph.toString()) ?? 0.0;
    if (phValue < 5.5 || phValue > 7.5) return 'out_of_range';
    if (phValue < 6.0 || phValue > 7.0) return 'borderline';
    return 'optimal';
  }

  String _assessDataQuality(Map<String, dynamic> sensorData) {
    int validReadings = 0;
    int totalReadings = 0;

    final keys = ['temperature', 'humidity', 'ph', 'ec', 'co2'];
    for (final key in keys) {
      totalReadings++;
      if (sensorData.containsKey(key)) {
        final value = double.tryParse(sensorData[key].toString());
        if (value != null && value > 0) {
          validReadings++;
        }
      }
    }

    final quality = validReadings / totalReadings;
    if (quality >= 0.8) return 'excellent';
    if (quality >= 0.6) return 'good';
    if (quality >= 0.4) return 'fair';
    return 'poor';
  }

  String _getConfidenceRange(String confidence) {
    final conf = double.tryParse(confidence) ?? 0.0;
    if (conf >= 0.9) return 'very_high';
    if (conf >= 0.7) return 'high';
    if (conf >= 0.5) return 'medium';
    return 'low';
  }

  bool _isCriticalIssue(String issue) {
    final criticalKeywords = ['root rot', 'mold', 'pest', 'disease', 'infestation'];
    return criticalKeywords.any((keyword) =>
      issue.toLowerCase().contains(keyword));
  }

  String _getStartupCategory(int startupTime) {
    if (startupTime < 1000) return 'fast';
    if (startupTime < 3000) return 'normal';
    if (startupTime < 5000) return 'slow';
    return 'very_slow';
  }

  String _getDurationCategory(String duration) {
    // Parse duration string (e.g., "00:05:30" -> "medium")
    final parts = duration.split(':');
    if (parts.length >= 2) {
      final minutes = int.tryParse(parts[0]) ?? 0;
      if (minutes < 1) return 'short';
      if (minutes < 5) return 'medium';
      return 'long';
    }
    return 'unknown';
  }

  String _getErrorType(String error) {
    if (error.contains('Network')) return 'network';
    if (error.contains('JSON') || error.contains('Parse')) return 'parse';
    if (error.contains('Permission')) return 'permission';
    if (error.contains('State')) return 'state';
    return 'unknown';
  }

  String _getStatusCodeCategory(int statusCode) {
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 300 && statusCode < 400) return 'redirect';
    if (statusCode >= 400 && statusCode < 500) return 'client_error';
    if (statusCode >= 500) return 'server_error';
    return 'unknown';
  }

  String _getNetworkDurationCategory(int duration) {
    if (duration < 500) return 'fast';
    if (duration < 2000) return 'normal';
    if (duration < 5000) return 'slow';
    return 'very_slow';
  }

  Future<Map<String, dynamic>> _getSessionAnalytics() async {
    // Return session-specific analytics data
    return {
      'session_start': DateTime.now().subtract(Duration(minutes: 30)).toIso8601String(),
      'platform': Platform.operatingSystem,
      'version': (await PackageInfo.fromPlatform()).version,
    };
  }

  /// Dispose analytics service
  void dispose() {
    _analytics = null;
    _securityManager = null;
    _isInitialized = false;
  }
}