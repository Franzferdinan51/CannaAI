import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:async';
import '../../../../core/providers/enhanced_sensor_provider.dart';
import '../../../../core/providers/automation_control_provider.dart';
import '../../../../core/providers/device_management_provider.dart';
import '../../../../core/services/ai_optimization_service.dart';
import '../../../../core/services/hardware_integration_service.dart';
import '../../../../core/models/sensor_data.dart';
import '../../../../core/models/room_config.dart';
import '../../../../core/models/sensor_device.dart';
import '../widgets/real_time_sensor_card.dart';
import '../widgets/automation_control_panel.dart';
import '../widgets/system_status_monitor.dart';
import '../widgets/analytics_dashboard.dart';
import '../widgets/alert_management_panel.dart';
import '../widgets/device_connectivity_panel.dart';
import '../widgets/ai_optimization_panel.dart';

class EnhancedDashboardPage extends ConsumerStatefulWidget {
  const EnhancedDashboardPage({Key? key}) : super(key: key);

  @override
  ConsumerState<EnhancedDashboardPage> createState() => _EnhancedDashboardPageState();
}

class _EnhancedDashboardPageState extends ConsumerState<EnhancedDashboardPage>
    with TickerProviderStateMixin {
  late TabController _tabController;
  Timer? _refreshTimer;
  bool _isRefreshing = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 6, vsync: this);
    _startAutoRefresh();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _refreshTimer?.cancel();
    super.dispose();
  }

  void _startAutoRefresh() {
    _refreshTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!_isRefreshing) {
        _refreshData();
      }
    });
  }

  Future<void> _refreshData() async {
    setState(() {
      _isRefreshing = true;
    });

    try {
      // Refresh sensor data
      await ref.read(enhancedSensorDataProvider.notifier)._refreshSensorData();

      // Refresh automation status
      await ref.read(automationControlProvider.notifier)._updateSystemStatus();

      // Refresh device connectivity
      await ref.read(hardwareIntegrationProvider.notifier)._checkAllDeviceConnections();
    } catch (e) {
      // Handle refresh errors
    } finally {
      if (mounted) {
        setState(() {
          _isRefreshing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final rooms = ref.watch(roomManagementProvider).activeRooms;
    final systemStatus = ref.watch(automationControlProvider);
    final sensorState = ref.watch(enhancedSensorDataProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('CultivAI Pro Dashboard'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.dashboard), text: 'Overview'),
            Tab(icon: Icon(Icons.sensors), text: 'Sensors'),
            Tab(icon: Icon(Icons.auto_awesome), text: 'Automation'),
            Tab(icon: Icon(Icons.analytics), text: 'Analytics'),
            Tab(icon: Icon(Icons.devices), text: 'Devices'),
            Tab(icon: Icon(Icons.psychology), text: 'AI Optimize'),
          ],
        ),
        actions: [
          IconButton(
            onPressed: _refreshData,
            icon: _isRefreshing
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh),
          ),
          PopupMenuButton<String>(
            onSelected: _handleMenuAction,
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'settings',
                child: Row(
                  children: [
                    Icon(Icons.settings),
                    SizedBox(width: 8),
                    Text('Settings'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'export',
                child: Row(
                  children: [
                    Icon(Icons.download),
                    SizedBox(width: 8),
                    Text('Export Data'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'emergency',
                child: Row(
                  children: [
                    Icon(Icons.warning, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Emergency Stop'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildOverviewTab(),
          _buildSensorsTab(),
          _buildAutomationTab(),
          _buildAnalyticsTab(),
          _buildDevicesTab(),
          _buildAIOptimizationTab(),
        ],
      ),
    );
  }

  Widget _buildOverviewTab() {
    final rooms = ref.watch(roomManagementProvider).activeRooms;
    final sensorState = ref.watch(enhancedSensorDataProvider);
    final systemStatus = ref.watch(automationControlProvider);

    return RefreshIndicator(
      onRefresh: _refreshData,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // System Status Header
            SystemStatusMonitor(
              isSystemActive: systemStatus.isSystemActive,
              lastUpdate: systemStatus.lastSystemUpdate,
              emergencyStates: systemStatus.emergencyStates,
            ),

            const SizedBox(height: 16),

            // Quick Stats Cards
            Row(
              children: [
                Expanded(
                  child: _buildStatCard(
                    'Active Rooms',
                    rooms.length.toString(),
                    Icons.meeting_room,
                    Colors.blue,
                    () => _navigateToTab(1),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildStatCard(
                    'Connected Devices',
                    ref.watch(deviceManagementProvider).activeDevices.length.toString(),
                    Icons.devices,
                    Colors.green,
                    () => _navigateToTab(4),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildStatCard(
                    'Active Alerts',
                    sensorState.activeAlerts.length.toString(),
                    Icons.notification_important,
                    Colors.orange,
                    () => _navigateToTab(2),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Room Overview Cards
            if (rooms.isNotEmpty) ...[
              const Text(
                'Room Status',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 1.2,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                ),
                itemCount: rooms.length,
                itemBuilder: (context, index) {
                  final room = rooms[index];
                  final currentData = sensorState.currentRoomData[room.id];
                  return _buildRoomOverviewCard(room, currentData);
                },
              ),
              const SizedBox(height: 16),
            ],

            // Recent Alerts
            const Text(
              'Recent Alerts',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            AlertManagementPanel(
              alerts: sensorState.activeAlerts,
              onAcknowledge: (alertId) {
                ref.read(enhancedSensorDataProvider.notifier).acknowledgeAlert(alertId);
              },
              onDismiss: (alertId) {
                ref.read(enhancedSensorDataProvider.notifier).dismissAlert(alertId);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSensorsTab() {
    return RefreshIndicator(
      onRefresh: _refreshData,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Sensor Status Overview
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.blue.shade200),
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.sensors, color: Colors.blue, size: 32),
                        const SizedBox(height: 8),
                        Text(
                          'Sensor Network',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.blue.shade900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${ref.watch(deviceManagementProvider).devices.length} Total Devices',
                          style: TextStyle(
                            color: Colors.blue.shade700,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.green.shade200),
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.check_circle, color: Colors.green, size: 32),
                        const SizedBox(height: 8),
                        Text(
                          'Data Quality',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.green.shade900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${(ref.watch(enhancedSensorDataProvider).averageQualityScore * 100).toStringAsFixed(1)}% Quality',
                          style: TextStyle(
                            color: Colors.green.shade700,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Real-time Sensor Cards
            const Text(
              'Real-time Sensor Readings',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            RealTimeSensorCard(
              sensorData: ref.watch(enhancedSensorDataProvider).currentRoomData,
              onCalibrationRequest: (deviceId) => _requestCalibration(deviceId),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAutomationTab() {
    return RefreshIndicator(
      onRefresh: _refreshData,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Automation System Status
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.purple.shade50, Colors.purple.shade100],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.purple.shade200),
              ),
              child: Row(
                children: [
                  Icon(
                    ref.watch(automationControlProvider).isSystemActive
                        ? Icons.auto_awesome
                        : Icons.auto_fix_off,
                    color: Colors.purple.shade700,
                    size: 32,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Automation System',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.purple.shade900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          ref.watch(automationControlProvider).isSystemActive
                              ? 'System Active - ${ref.watch(automationControlProvider).activeControllers} Controllers Running'
                              : 'System Inactive',
                          style: TextStyle(
                            color: Colors.purple.shade700,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Automation Control Panel
            const Text(
              'Control Panel',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            AutomationControlPanel(
              onManualAction: (roomId, action) {
                ref.read(automationControlProvider.notifier).executeManualAction(roomId, action);
              },
              onEmergencyStop: (roomId) {
                _executeEmergencyStop(roomId);
              },
            ),

            const SizedBox(height: 16),

            // Performance Metrics
            const Text(
              'Performance Metrics',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            _buildPerformanceMetrics(),
          ],
        ),
      ),
    );
  }

  Widget _buildAnalyticsTab() {
    return const AnalyticsDashboard();
  }

  Widget _buildDevicesTab() {
    return RefreshIndicator(
      onRefresh: _refreshData,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Device Connectivity Overview
            const Text(
              'Device Connectivity',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            DeviceConnectivityPanel(
              devices: ref.watch(deviceManagementProvider).devices,
              connections: ref.watch(hardwareIntegrationProvider).connectedDevices,
              onConnectDevice: (device) => _connectDevice(device),
              onDisconnectDevice: (deviceId) => _disconnectDevice(deviceId),
              onCalibrateDevice: (deviceId, values) => _calibrateDevice(deviceId, values),
            ),

            const SizedBox(height: 16),

            // Add New Device Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _scanForDevices,
                icon: const Icon(Icons.bluetooth_searching),
                label: const Text('Scan for New Devices'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.all(16),
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAIOptimizationTab() {
    return RefreshIndicator(
      onRefresh: _refreshData,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // AI Optimization Panel
            const Text(
              'AI-Powered Optimization',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            AIOptimizationPanel(
              onOptimizeClimate: (roomId) => _optimizeClimate(roomId),
              onPredictWatering: (roomId, metrics) => _predictWatering(roomId, metrics),
              onPredictYield: (roomId) => _predictYield(roomId),
              onOptimizeEnergy: (roomId) => _optimizeEnergy(roomId),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(
    String title,
    String value,
    IconData icon,
    Color color,
    VoidCallback onTap,
  ) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(
              title,
              style: TextStyle(
                fontSize: 12,
                color: color.withOpacity(0.7),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoomOverviewCard(RoomConfig room, SensorData? currentData) {
    final metrics = currentData?.metrics;
    final health = _calculateRoomHealth(metrics);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    room.name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getHealthColor(health),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    _getHealthText(health),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              room.environmentalTargets.growthStage.displayName,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 8),
            if (metrics != null) ...[
              _buildMiniMetricRow(
                'Temp',
                '${metrics.temperature?.toStringAsFixed(1) ?? '--'}°C',
                Icons.thermostat,
              ),
              const SizedBox(height: 4),
              _buildMiniMetricRow(
                'Humidity',
                '${metrics.humidity?.toStringAsFixed(0) ?? '--'}%',
                Icons.water_drop,
              ),
              const SizedBox(height: 4),
              _buildMiniMetricRow(
                'CO2',
                '${metrics.co2?.toStringAsFixed(0) ?? '--'}ppm',
                Icons.air,
              ),
            ] else ...[
              const Text('No data available', style: TextStyle(fontSize: 12)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildMiniMetricRow(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.grey.shade600),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildPerformanceMetrics() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'System Performance',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildMetricItem(
                  'Actions Today',
                  ref.watch(automationControlProvider).totalActions.toString(),
                  Icons.play_arrow,
                  Colors.blue,
                ),
              ),
              Expanded(
                child: _buildMetricItem(
                  'Error Rate',
                  '${(ref.watch(automationControlProvider).errorRate * 100).toStringAsFixed(1)}%',
                  Icons.error_outline,
                  Colors.orange,
                ),
              ),
              Expanded(
                child: _buildMetricItem(
                  'Uptime',
                  '${ref.watch(automationControlProvider).uptime}%',
                  Icons.timelapse,
                  Colors.green,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetricItem(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: Colors.grey.shade600,
          ),
        ),
      ],
    );
  }

  double _calculateRoomHealth(SensorMetrics? metrics) {
    if (metrics == null) return 0.5;

    double health = 1.0;
    int factors = 0;

    if (metrics.temperature != null) {
      final temp = metrics.temperature!;
      if (temp >= 18 && temp <= 30) {
        health *= 1.0;
      } else if (temp >= 15 && temp <= 35) {
        health *= 0.8;
      } else {
        health *= 0.5;
      }
      factors++;
    }

    if (metrics.humidity != null) {
      final humidity = metrics.humidity!;
      if (humidity >= 40 && humidity <= 70) {
        health *= 1.0;
      } else if (humidity >= 30 && humidity <= 80) {
        health *= 0.8;
      } else {
        health *= 0.5;
      }
      factors++;
    }

    if (metrics.co2 != null) {
      final co2 = metrics.co2!;
      if (co2 >= 400 && co2 <= 1200) {
        health *= 1.0;
      } else if (co2 >= 300 && co2 <= 1500) {
        health *= 0.8;
      } else {
        health *= 0.5;
      }
      factors++;
    }

    return factors > 0 ? health : 0.5;
  }

  Color _getHealthColor(double health) {
    if (health >= 0.8) return Colors.green;
    if (health >= 0.6) return Colors.orange;
    return Colors.red;
  }

  String _getHealthText(double health) {
    if (health >= 0.8) return 'EXCELLENT';
    if (health >= 0.6) return 'GOOD';
    return 'POOR';
  }

  void _navigateToTab(int index) {
    _tabController.animateTo(index);
  }

  void _handleMenuAction(String action) {
    switch (action) {
      case 'settings':
        Navigator.pushNamed(context, '/settings');
        break;
      case 'export':
        _exportData();
        break;
      case 'emergency':
        _showEmergencyDialog();
        break;
    }
  }

  Future<void> _scanForDevices() async {
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    scaffoldMessenger.showSnackBar(
      const SnackBar(
        content: Text('Scanning for devices...'),
        duration: Duration(seconds: 2),
      ),
    );

    try {
      await ref.read(hardwareIntegrationProvider.notifier).scanForDevices();
      scaffoldMessenger.showSnackBar(
        const SnackBar(
          content: Text('Device scan completed'),
          duration: Duration(seconds: 2),
        ),
      );
    } catch (e) {
      scaffoldMessenger.showSnackBar(
        SnackBar(
          content: Text('Scan failed: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _connectDevice(SensorDevice device) async {
    try {
      await ref.read(hardwareIntegrationProvider.notifier).connectToDevice(device);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Connected to ${device.name}')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to connect: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _disconnectDevice(String deviceId) async {
    try {
      await ref.read(hardwareIntegrationProvider.notifier).disconnectDevice(deviceId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Device disconnected')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to disconnect: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _calibrateDevice(String deviceId, Map<String, double> values) async {
    try {
      await ref.read(hardwareIntegrationProvider.notifier).calibrateDevice(
        ref.read(deviceManagementProvider).getDeviceById(deviceId)!,
        values,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Device calibrated successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Calibration failed: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _requestCalibration(String deviceId) async {
    // Show calibration dialog
    showDialog(
      context: context,
      builder: (context) => _buildCalibrationDialog(deviceId),
    );
  }

  Widget _buildCalibrationDialog(String deviceId) {
    return AlertDialog(
      title: const Text('Calibrate Sensor'),
      content: const Text('Enter calibration values for the sensor'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            // Implement calibration logic
            Navigator.pop(context);
          },
          child: const Text('Calibrate'),
        ),
      ],
    );
  }

  void _executeEmergencyStop(String roomId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Emergency Stop'),
        content: const Text('Are you sure you want to execute an emergency stop? This will immediately halt all automation systems.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // Execute emergency stop
              _performEmergencyStop(roomId);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('EMERGENCY STOP'),
          ),
        ],
      ),
    );
  }

  void _performEmergencyStop(String roomId) {
    // Implement emergency stop logic
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Emergency stop executed'),
        backgroundColor: Colors.red,
        duration: Duration(seconds: 5),
      ),
    );
  }

  Future<void> _optimizeClimate(String roomId) async {
    try {
      final currentData = ref.read(enhancedSensorDataProvider).currentRoomData[roomId];
      if (currentData != null) {
        final optimization = await ref.read(aiOptimizationProvider.notifier)
            .optimizeClimateSettings(roomId, currentData.metrics);
        _showOptimizationResults('Climate Optimization', optimization);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Optimization failed: ${e.toString()}')),
      );
    }
  }

  Future<void> _predictWatering(String roomId, SensorMetrics metrics) async {
    try {
      final prediction = await ref.read(aiOptimizationProvider.notifier)
          .predictWateringNeed(roomId, metrics);
      _showWateringPrediction(prediction);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Prediction failed: ${e.toString()}')),
      );
    }
  }

  Future<void> _predictYield(String roomId) async {
    try {
      final prediction = await ref.read(aiOptimizationProvider.notifier)
          .predictYield(roomId);
      _showYieldPrediction(prediction);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Prediction failed: ${e.toString()}')),
      );
    }
  }

  Future<void> _optimizeEnergy(String roomId) async {
    try {
      final optimization = await ref.read(aiOptimizationProvider.notifier)
          .optimizeEnergyUsage(roomId);
      _showEnergyOptimization(optimization);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Optimization failed: ${e.toString()}')),
      );
    }
  }

  void _showOptimizationResults(String title, dynamic optimization) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Optimization completed successfully'),
              const SizedBox(height: 16),
              // Add specific optimization details based on the type
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // Apply optimization
            },
            child: const Text('Apply'),
          ),
        ],
      ),
    );
  }

  void _showWateringPrediction(dynamic prediction) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Watering Prediction'),
        content: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Should water: ${prediction.shouldWater ? 'Yes' : 'No'}'),
            Text('Confidence: ${(prediction.confidence * 100).toStringAsFixed(1)}%'),
            Text('Amount: ${prediction.amount.toStringAsFixed(2)}'),
            Text('Reason: ${prediction.reason}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showYieldPrediction(dynamic prediction) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Yield Prediction'),
        content: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Expected Yield: ${prediction.expectedYield.toStringAsFixed(0)} g/m²'),
            Text('Classification: ${prediction.yieldClassify.name}'),
            Text('Confidence: ${(prediction.confidence * 100).toStringAsFixed(1)}%'),
            const SizedBox(height: 8),
            const Text('Contributing Factors:'),
            ...prediction.contributingFactors.map((factor) => Text('• $factor')),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showEnergyOptimization(dynamic optimization) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Energy Optimization'),
        content: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Potential Savings: ${optimization.estimatedSavingsPercent.toStringAsFixed(1)}%'),
            Text('Monthly Savings: \$${optimization.estimatedMonthlySavings.toStringAsFixed(2)}'),
            Text('Payback Period: ${optimization.paybackPeriod.inDays} days'),
            const SizedBox(height: 8),
            const Text('Recommendations:'),
            ...optimization.recommendations.map((rec) => Text('• $rec')),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Future<void> _exportData() async {
    // Implement data export functionality
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Exporting data...')),
    );
  }

  void _showEmergencyDialog() {
    _executeEmergencyStop('all_rooms');
  }
}