# CannaAI Pro Architecture Documentation

This document provides a comprehensive overview of the CannaAI Pro application architecture, including system design, technology choices, and implementation patterns.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Mobile Application Architecture](#mobile-application-architecture)
- [Backend Architecture](#backend-architecture)
- [Data Architecture](#data-architecture)
- [Security Architecture](#security-architecture)
- [Communication Patterns](#communication-patterns)
- [Performance Architecture](#performance-architecture)
- [Scalability Considerations](#scalability-considerations)
- [Technology Stack](#technology-stack)
- [Design Patterns](#design-patterns)

## Overview

CannaAI Pro is built on a modern, scalable architecture that supports real-time sensor monitoring, AI-powered plant analysis, and intelligent automation. The system follows clean architecture principles with clear separation of concerns and modular design.

### Key Architectural Goals

1. **Modularity**: Independent, replaceable components
2. **Scalability**: Horizontal and vertical scaling capabilities
3. **Reliability**: Fault tolerance and graceful degradation
4. **Security**: End-to-end encryption and secure communication
5. **Performance**: Real-time processing with minimal latency
6. **Maintainability**: Clean code with comprehensive documentation

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile Apps   │    │   Web Portal    │    │  IoT Devices    │
│  (Android/iOS)  │    │   (Dashboard)   │    │   (Sensors)     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      API Gateway          │
                    │   (Load Balancer, Auth)   │
                    └─────────────┬─────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
┌─────────▼─────────┐ ┌─────────▼─────────┐ ┌─────────▼─────────┐
│  Application      │ │  Analysis        │ │  Automation      │
│  Services         │ │  Services        │ │  Services        │
│  (CRUD, Users)    │ │  (AI, ML)        │ │  (Control)       │
└─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │     Data Layer           │
                    │  (PostgreSQL, Redis,      │
                    │   S3, Time-Series DB)    │
                    └───────────────────────────┘
```

### Component Overview

- **Mobile Applications**: Native Flutter apps for Android and iOS
- **Web Portal**: React-based dashboard for growers and administrators
- **API Gateway**: Central entry point with load balancing and authentication
- **Microservices**: Specialized services for different business domains
- **Data Layer**: Multi-database approach optimized for different data types

## Mobile Application Architecture

### Clean Architecture Implementation

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │     UI/Widgets  │ │   ViewModels    │ │  Navigation     │ │
│  │  (Flutter UI)   │ │  (Riverpod)     │ │  (Go Router)    │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    Domain Layer                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │    Entities     │ │   Use Cases     │ │ Repository I/F  │ │
│  │  (Business Obj) │ │ (App Logic)     │ │ (Data Contract) │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                     Data Layer                              │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │   Data Sources  │ │   Models        │ │  Network/API    │ │
│  │ (Local/Remote)  │ │ (DTO/Entities)  │ │ (HTTP/WebSocket)│ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Module Structure

```
lib/
├── core/                           # Shared core functionality
│   ├── constants/                  # App constants and config
│   │   ├── api_constants.dart
│   │   ├── app_constants.dart
│   │   └── route_constants.dart
│   ├── errors/                     # Custom error handling
│   │   ├── exceptions.dart
│   │   └── failures.dart
│   ├── utils/                      # Utility functions
│   │   ├── date_utils.dart
│   │   ├── validation.dart
│   │   └── encryption.dart
│   ├── theme/                      # App theming
│   │   ├── app_theme.dart
│   │   ├── colors.dart
│   │   └── text_styles.dart
│   └── widgets/                    # Reusable widgets
│       ├── custom_buttons.dart
│       ├── sensor_cards.dart
│       └── charts.dart
├── features/                       # Feature modules
│   ├── authentication/             # Auth feature
│   │   ├── data/
│   │   │   ├── datasources/
│   │   │   ├── models/
│   │   │   └── repositories/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   ├── repositories/
│   │   │   └── usecases/
│   │   └── presentation/
│   │       ├── pages/
│   │       ├── widgets/
│   │       └── providers/
│   ├── dashboard/                  # Dashboard feature
│   ├── automation/                 # Automation feature
│   ├── analytics/                  # Analytics feature
│   └── settings/                   # Settings feature
└── services/                       # App-wide services
    ├── api_service.dart
    ├── socket_service.dart
    ├── notification_service.dart
    ├── storage_service.dart
    └── biometric_service.dart
```

### State Management Architecture

Using **Riverpod** with the following pattern:

1. **State Providers**: For immutable state
2. **Future Providers**: For async operations
3. **Stream Providers**: For real-time data
4. **Notifier Providers**: For complex state logic

```dart
// Example: Sensor Data Provider
final sensorDataProvider = StateNotifierProvider<SensorDataNotifier, SensorDataState>((ref) {
  return SensorDataNotifier(ref.watch(apiServiceProvider));
});

class SensorDataNotifier extends StateNotifier<SensorDataState> {
  SensorDataNotifier(this._apiService) : super(const SensorDataState.initial());

  final ApiService _apiService;

  Future<void> fetchSensorData(String roomId) async {
    state = const SensorDataState.loading();

    try {
      final data = await _apiService.fetchSensorData(roomId);
      state = SensorDataState.loaded(data);
    } catch (e) {
      state = SensorDataState.error(e.toString());
    }
  }
}
```

## Backend Architecture

### Microservices Architecture

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   User Service  │ │  Sensor Service │ │ Analysis        │
│                 │ │                 │ │ Service         │
│ - Auth/Author   │ │ - Data Ingestion │ │ - Image Process │
│ - Profile Mgmt  │ │ - Real-time WS   │ │ - ML Models     │
│ - Preferences   │ │ - Data Storage   │ │ - Results       │
└─────────┬───────┘ └─────────┬───────┘ └─────────┬───────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Automation      │ │ Analytics       │ │ Notification    │
│ Service         │ │ Service         │ │ Service         │
│                 │ │                 │ │                 │
│ - Device Control│ │ - Data Aggregation│ │ - Push Notifications│
│ - Scheduling    │ │ - Reporting      │ │ - Email/ SMS    │
│ - Rule Engine   │ │ - Predictions    │ │ - Alerts        │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Service Communication

- **Synchronous**: REST APIs for request/response patterns
- **Asynchronous**: Message queues for background processing
- **Real-time**: WebSockets for live data streaming
- **Event-driven**: Pub/Sub for decoupled communication

### API Gateway Responsibilities

- **Request Routing**: Route requests to appropriate microservices
- **Authentication**: Validate JWT tokens and enforce security
- **Rate Limiting**: Prevent API abuse and ensure fair usage
- **Load Balancing**: Distribute traffic across service instances
- **Caching**: Cache frequent requests to improve performance

## Data Architecture

### Database Strategy

Multi-database approach optimized for different data types:

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   PostgreSQL    │ │     Redis       │ │ InfluxDB        │
│                 │ │                 │ │                 │
│ - User Data     │ │ - Session Cache │ │ - Sensor Data   │
│ - Room Config   │ │ - Real-time Data│ │ - Time Series   │
│ - Settings      │ │ - API Cache     │ │ - Metrics       │
│ - Audit Logs    │ │ - Job Queues    │ │ - Performance   │
└─────────────────┘ └─────────────────┘ └─────────────────┘

┌─────────────────┐ ┌─────────────────┐
│   AWS S3        │ │   Elasticsearch │
│                 │ │                 │
│ - Images        │ │ - Search Index  │
│ - Reports       │ │ - Logs          │
│ - Backups       │ │ - Analytics     │
│ - ML Models     │ │ - Monitoring    │
└─────────────────┘ └─────────────────┘
```

### Data Flow Patterns

1. **Write Path**: API → Validation → Business Logic → Database(s)
2. **Read Path**: Cache → Database(s) → Aggregation → API Response
3. **Real-time Path**: IoT Device → Stream Processing → WebSocket → Client

### Data Consistency

- **Strong Consistency**: Critical data (user settings, automation rules)
- **Eventual Consistency**: Analytics data, historical records
- **Cache Invalidation**: TTL-based and event-driven invalidation

## Security Architecture

### Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Security                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │   Input Val.    │ │   Auth/Author   │ │  Rate Limiting  │ │
│  │  (Validation)   │ │  (JWT, OAuth)   │ │ (DDoS Protection)│ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                  Network Security                           │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │   TLS/SSL       │ │  Certificate    │ │   Firewall      │ │
│  │  (Encryption)   │ │   Pinning       │ │  (WAF)          │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    Data Security                            │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │ Encryption at   │ │   Access Control│ │   Audit Logging │ │
│  │     Rest        │ │   (RBAC)        │ │  (Compliance)   │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Authentication & Authorization

- **JWT Tokens**: Stateless authentication with refresh tokens
- **Role-Based Access Control**: Granular permissions by user role
- **Multi-Factor Authentication**: Enhanced security for sensitive operations
- **OAuth 2.0**: Third-party integration support

### Data Encryption

- **In Transit**: TLS 1.3 for all network communication
- **At Rest**: AES-256 encryption for sensitive data
- **End-to-End**: Client-side encryption for sensitive images
- **Key Management**: AWS KMS or equivalent for key rotation

## Communication Patterns

### REST API Design

Following REST principles with HATEOAS:

```json
{
  "data": {
    "id": "room_123",
    "name": "Grow Room 1",
    "temperature": 25.5
  },
  "links": {
    "self": "/api/rooms/room_123",
    "sensor_data": "/api/rooms/room_123/sensors",
    "automation": "/api/rooms/room_123/automation"
  }
}
```

### WebSocket Events

Real-time bidirectional communication:

```javascript
// Client → Server
socket.emit('subscribe_room', { room_id: 'room_123' });

// Server → Client
socket.emit('sensor_update', {
  room_id: 'room_123',
  data: { temperature: 25.5, humidity: 65.2 }
});
```

### Event-Driven Architecture

Using message queues for asynchronous processing:

```
Producer → Message Queue → Consumer (Worker)
  │                         │
  └─> Image Upload     └─> ML Processing
  └─> Sensor Data      └─> Data Aggregation
  └─> User Action      └─> Notification Sending
```

## Performance Architecture

### Caching Strategy

Multi-level caching approach:

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   CDN Cache     │ │   API Gateway   │ │   Application   │
│                 │ │     Cache       │ │     Cache       │
│ - Static Assets │ │ - API Responses │ │ - Database      │
│ - Images        │ │ - Sessions      │ │ - Computations  │
└─────────────────┘ └─────────────────┘ └─────────────────┘

┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Database      │ │    External     │ │   Client Side   │
│   Cache         │ │    Services     │ │     Cache       │
│                 │ │                 │ │                 │
│ - Query Results │ │ - Third-party    │ │ - Images        │
│ - Indexed Data  │ │   APIs          │ │ - API Responses │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Performance Optimizations

1. **Database Optimization**
   - Connection pooling
   - Query optimization
   - Indexing strategy
   - Read replicas

2. **Application Optimization**
   - Lazy loading
   - Pagination
   - Compression
   - Minification

3. **Network Optimization**
   - HTTP/2 support
   - Gzip compression
   - CDN distribution
   - Edge computing

## Scalability Considerations

### Horizontal Scaling

- **Stateless Services**: Easy horizontal scaling
- **Load Balancing**: Distribute traffic efficiently
- **Auto-scaling**: Scale based on demand
- **Microservices**: Independent scaling of components

### Database Scaling

- **Read Replicas**: Distribute read operations
- **Sharding**: Partition data by logical boundaries
- **Connection Pooling**: Optimize database connections
- **Caching Layers**: Reduce database load

### Resource Management

- **Rate Limiting**: Prevent resource exhaustion
- **Circuit Breakers**: Handle service failures gracefully
- **Resource Quotas**: Limit resource usage per user
- **Monitoring**: Track resource utilization

## Technology Stack

### Frontend (Mobile)

- **Framework**: Flutter 3.19+
- **Language**: Dart 3.1+
- **State Management**: Riverpod 2.5+
- **Navigation**: Go Router 14+
- **HTTP Client**: Dio 5.4+
- **Real-time**: Socket.IO Client
- **Local Storage**: Hive, SQLite
- **Charts**: FL Chart, Syncfusion

### Backend

- **Language**: Node.js (TypeScript), Python (ML Services)
- **Framework**: Express.js, FastAPI
- **Database**: PostgreSQL, Redis, InfluxDB
- **Message Queue**: RabbitMQ, AWS SQS
- **Search**: Elasticsearch
- **File Storage**: AWS S3, Google Cloud Storage
- **ML/AI**: TensorFlow, PyTorch, OpenAI API

### Infrastructure

- **Cloud**: AWS / Google Cloud Platform
- **Containerization**: Docker, Kubernetes
- **CI/CD**: GitHub Actions, Jenkins
- **Monitoring**: Prometheus, Grafana
- **Logging**: ELK Stack
- **CDN**: Cloudflare, AWS CloudFront

## Design Patterns

### Clean Architecture

Separation of concerns with dependency inversion:

```
┌─────────────────┐    depends on    ┌─────────────────┐
│   Presentation  │ ───────────────► │    Domain       │
│                 │                 │                 │
│   UI/Widgets    │                 │  Use Cases      │
│   ViewModels    │                 │  Entities       │
└─────────────────┘                 └─────────────────┘
                                     │
                               depends on
                                     │
┌─────────────────┐                 ┌─────────────────┐
│      Data       │ ◄────────────── │   Interfaces    │
│                 │                 │                 │
│  Repositories   │                 │  Repository     │
│  Data Sources   │                 │  Interfaces     │
└─────────────────┘                 └─────────────────┘
```

### Repository Pattern

Abstract data access with clean interfaces:

```dart
abstract class SensorRepository {
  Future<List<SensorReading>> getReadings(String roomId, {DateTimeRange? range});
  Future<SensorReading?> getLatestReading(String roomId);
  Stream<SensorReading> getRealTimeReadings(String roomId);
  Future<void> saveReading(SensorReading reading);
}
```

### Factory Pattern

Create objects without specifying exact classes:

```dart
abstract class SensorFactory {
  SensorData createSensorData(Map<String, dynamic> json);
  SensorReading createSensorReading(Map<String, dynamic> json);
}

class JsonSensorFactory implements SensorFactory {
  @override
  SensorData createSensorData(Map<String, dynamic> json) {
    return SensorData.fromJson(json);
  }
}
```

### Observer Pattern

Real-time data updates:

```dart
abstract class SensorObserver {
  void onSensorUpdate(String roomId, SensorData data);
}

class SensorNotifier {
  final List<SensorObserver> _observers = [];

  void addObserver(SensorObserver observer) {
    _observers.add(observer);
  }

  void notifyObservers(String roomId, SensorData data) {
    for (final observer in _observers) {
      observer.onSensorUpdate(roomId, data);
    }
  }
}
```

This architecture documentation provides a comprehensive overview of the CannaAI Pro system design, ensuring maintainability, scalability, and performance for long-term growth and development.