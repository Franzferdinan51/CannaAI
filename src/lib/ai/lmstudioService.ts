import { PlantHealthAnalysis } from "../../types/plant-analysis";

/**
 * Test connection to LM Studio
 */
export async function testLMStudioConnection(endpoint: string): Promise<{ success: boolean; error?: string; models?: string[] }> {
  try {
    const baseUrl = endpoint.startsWith('http') ? endpoint : `http://${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${baseUrl}/v1/models`, {
      method: 'GET',
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const models = data.data?.map((m: any) => m.id) || [];
      return { success: true, models };
    }

    return { success: false, error: `Server returned ${response.status}` };
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
    const response = await fetch(`${baseUrl}/v1/models`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        return data.data[0].id;
      }
    }
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
    const baseUrl = endpoint.startsWith('http') ? endpoint : `http://${endpoint}`;
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
        content.push({
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${imgData}`
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

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("LM Studio error response:", errorText);
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content || "";

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
      confidenceScore: parsed.confidenceScore || 50,
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
  }
}