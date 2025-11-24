type AdkRequest = {
  message: string;
  mode?: string;
  context?: any;
  sensorData?: any;
  pageSnapshot?: any;
};

type AdkResponse = {
  content: string;
  model?: string;
  usage?: any;
  metadata?: any;
};

const ADK_ENDPOINT = process.env.ADK_ENDPOINT;
const ADK_API_KEY = process.env.ADK_API_KEY;

export async function callAdkAgent(payload: AdkRequest): Promise<AdkResponse> {
  if (!ADK_ENDPOINT || !ADK_API_KEY) {
    throw new Error('ADK not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(ADK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADK_API_KEY}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`ADK request failed: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    return {
      content: data.response || data.content || '',
      model: data.model || data.agent || 'adk',
      usage: data.usage,
      metadata: data.metadata
    };
  } finally {
    clearTimeout(timeout);
  }
}
