import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// CannaAI API base URL
const CANNAAI_URL = process.env.CANNAAI_URL || 'http://localhost:3000';

// LM Studio for AI analysis
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://100.116.54.125:1234/v1';
const LM_STUDIO_KEY = process.env.LM_STUDIO_KEY || 'sk-lm-zO7bswIc:WkHEMTUfVNkq5WYNyFOW';

// MiniMax for AI analysis
const MINIMAX_URL = process.env.MINIMAX_URL || 'https://api.minimax.io/v1';
const MINIMAX_KEY = process.env.MINIMAX_KEY || '';

const server = new Server(
  { name: 'cannaai-mcp-server', version: '2.0.0' },
  { capabilities: { tools: {} } }
);

// 25+ tools for comprehensive grow monitoring
const tools = [
  // ============ PLANT MANAGEMENT ============
  { name: 'get_plants', description: 'Get all plants from CannaAI', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_plant', description: 'Get specific plant by ID', inputSchema: { type: 'object', properties: { plantId: { type: 'string' } }, required: ['plantId'] } },
  { name: 'add_plant', description: 'Add new plant to tracking', inputSchema: { type: 'object', properties: { name: { type: 'string' }, strain: { type: 'string' }, stage: { type: 'string' }, notes: { type: 'string' } }, required: ['name'] } },
  { name: 'update_plant', description: 'Update plant info', inputSchema: { type: 'object', properties: { plantId: { type: 'string' }, name: { type: 'string' }, stage: { type: 'string' }, notes: { type: 'string' } }, required: ['plantId'] } },
  { name: 'delete_plant', description: 'Remove plant from tracking', inputSchema: { type: 'object', properties: { plantId: { type: 'string' } }, required: ['plantId'] } },

  // ============ SENSOR DATA ============
  { name: 'get_sensors', description: 'Get all sensor readings', inputSchema: { type: 'object', properties: { tentId: { type: 'string' } } } },
  { name: 'get_temperature', description: 'Get temperature readings', inputSchema: { type: 'object', properties: { hours: { type: 'number' } } } },
  { name: 'get_humidity', description: 'Get humidity readings', inputSchema: { type: 'object', properties: { hours: { type: 'number' } } } },
  { name: 'get_vpd', description: 'Get VPD (Vapor Pressure Deficit)', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_light_level', description: 'Get light intensity readings', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_co2_level', description: 'Get CO2 levels', inputSchema: { type: 'object', properties: {} } },

  // ============ GROW TRACKING ============
  { name: 'get_grow_stats', description: 'Get grow statistics', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_grow_log', description: 'Get activity log', inputSchema: { type: 'object', properties: { limit: { type: 'number' } } } },
  { name: 'add_log_entry', description: 'Add entry to grow log', inputSchema: { type: 'object', properties: { message: { type: 'string' }, category: { type: 'string' } }, required: ['message'] } },
  { name: 'get_canopy_data', description: 'Get canopy management data', inputSchema: { type: 'object', properties: {} } },

  // ============ NUTRIENTS ============
  { name: 'get_nutrient_schedule', description: 'Get nutrient feeding schedule', inputSchema: { type: 'object', properties: {} } },
  { name: 'add_nutrient_log', description: 'Log nutrient feeding', inputSchema: { type: 'object', properties: { plantId: { type: 'string' }, nutrients: { type: 'string' }, ph: { type: 'number' }, ec: { type: 'number' } }, required: ['plantId', 'nutrients'] } },
  { name: 'get_ph_level', description: 'Get pH levels', inputSchema: { type: 'object', properties: { plantId: { type: 'string' } } } },
  { name: 'get_ec_level', description: 'Get EC (Electrical Conductivity) levels', inputSchema: { type: 'object', properties: { plantId: { type: 'string' } } } },

  // ============ ENVIRONMENT ============
  { name: 'get_environment', description: 'Get environment settings', inputSchema: { type: 'object', properties: { tentId: { type: 'string' } } } },
  { name: 'set_environment', description: 'Update environment settings', inputSchema: { type: 'object', properties: { tentId: { type: 'string' }, tempMin: { type: 'number' }, tempMax: { type: 'number' }, humidityMin: { type: 'number' }, humidityMax: { type: 'number' } } } },
  { name: 'get_water_schedule', description: 'Get watering schedule', inputSchema: { type: 'object', properties: {} } },

  // ============ ALERTS ============
  { name: 'get_alerts', description: 'Get active alerts', inputSchema: { type: 'object', properties: { status: { type: 'string' } } } },
  { name: 'acknowledge_alert', description: 'Acknowledge an alert', inputSchema: { type: 'object', properties: { alertId: { type: 'string' } }, required: ['alertId'] } },

  // ============ AI ANALYSIS ============
  { name: 'analyze_plant', description: 'Analyze plant health with AI', inputSchema: { type: 'object', properties: { imageUrl: { type: 'string' }, plantId: { type: 'string' }, prompt: { type: 'string' } }, required: ['imageUrl'] } },
  { name: 'get_grow_recommendations', description: 'Get AI recommendations for grow', inputSchema: { type: 'object', properties: { plantId: { type: 'string' } } } },
  { name: 'analyze_environment', description: 'Analyze environment conditions', inputSchema: { type: 'object', properties: { tentId: { type: 'string' } } } },

  // ============ STATUS ============
  { name: 'get_status', description: 'Get CannaAI server status', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_providers', description: 'Get configured AI providers', inputSchema: { type: 'object', properties: {} } },
];

async function callCannaAI(endpoint: string, options: RequestInit = {}) {
  const url = `${CANNAAI_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) throw new Error(`CannaAI API error: ${response.status}`);
  return response.json();
}

async function analyzeWithAI(prompt: string, imageUrl?: string) {
  // Try MiniMax first
  if (MINIMAX_KEY) {
    try {
      const response = await fetch(`${MINIMAX_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MINIMAX_KEY}` },
        body: JSON.stringify({
          model: 'MiniMax-M2.7',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
        }),
      });
      if (response.ok) {
        const data: any = await response.json();
        return data.choices?.[0]?.message?.content || 'No analysis available';
      }
    } catch (e) { /* MiniMax failed */ }
  }

  // Try LM Studio
  try {
    const response = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LM_STUDIO_KEY}` },
      body: JSON.stringify({
        model: 'qwen3.5-2b',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
      }),
    });
    if (response.ok) {
      const data: any = await response.json();
      const text = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content;
      if (text && !text.includes('Thinking Process')) return text;
    }
  } catch (e) { /* LM Studio failed */ }

  return 'AI analysis unavailable - configure MiniMax or LM Studio';
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params as { name: string; arguments: Record<string, any> };
  try {
    let result: any;

    switch (name) {
      // Plant Management
      case 'get_plants': result = await callCannaAI('/api/plants'); break;
      case 'get_plant': result = await callCannaAI(`/api/plants/${args.plantId}`); break;
      case 'add_plant': result = await callCannaAI('/api/plants', { method: 'POST', body: JSON.stringify(args) }); break;
      case 'update_plant': result = await callCannaAI(`/api/plants/${args.plantId}`, { method: 'PATCH', body: JSON.stringify(args) }); break;
      case 'delete_plant': result = await callCannaAI(`/api/plants/${args.plantId}`, { method: 'DELETE' }); break;

      // Sensors
      case 'get_sensors': result = await callCannaAI(args.tentId ? `/api/sensors?tentId=${args.tentId}` : '/api/sensors'); break;
      case 'get_temperature': result = await callCannaAI(args.hours ? `/api/sensors/temperature?hours=${args.hours}` : '/api/sensors/temperature'); break;
      case 'get_humidity': result = await callCannaAI(args.hours ? `/api/sensors/humidity?hours=${args.hours}` : '/api/sensors/humidity'); break;
      case 'get_vpd': result = await callCannaAI('/api/sensors/vpd'); break;
      case 'get_light_level': result = await callCannaAI('/api/sensors/light'); break;
      case 'get_co2_level': result = await callCannaAI('/api/sensors/co2'); break;

      // Grow Tracking
      case 'get_grow_stats': result = await callCannaAI('/api/analytics/stats'); break;
      case 'get_grow_log': result = await callCannaAI(args.limit ? `/api/logs?limit=${args.limit}` : '/api/logs'); break;
      case 'add_log_entry': result = await callCannaAI('/api/logs', { method: 'POST', body: JSON.stringify(args) }); break;
      case 'get_canopy_data': result = await callCannaAI('/api/canopy'); break;

      // Nutrients
      case 'get_nutrient_schedule': result = await callCannaAI('/api/nutrients/schedule'); break;
      case 'add_nutrient_log': result = await callCannaAI('/api/nutrients/log', { method: 'POST', body: JSON.stringify(args) }); break;
      case 'get_ph_level': result = await callCannaAI(args.plantId ? `/api/nutrients/ph?plantId=${args.plantId}` : '/api/nutrients/ph'); break;
      case 'get_ec_level': result = await callCannaAI(args.plantId ? `/api/nutrients/ec?plantId=${args.plantId}` : '/api/nutrients/ec'); break;

      // Environment
      case 'get_environment': result = await callCannaAI(args.tentId ? `/api/environment?tentId=${args.tentId}` : '/api/environment'); break;
      case 'set_environment': result = await callCannaAI('/api/environment', { method: 'PUT', body: JSON.stringify(args) }); break;
      case 'get_water_schedule': result = await callCannaAI('/api/water/schedule'); break;

      // Alerts
      case 'get_alerts': result = await callCannaAI(args.status ? `/api/alerts?status=${args.status}` : '/api/alerts'); break;
      case 'acknowledge_alert': result = await callCannaAI(`/api/alerts/${args.alertId}/acknowledge`, { method: 'POST' }); break;

      // AI Analysis
      case 'analyze_plant':
        const plantData = args.plantId ? await callCannaAI(`/api/plants/${args.plantId}`).catch(() => ({})) : {};
        const analysisPrompt = `You are a plant health expert. Analyze this plant image${args.plantId ? ` for plant ${args.plantId}` : ''}.
        
Context: ${JSON.stringify(plantData)}
User question: ${args.prompt || 'What is the health status and any issues?'}

Provide detailed analysis.`;
        result = { analysis: await analyzeWithAI(analysisPrompt, args.imageUrl) };
        break;

      case 'get_grow_recommendations':
        const stats = await callCannaAI('/api/analytics/stats').catch(() => ({}));
        const sensors = await callCannaAI('/api/sensors').catch(() => ({}));
        const recPrompt = `You are a cannabis grow expert. Based on this data:
        
Stats: ${JSON.stringify(stats)}
Sensors: ${JSON.stringify(sensors)}

Provide 5 actionable recommendations for improving yield and plant health.`;
        result = { recommendations: await analyzeWithAI(recPrompt) };
        break;

      case 'analyze_environment':
        const env = await callCannaAI(args.tentId ? `/api/environment?tentId=${args.tentId}` : '/api/environment').catch(() => ({}));
        const envPrompt = `You are an environmental control expert. Analyze these grow room conditions:
        
Environment: ${JSON.stringify(env)}

Provide recommendations for optimal growing conditions.`;
        result = { analysis: await analyzeWithAI(envPrompt) };
        break;

      // Status
      case 'get_status':
        result = {
          status: 'running',
          version: '2.0.0',
          cannaai_url: CANNAAI_URL,
          providers: { minimax: !!MINIMAX_KEY, lmstudio: true },
          tools_count: tools.length,
        };
        break;

      case 'get_providers':
        result = {
          minimax: { url: MINIMAX_URL, configured: !!MINIMAX_KEY },
          lmstudio: { url: LM_STUDIO_URL, configured: true },
        };
        break;

      default:
        // Try generic API call
        result = await callCannaAI(`/api/${name.replace(/_/g, '/')}`).catch(() => ({ error: 'Endpoint not found' }));
    }

    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return {
      content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
});

async function main() {
  console.error('🌿 CannaAI MCP v2.0.0 starting...');
  console.error(`📍 CannaAI: ${CANNAAI_URL}`);
  console.error(`🔧 Tools: ${tools.length}`);
  await server.connect(new StdioServerTransport());
  console.error('✅ CannaAI MCP connected');
}

main().catch(e => { console.error(e); process.exit(1); });
