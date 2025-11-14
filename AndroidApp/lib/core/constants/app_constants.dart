class AppConstants {
  // App Information
  static const String appName = 'CannaAI Pro';
  static const String appVersion = '1.0.0';

  // API Configuration
  static const String baseUrl = 'http://192.168.1.100:3000'; // Default local server
  static const Duration apiTimeout = Duration(seconds: 30);
  static const int maxRetries = 3;

  // API Endpoints
  static const String analyzeEndpoint = '/api/analyze';
  static const String chatEndpoint = '/api/chat';
  static const String sensorsEndpoint = '/api/sensors';
  static const String strainsEndpoint = '/api/strains';
  static const String historyEndpoint = '/api/history';
  static const String automationEndpoint = '/api/automation';

  // WebSocket Configuration
  static const String socketUrl = 'http://192.168.1.100:3000';
  static const String socketPath = '/api/socketio';

  // Storage Keys
  static const String authTokenKey = 'auth_token';
  static const String userProfileKey = 'user_profile';
  static const String serverUrlKey = 'server_url';
  static const String themeModeKey = 'theme_mode';
  static const String notificationsKey = 'notifications_enabled';
  static const String autoSyncKey = 'auto_sync_enabled';
  static const String lastSyncKey = 'last_sync_timestamp';

  // Database
  static const String databaseName = 'canna_ai.db';
  static const int databaseVersion = 1;

  // Hive Boxes
  static const String analysisCacheBox = 'analysis_cache';
  static const String sensorDataBox = 'sensor_data';
  static const String strainProfilesBox = 'strain_profiles';
  static const String userPreferencesBox = 'user_preferences';

  // Sensor Data
  static const double defaultTempMin = 20.0; // Celsius
  static const double defaultTempMax = 28.0; // Celsius
  static const double defaultHumidityMin = 40.0; // Percent
  static const double defaultHumidityMax = 60.0; // Percent
  static const double defaultPhMin = 5.5;
  static const double defaultPhMax = 6.5;
  static const double defaultEcMin = 1.2; // mS/cm
  static const double defaultEcMax = 2.0; // mS/cm
  static const double defaultCo2Min = 800.0; // ppm
  static const double defaultCo2Max = 1200.0; // ppm

  // Automation Settings
  static const Duration defaultWateringDuration = Duration(seconds: 30);
  static const Duration defaultLightingOnTime = Duration(hours: 16);
  static const Duration defaultLightingOffTime = Duration(hours: 8);
  static const Duration sensorUpdateInterval = Duration(seconds: 30);
  static const Duration dataRetentionPeriod = Duration(days: 30);

  // Image Processing
  static const int maxImageSize = 1920; // pixels
  static const double imageQuality = 0.8; // compression
  static const List<String> supportedImageFormats = ['jpg', 'jpeg', 'png'];

  // Notifications
  static const String notificationChannelId = 'canna_ai_notifications';
  static const String notificationChannelName = 'CannaAI Notifications';
  static const String notificationChannelDescription = 'Notifications for CannaAI Pro';
  static const Duration notificationTimeout = Duration(seconds: 5);

  // Background Tasks
  static const String backgroundTaskName = 'sensor_data_sync';
  static const Duration backgroundTaskInterval = Duration(hours: 1);
  static const Duration backgroundTaskFlex = Duration(minutes: 15);

  // UI Constants
  static const double defaultPadding = 16.0;
  static const double smallPadding = 8.0;
  static const double largePadding = 24.0;
  static const double defaultBorderRadius = 12.0;
  static const double smallBorderRadius = 8.0;
  static const double largeBorderRadius = 16.0;

  // Animation Durations
  static const Duration shortAnimation = Duration(milliseconds: 200);
  static const Duration mediumAnimation = Duration(milliseconds: 300);
  static const Duration longAnimation = Duration(milliseconds: 500);

  // Chart Configuration
  static const int maxDataPoints = 100;
  static const Duration chartUpdateInterval = Duration(seconds: 5);
  static const List<Color> chartColors = [
    Color(0xFF2E7D32), // Primary Green
    Color(0xFF4CAF50), // Light Green
    Color(0xFF9C27B0), // Purple
    Color(0xFFFF8F00), // Orange
    Color(0xFF1976D2), // Blue
    Color(0xFFFF5722), // Deep Orange
  ];

  // Plant Growth Stages
  static const List<String> growthStages = [
    'Germination',
    'Seedling',
    'Vegetative',
    'Flowering',
    'Harvesting',
  ];

  // Strain Types
  static const List<String> strainTypes = [
    'Sativa',
    'Indica',
    'Hybrid',
    'CBD-dominant',
  ];

  // Common Nutrients
  static const List<String> commonNutrients = [
    'Nitrogen (N)',
    'Phosphorus (P)',
    'Potassium (K)',
    'Calcium (Ca)',
    'Magnesium (Mg)',
    'Sulfur (S)',
    'Iron (Fe)',
    'Manganese (Mn)',
    'Zinc (Zn)',
    'Copper (Cu)',
    'Boron (B)',
  ];

  // Common Plant Problems
  static const List<String> commonProblems = [
    'Overwatering',
    'Underwatering',
    'Nutrient Burn',
    'Nutrient Deficiency',
    'Light Burn',
    'Heat Stress',
    'Pest Infestation',
    'Mold/Fungus',
    'Root Rot',
    'pH Imbalance',
  ];

  // Feature Flags
  static const bool enableBluetoothSensors = true;
  static const bool enableCameraAnalysis = true;
  static const bool enableNotifications = true;
  static const bool enableBackgroundSync = true;
  static const bool enableOfflineMode = true;
  static const bool enableDarkMode = true;

  // Logging
  static const String logFileName = 'canna_ai.log';
  static const int maxLogFileSize = 10 * 1024 * 1024; // 10MB
  static const int maxLogFiles = 5;

  // Validation
  static const int minPasswordLength = 8;
  static const int maxStringLength = 255;
  static const int maxImageFileSize = 10 * 1024 * 1024; // 10MB
  static const double minTemperature = -10.0;
  static const double maxTemperature = 60.0;
  static const double minHumidity = 0.0;
  static const double maxHumidity = 100.0;
  static const double minPh = 0.0;
  static const double maxPh = 14.0;

  // Error Messages
  static const String networkErrorMessage = 'Network connection error. Please check your internet connection.';
  static const String serverErrorMessage = 'Server error. Please try again later.';
  static const String authErrorMessage = 'Authentication failed. Please login again.';
  static const String validationErrorMessage = 'Please check your input and try again.';
  static const String permissionErrorMessage = 'Permission denied. Please check app permissions.';
  static const String genericErrorMessage = 'An unexpected error occurred. Please try again.';

  // Success Messages
  static const String saveSuccessMessage = 'Data saved successfully.';
  static const String deleteSuccessMessage = 'Data deleted successfully.';
  static const String syncSuccessMessage = 'Data synchronized successfully.';
  static const String analysisSuccessMessage = 'Plant analysis completed successfully.';
  static const String settingsSuccessMessage = 'Settings updated successfully.';
}