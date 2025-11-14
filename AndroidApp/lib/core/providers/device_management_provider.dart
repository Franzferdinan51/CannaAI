import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/sensor_device.dart';

// Device management provider
final deviceManagementProvider = StateNotifierProvider<DeviceManagementNotifier, DeviceManagementState>((ref) {
  return DeviceManagementNotifier(ref);
});

class DeviceManagementNotifier extends StateNotifier<DeviceManagementState> {
  DeviceManagementNotifier() : super(const DeviceManagementState());

  void updateDevice(SensorDevice device) {
    final updatedDevices = state.devices.map((d) => d.id == device.id ? device : d).toList();
    state = state.copyWith(devices: updatedDevices);
  }

  SensorDevice? getDeviceById(String deviceId) {
    try {
      return state.devices.firstWhere((device) => device.id == deviceId);
    } catch (e) {
      return null;
    }
  }

  List<SensorDevice> getDevicesForRoom(String roomId) {
    return state.devices.where((device) => device.roomId == roomId).toList();
  }

  List<SensorDevice> get activeDevices =>
      state.devices.where((device) => device.isActive).toList();
}

class DeviceManagementState {
  final List<SensorDevice> devices;

  const DeviceManagementState({
    this.devices = const [],
  });

  DeviceManagementState copyWith({
    List<SensorDevice>? devices,
  }) {
    return DeviceManagementState(
      devices: devices ?? this.devices,
    );
  }
}