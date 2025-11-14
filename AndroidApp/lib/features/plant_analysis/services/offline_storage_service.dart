import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as path;
import '../models/enhanced_plant_analysis.dart';
import '../models/sensor_data.dart';
import 'image_processing_service.dart';

void unawaited(Future<void> future) {
  // Ignore the returned future to prevent warning
}

class OfflineStorageService {
  static OfflineStorageService? _instance;
  static Database? _database;
  SharedPreferences? _prefs;

  OfflineStorageService._();

  static OfflineStorageService get instance {
    _instance ??= OfflineStorageService._();
    return _instance!;
  }

  Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
    _database = await _initDatabase();
  }

  Future<Database> _initDatabase() async {
    final databasePath = await getDatabasesPath();
    final dbPath = path.join(databasePath, 'cannai_offline.db');

    return await openDatabase(
      dbPath,
      version: 1,
      onCreate: (db, version) async {
        await _createTables(db);
      },
    );
  }

  Future<void> _createTables(Database db) async {
    // Analysis history table
    await db.execute('''
      CREATE TABLE analyses (
        id TEXT PRIMARY KEY,
        image_path TEXT,
        thumbnail_path TEXT,
        analysis_data TEXT,
        timestamp INTEGER,
        strain TEXT,
        overall_health TEXT,
        confidence_score REAL,
        is_synced INTEGER DEFAULT 0,
        server_id TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // Sensor data table
    await db.execute('''
      CREATE TABLE sensor_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        temperature REAL,
        humidity REAL,
        ph REAL,
        ec REAL,
        co2 REAL,
        vpd REAL,
        light_intensity REAL,
        timestamp INTEGER,
        room_id TEXT,
        is_synced INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // Chat messages table
    await db.execute('''
      CREATE TABLE chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_text TEXT,
        is_user_message INTEGER,
        analysis_context TEXT,
        sensor_data_context TEXT,
        timestamp INTEGER,
        is_synced INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // Analysis queue for offline processing
    await db.execute('''
      CREATE TABLE analysis_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_path TEXT,
        analysis_type TEXT,
        priority INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        processed_at INTEGER
      )
    ''');

    // Create indexes for performance
    await db.execute('CREATE INDEX idx_analyses_timestamp ON analyses(timestamp DESC)');
    await db.execute('CREATE INDEX idx_sensor_timestamp ON sensor_readings(timestamp DESC)');
    await db.execute('CREATE INDEX idx_chat_timestamp ON chat_messages(timestamp DESC)');
    await db.execute('CREATE INDEX idx_queue_status ON analysis_queue(status, priority DESC)');
  }

  // Analysis History Management
  Future<void> saveAnalysis(EnhancedPlantAnalysis analysis) async {
    if (_database == null) await initialize();

    final analysisJson = jsonEncode(analysis.toJson());
    final timestamp = analysis.timestamp.millisecondsSinceEpoch;

    await _database!.insert(
      'analyses',
      {
        'id': analysis.id,
        'image_path': analysis.imagePath,
        'thumbnail_path': analysis.thumbnailPath,
        'analysis_data': analysisJson,
        'timestamp': timestamp,
        'strain': analysis.result.strain,
        'overall_health': analysis.result.overallHealth,
        'confidence_score': analysis.result.confidenceScore,
        'is_synced': 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );

    // Update cache
    await _updateAnalysesCache();
  }

  Future<List<EnhancedPlantAnalysis>> getAnalyses({
    int? limit,
    int? offset,
    String? strain,
    String? healthStatus,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    if (_database == null) await initialize();

    String whereClause = '1=1';
    List<dynamic> whereArgs = [];

    if (strain != null) {
      whereClause += ' AND strain = ?';
      whereArgs.add(strain);
    }

    if (healthStatus != null) {
      whereClause += ' AND overall_health = ?';
      whereArgs.add(healthStatus);
    }

    if (startDate != null) {
      whereClause += ' AND timestamp >= ?';
      whereArgs.add(startDate.millisecondsSinceEpoch);
    }

    if (endDate != null) {
      whereClause += ' AND timestamp <= ?';
      whereArgs.add(endDate.millisecondsSinceEpoch);
    }

    whereClause += ' ORDER BY timestamp DESC';

    if (limit != null) {
      whereClause += ' LIMIT ?';
      whereArgs.add(limit);
    }

    if (offset != null) {
      whereClause += ' OFFSET ?';
      whereArgs.add(offset);
    }

    final results = await _database!.query(
      'analyses',
      where: whereClause,
      whereArgs: whereArgs,
    );

    return results.map((result) {
      final analysisJson = jsonDecode(result['analysis_data'] as String);
      return EnhancedPlantAnalysis.fromJson(analysisJson);
    }).toList();
  }

  Future<EnhancedPlantAnalysis?> getAnalysis(String id) async {
    if (_database == null) await initialize();

    final results = await _database!.query(
      'analyses',
      where: 'id = ?',
      whereArgs: [id],
      limit: 1,
    );

    if (results.isEmpty) return null;

    final analysisJson = jsonDecode(results.first['analysis_data'] as String);
    return EnhancedPlantAnalysis.fromJson(analysisJson);
  }

  Future<void> deleteAnalysis(String id) async {
    if (_database == null) await initialize();

    await _database!.delete(
      'analyses',
      where: 'id = ?',
      whereArgs: [id],
    );

    // Update cache
    await _updateAnalysesCache();
  }

  // Sensor Data Management
  Future<void> saveSensorData(SensorData sensorData) async {
    if (_database == null) await initialize();

    await _database!.insert(
      'sensor_readings',
      {
        'temperature': sensorData.temperature,
        'humidity': sensorData.humidity,
        'ph': sensorData.ph,
        'ec': sensorData.ec,
        'co2': sensorData.co2,
        'vpd': sensorData.vpd,
        'light_intensity': sensorData.lightIntensity,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
        'room_id': sensorData.roomId ?? 'default',
        'is_synced': 0,
      },
    );

    // Update cache
    await _updateSensorCache();
  }

  Future<List<SensorData>> getSensorData({
    int? limit,
    int? hoursBack,
    String? roomId,
  }) async {
    if (_database == null) await initialize();

    String whereClause = '1=1';
    List<dynamic> whereArgs = [];

    if (roomId != null) {
      whereClause += ' AND room_id = ?';
      whereArgs.add(roomId);
    }

    if (hoursBack != null) {
      final timestamp = DateTime.now().subtract(Duration(hours: hoursBack));
      whereClause += ' AND timestamp >= ?';
      whereArgs.add(timestamp.millisecondsSinceEpoch);
    }

    whereClause += ' ORDER BY timestamp DESC';

    if (limit != null) {
      whereClause += ' LIMIT ?';
      whereArgs.add(limit);
    }

    final results = await _database!.query(
      'sensor_readings',
      where: whereClause,
      whereArgs: whereArgs,
    );

    return results.map((result) => SensorData(
      temperature: result['temperature'] as double,
      humidity: result['humidity'] as double,
      ph: result['ph'] as double,
      ec: result['ec'] as double,
      co2: result['co2'] as int,
      vpd: result['vpd'] as double,
      lightIntensity: result['light_intensity'] as int,
      roomId: result['room_id'] as String?,
    )).toList();
  }

  // Chat Messages Management
  Future<void> saveChatMessage({
    required String messageText,
    required bool isUserMessage,
    String? analysisContext,
    String? sensorDataContext,
  }) async {
    if (_database == null) await initialize();

    await _database!.insert(
      'chat_messages',
      {
        'message_text': messageText,
        'is_user_message': isUserMessage ? 1 : 0,
        'analysis_context': analysisContext,
        'sensor_data_context': sensorDataContext,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
        'is_synced': 0,
      },
    );
  }

  Future<List<Map<String, dynamic>>> getChatMessages({int? limit}) async {
    if (_database == null) await initialize();

    String query = 'SELECT * FROM chat_messages ORDER BY timestamp DESC';
    if (limit != null) {
      query += ' LIMIT ?';
    }

    final results = await _database!.rawQuery(query, limit != null ? [limit] : null);
    return results;
  }

  // Analysis Queue Management
  Future<void> queueAnalysisForProcessing({
    required String imagePath,
    required String analysisType,
    int priority = 0,
  }) async {
    if (_database == null) await initialize();

    await _database!.insert(
      'analysis_queue',
      {
        'image_path': imagePath,
        'analysis_type': analysisType,
        'priority': priority,
        'status': 'pending',
        'retry_count': 0,
      },
    );
  }

  Future<List<Map<String, dynamic>>> getPendingAnalyses() async {
    if (_database == null) await initialize();

    return await _database!.query(
      'analysis_queue',
      where: 'status = ?',
      whereArgs: ['pending'],
      orderBy: 'priority DESC, created_at ASC',
    );
  }

  Future<void> updateAnalysisStatus({
    required int queueId,
    required String status,
    String? errorMessage,
  }) async {
    if (_database == null) await initialize();

    await _database!.update(
      'analysis_queue',
      {
        'status': status,
        'error_message': errorMessage,
        'processed_at': DateTime.now().millisecondsSinceEpoch,
      },
      where: 'id = ?',
      whereArgs: [queueId],
    );
  }

  // Cache Management
  Future<void> _updateAnalysesCache() async {
    if (_prefs == null) return;

    final recentAnalyses = await getAnalyses(limit: 10);
    final analysesJson = recentAnalyses.map((a) => a.toJson()).toList();
    await _prefs!.setString('recent_analyses_cache', jsonEncode(analysesJson));
    await _prefs!.setInt('cache_timestamp', DateTime.now().millisecondsSinceEpoch);
  }

  Future<void> _updateSensorCache() async {
    if (_prefs == null) return;

    final recentSensorData = await getSensorData(limit: 24);
    final sensorJson = recentSensorData.map((s) => s.toJson()).toList();
    await _prefs!.setString('recent_sensor_cache', jsonEncode(sensorJson));
  }

  Future<List<EnhancedPlantAnalysis>?> getCachedAnalyses() async {
    if (_prefs == null) return null;

    final cacheTimestamp = _prefs!.getInt('cache_timestamp') ?? 0;
    final now = DateTime.now().millisecondsSinceEpoch;

    // Cache valid for 30 minutes
    if (now - cacheTimestamp > 30 * 60 * 1000) {
      return null;
    }

    final cacheString = _prefs!.getString('recent_analyses_cache');
    if (cacheString == null) return null;

    try {
      final cacheJson = jsonDecode(cacheString) as List;
      return cacheJson.map((a) => EnhancedPlantAnalysis.fromJson(a)).toList();
    } catch (e) {
      return null;
    }
  }

  Future<List<SensorData>?> getCachedSensorData() async {
    if (_prefs == null) return null;

    final cacheString = _prefs!.getString('recent_sensor_cache');
    if (cacheString == null) return null;

    try {
      final cacheJson = jsonDecode(cacheString) as List;
      return cacheJson.map((s) => SensorData.fromJson(s)).toList();
    } catch (e) {
      return null;
    }
  }

  // Sync Status
  Future<Map<String, int>> getSyncStatus() async {
    if (_database == null) await initialize();

    final analysesResult = await _database!.rawQuery(
      'SELECT COUNT(*) as total, SUM(is_synced) as synced FROM analyses',
    );

    final sensorResult = await _database!.rawQuery(
      'SELECT COUNT(*) as total, SUM(is_synced) as synced FROM sensor_readings',
    );

    final chatResult = await _database!.rawQuery(
      'SELECT COUNT(*) as total, SUM(is_synced) as synced FROM chat_messages',
    );

    return {
      'analyses_total': analysesResult.first['total'] as int,
      'analyses_synced': analysesResult.first['synced'] as int ?? 0,
      'sensor_total': sensorResult.first['total'] as int,
      'sensor_synced': sensorResult.first['synced'] as int ?? 0,
      'chat_total': chatResult.first['total'] as int,
      'chat_synced': chatResult.first['synced'] as int ?? 0,
    };
  }

  // Cleanup
  Future<void> cleanupOldData({int daysToKeep = 30}) async {
    if (_database == null) await initialize();

    final cutoffDate = DateTime.now().subtract(Duration(days: daysToKeep));
    final cutoffTimestamp = cutoffDate.millisecondsSinceEpoch;

    // Delete old sensor readings
    await _database!.delete(
      'sensor_readings',
      where: 'timestamp < ? AND is_synced = 1',
      whereArgs: [cutoffTimestamp],
    );

    // Delete old chat messages
    await _database!.delete(
      'chat_messages',
      where: 'timestamp < ? AND is_synced = 1',
      whereArgs: [cutoffTimestamp],
    );

    // Delete processed analysis queue items older than 24 hours
    final queueCutoff = DateTime.now().subtract(const Duration(hours: 24));
    await _database!.delete(
      'analysis_queue',
      where: 'status IN ("completed", "failed") AND processed_at < ?',
      whereArgs: [queueCutoff.millisecondsSinceEpoch],
    );
  }

  Future<void> clearCache() async {
    if (_prefs == null) return;

    await _prefs!.remove('recent_analyses_cache');
    await _prefs!.remove('recent_sensor_cache');
    await _prefs!.remove('cache_timestamp');
  }

  // Storage Statistics
  Future<Map<String, dynamic>> getStorageStats() async {
    if (_database == null) await initialize();

    final analysesCount = Sqflite.firstIntValue(
      await _database!.rawQuery('SELECT COUNT(*) FROM analyses'),
    ) ?? 0;

    final sensorCount = Sqflite.firstIntValue(
      await _database!.rawQuery('SELECT COUNT(*) FROM sensor_readings'),
    ) ?? 0;

    final chatCount = Sqflite.firstIntValue(
      await _database!.rawQuery('SELECT COUNT(*) FROM chat_messages'),
    ) ?? 0;

    final queueCount = Sqflite.firstIntValue(
      await _database!.rawQuery('SELECT COUNT(*) FROM analysis_queue WHERE status = "pending"'),
    ) ?? 0;

    return {
      'total_analyses': analysesCount,
      'total_sensor_readings': sensorCount,
      'total_chat_messages': chatCount,
      'pending_analyses': queueCount,
      'last_updated': DateTime.now().toIso8601String(),
    };
  }
}