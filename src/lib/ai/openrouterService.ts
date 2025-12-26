import { PlantHealthAnalysis } from "../../types/plant-analysis";

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

/**
 * Analyze plant health using OpenRouter (multi-model access)
 */
export async function analyzeWithOpenRouter(
  text: string,
  images: string[],
  apiKey: string,
  modelId: string = "openai/gpt-4-vision-preview",
  verificationTarget?: string
): Promise<PlantHealthAnalysis | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 600000);

  try {
    let promptText = "";
    if (verificationTarget) {
      if (typeof verificationTarget === 'object') {
        const vt = verificationTarget as any;
        promptText = VERIFICATION_PROMPT.replace("{{TARGET}}", vt.name);
        promptText += `\n\nCONTEXT FROM SWARM:\nExpected Type: ${vt.type}\nObservation: "${vt.context}"`;
        promptText += (text ? `\nCONTEXT DATA:\n${text.substring(0, 40000)}` : '');
      } else {
        promptText = VERIFICATION_PROMPT.replace("{{TARGET}}", verificationTarget);
        promptText += (text ? `\nCONTEXT DATA:\n${text.substring(0, 40000)}` : '');
      }
    } else {
      promptText = SYSTEM_PROMPT + (text ? `\nCONTEXT DATA:\n${text.substring(0, 40000)}` : '');
    }

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

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
        'X-Title': 'CannaAI Pro'
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: "system",
            content: "You are a cannabis cultivation expert AI that outputs strictly valid JSON."
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
      throw new Error(`OpenRouter Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content || "";

    // Clean and parse JSON
    let cleanedContent = responseContent.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, "$1").trim();

    let parsed: any = null;
    try {
      parsed = JSON.parse(cleanedContent);
    } catch (e) {
      const firstBrace = cleanedContent.indexOf('{');
      const lastBrace = cleanedContent.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const potentialJson = cleanedContent.substring(firstBrace, lastBrace + 1);
        try {
          parsed = JSON.parse(potentialJson);
        } catch (innerError) {
          console.error("Failed to parse extracted JSON:", potentialJson);
        }
      }
    }

    if (!parsed) {
      return {
        summary: responseContent.substring(0, 500) || "Could not extract summary.",
        entities: [],
        keyInsights: [responseContent.substring(0, 200)],
        sentiment: "unknown",
        flaggedIssues: []
      };
    }

    return {
      summary: parsed.summary || "Summary extraction failed.",
      entities: parsed.entities || [],
      keyInsights: parsed.keyInsights || [],
      sentiment: parsed.sentiment || "unknown",
      analysisDate: parsed.analysisDate || "Unknown",
      flaggedIssues: parsed.flaggedIssues || [],
      locations: parsed.locations || [],
      recommendations: parsed.recommendations || [],
      visualObjects: parsed.visualObjects || [],
      issueType: parsed.issueType || "Unknown",
      confidenceScore: parsed.confidenceScore || 0,
      timelineEvents: parsed.timelineEvents || [],
      strainInfo: parsed.strainInfo,
      environmentalConditions: parsed.environmentalConditions
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("OpenRouter Analysis Error:", error);
    throw error;
  }
}

/**
 * OpenRouter RAG Chat for cultivation assistance
 */
export async function openrouterRagChat(
  query: string,
  contextDocs: any[],
  history: any[],
  apiKey: string,
  modelId: string = "openai/gpt-3.5-turbo"
): Promise<string> {
  const contextText = contextDocs.length > 0
    ? contextDocs.map(d => `
=== DOCUMENT START ===
ID: ${d.id}
FILENAME: ${d.name}
DATE: ${d.analysis?.analysisDate || 'Unknown'}
SUMMARY: ${d.analysis?.summary}
ENTITIES: ${d.analysis?.entities?.map((e: any) => `${e.name} (${e.type})`).join(', ') || 'None'}
FULL CONTENT:
${d.content ? d.content.substring(0, 50000) : "[Content Missing]"}
=== DOCUMENT END ===
`).join('\n\n')
    : "No documents matched.";

  const historyText = history.slice(-20).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

  const systemPrompt = `You are CANNABIS CULTIVATION EXPERT AI (Version 2.0).
You have DIRECT ACCESS to the user's cultivation archive.
1. DEEP ANALYSIS: Read "FULL CONTENT" of documents.
2. SYNTHESIS: Connect information across documents.
3. CITATIONS: Cite sources - append [Filename].
4. ACCURACY: If info not in documents, say so.`;

  const userPrompt = `
ARCHIVE CONTEXT:
${contextText}

CONVERSATION HISTORY:
${historyText}

QUERY: ${query}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter Chat Error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "The assistant was unable to respond.";
}
