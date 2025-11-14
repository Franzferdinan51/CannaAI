import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../services/offline_sync_service.dart';
import '../../services/offline_storage_service.dart';

class OfflineStatusWidget extends StatefulWidget {
  final Function()? onSyncRequested;
  final bool showDetailedStatus;

  const OfflineStatusWidget({
    super.key,
    this.onSyncRequested,
    this.showDetailedStatus = false,
  });

  @override
  State<OfflineStatusWidget> createState() => _OfflineStatusWidgetState();
}

class _OfflineStatusWidgetState extends State<OfflineStatusWidget>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  late AnimationController _slideController;
  late Animation<Offset> _slideAnimation;

  final OfflineSyncService _syncService = OfflineSyncService.instance;
  final OfflineStorageService _storage = OfflineStorageService.instance;

  bool _isExpanded = false;
  Map<String, dynamic>? _syncStats;
  Map<String, dynamic>? _storageStats;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );

    _pulseAnimation = Tween<double>(
      begin: 1.0,
      end: 1.1,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));

    _slideController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeOut,
    ));

    _loadStats();
    _pulseController.repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  Future<void> _loadStats() async {
    try {
      final syncStats = await _syncService.getSyncStats();
      final storageStats = await _storage.getStorageStats();

      setState(() {
        _syncStats = syncStats;
        _storageStats = storageStats;
      });
    } catch (e) {
      // Handle error silently for UI
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _buildStatusHeader(),
        if (_isExpanded) _buildExpandedStatus(),
      ],
    );
  }

  Widget _buildStatusHeader() {
    final isSyncing = _syncService.isSyncing;
    final hasUnsyncedData = _hasPendingSync();

    return GestureDetector(
      onTap: () {
        if (widget.showDetailedStatus) {
          setState(() {
            _isExpanded = !_isExpanded;
          });
          if (_isExpanded) {
            _slideController.forward();
            _loadStats();
          } else {
            _slideController.reverse();
          }
        }
      },
      child: AnimatedBuilder(
        animation: _pulseAnimation,
        builder: (context, child) {
          return Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: _getStatusColor().withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _getStatusColor().withOpacity(0.3),
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: _getStatusColor().withOpacity(0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                // Status icon with pulse animation
                Transform.scale(
                  scale: isSyncing ? _pulseAnimation.value : 1.0,
                  child: Icon(
                    _getStatusIcon(),
                    color: _getStatusColor(),
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),

                // Status text
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _getStatusText(),
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: _getStatusColor(),
                        ),
                      ),
                      if (hasUnsyncedData)
                        Text(
                          _getUnsyncedCount(),
                          style: TextStyle(
                            fontSize: 12,
                            color: _getStatusColor().withOpacity(0.7),
                          ),
                        ),
                    ],
                  ),
                ),

                // Sync button or expand icon
                if (!isSyncing && hasUnsyncedData)
                  IconButton(
                    onPressed: () async {
                      HapticFeedback.lightImpact();
                      await _syncService.forceSyncNow();
                      _loadStats();
                      widget.onSyncRequested?.call();
                    },
                    icon: Icon(
                      Icons.sync,
                      color: _getStatusColor(),
                      size: 18,
                    ),
                    tooltip: 'Sync now',
                  )
                else if (widget.showDetailedStatus)
                  Icon(
                    _isExpanded ? Icons.expand_less : Icons.expand_more,
                    color: _getStatusColor(),
                    size: 18,
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildExpandedStatus() {
    return SlideTransition(
      position: _slideAnimation,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Sync Statistics
            _buildSyncStatistics(),
            const SizedBox(height: 16),

            // Storage Statistics
            _buildStorageStatistics(),
            const SizedBox(height: 16),

            // Actions
            _buildActionButtons(),
          ],
        ),
      ),
    );
  }

  Widget _buildSyncStatistics() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              Icons.cloud_sync,
              size: 16,
              color: Theme.of(context).primaryColor,
            ),
            const SizedBox(width: 8),
            Text(
              'Sync Status',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).primaryColor,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),

        if (_syncStats != null) ...[
          _buildSyncRow('Analyses', _syncStats!['analyses_total'] ?? 0, _syncStats!['analyses_synced'] ?? 0),
          _buildSyncRow('Sensor Data', _syncStats!['sensor_total'] ?? 0, _syncStats!['sensor_synced'] ?? 0),
          _buildSyncRow('Chat Messages', _syncStats!['chat_total'] ?? 0, _syncStats!['chat_synced'] ?? 0),
        ] else ...[
          const Text(
            'Loading sync statistics...',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
      ],
    );
  }

  Widget _buildSyncRow(String label, int total, int synced) {
    final pending = total - synced;
    final percentage = total > 0 ? (synced / total * 100).round() : 100;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 12),
              ),
              Text(
                '$synced/$total ($percentage%)',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: pending > 0 ? Colors.orange : Colors.green,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          LinearProgressIndicator(
            value: total > 0 ? synced / total : 1.0,
            backgroundColor: Colors.grey[300],
            valueColor: AlwaysStoppedAnimation<Color>(
              pending > 0 ? Colors.orange : Colors.green,
            ),
            minHeight: 4,
          ),
        ],
      ),
    );
  }

  Widget _buildStorageStatistics() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              Icons.storage,
              size: 16,
              color: Theme.of(context).primaryColor,
            ),
            const SizedBox(width: 8),
            Text(
              'Local Storage',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).primaryColor,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),

        if (_storageStats != null) ...[
          _buildStorageRow('Total Analyses', _storageStats!['total_analyses'] ?? 0),
          _buildStorageRow('Sensor Readings', _storageStats!['total_sensor_readings'] ?? 0),
          _buildStorageRow('Chat Messages', _storageStats!['total_chat_messages'] ?? 0),
          _buildStorageRow('Pending Analyses', _storageStats!['pending_analyses'] ?? 0),
        ] else ...[
          const Text(
            'Loading storage statistics...',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
      ],
    );
  }

  Widget _buildStorageRow(String label, int count) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 12),
          ),
          Text(
            count.toString(),
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Force sync button
        ElevatedButton.icon(
          onPressed: _syncService.isSyncing ? null : () async {
            HapticFeedback.lightImpact();
            await _syncService.forceSyncNow();
            _loadStats();
            widget.onSyncRequested?.call();
          },
          icon: _syncService.isSyncing
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
              : const Icon(Icons.sync, size: 16),
          label: Text(_syncService.isSyncing ? 'Syncing...' : 'Force Sync Now'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Theme.of(context).primaryColor,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 12),
          ),
        ),

        const SizedBox(height: 8),

        // Clear cache button
        OutlinedButton.icon(
          onPressed: () async {
            HapticFeedback.lightImpact();
            await _storage.clearCache();
            _loadStats();
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Cache cleared')),
            );
          },
          icon: const Icon(Icons.clear, size: 16),
          label: const Text('Clear Cache'),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 12),
          ),
        ),
      ],
    );
  }

  Color _getStatusColor() {
    final isSyncing = _syncService.isSyncing;
    final hasUnsyncedData = _hasPendingSync();

    if (isSyncing) {
      return Colors.blue;
    } else if (hasUnsyncedData) {
      return Colors.orange;
    } else {
      return Colors.green;
    }
  }

  IconData _getStatusIcon() {
    final isSyncing = _syncService.isSyncing;
    final hasUnsyncedData = _hasPendingSync();

    if (isSyncing) {
      return Icons.sync;
    } else if (hasUnsyncedData) {
      return Icons.cloud_upload;
    } else {
      return Icons.cloud_done;
    }
  }

  String _getStatusText() {
    final isSyncing = _syncService.isSyncing;
    final hasUnsyncedData = _hasPendingSync();

    if (isSyncing) {
      return 'Syncing in progress';
    } else if (hasUnsyncedData) {
      return 'Offline mode - Data pending sync';
    } else {
      return 'All data synced';
    }
  }

  String _getUnsyncedCount() {
    if (_syncStats == null) return '';

    final total = (_syncStats!['analyses_total'] ?? 0) +
                  (_syncStats!['sensor_total'] ?? 0) +
                  (_syncStats!['chat_total'] ?? 0);

    final synced = (_syncStats!['analyses_synced'] ?? 0) +
                   (_syncStats!['sensor_synced'] ?? 0) +
                   (_syncStats!['chat_synced'] ?? 0);

    final pending = total - synced;
    return pending > 0 ? '$pending items pending sync' : '';
  }

  bool _hasPendingSync() {
    if (_syncStats == null) return false;

    final pending = ((_syncStats!['analyses_total'] ?? 0) - (_syncStats!['analyses_synced'] ?? 0)) +
                    ((_syncStats!['sensor_total'] ?? 0) - (_syncStats!['sensor_synced'] ?? 0)) +
                    ((_syncStats!['chat_total'] ?? 0) - (_syncStats!['chat_synced'] ?? 0));

    return pending > 0;
  }
}