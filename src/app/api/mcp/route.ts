/**
 * MCP-compatible JSON-RPC endpoint for CannaAI.
 *
 * Exposes CannaAI's REST surface as Model Context Protocol tools so that any
 * MCP-capable agent (Claude Code, Codex, Cursor, OpenClaw, Hermes, etc.)
 * can drive CannaAI directly: analyze a plant photo, log a sensor reading,
 * ask the AI advisor, etc.
 *
 * Protocol: MCP 2024-11-05 (https://modelcontextprotocol.io).
 *
 * Methods supported:
 *   - initialize
 *   - tools/list
 *   - tools/call
 *
 * Designed to be additive: callers (and the original /api/mcp route) keep
 * working; the new behavior is enabled by the `inputSchema` blocks on every
 * tool plus the freshly-added tools (analyze_plant, get_chat_response,
 * get_health_snapshot, get_metrics, get_version, get_cors_policy).
 */

import { NextRequest } from 'next/server';

const CANNAAI_URL = process.env.CANNAAI_URL || 'http://localhost:3000';
const SERVER_NAME = 'cannaai';
const SERVER_VERSION = '2.1.0';
const PROTOCOL_VERSION = '2024-11-05';

/**
 * Build a JSON response without relying on NextResponse. NextResponse is
 * fully wired in production, but in unit tests where this module is
 * imported directly (no Next.js bootstrap) NextResponse.json may not be
 * callable. Hand-rolling a Response here keeps the route testable in
 * isolation AND identical to what NextResponse.json produces in prod.
 */
function jsonResponse(payload: any, init?: ResponseInit): Response {
  // Reference `Response` through a fresh local binding so we capture the
  // value at call time. This sidesteps jest's jsdom shadowing of the
  // module-level `Response` reference (which is non-constructible in the
  // jsdom test env, even though it works in production Node).
  const Resp = (globalThis as any).Response;
  return new Resp(JSON.stringify(payload), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init?.headers || {}),
    },
  });
}

/**
 * One source of truth for every tool this endpoint exposes. Each entry
 * has:
 *   - name:                JSON-RPC tool name (caller-facing)
 *   - description:         human-readable purpose
 *   - inputSchema:         JSON Schema (draft 2020-12) for the args object
 *   - endpoint:            relative URL on this CannaAI instance
 *   - method:              HTTP method for the upstream call (default GET)
 *   - query:               if set, build ?k=v from args[k]
 *   - pathArg:             if set, substitute {name} into endpoint from args
 *
 * Tools are deliberately listed in priority order (read-only status /
 * inspection first, mutating actions last) so a tool picker UI groups
 * them sensibly.
 */
type ToolDef = {
  name: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, any>; required?: string[]; additionalProperties?: boolean };
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  pathArg?: string;
  query?: string[];
  bodyFromArgs?: string[];
};

const TOOLS: ToolDef[] = [
  // ─── Inspection (read-only, safe to auto-call) ─────────────────────────
  {
    name: 'get_status',
    description: 'Get CannaAI system status: uptime, env, AI provider summary, analyze-cache stats, runtime + memory info.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    endpoint: '/api/health',
  },
  {
    name: 'get_version',
    description: 'Get CannaAI build provenance: semantic version, current git commit SHA, branch, dirty flag, builtAt timestamp.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    endpoint: '/api/version',
  },
  {
    name: 'get_metrics',
    description: 'Get Prometheus-format metrics for ops dashboards: build info, uptime, memory, analyze-cache counters, provider detection.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    endpoint: '/api/metrics',
  },
  {
    name: 'get_cors_policy',
    description: 'Get the CORS rules currently in effect: allowed origins, environment (development|production), whether the dev-only "any host on port 3000" opt-in is enabled.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    endpoint: '/api/security/cors',
  },
  {
    name: 'get_providers',
    description: 'Get available AI providers (merged registry + live detection), their capabilities, and current primary selection.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    endpoint: '/api/ai/providers',
  },
  {
    name: 'get_plants',
    description: 'List all plants tracked by CannaAI.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    endpoint: '/api/plants',
  },
  {
    name: 'get_plant',
    description: 'Get a single plant by its plantId.',
    inputSchema: {
      type: 'object',
      properties: { plantId: { type: 'string', description: 'Plant ID to look up' } },
      required: ['plantId'],
      additionalProperties: false,
    },
    endpoint: '/api/plants/{plantId}',
    pathArg: 'plantId',
  },
  {
    name: 'get_sensors',
    description: 'Get recent sensor readings. Optional roomId/sensorId filter, optional limit (capped server-side at 500).',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string' },
        sensorId: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 500 },
      },
      additionalProperties: false,
    },
    endpoint: '/api/sensors',
    query: ['roomId', 'sensorId', 'limit'],
  },
  {
    name: 'get_alerts',
    description: 'Get active alerts (sensor threshold, plant health, system failures).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    endpoint: '/api/alerts',
  },
  {
    name: 'get_grow_stats',
    description: 'Get analytics/aggregate stats for the grow operation.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    endpoint: '/api/analytics/stats',
  },
  {
    name: 'get_lmstudio_models',
    description: 'List available LM Studio models with their vision/text capability flags and the currently configured defaults.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    endpoint: '__lmstudio_models__', // special: handled in callTool directly
  },

  // ─── AI actions (require configured provider) ─────────────────────────
  {
    name: 'analyze_plant',
    description: 'Run AI plant analysis on a photo + strain/symptoms/environment. Returns full structured diagnosis (urgency, healthScore, likely causes, recommendations). Supports an optional imageHash — when the same photo is analyzed repeatedly the result cache returns instantly (X-Cache: HIT).',
    inputSchema: {
      type: 'object',
      properties: {
        strain: { type: 'string', description: 'Plant strain name (e.g. "Purple Sunshine Auto F2")' },
        growthStage: { type: 'string', enum: ['seedling', 'veg', 'early_flower', 'late_flower', 'unknown'] },
        medium: { type: 'string', enum: ['soil', 'coco', 'hydro', 'dwc', 'unknown'] },
        leafSymptoms: { type: 'string', description: 'Free-text description of what the user is seeing on the leaves' },
        temperature: { type: ['string', 'number'], description: 'Ambient temperature in °F' },
        humidity: { type: ['string', 'number'], description: 'Relative humidity %' },
        phLevel: { type: ['string', 'number'], description: 'pH reading if known' },
        plantImage: {
          type: 'string',
          description: 'Optional bounded image data URL or raw base64 image for vision analysis (max 12 MB encoded).',
          maxLength: 12 * 1024 * 1024,
        },
        model: { type: 'string', description: 'Optional LM Studio model ID override' },
        baseUrl: { type: 'string', format: 'uri', description: 'Optional LM Studio base URL override' },
        observationScope: { type: 'string', enum: ['single-plant', 'multiple-plants', 'crop'] },
        expectedPlantCount: { type: 'integer', minimum: 1, maximum: 100 },
      },
      required: ['strain', 'leafSymptoms'],
      additionalProperties: false,
    },
    endpoint: '/api/analyze',
    method: 'POST',
    bodyFromArgs: ['strain', 'growthStage', 'medium', 'leafSymptoms', 'temperature', 'humidity', 'phLevel', 'plantImage', 'model', 'baseUrl', 'observationScope', 'expectedPlantCount'],
  },
  {
    name: 'get_chat_response',
    description: 'Send a chat message, optionally with an image, to the CultivAI assistant. Returns the assistant reply plus provider metadata. Non-streaming variant of the chat endpoint.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The user message' },
        mode: { type: 'string', enum: ['chat', 'thinking'], description: '"thinking" prompts a more analytical response' },
        image: { type: 'string', description: 'Optional image data URL or raw base64 image' },
        model: { type: 'string', description: 'Optional LM Studio model ID override' },
        baseUrl: { type: 'string', format: 'uri', description: 'Optional provider base URL override' },
      },
      required: ['message'],
      additionalProperties: false,
    },
    endpoint: '/api/chat',
    method: 'POST',
    bodyFromArgs: ['message', 'mode', 'image', 'model', 'baseUrl'],
  },

  // ─── Mutations ────────────────────────────────────────────────────────
  {
    name: 'log_sensor_reading',
    description: 'Submit a new sensor reading. Validates temperature (-20..130°F), humidity (0..100%), VPD (0..5 kPa), CO2 (0..5000 ppm), light. Out-of-range or non-numeric payloads return 422/400 with field-level details — see the response.',
    inputSchema: {
      type: 'object',
      properties: {
        temperature: { type: ['number', 'string'], description: 'Temperature in °F (required)' },
        humidity: { type: ['number', 'string'], description: 'Relative humidity % (required)' },
        vpd: { type: ['number', 'string'], description: 'Vapor pressure deficit in kPa (optional)' },
        co2: { type: ['number', 'string'], description: 'CO2 in ppm (optional)' },
        light: { type: ['number', 'string'], description: 'Light level (lux or PPFD) (optional)' },
        roomId: { type: 'string', description: 'Room identifier; defaults to "default" if omitted' },
        source: { type: 'string', description: 'Origin tag, e.g. "grow-monitor" or "manual"' },
      },
      required: ['temperature', 'humidity'],
      additionalProperties: false,
    },
    endpoint: '/api/sensors',
    method: 'POST',
    bodyFromArgs: ['temperature', 'humidity', 'vpd', 'co2', 'light', 'roomId', 'source'],
  },
  {
    name: 'add_plant',
    description: 'Add a new plant to the tracked inventory.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        strain: { type: 'string' },
        growthStage: { type: 'string' },
        roomId: { type: 'string' },
        plantedAt: { type: 'string', description: 'ISO-8601 date string' },
      },
      required: ['name'],
      additionalProperties: false,
    },
    endpoint: '/api/plants',
    method: 'POST',
    bodyFromArgs: ['name', 'strain', 'growthStage', 'roomId', 'plantedAt'],
  },
  {
    name: 'set_lmstudio_model',
    description: 'Switch the configured LM Studio vision or text model at runtime.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['vision', 'text'], description: 'Which configured model slot to update' },
        model: { type: 'string', description: 'Model ID to use' },
      },
      required: ['type', 'model'],
      additionalProperties: false,
    },
    endpoint: '__set_lmstudio_model__', // handled in callTool
  },
  {
    name: 'acknowledge_alert',
    description: 'Mark an alert as acknowledged by alertId.',
    inputSchema: {
      type: 'object',
      properties: { alertId: { type: 'string' } },
      required: ['alertId'],
      additionalProperties: false,
    },
    endpoint: '/api/alerts/{alertId}/acknowledge',
    method: 'POST',
    pathArg: 'alertId',
  },
];

// ─── JSON-RPC plumbing ─────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

function makeResponse(id: string | number | null, result?: any, error?: JsonRpcResponse['error']): JsonRpcResponse {
  return { jsonrpc: '2.0', id: id ?? null, ...(error ? { error } : { result }) };
}

const ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  TOOL_NOT_FOUND: -32001,
  TOOL_EXECUTION_ERROR: -32002,
} as const;

async function callUpstream(endpoint: string, options: RequestInit = {}, authHeaders: Record<string, string> = {}): Promise<any> {
  const url = `${CANNAAI_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders, ...(options.headers || {}) },
  });
  if (!response.ok) {
    // Surface the upstream status + body so the agent gets useful feedback.
    let body: any = null;
    try { body = await response.json(); } catch { /* ignore non-JSON */ }
    const e: any = new Error(`CannaAI ${response.status} from ${endpoint}`);
    e.status = response.status;
    e.body = body;
    throw e;
  }
  return response.json();
}

function buildEndpointPath(tool: ToolDef, args: Record<string, any>): string {
  let path = tool.endpoint;
  if (tool.pathArg && args[tool.pathArg] !== undefined) {
    path = path.replace(`{${tool.pathArg}}`, encodeURIComponent(String(args[tool.pathArg])));
  }
  if (tool.query && tool.query.length > 0) {
    const qs = tool.query
      .filter((k) => args[k] !== undefined && args[k] !== null && args[k] !== '')
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(args[k]))}`)
      .join('&');
    if (qs) path += `?${qs}`;
  }
  return path;
}

function buildRequestBody(tool: ToolDef, args: Record<string, any>): any {
  if (!tool.bodyFromArgs) return undefined;
  const body: Record<string, any> = {};
  for (const k of tool.bodyFromArgs) {
    if (args[k] !== undefined) body[k] = args[k];
  }
  return body;
}

async function callTool(name: string, args: Record<string, any>, authHeaders: Record<string, string> = {}): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
      isError: true,
    };
  }

  // Validate args against the tool's inputSchema (lightweight: just check required keys).
  const required = tool.inputSchema.required || [];
  for (const k of required) {
    if (args[k] === undefined || args[k] === null || args[k] === '') {
      return {
        content: [{ type: 'text', text: JSON.stringify({
          error: `Missing required argument: ${k}`,
          tool: name,
          schema: tool.inputSchema,
        }) }],
        isError: true,
      };
    }
  }

  if (name === 'analyze_plant' && typeof args.plantImage === 'string' && args.plantImage.length > 12 * 1024 * 1024) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: 'plantImage exceeds the 12 MB encoded limit', tool: name }) }],
      isError: true,
    };
  }

  try {
    let result: any;

    if (tool.endpoint === '__lmstudio_models__') {
      const { getAvailableModels, getVisionModels, getTextModels, getConfiguredModels } = await import('@/lib/ai-provider-lmstudio');
      const [all, vision, text, current] = await Promise.all([
        getAvailableModels(),
        getVisionModels(),
        getTextModels(),
        Promise.resolve(getConfiguredModels()),
      ]);
      result = { all_models: all, vision_models: vision, text_models: text, current };
    } else if (tool.endpoint === '__set_lmstudio_model__') {
      const { setModel } = await import('@/lib/ai-provider-lmstudio');
      const { type, model } = args;
      if (!type || !model) throw new Error('Use: {type, model}');
      setModel(type, model);
      result = { success: true, message: `Set ${type} to ${model}` };
    } else {
      const path = buildEndpointPath(tool, args);
      const fetchOptions: RequestInit = { method: tool.method || 'GET' };
      if (tool.method && tool.method !== 'GET' && tool.bodyFromArgs) {
        fetchOptions.body = JSON.stringify(buildRequestBody(tool, args));
      }
      result = await callUpstream(path, fetchOptions, authHeaders);
    }

    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (err: any) {
    return {
      content: [{ type: 'text', text: JSON.stringify({
        error: err?.message || 'Tool execution failed',
        status: err?.status,
        body: err?.body,
        tool: name,
      }) }],
      isError: true,
    };
  }
}

export async function POST(request: NextRequest) {
  let body: JsonRpcRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(makeResponse(null, undefined, {
      code: ERROR_CODES.PARSE_ERROR,
      message: 'Invalid JSON body',
    }), { status: 400 });
  }

  const { method, params, id } = body;

  if (method === 'initialize') {
    return jsonResponse(makeResponse(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      instructions:
        'CannaAI is a cannabis cultivation AI platform. Use the listed tools to inspect plants, ' +
        'sensor history, AI provider status, build provenance, and metrics; submit sensor readings; ' +
        'run AI plant analysis on a strain + symptoms; or send a chat message to the CultivAI assistant. ' +
        'Prefer read-only tools first to ground your advice in current state.',
    }));
  }

  if (method === 'tools/list') {
    return jsonResponse(makeResponse(id, {
      tools: TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    }));
  }

  if (method === 'notifications/initialized' || method === 'ping') {
    return jsonResponse(makeResponse(id, {}));
  }

  if (method === 'tools/call') {
    const toolName = params?.name;
    const toolArgs = params?.arguments || {};
    if (typeof toolName !== 'string') {
      return jsonResponse(makeResponse(id, undefined, {
        code: ERROR_CODES.INVALID_PARAMS,
        message: 'tools/call requires params.name',
      }), { status: 400 });
    }
    const authHeaders: Record<string, string> = {};
    const authorization = request.headers.get('authorization');
    const apiToken = request.headers.get('x-cannaai-api-token');
    if (authorization) authHeaders.Authorization = authorization;
    if (apiToken) authHeaders['X-CannaAI-API-Token'] = apiToken;
    const result = await callTool(toolName, toolArgs, authHeaders);
    return jsonResponse(makeResponse(id, result));
  }

  return jsonResponse(makeResponse(id, undefined, {
    code: ERROR_CODES.METHOD_NOT_FOUND,
    message: `Method not found: ${method}`,
  }), { status: 404 });
}

// GET returns a brief discovery summary so humans + non-MCP tools can see
// what the endpoint exposes without sending a JSON-RPC request.
export async function GET() {
  return jsonResponse({
    name: SERVER_NAME,
    version: SERVER_VERSION,
    protocol: 'MCP ' + PROTOCOL_VERSION,
    transport: 'streamable-http (POST JSON-RPC 2.0)',
    toolCount: TOOLS.length,
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
    docs: 'POST a JSON-RPC 2.0 envelope: {"jsonrpc":"2.0","id":1,"method":"tools/list"}',
  });
}
