import { PlantHealthAnalysis } from "../../types/plant-analysis";
import { getLMStudioApiKey } from "../ai-provider-lmstudio";

function normalizeImageUrl(image: unknown): string | undefined {
  if (typeof image !== 'string') return undefined;
  const value = image.trim();
  if (!value) return undefined;
  if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  return `data:image/png;base64,${value}`;
}

function textFromCompletionMessage(message: any): string {
  const content = message?.content;
  if (Array.isArray(content)) {
    const text = content
      .map((part: any) => typeof part === 'string' ? part : part?.text || '')
      .join('')
      .trim();
    if (text) return text;
  }
  if (typeof content === 'string' && content.trim()) return content.trim();
  return typeof message?.reasoning_content === 'string'
    ? message.reasoning_content.trim()
    : '';
}

function isNonChatModel(model: any): boolean {
  const id = String(model?.id || model?.key || '').toLowerCase();
  return Boolean(
    model?.type === 'embedding' ||
    model?.type === 'reranker' ||
    id.includes('embedding') ||
    id.includes('reranker') ||
    id.includes('embed-') ||
    id.endsWith('-embed'),
  );
}

function normalizeBaseUrl(endpoint: string): string {
  const value = endpoint.trim();
  const withProtocol = /^https?:\/\//i.test(value) ? value : `http://${value}`;
  // Accept the root URL as well as URLs copied from either LM Studio API.
  // Requests in this legacy adapter append the API path themselves.
  return withProtocol
    .replace(/\/(?:api\/)?v1\/?$/i, '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/$/, '');
}

async function fetchModelCatalog(baseUrl: string, apiKey?: string): Promise<any[]> {
  const headers = {
    'Accept': 'application/json',
    ...(apiKey?.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {}),
  };

  // Newer LM Studio exposes capability and loaded-instance metadata here.
  // Keep the OpenAI-compatible endpoint as a fallback for older releases.
  for (const path of ['/api/v1/models', '/v1/models']) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}${path}`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers,
      }, 5000);
      if (!response.ok) continue;
      const data = await response.json();
      const models = Array.isArray(data?.models) ? data.models : data?.data;
      if (Array.isArray(models) && (models.length > 0 || path === '/v1/models')) return models;
    } catch {
      // Try the compatibility endpoint before reporting the provider down.
    }
  }
  return [];
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Test connection to LM Studio
 */
export async function testLMStudioConnection(
  endpoint: string,
  apiKey?: string,
): Promise<{ success: boolean; error?: string; models?: string[] }> {
  try {
    const baseUrl = normalizeBaseUrl(endpoint);
    const models = await fetchModelCatalog(baseUrl, apiKey);
    const ids = models.map((model: any) => model?.id || model?.key).filter(Boolean);
    return ids.length > 0
      ? { success: true, models: ids }
      : { success: false, error: 'LM Studio returned no chat-capable models' };
  } catch (e: any) {
    let errorMsg = e.message || "Unknown error";
    if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      if (isHttps) {
        errorMsg = "Mixed Content Blocked: HTTPS site trying to connect to HTTP local server. Allow insecure content or use HTTP.";
      } else {
        errorMsg = "Network Error: Ensure LM Studio is running, CORS is enabled, and endpoint is correct.";
      }
    }
    console.error("Connection test failed:", e);
    return { success: false, error: errorMsg };
  }
}

/**
 * Get first available model from LM Studio
 */
async function getAvailableModel(baseUrl: string): Promise<string | null> {
  try {
    const models = await fetchModelCatalog(baseUrl, getLMStudioApiKey());
    const model = models.find((entry: any) => !isNonChatModel(entry));
    if (model) return model.id || model.key || null;
  } catch (e) {
    console.error("Failed to get models:", e);
  }
  return null;
}

const VERIFICATION_PROMPT = `
CRITICAL INSTRUCTION: You are an expert cannabis cultivation analyst conducting verification.
TARGET TO VERIFY: "{{TARGET}}"

Task:
1. Scan specifically for "{{TARGET}}".
2. If found, confirm issue type, severity, and treatment.
3. If NOT found, return empty lists.
4. DO NOT hallucinate.

Return valid JSON. Escape all double quotes.
{
  "summary": "Verification result...",
  "entities": [],
  "keyInsights": [],
  "flaggedIssues": [],
  "recommendations": [],
  "locations": [],
  "visualObjects": [],
  "issueType": "Verification",
  "confidenceScore": 0,
  "timelineEvents": []
}
`;

const SYSTEM_PROMPT = `
TASK: PERFORM FORENSIC CANNABIS PLANT HEALTH ANALYSIS.

CRITICAL INSTRUCTIONS:
- IDENTIFY: Visually recognize symptoms (spots, discoloration, pests, mold).
- INFER: Use context clues (leaf position, growth stage, environmental data).
- DESCRIBE: Specific details (e.g., "Yellow spots on lower fan leaves", "Webbing on buds").

1. SUMMARY: Concise health assessment.
2. ENTITIES: List EVERY item found. Use types: "strain", "nutrient", "pest", "disease", "deficiency", "symptom".
3. KEY INSIGHTS: Connect visual elements to potential issues.
4. SENTIMENT: "healthy", "warning", "critical", "unknown".
5. FLAGGED ISSUES: Critical problems needing immediate attention.
6. LOCATIONS: Plant parts affected (leaves, stems, buds, roots).
7. RECOMMENDATIONS: Specific treatment actions.
8. VISUAL OBJECTS: Distinctive items visible (mites, spots, equipment).
9. ISSUE TYPE: Classify (e.g., "Nutrient Deficiency", "Pest Infestation").
10. TIMELINE: Extract growth events if info provided.
11. CONFIDENCE: 0-100 score based on clarity.
12. STRAIN INFO: Extract strain data if available.
13. ENVIRONMENTAL: Extract temp, humidity, pH, EC if provided.

Respond with valid JSON. Escape all double quotes.
`;

/**
 * Analyze plant health using LM Studio (local AI)
 */
export async function analyzeWithLMStudio(
  text: string,
  images: string[],
  endpoint: string,
  verificationTarget?: string,
  requestedModelId?: string,
  useSearch: boolean = false
): Promise<PlantHealthAnalysis | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 min timeout

  try {
    const baseUrl = normalizeBaseUrl(endpoint);
    const url = `${baseUrl}/v1/chat/completions`;

    let modelId: string | null | undefined = requestedModelId;
    if (!modelId) {
      modelId = await getAvailableModel(baseUrl);
    }

    if (!modelId) {
      throw new Error("No model loaded in LM Studio");
    }

    // Context-Aware Verification Logic
    let promptText = "";
    if (verificationTarget) {
      if (typeof verificationTarget === 'object') {
        const vt = verificationTarget as any;
        let contextPrompt = VERIFICATION_PROMPT.replace("{{TARGET}}", vt.name);
        contextPrompt += `\n\nCONTEXT FROM SWARM:\nExpected Type: ${vt.type}\nObservation: "${vt.context}"`;
        promptText = contextPrompt + (text ? `\nCONTEXT DATA:\n${text.substring(0, 40000)}` : '');
      } else {
        promptText = VERIFICATION_PROMPT.replace("{{TARGET}}", verificationTarget) + (text ? `\nCONTEXT DATA:\n${text.substring(0, 40000)}` : '');
      }
    } else {
      promptText = SYSTEM_PROMPT + (text ? `\nCONTEXT DATA:\n${text.substring(0, 40000)}` : '');
    }

    // Construct vision payload
    const content: any[] = [{ type: "text", text: promptText }];

    if (images && images.length > 0) {
      images.slice(0, 3).forEach(imgData => {
        const imageUrl = normalizeImageUrl(imgData);
        if (!imageUrl) return;
        content.push({
          type: "image_url",
          image_url: {
            url: imageUrl
          }
        });
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        ...(getLMStudioApiKey()
          ? { Authorization: `Bearer ${getLMStudioApiKey()}` }
          : {}),
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant that outputs strictly valid JSON for cannabis cultivation analysis."
          },
          {
            role: "user",
            content: content
          }
        ],
        temperature: 0.2,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("LM Studio error response:", errorText);
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    const responseContent = textFromCompletionMessage(data.choices?.[0]?.message);
    if (!responseContent) {
      throw new Error("LM Studio returned an empty analysis response");
    }

    // Clean response
    let cleanedContent = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Try to parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(cleanedContent);
    } catch (e) {
      console.error("Failed to parse LM Studio response:", cleanedContent);
      return null;
    }

    // Map response to PlantHealthAnalysis
    const analysis: PlantHealthAnalysis = {
      summary: parsed.summary || "No summary provided",
      entities: parsed.entities || [],
      keyInsights: parsed.keyInsights || [],
      sentiment: parsed.sentiment || "unknown",
      flaggedIssues: parsed.flaggedIssues || [],
      locations: parsed.locations || [],
      recommendations: parsed.recommendations || [],
      visualObjects: parsed.visualObjects || [],
      issueType: parsed.issueType || "Unknown",
      confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0,
      timelineEvents: parsed.timelineEvents || [],
      provider: 'lmstudio',
      timestamp: new Date().toISOString(),
      rawResponse: cleanedContent
    };

    return analysis;
  } catch (e: any) {
    console.error("LM Studio analysis error:", e);
    if (e.name === 'AbortError') {
      throw new Error("Analysis timeout: LM Studio took too long to respond");
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * LM Studio RAG chat for cultivation assistance
 */
export async function localRagChat(
  query: string,
  contextDocs: any[],
  history: any[],
  endpoint: string,
  requestedModelId?: string
): Promise<string> {
  if (!endpoint) {
    throw new Error("LM Studio endpoint is not configured");
  }

  const baseUrl = normalizeBaseUrl(endpoint);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    let modelId = requestedModelId;
    if (!modelId) {
      modelId = await getAvailableModel(baseUrl) || undefined;
    }

    if (!modelId) {
      throw new Error("No model loaded in LM Studio");
    }

    const contextText = contextDocs.length > 0
      ? contextDocs.map(d => `
=== DOCUMENT START ===
ID: ${d.id}
FILENAME: ${d.name}
DATE: ${d.analysis?.analysisDate || 'Unknown'}
SUMMARY: ${d.analysis?.summary}
ENTITIES: ${d.analysis?.entities?.map((e: any) => `${e.name} (${e.type})`).join(', ') || 'None'}
FULL CONTENT:
${d.content ? d.content.substring(0, 50000) : "[Content Missing or Image Only]"}
=== DOCUMENT END ===
`).join('\n\n')
      : "No specific documents matched. Answer based on general cultivation knowledge.";

    const historyText = history
      .slice(-20)
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const systemPrompt = `You are CANNABIS CULTIVATION EXPERT AI (Version 2.0).
You have DIRECT ACCESS to the user's cultivation archive.
1. DEEP ANALYSIS: Read "FULL CONTENT" of documents.
2. SYNTHESIS: Connect information across documents.
3. CITATIONS: Cite sources by appending [Filename].
4. ACCURACY: If information is not in the documents, say so.`;

    const userPrompt = `
ARCHIVE CONTEXT:
${contextText}

CONVERSATION HISTORY:
${historyText || 'No prior conversation.'}

QUERY: ${query}`;

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(getLMStudioApiKey()
          ? { Authorization: `Bearer ${getLMStudioApiKey()}` }
          : {}),
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`LM Studio Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = textFromCompletionMessage(data.choices?.[0]?.message);
    if (content) return content;

    throw new Error("LM Studio returned an empty chat response");
  } catch (e: any) {
    clearTimeout(timeoutId);
    console.error("LM Studio RAG chat error:", e);
    if (e.name === 'AbortError') {
      throw new Error("Chat timeout: LM Studio took too long to respond");
    }
    throw e;
  }
}
