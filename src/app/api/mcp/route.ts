// MCP-compatible JSON-RPC endpoint for CannaAI
import { NextRequest, NextResponse } from 'next/server';

const CANNAAI_URL = process.env.CANNAAI_URL || 'http://localhost:3000';

// MCP tools (same as standalone MCP server)
const tools = [
  { name: 'get_plants', description: 'Get all plants' },
  { name: 'get_plant', description: 'Get specific plant' },
  { name: 'add_plant', description: 'Add new plant' },
  { name: 'update_plant', description: 'Update plant' },
  { name: 'delete_plant', description: 'Delete plant' },
  { name: 'get_sensors', description: 'Get sensor readings' },
  { name: 'get_temperature', description: 'Get temperature' },
  { name: 'get_humidity', description: 'Get humidity' },
  { name: 'get_vpd', description: 'Get VPD' },
  { name: 'get_light_level', description: 'Get light level' },
  { name: 'get_co2_level', description: 'Get CO2 level' },
  { name: 'get_grow_stats', description: 'Get grow stats' },
  { name: 'get_grow_log', description: 'Get grow log' },
  { name: 'add_log_entry', description: 'Add log entry' },
  { name: 'get_canopy_data', description: 'Get canopy data' },
  { name: 'get_nutrient_schedule', description: 'Get nutrient schedule' },
  { name: 'add_nutrient_log', description: 'Log nutrient' },
  { name: 'get_ph_level', description: 'Get pH level' },
  { name: 'get_ec_level', description: 'Get EC level' },
  { name: 'get_environment', description: 'Get environment' },
  { name: 'set_environment', description: 'Set environment' },
  { name: 'get_water_schedule', description: 'Get water schedule' },
  { name: 'get_alerts', description: 'Get alerts' },
  { name: 'acknowledge_alert', description: 'Acknowledge alert' },
  { name: 'analyze_plant', description: 'AI plant analysis' },
  { name: 'get_grow_recommendations', description: 'AI recommendations' },
  { name: 'analyze_environment', description: 'AI environment analysis' },
  { name: 'get_status', description: 'Get status' },
  { name: 'get_providers', description: 'Get AI providers' },
];

async function callCannaAI(endpoint: string, options: RequestInit = {}) {
  const url = `${CANNAAI_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) throw new Error(`CannaAI error: ${response.status}`);
  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { method, params, id } = body;

    // Handle MCP protocol
    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: { tools }
      });
    }

    if (method === 'tools/call') {
      const { name, arguments: args = {} } = params;
      let result: any;

      // Map tool names to API endpoints
      const endpoints: Record<string, { endpoint: string; method?: string }> = {
        get_plants: { endpoint: '/api/plants' },
        get_plant: { endpoint: `/api/plants/${args.plantId}` },
        add_plant: { endpoint: '/api/plants', method: 'POST' },
        update_plant: { endpoint: `/api/plants/${args.plantId}`, method: 'PATCH' },
        delete_plant: { endpoint: `/api/plants/${args.plantId}`, method: 'DELETE' },
        get_sensors: { endpoint: '/api/sensors' },
        get_temperature: { endpoint: '/api/sensors/temperature' },
        get_humidity: { endpoint: '/api/sensors/humidity' },
        get_vpd: { endpoint: '/api/sensors/vpd' },
        get_light_level: { endpoint: '/api/sensors/light' },
        get_co2_level: { endpoint: '/api/sensors/co2' },
        get_grow_stats: { endpoint: '/api/analytics/stats' },
        get_grow_log: { endpoint: `/api/logs${args.limit ? `?limit=${args.limit}` : ''}` },
        add_log_entry: { endpoint: '/api/logs', method: 'POST' },
        get_canopy_data: { endpoint: '/api/canopy' },
        get_nutrient_schedule: { endpoint: '/api/nutrients/schedule' },
        add_nutrient_log: { endpoint: '/api/nutrients/log', method: 'POST' },
        get_ph_level: { endpoint: '/api/nutrients/ph' },
        get_ec_level: { endpoint: '/api/nutrients/ec' },
        get_environment: { endpoint: '/api/environment' },
        set_environment: { endpoint: '/api/environment', method: 'PUT' },
        get_water_schedule: { endpoint: '/api/water/schedule' },
        get_alerts: { endpoint: '/api/alerts' },
        acknowledge_alert: { endpoint: `/api/alerts/${args.alertId}/acknowledge`, method: 'POST' },
        get_status: { endpoint: '/api/status' },
      };

      const tool = endpoints[name];
      if (tool) {
        result = await callCannaAI(tool.endpoint, tool.method ? { method: tool.method, body: JSON.stringify(args) } : {});
      } else if (name === 'analyze_plant') {
        // AI analysis - use council endpoint
        result = { analysis: 'Use /api/council endpoint for AI analysis' };
      } else if (name === 'get_grow_recommendations') {
        result = { recommendations: 'Use /api/council endpoint for AI recommendations' };
      } else if (name === 'analyze_environment') {
        result = { analysis: 'Use /api/council endpoint for environment analysis' };
      } else if (name === 'get_providers') {
        result = {
          minimax: { url: 'https://api.minimax.io', configured: true },
          lmstudio: { url: 'http://100.116.54.125:1234', configured: true }
        };
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }

      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        }
      });
    }

    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'cannaai', version: '2.0.0' }
        }
      });
    }

    return NextResponse.json({ error: 'Method not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: { message: error instanceof Error ? error.message : 'Unknown error' }
    }, { status: 500 });
  }
}

// Handle tools/list via GET too
export async function GET() {
  return NextResponse.json({
    jsonrpc: '2.0',
    id: null,
    result: {
      content: [{ type: 'text', text: JSON.stringify({ tools }, null, 2) }]
    }
  });
}
