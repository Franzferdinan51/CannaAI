/**
 * LM Studio AI Provider - Dynamic Model Selection
 * Auto-detects available models and allows selection
 */

const LM_STUDIO_BASE_URL = process.env.LM_STUDIO_BASE_URL || 'http://100.116.54.125:1234/v1';
const LM_STUDIO_API_KEY = process.env.LM_STUDIO_API_KEY || 'sk-lm-zO7bswIc:WkHEMTUfVNkq5WYNyFOW';

// Default models (can be overridden)
const LM_STUDIO_VISION_MODEL = process.env.LM_STUDIO_VISION_MODEL || 'jan-v2-vl-high';
const LM_STUDIO_TEXT_MODEL = process.env.LM_STUDIO_TEXT_MODEL || 'qwen/qwen3.5-27b';

// Cache available models
let availableModelsCache: string[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

export async function checkLMStudio(): Promise<boolean> {
  try {
    const response = await fetch(`${LM_STUDIO_BASE_URL}/models`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${LM_STUDIO_API_KEY}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getAvailableModels(forceRefresh = false): Promise<string[]> {
  const now = Date.now();
  
  // Return cache if valid
  if (!forceRefresh && availableModelsCache && (now - cacheTime) < CACHE_TTL) {
    return availableModelsCache;
  }

  try {
    const response = await fetch(`${LM_STUDIO_BASE_URL}/models`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${LM_STUDIO_API_KEY}` },
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    availableModelsCache = data.data?.map((m: any) => m.id) || [];
    cacheTime = now;
    return availableModelsCache;
  } catch {
    return [];
  }
}

// All models can potentially do vision - let caller decide
export async function getVisionModels(): Promise<string[]> {
  const models = await getAvailableModels();
  // Most local models support vision - filter only embeddings
  return models.filter(id => !id.includes('embedding'));
}

export async function getTextModels(): Promise<string[]> {
  const models = await getAvailableModels();
  return models.filter(id => !id.includes('embedding'));
}

export async function executeWithLMStudio(
  messages: any[],
  options: { 
    model?: string; 
    image?: string; 
    temperature?: number;
    useVision?: boolean;
  } = {}
) {
  // Determine which model to use
  let model: string;
  
  if (options.model) {
    // Specific model requested
    model = options.model;
  } else if (options.image && options.useVision !== false) {
    // Image provided - use vision model
    model = LM_STUDIO_VISION_MODEL;
  } else {
    // Text model
    model = LM_STUDIO_TEXT_MODEL;
  }

  let formattedMessages = messages;
  
  // Add image to message if using vision model
  if (options.image && options.useVision !== false) {
    formattedMessages = messages.map((msg: any) => {
      if (msg.role === 'user') {
        return {
          role: 'user',
          content: [
            { type: 'text', text: msg.content },
            { type: 'image_url', image_url: { url: options.image } },
          ],
        };
      }
      return msg;
    });
  }

  const response = await fetch(`${LM_STUDIO_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LM_STUDIO_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LM Studio error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Get current configured models
export function getConfiguredModels() {
  return {
    vision: LM_STUDIO_VISION_MODEL,
    text: LM_STUDIO_TEXT_MODEL,
  };
}

// Change model via API (runtime configurable)
export function setModel(type: 'vision' | 'text', model: string) {
  if (type === 'vision') {
    process.env.LM_STUDIO_VISION_MODEL = model;
  } else {
    process.env.LM_STUDIO_TEXT_MODEL = model;
  }
  // Clear cache to force refresh
  availableModelsCache = null;
}

export { LM_STUDIO_VISION_MODEL, LM_STUDIO_TEXT_MODEL };
