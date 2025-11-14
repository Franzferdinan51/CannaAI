import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/offline_provider.dart';
import '../widgets/offline_status_widget.dart';
import '../../../../core/models/enhanced_plant_analysis.dart';
import '../../../../core/models/sensor_data.dart';

class OfflineIntegrationPage extends ConsumerStatefulWidget {
  const OfflineIntegrationPage({super.key});

  @override
  ConsumerState<OfflineIntegrationPage> createState() => _OfflineIntegrationPageState();
}

class _OfflineIntegrationPageState extends ConsumerState<OfflineIntegrationPage>
    with TickerProviderStateMixin {
  late TabController _tabController;
  late AnimationController _fabAnimation;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _fabAnimation = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    // Initialize services
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(offlineInitializationProvider);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _fabAnimation.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Offline Capabilities'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.dashboard), text: 'Dashboard'),
            Tab(icon: Icon(Icons.analytics), text: 'Analytics'),
            Tab(icon: Icon(Icons.storage), text: 'Storage'),
            Tab(icon: Icon(Icons.settings), text: 'Settings'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildDashboardTab(),
          _buildAnalyticsTab(),
          _buildStorageTab(),
          _buildSettingsTab(),
        ],
      ),
      floatingActionButton: _buildFloatingActionButton(),
    );
  }

  Widget _buildDashboardTab() {
    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(syncStatusProvider);
        ref.invalidate(storageStatsProvider);
        ref.invalidate(cachedAnalysesProvider);
        ref.invalidate(cachedSensorDataProvider);
        HapticFeedback.lightImpact();
      },
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Offline Status Widget
            const OfflineStatusWidget(showDetailedStatus: true),
            const SizedBox(height: 24),

            // Quick Stats
            _buildQuickStats(),
            const SizedBox(height: 24),

            // Recent Activities
            _buildRecentActivities(),
            const SizedBox(height: 24),

            // Sync Controls
            _buildSyncControls(),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickStats() {
    return Consumer(
      builder: (context, ref, child) {
        final syncStatus = ref.watch(syncStatusProvider);
        final storageStats = ref.watch(storageStatsProvider);

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Quick Stats',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),

                // Sync Status Stats
                syncStatus.when(
                  data: (stats) => _buildStatGrid([
                    StatItem('Analyses', '${stats['analyses_total'] ?? 0}', Icons.analytics),
                    StatItem('Sensor Data', '${stats['sensor_total'] ?? 0}', Icons.sensors),
                    StatItem('Chat Messages', '${stats['chat_total'] ?? 0}', Icons.chat),
                    StatItem('Pending', '${((stats['analyses_total'] ?? 0) - (stats['analyses_synced'] ?? 0)) + ((stats['sensor_total'] ?? 0) - (stats['sensor_synced'] ?? 0)) + ((stats['chat_total'] ?? 0) - (stats['chat_synced'] ?? 0))}', Icons.pending),
                  ]),
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (error, stack) => Text('Error: $error'),
                ),

                if (storageStats.hasValue) ...[
                  const SizedBox(height: 16),
                  const Divider(),
                  const SizedBox(height: 16),

                  // Storage Stats
                  storageStats.when(
                    data: (stats) => _buildStatGrid([
                      StatItem('Cached Analyses', '${stats['total_analyses'] ?? 0}', Icons.storage),
                      StatItem('Sensor Readings', '${stats['total_sensor_readings'] ?? 0}', Icons.storage),
                      StatItem('Pending Queue', '${stats['pending_analyses'] ?? 0}', Icons.hourglass_empty),
                      StatItem('Storage Size', _formatStorageSize(stats), Icons.sd_storage),
                    ]),
                    loading: () => const Center(child: CircularProgressIndicator()),
                    error: (error, stack) => Text('Error: $error'),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatGrid(List<StatItem> items) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 2.5,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(context).primaryColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Theme.of(context).primaryColor.withOpacity(0.3)),
          ),
          child: Row(
            children: [
              Icon(
                item.icon,
                color: Theme.of(context).primaryColor,
                size: 20,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      item.label,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      item.value,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildRecentActivities() {
    return Consumer(
      builder: (context, ref, child) {
        final cachedAnalyses = ref.watch(cachedAnalysesProvider);

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Recent Analyses',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),

                cachedAnalyses.when(
                  data: (analyses) {
                    if (analyses == null || analyses.isEmpty) {
                      return const Center(
                        child: Text(
                          'No recent analyses available',
                          style: TextStyle(color: Colors.grey),
                        ),
                      );
                    }

                    return Column(
                      children: analyses.take(5).map((analysis) {
                        return ListTile(
                          leading: CircleAvatar(
                            backgroundColor: _getHealthColor(analysis.result.overallHealth),
                            child: Icon(
                              _getHealthIcon(analysis.result.overallHealth),
                              color: Colors.white,
                              size: 16,
                            ),
                          ),
                          title: Text(analysis.result.strain),
                          subtitle: Text(
                            analysis.result.overallHealth,
                            style: const TextStyle(fontSize: 12),
                          ),
                          trailing: Text(
                            _formatRelativeTime(analysis.timestamp),
                            style: const TextStyle(fontSize: 12),
                          ),
                        );
                      }).toList(),
                    );
                  },
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (error, stack) => Text('Error loading analyses: $error'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSyncControls() {
    return Consumer(
      builder: (context, ref, child) {
        final isSyncing = ref.watch(isSyncingProvider);
        final notifier = ref.read(offlineNotifierProvider.notifier);

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Sync Controls',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),

                // Force Sync Button
                ElevatedButton.icon(
                  onPressed: isSyncing ? null : () async {
                    HapticFeedback.mediumImpact();
                    await notifier.forceSync();
                  },
                  icon: isSyncing
                      ? SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Theme.of(context).primaryColor,
                            ),
                          ),
                        )
                      : const Icon(Icons.sync),
                  label: Text(isSyncing ? 'Syncing...' : 'Force Sync Now'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),

                const SizedBox(height: 12),

                // Clear Cache Button
                OutlinedButton.icon(
                  onPressed: () async {
                    HapticFeedback.lightImpact();
                    await notifier.clearCache();
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Cache cleared successfully')),
                      );
                    }
                  },
                  icon: const Icon(Icons.clear),
                  label: const Text('Clear Cache'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildAnalyticsTab() {
    return Consumer(
      builder: (context, ref, child) {
        final analytics = ref.watch(offlineAnalyticsProvider);

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(offlineAnalyticsProvider);
          },
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: analytics.when(
              data: (data) => _buildAnalyticsContent(data),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Center(child: Text('Error: $error')),
            ),
          ),
        );
      },
    );
  }

  Widget _buildAnalyticsContent(Map<String, dynamic> data) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Overview Cards
        Row(
          children: [
            Expanded(
              child: _buildAnalyticsCard(
                'Total Analyses',
                '${data['totalAnalyses'] ?? 0}',
                Icons.analytics,
                Colors.blue,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildAnalyticsCard(
                'Avg Health Score',
                '${((data['averageHealthScore'] ?? 0.0) * 100).toStringAsFixed(1)}%',
                Icons.trending_up,
                data['averageHealthScore'] > 0.7 ? Colors.green : Colors.orange,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Health Status Distribution
        _buildHealthStatusDistribution(data['healthStatusDistribution'] ?? {}),
        const SizedBox(height: 16),

        // Environmental Data
        _buildEnvironmentalData(data),
      ],
    );
  }

  Widget _buildAnalyticsCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(
              title,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHealthStatusDistribution(Map<String, dynamic> distribution) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Health Status Distribution',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),

            if (distribution.isEmpty)
              const Center(child: Text('No data available'))
            else
              Column(
                children: distribution.entries.map((entry) {
                  final status = entry.key;
                  final count = entry.value as int;
                  final color = _getHealthColor(status);

                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        Icon(
                          _getHealthIcon(status),
                          color: color,
                          size: 16,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(status),
                        ),
                        Text(
                          count.toString(),
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildEnvironmentalData(Map<String, dynamic> data) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Environmental Data Averages',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),

            Row(
              children: [
                Expanded(
                  child: _buildEnvironmentalItem(
                    'Temperature',
                    '${data['averageTemperature']?.toStringAsFixed(1) ?? 'N/A'}°F',
                    Icons.thermostat,
                    Colors.orange,
                  ),
                ),
                Expanded(
                  child: _buildEnvironmentalItem(
                    'Humidity',
                    '${data['averageHumidity']?.toStringAsFixed(1) ?? 'N/A'}%',
                    Icons.water_drop,
                    Colors.blue,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildEnvironmentalItem(
                    'pH Level',
                    data['averagePh']?.toStringAsFixed(1) ?? 'N/A',
                    Icons.science,
                    Colors.green,
                  ),
                ),
                Expanded(
                  child: _buildEnvironmentalItem(
                    'Total Readings',
                    '${data['totalSensorReadings'] ?? 0}',
                    Icons.sensors,
                    Colors.purple,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEnvironmentalItem(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: Colors.grey),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStorageTab() {
    return Consumer(
      builder: (context, ref, child) {
        final cachedAnalyses = ref.watch(cachedAnalysesProvider);
        final cachedSensorData = ref.watch(cachedSensorDataProvider);

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Cached Analyses
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Cached Analyses',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),

                      cachedAnalyses.when(
                        data: (analyses) {
                          if (analyses == null || analyses.isEmpty) {
                            return const Center(
                              child: Text('No cached analyses available'),
                            );
                          }

                          return ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: analyses.length,
                            itemBuilder: (context, index) {
                              final analysis = analyses[index];
                              return ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: _getHealthColor(analysis.result.overallHealth),
                                  child: Icon(
                                    _getHealthIcon(analysis.result.overallHealth),
                                    color: Colors.white,
                                    size: 16,
                                  ),
                                ),
                                title: Text(analysis.result.strain),
                                subtitle: Text(
                                  '${analysis.result.overallHealth} • ${_formatRelativeTime(analysis.timestamp)}',
                                ),
                                trailing: IconButton(
                                  onPressed: () {
                                    // View analysis details
                                  },
                                  icon: const Icon(Icons.arrow_forward_ios, size: 16),
                                ),
                              );
                            },
                          );
                        },
                        loading: () => const Center(child: CircularProgressIndicator()),
                        error: (error, stack) => Text('Error: $error'),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Cached Sensor Data
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Cached Sensor Data',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),

                      cachedSensorData.when(
                        data: (sensorData) {
                          if (sensorData == null || sensorData.isEmpty) {
                            return const Center(
                              child: Text('No cached sensor data available'),
                            );
                          }

                          return ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: sensorData.length,
                            itemBuilder: (context, index) {
                              final data = sensorData[index];
                              return ListTile(
                                leading: const Icon(Icons.sensors),
                                title: Text('Room ${data.roomId ?? 'Default'}'),
                                subtitle: Text(
                                  'Temp: ${data.temperature.toStringAsFixed(1)}°F • Humidity: ${data.humidity.toStringAsFixed(1)}%',
                                ),
                                trailing: Text(
                                  _formatRelativeTime(data.timestamp),
                                  style: const TextStyle(fontSize: 12),
                                ),
                              );
                            },
                          );
                        },
                        loading: () => const Center(child: CircularProgressIndicator()),
                        error: (error, stack) => Text('Error: $error'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSettingsTab() {
    return Consumer(
      builder: (context, ref, child) {
        final notifier = ref.read(offlineNotifierProvider.notifier);

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Storage Management
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Storage Management',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),

                      ListTile(
                        leading: const Icon(Icons.cleaning_services),
                        title: const Text('Clean Old Data'),
                        subtitle: const Text('Remove data older than 30 days'),
                        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                        onTap: () async {
                          HapticFeedback.lightImpact();
                          await notifier.cleanupOldData();
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Old data cleaned successfully')),
                            );
                          }
                        },
                      ),

                      ListTile(
                        leading: const Icon(Icons.clear_all),
                        title: const Text('Clear All Cache'),
                        subtitle: const Text('Remove all cached data'),
                        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                        onTap: () async {
                          HapticFeedback.lightImpact();
                          await notifier.clearCache();
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Cache cleared successfully')),
                            );
                          }
                        },
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Sync Settings
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Sync Settings',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),

                      ListTile(
                        leading: const Icon(Icons.sync),
                        title: const Text('Auto-sync'),
                        subtitle: const Text('Automatically sync when online'),
                        trailing: Switch(
                          value: true, // Could be managed in state
                          onChanged: (value) {
                            // Handle toggle
                          },
                        ),
                      ),

                      ListTile(
                        leading: const Icon(Icons.wifi_off),
                        title: const Text('Offline Mode'),
                        subtitle: const Text('Work completely offline'),
                        trailing: Switch(
                          value: true, // Could be managed in state
                          onChanged: (value) {
                            // Handle toggle
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildFloatingActionButton() {
    return Consumer(
      builder: (context, ref, child) {
        final isSyncing = ref.watch(isSyncingProvider);
        final notifier = ref.read(offlineNotifierProvider.notifier);

        return AnimatedBuilder(
          animation: _fabAnimation,
          builder: (context, child) {
            return FloatingActionButton.extended(
              onPressed: isSyncing ? null : () async {
                HapticFeedback.heavyImpact();
                await notifier.forceSync();
              },
              icon: isSyncing
                  ? SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Icon(Icons.sync),
              label: Text(isSyncing ? 'Syncing...' : 'Sync All'),
            );
          },
        );
      },
    );
  }

  // Helper methods
  Color _getHealthColor(String healthStatus) {
    switch (healthStatus.toLowerCase()) {
      case 'healthy':
        return Colors.green;
      case 'attention needed':
        return Colors.orange;
      case 'critical':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  IconData _getHealthIcon(String healthStatus) {
    switch (healthStatus.toLowerCase()) {
      case 'healthy':
        return Icons.check_circle;
      case 'attention needed':
        return Icons.warning;
      case 'critical':
        return Icons.error;
      default:
        return Icons.help_outline;
    }
  }

  String _formatRelativeTime(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }

  String _formatStorageSize(Map<String, dynamic> stats) {
    // This is a simplified calculation
    final totalItems = (stats['total_analyses'] ?? 0) +
                      (stats['total_sensor_readings'] ?? 0) +
                      (stats['total_chat_messages'] ?? 0);

    if (totalItems < 1000) {
      return '$totalItems items';
    } else {
      return '${(totalItems / 1000).toStringAsFixed(1)}k items';
    }
  }
}

class StatItem {
  final String label;
  final String value;
  final IconData icon;

  StatItem(this.label, this.value, this.icon);
}