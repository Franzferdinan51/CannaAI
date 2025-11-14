import 'dart:convert';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:encrypt/encrypt.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// Comprehensive encryption service for CannaAI Pro
/// Handles data encryption, key management, and secure storage
class EncryptionService {
  static final EncryptionService _instance = EncryptionService._internal();
  factory EncryptionService() => _instance;
  EncryptionService._internal();

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainItemAccessibility.first_unlock_this_device,
    ),
  );

  late final Encrypter _encrypter;
  late final IV _iv;
  String? _deviceId;

  /// Initialize encryption service with device-specific key
  Future<void> initialize() async {
    await _getDeviceId();
    await _initializeEncryption();
  }

  /// Get or generate unique device identifier
  Future<void> _getDeviceId() async {
    _deviceId = await _secureStorage.read(key: 'device_id');

    if (_deviceId == null) {
      final packageInfo = await PackageInfo.fromPlatform();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final randomBytes = sha256.convert(utf8.encode('${packageInfo.packageName}_$timestamp'));

      _deviceId = randomBytes.toString().substring(0, 32);
      await _secureStorage.write(key: 'device_id', value: _deviceId!);
    }
  }

  /// Initialize encryption key and IV
  Future<void> _initializeEncryption() async {
    // Generate or retrieve encryption key
    String? encryptionKey = await _secureStorage.read(key: 'encryption_key');

    if (encryptionKey == null) {
      final key = Key.fromSecureRandom(32);
      encryptionKey = key.base64;
      await _secureStorage.write(key: 'encryption_key', value: encryptionKey);
    }

    final key = Key.fromBase64(encryptionKey);
    _encrypter = Encrypter(AES(key, mode: AESMode.cbc));

    // Generate or retrieve IV
    String? ivString = await _secureStorage.read(key: 'encryption_iv');
    if (ivString == null) {
      _iv = IV.fromSecureRandom(16);
      await _secureStorage.write(key: 'encryption_iv', value: _iv.base64);
    } else {
      _iv = IV.fromBase64(ivString);
    }
  }

  /// Encrypt sensitive data
  Future<String> encrypt(String plainText) async {
    try {
      final encrypted = _encrypter.encrypt(plainText, iv: _iv);
      return encrypted.base64;
    } catch (e) {
      throw EncryptionException('Failed to encrypt data: $e');
    }
  }

  /// Decrypt sensitive data
  Future<String> decrypt(String encryptedText) async {
    try {
      final encrypted = Encrypted.fromBase64(encryptedText);
      final decrypted = _encrypter.decrypt(encrypted, iv: _iv);
      return decrypted;
    } catch (e) {
      throw EncryptionException('Failed to decrypt data: $e');
    }
  }

  /// Encrypt sensor data before storing
  Future<Map<String, dynamic>> encryptSensorData(Map<String, dynamic> sensorData) async {
    final encryptedData = <String, dynamic>{};

    for (final entry in sensorData.entries) {
      if (_isSensitiveField(entry.key)) {
        encryptedData[entry.key] = await encrypt(entry.value.toString());
      } else {
        encryptedData[entry.key] = entry.value;
      }
    }

    encryptedData['encrypted'] = true;
    encryptedData['encryption_version'] = '1.0';

    return encryptedData;
  }

  /// Decrypt sensor data after retrieval
  Future<Map<String, dynamic>> decryptSensorData(Map<String, dynamic> encryptedData) async {
    if (!encryptedData.containsKey('encrypted') || !encryptedData['encrypted']) {
      return encryptedData;
    }

    final decryptedData = <String, dynamic>{};

    for (final entry in encryptedData.entries) {
      if (_isSensitiveField(entry.key) && entry.value is String) {
        try {
          decryptedData[entry.key] = await decrypt(entry.value as String);
        } catch (e) {
          // Handle decryption error
          decryptedData[entry.key] = entry.value;
        }
      } else {
        decryptedData[entry.key] = entry.value;
      }
    }

    return decryptedData;
  }

  /// Check if field contains sensitive information
  bool _isSensitiveField(String fieldName) {
    final sensitiveFields = [
      'api_key',
      'password',
      'token',
      'secret',
      'user_id',
      'email',
      'phone',
      'location',
      'address',
      'coordinates'
    ];

    return sensitiveFields.any((sensitive) =>
      fieldName.toLowerCase().contains(sensitive));
  }

  /// Hash sensitive data for comparison
  String hashData(String data) {
    final bytes = utf8.encode(data + (_deviceId ?? ''));
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  /// Verify data integrity
  bool verifyDataIntegrity(String data, String expectedHash) {
    return hashData(data) == expectedHash;
  }

  /// Generate secure random string
  String generateSecureString(int length) {
    final random = SecureRandom(AES(Key.fromSecureRandom(32)).bytes);
    return random.nextString(length);
  }

  /// Securely store sensitive data
  Future<void> storeSecureData(String key, String value) async {
    try {
      final encryptedValue = await encrypt(value);
      final dataHash = hashData(value);

      await _secureStorage.write(key: '${key}_encrypted', value: encryptedValue);
      await _secureStorage.write(key: '${key}_hash', value: dataHash);
    } catch (e) {
      throw EncryptionException('Failed to store secure data: $e');
    }
  }

  /// Retrieve and verify secure data
  Future<String?> retrieveSecureData(String key) async {
    try {
      final encryptedValue = await _secureStorage.read(key: '${key}_encrypted');
      final expectedHash = await _secureStorage.read(key: '${key}_hash');

      if (encryptedValue == null || expectedHash == null) {
        return null;
      }

      final decryptedValue = await decrypt(encryptedValue);

      // Verify integrity
      if (verifyDataIntegrity(decryptedValue, expectedHash)) {
        return decryptedValue;
      } else {
        throw EncryptionException('Data integrity verification failed');
      }
    } catch (e) {
      throw EncryptionException('Failed to retrieve secure data: $e');
    }
  }

  /// Delete secure data
  Future<void> deleteSecureData(String key) async {
    await _secureStorage.delete(key: '${key}_encrypted');
    await _secureStorage.delete(key: '${key}_hash');
  }

  /// Rotate encryption key
  Future<void> rotateEncryptionKey() async {
    // Generate new encryption key
    final newKey = Key.fromSecureRandom(32);
    final newEncryptionKey = newKey.base64;

    // Store new key temporarily
    await _secureStorage.write(key: 'new_encryption_key', value: newEncryptionKey);

    // Re-encrypt all sensitive data with new key (implementation needed)
    // This would involve reading all encrypted data, decrypting with old key,
    // and encrypting with new key

    // Replace old key with new key
    await _secureStorage.write(key: 'encryption_key', value: newEncryptionKey);
    await _secureStorage.delete(key: 'new_encryption_key');

    // Re-initialize encryption with new key
    await _initializeEncryption();
  }

  /// Clear all encryption data (for logout/reset)
  Future<void> clearAllEncryptionData() async {
    await _secureStorage.deleteAll();
    await _initializeEncryption();
  }

  /// Get device fingerprint for additional security
  Future<String> getDeviceFingerprint() async {
    final packageInfo = await PackageInfo.fromPlatform();
    final components = [
      packageInfo.packageName,
      packageInfo.version,
      _deviceId ?? '',
      DateTime.now().toIso8601String().substring(0, 10), // Date only
    ];

    return hashData(components.join('|'));
  }
}

/// Custom exception for encryption errors
class EncryptionException implements Exception {
  final String message;

  const EncryptionException(this.message);

  @override
  String toString() => 'EncryptionException: $message';
}

/// Utility class for secure random operations
class SecureRandom {
  final List<int> _bytes;
  int _position = 0;

  SecureRandom(this._bytes);

  /// Generate next random string
  String nextString(int length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    final random = List<int>.filled(length, 0);

    for (int i = 0; i < length; i++) {
      if (_position >= _bytes.length) {
        _position = 0;
      }
      random[i] = _bytes[_position] % chars.length;
      _position++;
    }

    return String.fromCharCodes(random.map((i) => chars.codeUnitAt(i)));
  }

  /// Generate next random number
  int nextInt(int max) {
    if (_position >= _bytes.length) {
      _position = 0;
    }
    final value = _bytes[_position] % max;
    _position++;
    return value;
  }
}