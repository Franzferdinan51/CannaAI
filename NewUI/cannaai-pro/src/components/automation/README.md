# CannaAI Pro Automation System

Complete environmental control and automation system for cannabis cultivation facilities. This module provides comprehensive control over irrigation, lighting, climate, CO₂, and safety systems with real-time monitoring and intelligent automation.

## Features

### 🌱 Irrigation Control
- **Smart Watering**: Moisture-based and scheduled watering cycles
- **Zone Management**: Individual control of irrigation zones
- **Flow Monitoring**: Real-time flow rate and pressure monitoring
- **Water Quality**: pH and EC level tracking
- **Usage Analytics**: Daily water consumption tracking
- **Manual Override**: Immediate watering capabilities

### 💡 Lighting Control
- **Schedule Management**: Vegetative (18/6) and flowering (12/12) cycles
- **Intensity Control**: Dimmable lighting with percentage control
- **Spectrum Control**: Full spectrum and color temperature adjustment
- **Power Monitoring**: Real-time power consumption tracking
- **Sunrise/Sunset**: Gradual transitions for natural light simulation
- **Zone Control**: Independent lighting zone management

### 🌡️ Climate Control
- **Temperature Management**: Heating and cooling automation
- **Humidity Control**: Dehumidification and ventilation systems
- **Air Circulation**: Automated fan and air movement control
- **VPD Monitoring**: Vapor Pressure Deficit calculations and management
- **Multi-Zone**: Individual climate zones with independent control
- **Filter Management**: Air filter replacement scheduling

### 🌱 CO₂ Control
- **Automated Injection**: Target-based CO₂ enrichment
- **Level Monitoring**: Real-time CO₂ concentration tracking
- **Tank Management**: CO₂ tank level monitoring and alerts
- **Flow Control**: Precise injection rate management
- **Safety Integration**: Automatic shutdown on high CO₂ levels

### 🛡️ Safety Features
- **Environmental Monitoring**: Temperature, humidity, and CO₂ safety limits
- **Leak Detection**: Water leak monitoring and alerts
- **Smoke Detection**: Fire safety integration
- **Emergency Shutdown**: Automatic system shutdown on critical conditions
- **Alert System**: Multi-level alerting (info, warning, critical)
- **Manual Override**: Safety-protected manual controls

### ⏰ Scheduling & Automation
- **Cron Scheduling**: Flexible time-based automation
- **Rule Engine**: Sensor-based trigger system
- **Priority Management**: Execution priority for conflicting tasks
- **Template System**: Pre-built automation templates
- **Recovery Logic**: Automatic recovery from failures
- **Execution Logging**: Complete audit trail of all actions

### 📊 Monitoring & Analytics
- **Real-time Dashboard**: Live status of all systems
- **Historical Data**: Complete automation history and logging
- **Performance Metrics**: System efficiency and uptime tracking
- **Alert History**: Safety and performance alert logging
- **Export Capabilities**: CSV and JSON data export
- **System Health**: Overall system health monitoring

## Component Architecture

### Main Components

#### `AutomationDashboard`
The main dashboard component that integrates all automation systems:
- **Overview Tab**: System status summary and quick controls
- **Environmental Tab**: Current conditions and manual controls
- **Lighting Tab**: Lighting schedules and intensity control
- **Irrigation Tab**: Watering zones and moisture management
- **Scheduling Tab**: Automation rules and cron schedules
- **History Tab**: Complete activity log and analytics

#### Control Components
- **`EnvironmentalControls`**: Real-time environmental parameter monitoring
- **`IrrigationControl`**: Zone-based watering system control
- **`LightingControl`**: Schedule-based lighting management
- **`ClimateControl`**: Temperature, humidity, and air quality control
- **`ManualOverride`**: Safety-protected manual system control
- **`SafetyFeatures`**: Alert system and emergency controls

#### Supporting Components
- **`AutomationScheduling`**: Rule-based automation setup
- **`AutomationHistory`**: Historical data and activity logging
- **API Integration**: Complete backend communication layer
- **Socket.IO Integration**: Real-time updates and notifications

## API Integration

### AutomationAPI Class
```typescript
const automationAPI = new AutomationAPI();

// Get current system status
const status = await automationAPI.getStatus();

// Update watering settings
await automationAPI.updateWatering({
  threshold: 30,
  duration: 5,
  zones: ['zone_1', 'zone_2']
});

// Execute manual override
await automationAPI.executeManualOverride('watering', 'start', 10);
```

### React Hook Integration
```typescript
function MyComponent() {
  const {
    api,
    loading,
    error,
    updateWatering,
    executeManualOverride,
    getHistory
  } = useAutomationAPI();

  const handleWatering = async () => {
    try {
      await updateWatering({ threshold: 35 });
    } catch (error) {
      console.error('Failed to update watering:', error);
    }
  };
}
```

## Real-time Updates

### Socket.IO Integration
```typescript
function AutomationComponent() {
  const {
    connected,
    automationStatus,
    safetyAlerts,
    realTimeLogs,
    emitCommand
  } = useAutomationSocket();

  useEffect(() => {
    if (connected) {
      emitCommand('subscribe', { systems: ['all'] });
    }
  }, [connected, emitCommand]);
}
```

### Real-time Events
- **`automation-status`**: Live system status updates
- **`safety-alert`**: Immediate safety notifications
- **`automation-log`**: Real-time activity logging
- **`sensor-trigger`**: Sensor-based automation triggers
- **`manual-override`**: Manual override notifications

## TypeScript Types

### Core Types
```typescript
interface AutomationStatus {
  watering: WateringStatus;
  lighting: LightingStatus;
  climate: ClimateStatus;
  co2: CO2Status;
}

interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  system: 'watering' | 'lighting' | 'climate' | 'co2';
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

interface SafetyAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'temperature' | 'humidity' | 'water' | 'electrical';
  title: string;
  message: string;
  acknowledged: boolean;
  resolved: boolean;
}
```

## Usage Examples

### Basic Automation Dashboard
```typescript
import { AutomationDashboard } from '@/components/automation';

function CultivationPage() {
  const [sensorData, setSensorData] = useState();
  const [rooms, setRooms] = useState();

  return (
    <AutomationDashboard
      sensorData={sensorData}
      rooms={rooms}
      automationEnabled={true}
    />
  );
}
```

### Individual Control Component
```typescript
import { IrrigationControl } from '@/components/automation';

function WateringPage() {
  const handleStatusUpdate = (status) => {
    console.log('Irrigation status updated:', status);
  };

  return (
    <IrrigationControl
      sensorData={sensorData}
      rooms={rooms}
      automationEnabled={true}
      onStatusUpdate={handleStatusUpdate}
    />
  );
}
```

### Custom Automation Rule
```typescript
const customRule: AutomationRule = {
  id: 'moisture_based_watering',
  name: 'Moisture-Based Watering',
  enabled: true,
  system: 'watering',
  trigger: {
    type: 'sensor',
    config: {
      sensorId: 'soil_moisture_1',
      threshold: 25,
      operator: 'lt'
    }
  },
  conditions: [
    {
      sensorId: 'soil_moisture_1',
      sensorType: 'soil_moisture',
      operator: 'lt',
      value: 25,
      duration: 10 // 10 minutes below threshold
    }
  ],
  actions: [
    {
      type: 'water',
      config: {
        zoneId: 'zone_1',
        duration: 300, // 5 minutes
        intensity: 100
      }
    }
  ]
};
```

## Configuration

### Environment Variables
```env
# Automation System
AUTOMATION_ENABLED=true
SAFETY_MODE=true
EMERGENCY_SHUTDOWN=true

# Socket.IO Configuration
SOCKET_IO_PATH=/api/socketio
SOCKET_IO_TRANSPORTS=websocket,polling

# API Configuration
AUTOMATION_API_BASE_URL=/api/automation
API_TIMEOUT=30000
```

### Safety Configuration
```typescript
const safetySettings = {
  emergencyShutdown: true,
  autoRecovery: true,
  criticalTempThreshold: 90,    // °F
  lowTempThreshold: 50,        // °F
  criticalHumidityThreshold: 85, // %
  lowHumidityThreshold: 25,     // %
  maxCo2Threshold: 2000,        // ppm
  leakDetection: true,
  smokeDetection: true,
  powerOutageResponse: 'suspend'
};
```

## Monitoring and Logging

### Activity Logging
All automation actions are logged with:
- **Timestamp**: Precise execution time
- **System**: Which automation system was involved
- **Action**: What action was performed
- **Status**: Success, warning, or error
- **Duration**: How long the action took
- **Trigger**: What initiated the action (schedule, sensor, manual)
- **Metadata**: Additional context and parameters

### Performance Metrics
- **Uptime**: System availability and reliability
- **Response Times**: API and system response performance
- **Success Rates**: Automation execution success percentages
- **Resource Usage**: Memory, CPU, and network utilization
- **Error Rates**: System error frequency and types

## Safety Considerations

### Emergency Procedures
1. **Critical Alerts**: Immediate notifications for dangerous conditions
2. **Automatic Shutdown**: System protection on critical failures
3. **Manual Override**: Safety-protected manual controls
4. **Recovery Logic**: Automatic system recovery when conditions normalize
5. **Audit Trail**: Complete logging of all safety-related actions

### Best Practices
- **Regular Testing**: Monthly safety system testing
- **Backup Systems**: Redundant sensors and controls
- **Maintenance Scheduling**: Regular equipment maintenance
- **User Training**: Proper staff training on emergency procedures
- **Documentation**: Clear standard operating procedures

## Troubleshooting

### Common Issues

#### Automation Not Responding
1. Check system status in dashboard
2. Verify automation is enabled
3. Check for safety alerts or overrides
4. Review recent error logs
5. Test manual controls

#### Sensor Readings Inaccurate
1. Verify sensor calibration
2. Check sensor connectivity
3. Review sensor maintenance schedule
4. Test with manual readings
5. Replace faulty sensors

#### Scheduling Not Working
1. Verify cron expression syntax
2. Check system timezone settings
3. Review schedule priority conflicts
4. Test schedule execution manually
5. Check for overlapping schedules

#### High Resource Usage
1. Monitor system performance metrics
2. Review automation frequency
3. Optimize scheduling intervals
4. Check for memory leaks
5. Scale hardware resources if needed

## Development

### Adding New Automation Systems
1. Define system types in `types.ts`
2. Create control component
3. Add API endpoints
4. Implement Socket.IO events
5. Add safety integration
6. Update documentation

### Testing
- **Unit Tests**: Component and utility function tests
- **Integration Tests**: API and database integration
- **Safety Tests**: Emergency procedure validation
- **Performance Tests**: Load and stress testing
- **User Acceptance**: Real-world scenario testing

## Contributing

When contributing to the automation system:
1. Follow TypeScript best practices
2. Implement proper error handling
3. Add comprehensive logging
4. Include safety considerations
5. Write thorough documentation
6. Test safety features extensively

## License

This automation system is part of CannaAI Pro and subject to the project's licensing terms.

## Support

For technical support and questions:
- Review the troubleshooting section
- Check the API documentation
- Examine system logs
- Contact the development team
- Review safety procedures first in emergency situations