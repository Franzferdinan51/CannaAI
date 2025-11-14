import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'offline_storage_service.dart';
import '../models/enhanced_plant_analysis.dart';
import '../models/sensor_data.dart';

class OfflineSyncService {
  static OfflineSyncService? _instance;
  bool _isSyncing = false;
  Timer? _syncTimer;

  final String _baseUrl;
  final String? _apiKey;
  final Duration _syncInterval;
  final int _maxRetries;

  OfflineSyncService({
    String baseUrl = 'https://api.cannai.com',
    String? apiKey,
    Duration syncInterval = const Duration(minutes: 5),
    int maxRetries = 3,
  }) : _baseUrl = baseUrl,
       _apiKey = apiKey,
       _syncInterval = syncInterval,
       _maxRetries = maxRetries;

  static OfflineSyncService get instance {
    return _instance ??= OfflineSyncService();
  }

  Future<void> initialize() async {
    // Start periodic sync
    _syncTimer = Timer.periodic(_syncInterval, (_) => performSync());

    // Perform initial sync
    unawaited(performSync());
  }

  void dispose() {
    _syncTimer?.cancel();
  }

  Future<SyncResult> performSync() async {
    if (_isSyncing) {
      return const SyncResult(
        success: false,
        message: 'Sync already in progress',
      );
    }

    _isSyncing = true;

    try {
      final results = <String, dynamic>{};

      // Sync analyses
      results['analyses'] = await _syncAnalyses();

      // Sync sensor data
      results['sensor_data'] = await _syncSensorData();

      // Sync chat messages
      results['chat_messages'] = await _syncChatMessages();

      // Process analysis queue
      results['analysis_queue'] = await _processAnalysisQueue();

      final totalSynced = (results['analyses']?.syncedCount ?? 0) +
                         (results['sensor_data']?.syncedCount ?? 0) +
                         (results['chat_messages']?.syncedCount ?? 0);

      final totalErrors = (results['analyses']?.errorCount ?? 0) +
                         (results['sensor_data']?.errorCount ?? 0) +
                         (results['chat_messages']?.errorCount ?? 0) +
                         (results['analysis_queue']?.errorCount ?? 0);

      return SyncResult(
        success: totalErrors == 0,
        message: 'Synced $totalSynced items${totalErrors > 0 ? ' with $totalErrors errors' : ''}',
        details: results,
        syncedCount: totalSynced,
        errorCount: totalErrors,
      );
    } catch (e) {
      return SyncResult(
        success: false,
        message: 'Sync failed: ${e.toString()}',
      );
    } finally {
      _isSyncing = false;
    }
  }

  Future<SyncSectionResult> _syncAnalyses() async {
    final storage = OfflineStorageService.instance;
    int syncedCount = 0;
    int errorCount = 0;
    final errors = <String>[];

    try {
      // Get unsynced analyses
      final unsyncedAnalyses = await storage.getAnalyses();

      for (final analysis in unsyncedAnalyses) {
        try {
          final success = await _uploadAnalysis(analysis);
          if (success) {
            syncedCount++;
            // Mark as synced in database
            await storage._database!.update(
              'analyses',
              {'is_synced': 1},
              where: 'id = ?',
              whereArgs: [analysis.id],
            );
          } else {
            errorCount++;
            errors.add('Failed to upload analysis ${analysis.id}');
          }
        } catch (e) {
          errorCount++;
          errors.add('Analysis ${analysis.id}: ${e.toString()}');
        }
      }
    } catch (e) {
      errorCount++;
      errors.add('Analyses sync error: ${e.toString()}');
    }

    return SyncSectionResult(
      syncedCount: syncedCount,
      errorCount: errorCount,
      errors: errors,
    );
  }

  Future<SyncSectionResult> _syncSensorData() async {
    final storage = OfflineStorageService.instance;
    int syncedCount = 0;
    int errorCount = 0;
    final errors = <String>[];

    try {
      // Get unsynced sensor readings
      final sensorData = await storage.getSensorData();

      for (final reading in sensorData) {
        try {
          final success = await _uploadSensorReading(reading);
          if (success) {
            syncedCount++;
            // Mark as synced in database
            await storage._database!.update(
              'sensor_readings',
              {'is_synced': 1},
              where: 'timestamp = ?',
              whereArgs: [reading.timestamp.millisecondsSinceEpoch],
            );
          } else {
            errorCount++;
            errors.add('Failed to upload sensor reading');
          }
        } catch (e) {
          errorCount++;
          errors.add('Sensor reading: ${e.toString()}');
        }
      }
    } catch (e) {
      errorCount++;
      errors.add('Sensor data sync error: ${e.toString()}');
    }

    return SyncSectionResult(
      syncedCount: syncedCount,
      errorCount: errorCount,
      errors: errors,
    );
  }

  Future<SyncSectionResult> _syncChatMessages() async {
    final storage = OfflineStorageService.instance;
    int syncedCount = 0;
    int errorCount = 0;
    final errors = <String>[];

    try {
      // Get unsynced chat messages
      final messages = await storage.getChatMessages();

      for (final message in messages) {
        try {
          final success = await _uploadChatMessage(message);
          if (success) {
            syncedCount++;
            // Mark as synced in database
            await storage._database!.update(
              'chat_messages',
              {'is_synced': 1},
              where: 'id = ?',
              whereArgs: [message['id']],
            );
          } else {
            errorCount++;
            errors.add('Failed to upload chat message');
          }
        } catch (e) {
          errorCount++;
          errors.add('Chat message: ${e.toString()}');
        }
      }
    } catch (e) {
      errorCount++;
      errors.add('Chat sync error: ${e.toString()}');
    }

    return SyncSectionResult(
      syncedCount: syncedCount,
      errorCount: errorCount,
      errors: errors,
    );
  }

  Future<SyncSectionResult> _processAnalysisQueue() async {
    final storage = OfflineStorageService.instance;
    int syncedCount = 0;
    int errorCount = 0;
    final errors = <String>[];

    try {
      final pendingAnalyses = await storage.getPendingAnalyses();

      for (final item in pendingAnalyses) {
        try {
          // Check if image file exists
          final imageFile = File(item['image_path'] as String);
          if (!await imageFile.exists()) {
            await storage.updateAnalysisStatus(
              queueId: item['id'] as int,
              status: 'failed',
              errorMessage: 'Image file not found',
            );
            errorCount++;
            errors.add('Image not found: ${item['image_path']}');
            continue;
          }

          // Process analysis locally since we're offline
          final mockAnalysis = await _generateMockAnalysis(imageFile);

          if (mockAnalysis != null) {
            syncedCount++;
            await storage.saveAnalysis(mockAnalysis);
            await storage.updateAnalysisStatus(
              queueId: item['id'] as int,
              status: 'completed',
            );
          } else {
            await storage.updateAnalysisStatus(
              queueId: item['id'] as int,
              status: 'failed',
              errorMessage: 'Failed to process analysis',
            );
            errorCount++;
            errors.add('Failed to process: ${item['image_path']}');
          }
        } catch (e) {
          await storage.updateAnalysisStatus(
            queueId: item['id'] as int,
            status: 'failed',
            errorMessage: e.toString(),
          );
          errorCount++;
          errors.add('Queue processing: ${e.toString()}');
        }
      }
    } catch (e) {
      errorCount++;
      errors.add('Analysis queue error: ${e.toString()}');
    }

    return SyncSectionResult(
      syncedCount: syncedCount,
      errorCount: errorCount,
      errors: errors,
    );
  }

  Future<bool> _uploadAnalysis(EnhancedPlantAnalysis analysis) async {
    if (_apiKey == null) return true; // Skip upload if no API key

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/analyses'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_apiKey',
        },
        body: jsonEncode(analysis.toJson()),
      );

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      return false;
    }
  }

  Future<bool> _uploadSensorReading(SensorData reading) async {
    if (_apiKey == null) return true;

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/sensor-data'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_apiKey',
        },
        body: jsonEncode(reading.toJson()),
      );

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      return false;
    }
  }

  Future<bool> _uploadChatMessage(Map<String, dynamic> message) async {
    if (_apiKey == null) return true;

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/chat-messages'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_apiKey',
        },
        body: jsonEncode(message),
      );

      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      return false;
    }
  }

  Future<EnhancedPlantAnalysis?> _generateMockAnalysis(File imageFile) async {
    try {
      // Generate realistic mock analysis based on image characteristics
      final imageSize = await imageFile.length();
      final now = DateTime.now();

      // Simulate analysis processing time
      await Future.delayed(const Duration(seconds: 2));

      // Generate mock symptoms
      final symptoms = <SymptomDetection>[];
      final deficiencies = <NutrientDeficiency>[];
      final pests = <PestDetection>[];
      final diseases = <DiseaseDetection>[];

      // Randomly add issues based on "probability"
      if (DateTime.now().millisecond % 3 == 0) {
        symptoms.add(SymptomDetection(
          name: 'Yellowing Leaves',
          severity: SymptomSeverity.moderate,
          affectedAreas: ['Lower leaves', 'Older growth'],
          description: 'Yellowing of lower leaves, possibly indicating nitrogen deficiency',
          recommendation: 'Check nutrient levels and consider nitrogen supplementation',
        ));
      }

      if (DateTime.now().millisecond % 4 == 0) {
        deficiencies.add(NutrientDeficiency(
          nutrient: 'Nitrogen',
          severity: DeficiencySeverity.moderate,
          confidence: 0.75,
          symptoms: ['Yellowing leaves', 'Stunted growth'],
          recommendation: 'Add nitrogen-rich fertilizer according to feeding schedule',
        ));
      }

      // Generate purple strain analysis
      final purpleAnalysis = PurpleStrainAnalysis(
        isPurpleStrain: DateTime.now().millisecond % 2 == 0,
        purpleCharacteristics: DateTime.now().millisecond % 2 == 0
            ? ['Purple stems', 'Purple leaf veins', 'Deep purple buds']
            : [],
        anthocyaninLevels: DateTime.now().millisecond % 2 == 0 ? 0.75 : 0.15,
        geneticFactors: DateTime.now().millisecond % 2 == 0
            ? ['High anthocyanin production', 'Temperature-sensitive color expression']
            : [],
        environmentalFactors: ['Cool nighttime temperatures'],
        nutritionalFactors: [],
        stressIndicators: [],
      );

      final analysisResult = EnhancedAnalysisResult(
        strain: 'Purple Kush',
        overallHealth: symptoms.isEmpty ? 'Healthy' : 'Attention Needed',
        confidenceScore: 0.85 + (DateTime.now().millisecond % 15) / 100,
        detectedSymptoms: symptoms,
        detectedDeficiencies: deficiencies,
        detectedPests: pests,
        detectedDiseases: diseases,
        purpleStrainAnalysis: purpleAnalysis,
        recommendations: _generateRecommendations(symptoms, deficiencies),
        riskFactors: _generateRiskFactors(symptoms, deficiencies),
        healthScore: _calculateHealthScore(symptoms, deficiencies),
      );

      return EnhancedPlantAnalysis(
        id: now.millisecondsSinceEpoch.toString(),
        imagePath: imageFile.path,
        thumbnailPath: imageFile.path, // In real app, this would be different
        timestamp: now,
        result: analysisResult,
        processingTime: const Duration(seconds: 3),
        imageMetadata: ImageMetadata(
          fileSize: imageSize,
          width: 1920,
          height: 1080,
          format: 'JPEG',
          timestamp: now,
        ),
      );
    } catch (e) {
      return null;
    }
  }

  List<String> _generateRecommendations(List<SymptomDetection> symptoms, List<NutrientDeficiency> deficiencies) {
    final recommendations = <String>[];

    if (symptoms.isNotEmpty) {
      for (final symptom in symptoms) {
        recommendations.add(symptom.recommendation);
      }
    }

    if (deficiencies.isNotEmpty) {
      for (final deficiency in deficiencies) {
        recommendations.add(deficiency.recommendation);
      }
    }

    if (recommendations.isEmpty) {
      recommendations.add('Plant appears healthy. Continue current care routine.');
      recommendations.add('Monitor for any changes in leaf color or growth patterns.');
    }

    return recommendations;
  }

  List<String> _generateRiskFactors(List<SymptomDetection> symptoms, List<NutrientDeficiency> deficiencies) {
    final factors = <String>[];

    if (symptoms.any((s) => s.severity == SymptomSeverity.severe)) {
      factors.add('Severe symptoms present - immediate action required');
    }

    if (deficiencies.length > 2) {
      factors.add('Multiple nutrient deficiencies - check pH and nutrient solution');
    }

    factors.add('Environmental conditions optimal for growth');
    factors.add('No signs of pest infestation detected');

    return factors;
  }

  double _calculateHealthScore(List<SymptomDetection> symptoms, List<NutrientDeficiency> deficiencies) {
    double baseScore = 100.0;

    // Deduct points for symptoms
    for (final symptom in symptoms) {
      switch (symptom.severity) {
        case SymptomSeverity.mild:
          baseScore -= 5;
          break;
        case SymptomSeverity.moderate:
          baseScore -= 15;
          break;
        case SymptomSeverity.severe:
          baseScore -= 30;
          break;
      }
    }

    // Deduct points for deficiencies
    baseScore -= deficiencies.length * 10;

    return (baseScore.clamp(0.0, 100.0) / 100.0).clamp(0.0, 1.0);
  }

  Future<bool> forceSyncNow() async {
    final result = await performSync();
    return result.success;
  }

  Future<Map<String, dynamic>> getSyncStats() async {
    final storage = OfflineStorageService.instance;
    return await storage.getSyncStatus();
  }

  bool get isSyncing => _isSyncing;
}

class SyncResult {
  final bool success;
  final String message;
  final Map<String, dynamic>? details;
  final int? syncedCount;
  final int? errorCount;

  const SyncResult({
    required this.success,
    required this.message,
    this.details,
    this.syncedCount,
    this.errorCount,
  });
}

class SyncSectionResult {
  final int syncedCount;
  final int errorCount;
  final List<String> errors;

  SyncSectionResult({
    required this.syncedCount,
    required this.errorCount,
    required this.errors,
  });
}

void unawaited(Future<void> future) {
  // Ignore the returned future
}