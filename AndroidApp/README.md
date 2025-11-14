# CannaAI Pro 🌱

[![CI/CD](https://github.com/cannaai/canna_ai_flutter/actions/workflows/build.yml/badge.svg)](https://github.com/cannaai/canna_ai_flutter/actions/workflows/build.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-android%20%7C%20ios-lightgrey.svg)](README.md)
[![Flutter Version](https://img.shields.io/badge/flutter-3.19.0+-blue.svg)](https://flutter.dev/docs/development/tools/sdk-releases)

**CannaAI Pro** is an advanced cannabis cultivation management system that leverages AI-powered plant health analysis, real-time sensor monitoring, and intelligent automation to optimize growing conditions and maximize yields.

## ✨ Features

### 🌿 Plant Health Analysis
- **AI-Powered Diagnosis**: Advanced machine learning algorithms analyze plant images to detect diseases, nutrient deficiencies, and pest infestations
- **Confidence Scoring**: Provides probability-based recommendations with confidence intervals
- **Strain-Specific Insights**: Tailored recommendations for different cannabis strains
- **Historical Tracking**: Monitor plant health progression over time with visual timelines

### 📡 Real-Time Sensor Monitoring
- **Multi-Room Support**: Monitor up to 10 growing rooms simultaneously
- **Comprehensive Metrics**: Temperature, humidity, pH, EC, CO2, and VPD monitoring
- **WebSocket Integration**: Real-time data streaming with automatic reconnection
- **Alert System**: Customizable thresholds with push notifications for critical conditions

### 🤖 Intelligent Automation
- **Smart Watering**: Automated irrigation based on soil moisture and plant needs
- **Climate Control**: Dynamic adjustment of temperature and humidity setpoints
- **Light Management**: Automated lighting schedules for vegetative and flowering stages
- **Integration Ready**: Connect with popular grow controllers and IoT devices

### 📊 Advanced Analytics
- **Performance Metrics**: Yield predictions and growth rate analysis
- **Environmental Trends**: Historical data visualization with predictive analytics
- **Cost Tracking**: Monitor water, nutrient, and energy consumption
- **Export Capabilities**: Generate reports for compliance and optimization

### 🔒 Security & Compliance
- **End-to-End Encryption**: All data encrypted at rest and in transit
- **Offline Mode**: Full functionality without internet connection
- **Data Backup**: Automatic cloud and local backup options
- **Compliance Ready**: Built-in tracking for regulatory requirements

## Tech Stack

- **Framework**: Flutter 3.19+
- **Language**: Dart 3.1+
- **State Management**: Riverpod 2.5+
- **Navigation**: Go Router 14+
- **HTTP Client**: Dio 5.4+
- **Real-time**: Socket.IO 2.0+
- **Local Database**: SQLite with Prisma/Drift
- **Local Storage**: Hive for caching
- **Background Tasks**: WorkManager
- **Notifications**: Flutter Local Notifications
- **Charts**: FL Chart & Syncfusion Charts
- **Camera**: Camera & Image Picker
- **Bluetooth**: Flutter Bluetooth Serial

## Getting Started

### Prerequisites

- Flutter SDK 3.19 or higher
- Dart SDK 3.1 or higher
- Android Studio or VS Code with Flutter extensions
- Android device or emulator (Android API 21+)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd canna_ai_android
   ```

2. Install dependencies:
   ```bash
   flutter pub get
   ```

3. Generate code (if needed):
   ```bash
   flutter packages pub run build_runner build
   ```

4. Run the app:
   ```bash
   flutter run
   ```

## Configuration

### Server Configuration

Update the server URL in `lib/core/constants/app_constants.dart`:

```dart
static const String baseUrl = 'http://192.168.1.100:3000';
static const String socketUrl = 'http://192.168.1.100:3000';
```

### Permissions

The app requires the following permissions:

- **Internet & Network**: For API communication
- **Camera**: For plant photo analysis
- **Storage**: For saving photos and data
- **Bluetooth**: For sensor connectivity
- **Location**: For Bluetooth scanning (Android 10+)
- **Notifications**: For alerts and reminders

### Security Configuration

The app uses network security configuration to allow HTTP connections during development. For production, update the network security config in `android/app/src/main/res/xml/network_security_config.xml`.

## Project Structure

```
lib/
├── core/                    # Core functionality
│   ├── constants/          # App constants and configuration
│   ├── models/             # Data models
│   ├── router/             # Navigation and routing
│   ├── services/           # API, socket, notification services
│   ├── theme/              # App theming and styling
│   └── utils/              # Utility functions
├── features/               # Feature modules
│   ├── analytics/          # Analytics and charts
│   ├── automation/         # Automation controls
│   ├── auth/               # Authentication
│   ├── dashboard/          # Main dashboard
│   ├── plant_analysis/     # AI plant analysis
│   ├── settings/           # App settings
│   ├── splash/             # Splash screen
│   └── strains/            # Strain management
└── main.dart               # App entry point
```

## Key Features Implementation

### Real-time Data

- WebSocket connections for live sensor data
- Background data synchronization
- Offline data caching
- Automatic reconnection handling

### AI Plant Analysis

- Camera integration for photo capture
- Image processing and compression
- API integration for analysis
- Results history and bookmarking

### Automation System

- Device control via API calls
- Scheduling and automation rules
- Real-time status monitoring
- Manual override capabilities

### Notifications

- Local push notifications
- Custom notification channels
- Background task notifications
- Alert prioritization

## Development

### Code Generation

This project uses code generation for:

- JSON serialization (`build_runner` -> `json_serializable`)
- Retrofit API clients (`retrofit_generator`)
- Riverpod providers (`riverpod_generator`)
- Hive adapters (`hive_generator`)

Run code generation after making changes:
```bash
flutter packages pub run build_runner build --delete-conflicting-outputs
```

### State Management

The app uses Riverpod for state management with the following pattern:

- **Providers**: For state and business logic
- **ConsumerWidgets**: For UI that depends on state
- **ConsumerStatefulWidget**: For stateful widgets with complex lifecycle

### API Integration

- Uses Dio for HTTP client with interceptors
- Retrofit for type-safe API clients
- Automatic retry and error handling
- Request/response logging

### Testing

```bash
# Run unit tests
flutter test

# Run integration tests
flutter test integration_test/
```

## Build and Deployment

### Debug Build
```bash
flutter build apk --debug
```

### Release Build
```bash
flutter build apk --release
```

### App Bundle (for Play Store)
```bash
flutter build appbundle --release
```

## Environment Variables

Create a `.env` file in the root directory:

```
API_BASE_URL=http://192.168.1.100:3000
SOCKET_URL=http://192.168.1.100:3000
ENABLE_NOTIFICATIONS=true
ENABLE_BLUETOOTH=true
```

## Troubleshooting

### Common Issues

1. **Camera Permission Denied**
   - Check AndroidManifest.xml permissions
   - Verify permission handling in code

2. **WebSocket Connection Failed**
   - Check server URL configuration
   - Verify network connectivity
   - Check firewall settings

3. **Background Tasks Not Working**
   - Verify WorkManager configuration
   - Check battery optimization settings
   - Verify background permissions

4. **Bluetooth Not Connecting**
   - Check location permissions (Android 10+)
   - Verify Bluetooth is enabled
   - Check device compatibility

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the troubleshooting section