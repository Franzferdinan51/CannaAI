# CannaAI Pro - Comprehensive Sensor Monitoring System

This directory contains the complete sensor monitoring system migrated from the old Next.js UI to the NewUI. The system provides real-time sensor monitoring, configuration, analytics, and management capabilities for cannabis cultivation environments.

## Features

### 🔬 **Real-Time Monitoring**
- Live sensor data display with automatic updates
- Multiple sensor types: Temperature, Humidity, pH, EC, CO2, VPD, Soil Moisture, Light Intensity, and more
- Connection status monitoring with battery levels and signal strength
- Data quality indicators and anomaly detection

### 📊 **Advanced Analytics**
- Historical data visualization with multiple chart types (Line, Area, Bar)
- Customizable timeframes (1 hour to 90 days)
- Statistical analysis with trends and comparisons
- Data export functionality in multiple formats
- Performance metrics and quality scoring

### 🗺️ **Location Management**
- Interactive sensor map with visual placement
- Room-based sensor organization
- Drag-and-drop sensor positioning
- Multiple view modes (Map, List, Grid)
- Room configuration and management

### 🚨 **Smart Alerts & Notifications**
- Configurable alert thresholds and conditions
- Multiple severity levels (Low, Medium, High, Critical)
- Alert acknowledgment system
- Notification channels (Email, SMS, Push, Desktop)
- Alert history and analytics

### ⚙️ **Sensor Configuration**
- Comprehensive sensor management interface
- Calibration support with multi-point calibration
- Sensor testing and diagnostics
- Maintenance scheduling and tracking
- Device information and firmware management

### 🔌 **Real-Time Communication**
- Enhanced Socket.IO integration
- Automatic reconnection with exponential backoff
- Room-based data subscriptions
- System health monitoring
- WebSocket event handling

## Architecture

### Component Structure

```
sensors/
├── index.tsx                 # Main sensors component with navigation
├── types.ts                  # Comprehensive TypeScript interfaces
├── api.ts                    # API integration service
├── SensorDashboard.tsx       # Real-time monitoring dashboard
├── SensorConfig.tsx          # Sensor configuration and management
├── SensorAlerts.tsx          # Alerts and notifications system
├── SensorAnalytics.tsx       # Historical data and analytics
├── SensorMap.tsx             # Location mapping and room management
├── Sensors.tsx              # Legacy component (replaced)
├── Sensors.tsx.backup       # Backup of original component
└── README.md                # This documentation
```

### Key Files

#### `types.ts`
- Comprehensive TypeScript interfaces for the entire sensor system
- Defines data structures for sensors, rooms, alerts, analytics, etc.
- Extensible type system for future enhancements

#### `api.ts`
- Complete API integration layer
- RESTful API client with error handling
- WebSocket communication through Socket.IO
- Utility functions for data validation and processing

#### `index.tsx`
- Main navigation component with tab-based interface
- State management for sensors and rooms
- Integration with Socket.IO context
- Responsive design with multiple view modes

## Usage

### Basic Setup

```tsx
import Sensors from './components/sensors';

function App() {
  return (
    <div className="app">
      <Sensors />
    </div>
  );
}
```

### Individual Components

```tsx
import {
  SensorDashboard,
  SensorConfiguration,
  SensorAlerts,
  SensorAnalytics,
  SensorMap
} from './components/sensors';

// Use components individually
<SensorDashboard />
<SensorConfiguration sensor={sensorData} onSave={handleSave} />
<SensorAlerts />
<SensorAnalytics sensors={sensors} />
<SensorMap rooms={rooms} sensors={sensors} />
```

### API Integration

```tsx
import sensorAPI from './components/sensors/api';

// Fetch sensors
const sensors = await sensorAPI.sensors.getSensors();

// Create new sensor
const newSensor = await sensorAPI.sensors.createSensor(sensorData);

// Get analytics
const analytics = await sensorAPI.sensors.getSensorAnalytics(sensorId, '24h');

// Export data
const blob = await sensorAPI.data.exportData({
  format: 'csv',
  sensors: ['sensor_1', 'sensor_2'],
  timeframe: { start: '2024-01-01', end: '2024-01-31' }
});
```

### Socket.IO Integration

```tsx
import { useEnhancedSocket } from '../lib/socket-enhanced';

function SensorComponent() {
  const {
    isConnected,
    subscribeToSensorData,
    on,
    emit
  } = useEnhancedSocket();

  useEffect(() => {
    // Subscribe to sensor data
    subscribeToSensorData(['sensor_1', 'sensor_2']);

    // Listen for real-time updates
    on('sensor-data', (data) => {
      console.log('Received sensor data:', data);
    });

    return () => {
      // Cleanup listeners
    };
  }, []);
}
```

## Sensor Types

The system supports the following sensor types:

| Type | Description | Unit | Range |
|------|-------------|------|-------|
| Temperature | Environmental temperature | °F | -50°F to 150°F |
| Humidity | Relative humidity | % | 0% to 100% |
| pH | Acidity/alkalinity level | pH | 0 to 14 |
| EC | Electrical conductivity | mS/cm | 0 to 10 |
| CO2 | Carbon dioxide concentration | ppm | 0 to 5000 |
| VPD | Vapor pressure deficit | kPa | 0 to 5 |
| Soil Moisture | Soil water content | % | 0% to 100% |
| Light Intensity | Photosynthetic light | PPFD | 0 to 2000 |
| Daily Light Integral | Cumulative light exposure | mol/m² | 0 to 60 |
| Dissolved Oxygen | Oxygen in water | mg/L | 0 to 15 |
| Pressure | Atmospheric pressure | hPa | 900 to 1100 |

## Configuration Options

### Sensor Configuration

```typescript
interface SensorConfig {
  id: string;
  name: string;
  type: SensorType;
  location: string;
  roomName: string;
  enabled: boolean;
  calibration?: SensorCalibration;
  alerts: SensorAlert[];
  dataHistory: SensorDataPoint[];
  batteryLevel?: number;
  signalStrength?: number;
  lastMaintenance?: string;
  nextMaintenanceDue?: string;
  firmwareVersion?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
}
```

### Alert Configuration

```typescript
interface SensorAlert {
  id: string;
  type: AlertType;
  condition: AlertCondition;
  enabled: boolean;
  severity: AlertSeverity;
  message: string;
  actions: AlertAction[];
  cooldownMinutes: number;
}
```

### Room Configuration

```typescript
interface RoomConfig {
  id: string;
  name: string;
  active: boolean;
  targetEnvironment: {
    temperature: { min: number; max: number };
    humidity: { min: number; max: number };
    co2: { min: number; max: number };
    // ... more targets
  };
  sensors: string[];
  automation: {
    watering: WateringConfig;
    lighting: LightingConfig;
    climate: ClimateConfig;
    co2: CO2Config;
  };
}
```

## API Endpoints

The system provides the following API endpoints:

### Sensors
- `GET /api/sensors` - Get all sensors
- `GET /api/sensors/:id` - Get specific sensor
- `POST /api/sensors` - Create new sensor
- `PUT /api/sensors/:id` - Update sensor
- `DELETE /api/sensors/:id` - Delete sensor
- `GET /api/sensors/:id/data` - Get sensor data
- `POST /api/sensors/:id/calibrate` - Calibrate sensor
- `POST /api/sensors/:id/test` - Test sensor

### Rooms
- `GET /api/rooms` - Get all rooms
- `GET /api/rooms/:id` - Get specific room
- `POST /api/rooms` - Create new room
- `PUT /api/rooms/:id` - Update room
- `DELETE /api/rooms/:id` - Delete room

### Data & Analytics
- `GET /api/sensors/data/latest` - Get latest sensor data
- `GET /api/sensors/data/history` - Get historical data
- `POST /api/sensors/data/export` - Export data
- `POST /api/analytics` - Generate analytics

### Alerts & Notifications
- `GET /api/alerts` - Get all alerts
- `POST /api/alerts` - Create new alert
- `GET /api/notifications` - Get notifications
- `POST /api/notifications/:id/acknowledge` - Acknowledge notification

### System
- `GET /api/health` - Get system health
- `GET /api/status` - Get system status

## Socket.IO Events

### Client to Server
- `subscribe-sensors` - Subscribe to specific sensor data
- `unsubscribe-sensors` - Unsubscribe from sensor data
- `subscribe-rooms` - Subscribe to room data
- `calibrate-sensor` - Calibrate a sensor
- `test-sensor` - Test a sensor
- `automation-execute` - Execute automation action

### Server to Client
- `sensor-data` - Single sensor data update
- `sensor-data-batch` - Multiple sensor data updates
- `notification` - Single notification
- `notification-batch` - Multiple notifications
- `system-health` - System health update
- `automation-event` - Automation event
- `alert-triggered` - Alert triggered
- `alert-resolved` - Alert resolved

## Development

### Adding New Sensor Types

1. Add the new type to `SensorType` in `types.ts`
2. Update sensor type configurations in components
3. Add visualization logic in charts and displays
4. Update API integration if needed

### Extending Alert Types

1. Add new alert types to `AlertType` in `types.ts`
2. Update alert configuration UI in `SensorConfig.tsx`
3. Add alert handling logic in the backend
4. Update notification system

### Custom Analytics

1. Extend analytics data structures in `types.ts`
2. Add new chart types to `SensorAnalytics.tsx`
3. Update API endpoints for new analytics
4. Add UI controls for new analytics features

## Troubleshooting

### Common Issues

**Socket.IO Connection Issues**
- Check server URL configuration
- Verify CORS settings
- Check firewall rules
- Ensure server is running

**Sensor Data Not Updating**
- Verify sensor is enabled
- Check WebSocket connection
- Verify data format matches expected schema
- Check browser console for errors

**API Errors**
- Check network connectivity
- Verify API endpoint URLs
- Check authentication if required
- Examine error responses in browser dev tools

### Performance Optimization

- Use data pagination for large datasets
- Implement data caching strategies
- Optimize chart rendering with data aggregation
- Use React.memo for component optimization
- Implement virtual scrolling for large lists

## Contributing

When contributing to the sensor system:

1. Follow the existing code patterns and conventions
2. Add TypeScript types for new features
3. Include comprehensive error handling
4. Add unit tests for new functionality
5. Update documentation for changes
6. Test across different browsers and devices

## License

This sensor monitoring system is part of the CannaAI Pro platform and follows the project's licensing terms.

---

**Last Updated:** November 24, 2024
**Version:** 1.0.0
**Migration Status:** Complete from old Next.js UI