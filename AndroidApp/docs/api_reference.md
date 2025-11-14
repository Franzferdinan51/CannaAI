# CannaAI Pro API Reference

This document provides comprehensive API documentation for the CannaAI Pro mobile application and backend services.

## Table of Contents

- [Base URLs](#base-urls)
- [Authentication](#authentication)
- [Sensor Data API](#sensor-data-api)
- [Plant Analysis API](#plant-analysis-api)
- [Automation API](#automation-api)
- [Analytics API](#analytics-api)
- [User Management API](#user-management-api)
- [WebSocket API](#websocket-api)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [SDKs & Libraries](#sdks--libraries)

## Base URLs

```
Development: https://dev-api.cannaai.com
Staging: https://staging-api.cannaai.com
Production: https://api.cannaai.com
```

## Authentication

All API requests (except for authentication endpoints) require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "123456",
      "email": "user@example.com",
      "name": "John Doe",
      "subscription": "premium"
    },
    "expires_in": 3600
  }
}
```

### Refresh Token

```http
POST /auth/refresh
Authorization: Bearer <refresh_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

## Sensor Data API

### Get Sensor Readings

```http
GET /sensors/{room_id}/readings?start_date=2024-01-01&end_date=2024-01-02&limit=100
Authorization: Bearer <jwt_token>
```

**Parameters:**
- `room_id` (string, required): Room identifier
- `start_date` (string, optional): Start date in ISO 8601 format
- `end_date` (string, optional): End date in ISO 8601 format
- `limit` (integer, optional): Maximum number of readings (default: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "room_id": "room_1",
    "readings": [
      {
        "id": "reading_123",
        "timestamp": "2024-01-01T12:00:00Z",
        "temperature": 25.5,
        "humidity": 65.2,
        "ph": 6.8,
        "ec": 1.6,
        "co2": 800,
        "vpd": 1.2,
        "light_intensity": 500,
        "soil_moisture": 75.5
      }
    ],
    "pagination": {
      "total": 1500,
      "page": 1,
      "limit": 100
    }
  }
}
```

### Create Sensor Reading

```http
POST /sensors/{room_id}/readings
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "timestamp": "2024-01-01T12:00:00Z",
  "temperature": 25.5,
  "humidity": 65.2,
  "ph": 6.8,
  "ec": 1.6,
  "co2": 800,
  "vpd": 1.2,
  "light_intensity": 500,
  "soil_moisture": 75.5
}
```

### Get Latest Reading

```http
GET /sensors/{room_id}/latest
Authorization: Bearer <jwt_token>
```

### Get Sensor Statistics

```http
GET /sensors/{room_id}/stats?period=24h
Authorization: Bearer <jwt_token>
```

**Parameters:**
- `period` (string): Time period (1h, 6h, 24h, 7d, 30d)

## Plant Analysis API

### Analyze Plant Health

```http
POST /analyze/plant
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

{
  "image": <file>,
  "strain": "Blue Dream",
  "stage": "flowering",
  "symptoms": ["yellowing", "spotting"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis_id": "analysis_123",
    "confidence": 0.95,
    "health_status": "healthy",
    "issues_detected": [
      {
        "type": "nutrient_deficiency",
        "severity": "low",
        "description": "Slight nitrogen deficiency detected",
        "affected_areas": ["lower_leaves"]
      }
    ],
    "recommendations": [
      {
        "action": "increase_nitrogen",
        "urgency": "medium",
        "description": "Increase nitrogen levels in nutrient solution"
      }
    ],
    "predicted_yield": 0.85,
    "harvest_estimate": "2024-02-15",
    "image_analysis": {
      "color_analysis": {
        "green_percentage": 78.5,
        "yellow_percentage": 15.2,
        "brown_percentage": 6.3
      },
      "leaf_count": 47,
      "plant_height": 45.2
    }
  }
}
```

### Get Analysis History

```http
GET /analyze/history?plant_id=plant_123&limit=50
Authorization: Bearer <jwt_token>
```

### Get Analysis Details

```http
GET /analyze/{analysis_id}
Authorization: Bearer <jwt_token>
```

## Automation API

### Get Automation Settings

```http
GET /automation/{room_id}/settings
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "room_id": "room_1",
    "watering": {
      "enabled": true,
      "threshold": 30.0,
      "duration": 30,
      "schedule": ["06:00", "18:00"]
    },
    "lighting": {
      "enabled": true,
      "on_time": "06:00",
      "off_time": "22:00",
      "intensity": 75
    },
    "climate": {
      "target_temperature": 24.0,
      "target_humidity": 60.0,
      "tolerance": 2.0
    }
  }
}
```

### Update Automation Settings

```http
PUT /automation/{room_id}/settings
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "watering": {
    "enabled": true,
    "threshold": 35.0,
    "duration": 45,
    "schedule": ["06:00", "14:00", "22:00"]
  },
  "lighting": {
    "enabled": true,
    "on_time": "06:00",
    "off_time": "23:00",
    "intensity": 80
  }
}
```

### Execute Automation Action

```http
POST /automation/{room_id}/execute
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "action": "water",
  "duration": 30,
  "force": true
}
```

### Get Automation History

```http
GET /automation/{room_id}/history?start_date=2024-01-01&limit=100
Authorization: Bearer <jwt_token>
```

## Analytics API

### Get Growth Analytics

```http
GET /analytics/growth/{room_id}?period=30d
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "room_id": "room_1",
    "period": "30d",
    "growth_metrics": {
      "average_height_increase": 2.5,
      "total_yield": 450.2,
      "growth_rate": 0.85,
      "health_score": 0.92
    },
    "environmental_averages": {
      "temperature": 24.5,
      "humidity": 62.1,
      "ph": 6.7,
      "ec": 1.8
    },
    "efficiency_metrics": {
      "water_usage": 125.5,
      "energy_consumption": 45.2,
      "nutrient_efficiency": 0.88
    }
  }
}
```

### Get Yield Predictions

```http
GET /analytics/yield-prediction/{room_id}
Authorization: Bearer <jwt_token>
```

### Get Cost Analysis

```http
GET /analytics/costs/{room_id}?period=30d
Authorization: Bearer <jwt_token>
```

### Export Data

```http
POST /analytics/export
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "room_ids": ["room_1", "room_2"],
  "data_types": ["sensor", "automation", "analysis"],
  "format": "csv",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

## User Management API

### Get User Profile

```http
GET /user/profile
Authorization: Bearer <jwt_token>
```

### Update User Profile

```http
PUT /user/profile
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "John Doe",
  "notification_preferences": {
    "email": true,
    "push": true,
    "critical_alerts": true
  }
}
```

### Get User Rooms

```http
GET /user/rooms
Authorization: Bearer <jwt_token>
```

### Create Room

```http
POST /user/rooms
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Grow Room 1",
  "description": "Main flowering room",
  "size": 20.5,
  "lighting_type": "LED",
  "strain": "Blue Dream"
}
```

## WebSocket API

### Connection

```javascript
const socket = io('wss://api.cannaai.com/socket', {
  auth: {
    token: 'jwt_token_here'
  }
});
```

### Events

#### sensor:update

```json
{
  "event": "sensor:update",
  "data": {
    "room_id": "room_1",
    "reading": {
      "timestamp": "2024-01-01T12:00:00Z",
      "temperature": 25.5,
      "humidity": 65.2
    }
  }
}
```

#### automation:executed

```json
{
  "event": "automation:executed",
  "data": {
    "room_id": "room_1",
    "action": "water",
    "duration": 30,
    "success": true
  }
}
```

#### alert:triggered

```json
{
  "event": "alert:triggered",
  "data": {
    "room_id": "room_1",
    "alert_type": "temperature_high",
    "severity": "warning",
    "message": "Temperature exceeded threshold",
    "value": 28.5,
    "threshold": 27.0
  }
}
```

## Error Handling

All API errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "temperature",
      "issue": "Value must be between 0 and 50"
    }
  },
  "request_id": "req_123456789"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | Authentication token missing or invalid |
| `AUTHORIZATION_DENIED` | 403 | User does not have permission |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | API rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## Rate Limiting

API endpoints are rate-limited to ensure fair usage:

- **Standard endpoints**: 100 requests per minute
- **Upload endpoints**: 10 requests per minute
- **Analytics endpoints**: 50 requests per minute

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## SDKs & Libraries

### Flutter/Dart SDK

```yaml
dependencies:
  canna_ai_sdk: ^1.0.0
```

```dart
import 'package:canna_ai_sdk/canna_ai_sdk.dart';

// Initialize client
final client = CannaAIClient(
  baseUrl: 'https://api.cannaai.com',
  apiKey: 'your_api_key',
);

// Get sensor data
final readings = await client.sensors.getReadings('room_1');

// Analyze plant
final analysis = await client.analysis.analyzePlant(
  image: File('plant.jpg'),
  strain: 'Blue Dream',
);
```

### Python SDK

```python
from canna_ai import CannaAIClient

client = CannaAIClient(api_key='your_api_key')

# Get sensor data
readings = client.sensors.get_readings('room_1')

# Analyze plant
analysis = client.analysis.analyze_plant(
    image=open('plant.jpg', 'rb'),
    strain='Blue Dream'
)
```

### JavaScript/TypeScript SDK

```javascript
import { CannaAIClient } from '@cannaai/sdk';

const client = new CannaAIClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.cannaai.com'
});

// Get sensor data
const readings = await client.sensors.getReadings('room_1');

// Analyze plant
const analysis = await client.analysis.analyzePlant({
  image: File('plant.jpg'),
  strain: 'Blue Dream'
});
```

## Testing

### Testing Endpoints

Use the provided testing credentials for development:

```http
POST /auth/login
Content-Type: application/json

{
  "email": "test@cannaai.com",
  "password": "test_password_123"
}
```

### Mock Server

For development without internet connectivity, a mock server is available:

```
https://mock-api.cannaai.com
```

## Support

- **API Documentation**: https://docs.cannaai.com
- **Developer Forum**: https://community.cannaai.com
- **Support Email**: api-support@cannaai.com
- **Status Page**: https://status.cannaai.com

## Changelog

### v1.2.0 (2024-01-15)
- Added batch sensor data upload endpoint
- Improved error messages for validation failures
- Added support for WebSocket authentication via query parameter

### v1.1.0 (2024-01-01)
- Introduced plant strain recommendations API
- Added cost analytics endpoints
- Enhanced automation scheduling capabilities

### v1.0.0 (2023-12-01)
- Initial public API release
- Core sensor data and automation functionality
- Plant analysis and analytics endpoints