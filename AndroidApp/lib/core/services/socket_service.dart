import 'dart:async';
import 'dart:convert';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';

import '../constants/app_constants.dart';

// Socket service provider
final socketServiceProvider = Provider<SocketService>((ref) {
  return SocketService();
});

class SocketService {
  IO.Socket? _socket;
  final Logger _logger = Logger();
  bool _isConnected = false;
  final StreamController<Map<String, dynamic>> _sensorDataStreamController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _notificationStreamController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _automationStreamController =
      StreamController<Map<String, dynamic>>.broadcast();

  // Stream getters
  Stream<Map<String, dynamic>> get sensorDataStream =>
      _sensorDataStreamController.stream;
  Stream<Map<String, dynamic>> get notificationStream =>
      _notificationStreamController.stream;
  Stream<Map<String, dynamic>> get automationStream =>
      _automationStreamController.stream;

  bool get isConnected => _isConnected;

  Future<void> connect({String? url}) async {
    try {
      final socketUrl = url ?? AppConstants.socketUrl;

      if (_socket != null && _isConnected) {
        _logger.i('Socket already connected');
        return;
      }

      _logger.i('Connecting to socket server at: $socketUrl');

      _socket = IO.io(
        socketUrl,
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .setPath(AppConstants.socketPath)
            .disableAutoConnect()
            .build(),
      );

      _setupEventListeners();
      _socket!.connect();

    } catch (e) {
      _logger.e('Failed to connect to socket server: $e');
      rethrow;
    }
  }

  void _setupEventListeners() {
    if (_socket == null) return;

    // Connection events
    _socket!.onConnect((_) {
      _isConnected = true;
      _logger.i('Socket connected successfully');
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
      _logger.i('Socket disconnected');
    });

    _socket!.onConnectError((error) {
      _isConnected = false;
      _logger.e('Socket connection error: $error');
    });

    _socket!.onError((error) {
      _logger.e('Socket error: $error');
    });

    // Custom events
    _socket!.on('sensor_data', (data) {
      _logger.d('Received sensor data: $data');
      if (data is Map) {
        _sensorDataStreamController.add(Map<String, dynamic>.from(data));
      }
    });

    _socket!.on('sensor_alert', (data) {
      _logger.d('Received sensor alert: $data');
      if (data is Map) {
        _notificationStreamController.add({
          'type': 'sensor_alert',
          'data': Map<String, dynamic>.from(data),
        });
      }
    });

    _socket!.on('automation_event', (data) {
      _logger.d('Received automation event: $data');
      if (data is Map) {
        _automationStreamController.add(Map<String, dynamic>.from(data));
      }
    });

    _socket!.on('analysis_complete', (data) {
      _logger.d('Received analysis complete: $data');
      if (data is Map) {
        _notificationStreamController.add({
          'type': 'analysis_complete',
          'data': Map<String, dynamic>.from(data),
        });
      }
    });

    _socket!.on('system_notification', (data) {
      _logger.d('Received system notification: $data');
      if (data is Map) {
        _notificationStreamController.add({
          'type': 'system_notification',
          'data': Map<String, dynamic>.from(data),
        });
      }
    });

    _socket!.on('room_status', (data) {
      _logger.d('Received room status: $data');
      if (data is Map) {
        _sensorDataStreamController.add({
          'type': 'room_status',
          'data': Map<String, dynamic>.from(data),
        });
      }
    });
  }

  void disconnect() {
    if (_socket != null) {
      _socket!.disconnect();
      _socket = null;
      _isConnected = false;
      _logger.i('Socket disconnected');
    }
  }

  // Emit events
  void emit(String event, dynamic data) {
    if (_socket != null && _isConnected) {
      _socket!.emit(event, data);
      _logger.d('Emitted event: $event with data: $data');
    } else {
      _logger.w('Cannot emit event: Socket not connected');
    }
  }

  // Join room
  void joinRoom(String roomId) {
    emit('join_room', {'room_id': roomId});
  }

  // Leave room
  void leaveRoom(String roomId) {
    emit('leave_room', {'room_id': roomId});
  }

  // Subscribe to sensor data
  void subscribeToSensorData(String deviceId) {
    emit('subscribe_sensor', {'device_id': deviceId});
  }

  // Unsubscribe from sensor data
  void unsubscribeFromSensorData(String deviceId) {
    emit('unsubscribe_sensor', {'device_id': deviceId});
  }

  // Request room status
  void requestRoomStatus(String roomId) {
    emit('get_room_status', {'room_id': roomId});
  }

  // Send automation command
  void sendAutomationCommand({
    required String deviceId,
    required String action,
    Map<String, dynamic>? parameters,
  }) {
    emit('automation_command', {
      'device_id': deviceId,
      'action': action,
      'parameters': parameters ?? {},
    });
  }

  // Request sensor history
  void requestSensorHistory({
    required String deviceId,
    required DateTime startDate,
    required DateTime endDate,
  }) {
    emit('get_sensor_history', {
      'device_id': deviceId,
      'start_date': startDate.toIso8601String(),
      'end_date': endDate.toIso8601String(),
    });
  }

  // Send sensor data (for testing/manual input)
  void sendSensorData({
    required String roomId,
    required Map<String, dynamic> sensorData,
  }) {
    emit('sensor_data_update', {
      'room_id': roomId,
      'data': sensorData,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  // Acknowledge notification
  void acknowledgeNotification(String notificationId) {
    emit('acknowledge_notification', {
      'notification_id': notificationId,
    });
  }

  // Request system status
  void requestSystemStatus() {
    emit('get_system_status', {});
  }

  // Register device
  void registerDevice({
    required String deviceId,
    required String deviceType,
    Map<String, dynamic>? deviceInfo,
  }) {
    emit('register_device', {
      'device_id': deviceId,
      'device_type': deviceType,
      'device_info': deviceInfo ?? {},
    });
  }

  // Unregister device
  void unregisterDevice(String deviceId) {
    emit('unregister_device', {
      'device_id': deviceId,
    });
  }

  // Update device settings
  void updateDeviceSettings({
    required String deviceId,
    required Map<String, dynamic> settings,
  }) {
    emit('update_device_settings', {
      'device_id': deviceId,
      'settings': settings,
    });
  }

  // Send heartbeat
  void sendHeartbeat() {
    emit('heartbeat', {
      'timestamp': DateTime.now().toIso8601String(),
      'device_type': 'mobile_app',
    });
  }

  // Start heartbeat interval
  Timer? _heartbeatTimer;
  void startHeartbeat({Duration interval = const Duration(seconds: 30)}) {
    stopHeartbeat();
    _heartbeatTimer = Timer.periodic(interval, (_) {
      sendHeartbeat();
    });
  }

  // Stop heartbeat interval
  void stopHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
  }

  // Cleanup resources
  void dispose() {
    stopHeartbeat();
    disconnect();

    _sensorDataStreamController.close();
    _notificationStreamController.close();
    _automationStreamController.close();

    _logger.i('Socket service disposed');
  }

  // Check connection status
  Future<bool> checkConnection() async {
    if (_socket == null || !_isConnected) {
      return false;
    }

    try {
      // Send a ping and wait for response
      final completer = Completer<bool>();

      _socket!.once('pong', (_) {
        completer.complete(true);
      });

      emit('ping', {});

      // Wait for response with timeout
      final result = await completer.future.timeout(
        const Duration(seconds: 5),
        onTimeout: () => false,
      );

      return result;
    } catch (e) {
      _logger.e('Connection check failed: $e');
      return false;
    }
  }

  // Get connection info
  Map<String, dynamic> getConnectionInfo() {
    return {
      'connected': _isConnected,
      'socket_id': _socket?.id,
      'url': AppConstants.socketUrl,
      'path': AppConstants.socketPath,
    };
  }
}