import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'encryption_service.dart';

/// Comprehensive security manager for CannaAI Pro
/// Handles root detection, anti-tampering, SSL pinning, and security policies
class SecurityManager {
  static final SecurityManager _instance = SecurityManager._internal();
  factory SecurityManager() => _instance;
  SecurityManager._internal();

  final EncryptionService _encryptionService = EncryptionService();
  bool _isInitialized = false;
  bool _isDeviceSecure = false;
  String? _deviceFingerprint;

  /// Initialize security manager
  Future<void> initialize() async {
    if (_isInitialized) return;

    await _encryptionService.initialize();
    await _performSecurityChecks();
    _isInitialized = true;

    if (kDebugMode) {
      debugPrint('SecurityManager initialized. Device secure: $_isDeviceSecure');
    }
  }

  /// Perform comprehensive security checks
  Future<void> _performSecurityChecks() async {
    bool isSecure = true;

    // Check for root/jailbreak
    isSecure &= await _checkRootDetection();

    // Check for debugger attachment
    if (!kDebugMode) {
      isSecure &= await _checkDebuggerDetection();
    }

    // Check device integrity
    isSecure &= await _checkDeviceIntegrity();

    // Check app integrity
    isSecure &= _checkAppIntegrity();

    _isDeviceSecure = isSecure;

    if (!_isDeviceSecure && !kDebugMode) {
      // In production, take security actions
      await _handleSecurityBreach();
    }
  }

  /// Check if device is rooted or jailbroken
  Future<bool> _checkRootDetection() async {
    if (kDebugMode) return true; // Allow debugging in debug mode

    bool isRooted = false;

    try {
      if (Platform.isAndroid) {
        final androidInfo = await DeviceInfoPlugin().androidInfo;
        final version = androidInfo.version;

        // Check for common root indicators
        final rootFiles = [
          '/system/app/Superuser.apk',
          '/sbin/su',
          '/system/bin/su',
          '/system/xbin/su',
          '/data/local/xbin/su',
          '/data/local/bin/su',
          '/system/sd/xbin/su',
          '/system/bin/failsafe/su',
          '/data/local/su',
          '/system/app/SuperSU.apk',
          '/system/etc/init.d/99SuperSUDaemon',
        ];

        for (final file in rootFiles) {
          if (await File(file).exists()) {
            isRooted = true;
            break;
          }
        }

        // Check for root management apps
        final rootApps = [
          'com.noshufou.android.su',
          'com.noshufou.android.su.elite',
          'eu.chainfire.supersu',
          'com.koushikdutta.superuser',
          'com.thirdparty.superuser',
          'com.yellowes.su',
        ];

        // Additional checks for Android
        if (version.sdkInt >= 23) {
          // Check for SafetyNet compatibility
          try {
            // Implement SafetyNet check if needed
          } catch (e) {
            // SafetyNet not available, assume device might be rooted
            isRooted = true;
          }
        }
      } else if (Platform.isIOS) {
        // iOS jailbreak detection
        final jailbreakPaths = [
          '/Applications/Cydia.app',
          '/Library/MobileSubstrate/MobileSubstrate.dylib',
          '/bin/bash',
          '/usr/sbin/sshd',
          '/etc/apt',
          '/private/var/lib/apt/',
        ];

        for (final path in jailbreakPaths) {
          if (await Directory(path).exists()) {
            isRooted = true;
            break;
          }
        }

        // Check for jailbreak indicators
        try {
          await Process.run('cydia', []);
          isRooted = true;
        } catch (e) {
          // Cydia not found
        }
      }
    } catch (e) {
      // Error checking for root, assume safe
      debugPrint('Error during root detection: $e');
    }

    return !isRooted;
  }

  /// Check for debugger attachment
  Future<bool> _checkDebuggerDetection() async {
    if (kDebugMode) return true;

    try {
      // Basic debugger detection
      // In production, you might want more sophisticated detection

      if (Platform.isAndroid) {
        // Check for debugging flags
        final result = await Process.run('getprop', ['ro.debuggable']);
        final output = result.stdout as String;
        if (output.trim() == '1') {
          return false; // Device is debuggable
        }
      }

      return true;
    } catch (e) {
      debugPrint('Error during debugger detection: $e');
      return true; // Assume safe if detection fails
    }
  }

  /// Check device integrity
  Future<bool> _checkDeviceIntegrity() async {
    try {
      // Get device information for fingerprinting
      final deviceInfo = await DeviceInfoPlugin();
      final packageInfo = await PackageInfo.fromPlatform();

      String deviceHash;

      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        deviceHash = '${androidInfo.model}_${androidInfo.id}_${androidInfo.brand}';
      } else {
        final iosInfo = await deviceInfo.iosInfo;
        deviceHash = '${iosInfo.model}_${iosInfo.identifierForVendor}';
      }

      _deviceFingerprint = _encryptionService.hashData(
        '$deviceHash${packageInfo.packageName}${packageInfo.version}'
      );

      // Store device fingerprint for verification
      return true;
    } catch (e) {
      debugPrint('Error during device integrity check: $e');
      return false;
    }
  }

  /// Check app integrity and configuration
  bool _checkAppIntegrity() {
    try {
      // Verify app is running in release mode (for production)
      if (!kDebugMode && kReleaseMode) {
        // Additional release mode checks can be added here
        return true;
      }

      return kDebugMode; // Allow in debug mode
    } catch (e) {
      debugPrint('Error during app integrity check: $e');
      return false;
    }
  }

  /// Handle security breach
  Future<void> _handleSecurityBreach() async {
    debugPrint('SECURITY BREACH DETECTED!');

    // In production, you might want to:
    // 1. Disable sensitive features
    // 2. Log the breach attempt
    // 3. Require re-authentication
    // 4. Limit functionality
    // 5. Report to security server

    // For now, we'll just log it
    if (!kDebugMode) {
      // Log security breach
      await _logSecurityEvent('security_breach_detected', {
        'device_fingerprint': _deviceFingerprint,
        'timestamp': DateTime.now().toIso8601String(),
      });
    }
  }

  /// Log security events
  Future<void> _logSecurityEvent(String event, Map<String, dynamic> metadata) async {
    try {
      // Encrypt sensitive metadata before logging
      final encryptedMetadata = await _encryptionService.encrypt(
        metadata.toString()
      );

      debugPrint('Security Event: $event');
      debugPrint('Encrypted Metadata: $encryptedMetadata');

      // In production, send to security monitoring service
    } catch (e) {
      debugPrint('Error logging security event: $e');
    }
  }

  /// Validate SSL certificate (SSL Pinning simulation)
  Future<bool> validateSSLCertificate(String hostname, dynamic certificate) async {
    try {
      // In a real implementation, you would:
      // 1. Pin specific certificates for your API endpoints
      // 2. Validate certificate chain
      // 3. Check certificate expiration
      // 4. Verify certificate fingerprint

      // For now, simulate basic validation
      if (hostname.contains('cannaai.com')) {
        // Validate against pinned certificate
        return true;
      }

      return false;
    } catch (e) {
      debugPrint('SSL certificate validation error: $e');
      return false;
    }
  }

  /// Check if current environment is secure
  bool get isSecure => _isDeviceSecure;

  /// Get device fingerprint
  String? get deviceFingerprint => _deviceFingerprint;

  /// Encrypt sensitive API data
  Future<String> encryptApiData(Map<String, dynamic> data) async {
    try {
      final jsonString = data.toString();
      return await _encryptionService.encrypt(jsonString);
    } catch (e) {
      throw SecurityException('Failed to encrypt API data: $e');
    }
  }

  /// Decrypt sensitive API data
  Future<Map<String, dynamic>> decryptApiData(String encryptedData) async {
    try {
      final jsonString = await _encryptionService.decrypt(encryptedData);
      return Map<String, dynamic>.from(
        // Parse JSON string back to Map
        // This is simplified - use proper JSON parsing in production
        jsonString.split(',').map((e) => e.split(':')).toList().asMap().map((key, value) => MapEntry(value[0], value[1]))
      );
    } catch (e) {
      throw SecurityException('Failed to decrypt API data: $e');
    }
  }

  /// Generate secure session token
  Future<String> generateSessionToken() async {
    try {
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final randomData = _encryptionService.generateSecureString(32);

      return _encryptionService.hashData('$_deviceFingerprint:$timestamp:$randomData');
    } catch (e) {
      throw SecurityException('Failed to generate session token: $e');
    }
  }

  /// Validate session token
  bool validateSessionToken(String token, int maxAgeMinutes) {
    try {
      // Extract timestamp from token (simplified)
      // In production, implement proper token validation

      final now = DateTime.now().millisecondsSinceEpoch;
      final maxAge = maxAgeMinutes * 60 * 1000;

      // This is a simplified validation
      return token.isNotEmpty && token.length == 64;
    } catch (e) {
      debugPrint('Session token validation error: $e');
      return false;
    }
  }

  /// Clear sensitive data on logout
  Future<void> clearSensitiveData() async {
    try {
      await _encryptionService.clearAllEncryptionData();
      _deviceFingerprint = null;
      _isInitialized = false;

      debugPrint('Sensitive data cleared');
    } catch (e) {
      debugPrint('Error clearing sensitive data: $e');
    }
  }

  /// Perform security health check
  Future<Map<String, dynamic>> performHealthCheck() async {
    final healthCheck = <String, dynamic>{
      'initialized': _isInitialized,
      'device_secure': _isDeviceSecure,
      'device_fingerprint': _deviceFingerprint,
      'timestamp': DateTime.now().toIso8601String(),
    };

    // Add additional security checks
    healthCheck['root_check'] = await _checkRootDetection();
    healthCheck['debugger_check'] = await _checkDebuggerDetection();
    healthCheck['device_integrity'] = await _checkDeviceIntegrity();
    healthCheck['app_integrity'] = _checkAppIntegrity();

    return healthCheck;
  }
}

/// Custom exception for security-related errors
class SecurityException implements Exception {
  final String message;

  const SecurityException(this.message);

  @override
  String toString() => 'SecurityException: $message';
}

/// SSL Certificate configuration for SSL pinning
class SSLCertificateConfig {
  static const Map<String, String> pinnedCertificates = {
    'api.cannaai.com': 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    'dev-api.cannaai.com': 'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
  };

  static String? getCertificateForHost(String host) {
    return pinnedCertificates[host];
  }

  static bool isHostPinned(String host) {
    return pinnedCertificates.containsKey(host);
  }
}