import { NextRequest, NextResponse } from 'next/server';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

// Mock sensor data with realistic values
let sensorData = {
  temperature: 22.5, // Internal Celsius for calculations
  humidity: 55,
  soilMoisture: 45,
  lightIntensity: 750,
  ph: 6.2,
  ec: 1.4,
  co2: 1200,
  vpd: 0.85,
  lastUpdated: new Date().toISOString()
};

// Automation settings
let automationSettings = {
  watering: { enabled: true, threshold: 30, schedule: '0 6,18 * * *' },
  lighting: { enabled: true, vegSchedule: '0 6-24 * * *', flowerSchedule: '0 6-18 * * *' },
  climate: { enabled: true, tempMin: 64, tempMax: 79, humidityMin: 40, humidityMax: 70 } // Fahrenheit
};

// Room data (stored in Celsius internally)
let rooms = [
  { id: 'room_1', name: 'Main Flower Room', temp: 22, humidity: 55, co2: 1200, active: true }, // Celsius
  { id: 'room_2', name: 'Veg Room', temp: 24, humidity: 65, co2: 1000, active: false } // Celsius
];

// Simulate sensor data updates
function updateSensorData() {
  sensorData = {
    temperature: parseFloat((sensorData.temperature + (Math.random() - 0.5) * 0.5).toFixed(1)),
    humidity: Math.min(100, Math.max(0, Math.round(sensorData.humidity + (Math.random() - 0.5) * 2))),
    soilMoisture: Math.min(100, Math.max(0, Math.round(sensorData.soilMoisture + (Math.random() - 0.5) * 3))),
    lightIntensity: Math.min(1000, Math.max(0, Math.round(sensorData.lightIntensity + (Math.random() - 0.5) * 50))),
    ph: parseFloat((sensorData.ph + (Math.random() - 0.5) * 0.1).toFixed(1)),
    ec: parseFloat((sensorData.ec + (Math.random() - 0.5) * 0.05).toFixed(2)),
    co2: Math.min(2000, Math.max(400, Math.round(sensorData.co2 + (Math.random() - 0.5) * 100))),
    vpd: parseFloat((0.85 + (Math.random() - 0.5) * 0.2).toFixed(2)),
    lastUpdated: new Date().toISOString()
  };

  // Update room data
  rooms = rooms.map(room => ({
    ...room,
    temp: room.active ? Math.round(room.temp + (Math.random() - 0.5) * 2) : room.temp, // Internal Celsius
    humidity: room.active ? Math.round(room.humidity + (Math.random() - 0.5) * 3) : room.humidity,
    co2: room.active ? Math.round(room.co2 + (Math.random() - 0.5) * 50) : room.co2
  }));
}

export async function GET() {
  // For static export, provide client-side compatibility response
  const isStaticExport = process.env.BUILD_MODE === 'static';
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'This API is handled client-side in static export mode.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  try {
    // Update sensor data on each read
    updateSensorData();

    // Convert temperature to Fahrenheit for display
    const displayData = {
      ...sensorData,
      temperature: Math.round((sensorData.temperature * 9/5) + 32) // Convert to Fahrenheit
    };

    // Convert room temperatures to Fahrenheit for display
    const displayRooms = rooms.map(room => ({
      ...room,
      temp: Math.round((room.temp * 9/5) + 32) // Convert to Fahrenheit
    }));

    return NextResponse.json({
      success: true,
      sensors: displayData,
      rooms: displayRooms,
      automation: automationSettings,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get sensors error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sensor data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // For static export, provide client-side compatibility response
  const isStaticExport = process.env.BUILD_MODE === 'static';
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'This API is handled client-side in static export mode.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'update_automation':
        automationSettings = { ...automationSettings, ...data };
        break;

      case 'toggle_room':
        const room = rooms.find(r => r.id === data.roomId);
        if (room) {
          room.active = !room.active;
        }
        break;

      case 'water_now':
        // Simulate watering action
        sensorData.soilMoisture = Math.min(100, sensorData.soilMoisture + 20);
        break;

      case 'toggle_lights':
        // Simulate light toggle
        sensorData.lightIntensity = sensorData.lightIntensity > 500 ? 0 : 800;
        break;

      case 'adjust_climate':
        // Simulate climate adjustment (convert Fahrenheit to Celsius for internal storage)
        if (data.temperature !== undefined) {
          // Assume input is Fahrenheit, convert to Celsius for internal storage
          sensorData.temperature = ((data.temperature - 32) * 5/9);
        }
        if (data.humidity !== undefined) {
          sensorData.humidity = data.humidity;
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `${action} completed successfully`,
      data: {
        sensors: sensorData,
        rooms,
        automation: automationSettings
      }
    });

  } catch (error) {
    console.error('Sensor action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform sensor action' },
      { status: 500 }
    );
  }
}