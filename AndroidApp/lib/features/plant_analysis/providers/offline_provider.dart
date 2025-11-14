import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/offline_storage_service.dart';
import '../services/offline_sync_service.dart';
import '../models/enhanced_plant_analysis.dart';
import '../models/sensor_data.dart';

// Providers for services
final offlineStorageServiceProvider = Provider<OfflineStorageService>((ref) {
  return OfflineStorageService.instance;
});

final offlineSyncServiceProvider = Provider<OfflineSyncService>((ref) {
  return OfflineSyncService.instance;
});

// Provider for offline initialization
final offlineInitializationProvider = FutureProvider<void>((ref) async {
  final storage = ref.read(offlineStorageServiceProvider);
  await storage.initialize();

  final sync = ref.read(offlineSyncServiceProvider);
  await sync.initialize();
});

// Provider for cached analyses
final cachedAnalysesProvider = StateProvider<List<EnhancedPlantAnalysis>?>((ref) {
  return null;
});

// Provider for cached sensor data
final cachedSensorDataProvider = StateProvider<List<SensorData>?>((ref) {
  return null;
});

// Provider for sync status
final syncStatusProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final sync = ref.read(offlineSyncServiceProvider);
  return await sync.getSyncStats();
});

// Provider for storage statistics
final storageStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final storage = ref.read(offlineStorageServiceProvider);
  return await storage.getStorageStats();
});

// Provider for is syncing state
final isSyncingProvider = Provider<bool>((ref) {
  final sync = ref.read(offlineSyncServiceProvider);
  return sync.isSyncing;
});

// Provider for offline mode status
final offlineModeProvider = Provider<bool>((ref) {
  // This could be enhanced with actual connectivity checks
  return true; // Assume offline mode for demo
});

// Provider for pending analyses count
final pendingAnalysesProvider = FutureProvider<int>((ref) async {
  final storage = ref.read(offlineStorageServiceProvider);
  final pending = await storage.getPendingAnalyses();
  return pending.length;
});

// Provider for unsynced items count
final unsyncedItemsProvider = FutureProvider<int>((ref) async {
  final sync = ref.read(offlineSyncServiceProvider);
  final stats = await sync.getSyncStats();

  final total = (stats['analyses_total'] ?? 0) +
                (stats['sensor_total'] ?? 0) +
                (stats['chat_total'] ?? 0);

  final synced = (stats['analyses_synced'] ?? 0) +
                 (stats['sensor_synced'] ?? 0) +
                 (stats['chat_synced'] ?? 0);

  return total - synced;
});

// Provider for analyses with filters
class AnalysesFilter {
  final String? strain;
  final String? healthStatus;
  final DateTime? startDate;
  final DateTime? endDate;
  final int? limit;
  final int? offset;

  const AnalysesFilter({
    this.strain,
    this.healthStatus,
    this.startDate,
    this.endDate,
    this.limit,
    this.offset,
  });
}

final analysesFilterProvider = StateProvider<AnalysesFilter>((ref) {
  return const AnalysesFilter();
});

final filteredAnalysesProvider = FutureProvider<List<EnhancedPlantAnalysis>>((ref) async {
  final storage = ref.read(offlineStorageServiceProvider);
  final filter = ref.read(analysesFilterProvider);

  return await storage.getAnalyses(
    strain: filter.strain,
    healthStatus: filter.healthStatus,
    startDate: filter.startDate,
    endDate: filter.endDate,
    limit: filter.limit,
    offset: filter.offset,
  );
});

// Provider for sensor data with filters
class SensorDataFilter {
  final int? limit;
  final int? hoursBack;
  final String? roomId;

  const SensorDataFilter({
    this.limit,
    this.hoursBack,
    this.roomId,
  });
}

final sensorDataFilterProvider = StateProvider<SensorDataFilter>((ref) {
  return const SensorDataFilter();
});

final filteredSensorDataProvider = FutureProvider<List<SensorData>>((ref) async {
  final storage = ref.read(offlineStorageServiceProvider);
  final filter = ref.read(sensorDataFilterProvider);

  return await storage.getSensorData(
    limit: filter.limit,
    hoursBack: filter.hoursBack,
    roomId: filter.roomId,
  );
});

// Provider for chat messages
final chatMessagesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final storage = ref.read(offlineStorageServiceProvider);
  return await storage.getChatMessages(limit: 50);
});

// Provider for offline actions
class OfflineNotifier extends StateNotifier<AsyncValue<void>> {
  final OfflineStorageService _storage;
  final OfflineSyncService _sync;

  OfflineNotifier(this._storage, this._sync) : super(const AsyncValue.data(null));

  Future<void> saveAnalysis(EnhancedPlantAnalysis analysis) async {
    state = const AsyncValue.loading();
    try {
      await _storage.saveAnalysis(analysis);
      state = const AsyncValue.data(null);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> saveSensorData(SensorData sensorData) async {
    state = const AsyncValue.loading();
    try {
      await _storage.saveSensorData(sensorData);
      state = const AsyncValue.data(null);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> saveChatMessage({
    required String messageText,
    required bool isUserMessage,
    String? analysisContext,
    String? sensorDataContext,
  }) async {
    state = const AsyncValue.loading();
    try {
      await _storage.saveChatMessage(
        messageText: messageText,
        isUserMessage: isUserMessage,
        analysisContext: analysisContext,
        sensorDataContext: sensorDataContext,
      );
      state = const AsyncValue.data(null);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> queueAnalysisForProcessing({
    required String imagePath,
    required String analysisType,
    int priority = 0,
  }) async {
    state = const AsyncValue.loading();
    try {
      await _storage.queueAnalysisForProcessing(
        imagePath: imagePath,
        analysisType: analysisType,
        priority: priority,
      );
      state = const AsyncValue.data(null);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> forceSync() async {
    state = const AsyncValue.loading();
    try {
      await _sync.forceSyncNow();
      state = const AsyncValue.data(null);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> deleteAnalysis(String analysisId) async {
    state = const AsyncValue.loading();
    try {
      await _storage.deleteAnalysis(analysisId);
      state = const AsyncValue.data(null);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> clearCache() async {
    state = const AsyncValue.loading();
    try {
      await _storage.clearCache();
      state = const AsyncValue.data(null);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> cleanupOldData({int daysToKeep = 30}) async {
    state = const AsyncValue.loading();
    try {
      await _storage.cleanupOldData(daysToKeep: daysToKeep);
      state = const AsyncValue.data(null);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  void reset() {
    state = const AsyncValue.data(null);
  }
}

final offlineNotifierProvider = StateNotifierProvider<OfflineNotifier, AsyncValue<void>>((ref) {
  final storage = ref.read(offlineStorageServiceProvider);
  final sync = ref.read(offlineSyncServiceProvider);
  return OfflineNotifier(storage, sync);
});

// Provider for automatic cache refresh
class CacheRefreshNotifier extends StateNotifier<bool> {
  final Ref _ref;
  Timer? _timer;

  CacheRefreshNotifier(this._ref) : super(false) {
    _startPeriodicRefresh();
  }

  void _startPeriodicRefresh() {
    _timer = Timer.periodic(const Duration(minutes: 5), (_) async {
      await _refreshCache();
    });
  }

  Future<void> _refreshCache() async {
    try {
      state = true;

      final storage = _ref.read(offlineStorageServiceProvider);

      // Refresh analyses cache
      final cachedAnalyses = await storage.getCachedAnalyses();
      _ref.read(cachedAnalysesProvider.notifier).state = cachedAnalyses;

      // Refresh sensor data cache
      final cachedSensorData = await storage.getCachedSensorData();
      _ref.read(cachedSensorDataProvider.notifier).state = cachedSensorData;

    } catch (e) {
      // Handle error silently for cache refresh
    } finally {
      state = false;
    }
  }

  Future<void> forceRefresh() async {
    await _refreshCache();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}

final cacheRefreshNotifierProvider = StateNotifierProvider<CacheRefreshNotifier, bool>((ref) {
  return CacheRefreshNotifier(ref);
});

// Provider for offline analytics
final offlineAnalyticsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final storage = ref.read(offlineStorageServiceProvider);

  // Get analytics data
  final recentAnalyses = await storage.getAnalyses(limit: 100);
  final sensorData = await storage.getSensorData(limit: 100);

  // Calculate analytics
  final healthStatusCount = <String, int>{};
  final strainCount = <String, int>{};
  final averageHealthScore = recentAnalyses.isNotEmpty
      ? recentAnalyses.map((a) => a.result.healthScore).reduce((a, b) => a + b) / recentAnalyses.length
      : 0.0;

  // Count health statuses
  for (final analysis in recentAnalyses) {
    final health = analysis.result.overallHealth;
    healthStatusCount[health] = (healthStatusCount[health] ?? 0) + 1;

    final strain = analysis.result.strain;
    strainCount[strain] = (strainCount[strain] ?? 0) + 1;
  }

  // Calculate sensor data averages
  final avgTemperature = sensorData.isNotEmpty
      ? sensorData.map((s) => s.temperature).reduce((a, b) => a + b) / sensorData.length
      : 0.0;
  final avgHumidity = sensorData.isNotEmpty
      ? sensorData.map((s) => s.humidity).reduce((a, b) => a + b) / sensorData.length
      : 0.0;
  final avgPh = sensorData.isNotEmpty
      ? sensorData.map((s) => s.ph).reduce((a, b) => a + b) / sensorData.length
      : 0.0;

  return {
    'totalAnalyses': recentAnalyses.length,
    'totalSensorReadings': sensorData.length,
    'averageHealthScore': averageHealthScore,
    'healthStatusDistribution': healthStatusCount,
    'strainDistribution': strainCount,
    'averageTemperature': avgTemperature,
    'averageHumidity': avgHumidity,
    'averagePh': avgPh,
    'lastAnalysisDate': recentAnalyses.isNotEmpty ? recentAnalyses.first.timestamp.toIso8601String() : null,
    'lastSensorReading': sensorData.isNotEmpty ? sensorData.first.timestamp.toIso8601String() : null,
  };
});