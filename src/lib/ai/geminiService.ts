import { GoogleGenerativeAI } from "@google/generative-ai";
import { PlantHealthAnalysis } from "../../types/plant-analysis";

const schema = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    entities: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          type: { type: "STRING" },
          role: { type: "STRING" },
          context: { type: "STRING" },
          isConfirmed: { type: "BOOLEAN" }
        },
        required: ["name", "type", "role", "context", "isConfirmed"]
      }
    },
    keyInsights: { type: "ARRAY", items: { type: "STRING" } },
    sentiment: { type: "STRING" },
    analysisDate: { type: "STRING" },
    flaggedIssues: { type: "ARRAY", items: { type: "STRING" } },
    locations: { type: "ARRAY", items: { type: "STRING" } },
    recommendations: { type: "ARRAY", items: { type: "STRING" } },
    visualObjects: { type: "ARRAY", items: { type: "STRING" } },
    issueType: { type: "STRING" },
    confidenceScore: { type: "NUMBER" },
    timelineEvents: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          date: { type: "STRING" },
          event: { type: "STRING" }
        },
        required: ["date", "event"]
      }
    },
    strainInfo: {
      type: "OBJECT",
      properties: {
        strainName: { type: "STRING" },
        phenotype: { type: "STRING" },
        stage: { type: "STRING" },
        floweringDays: { type: "NUMBER" }
      }
    },
    environmentalConditions: {
      type: "OBJECT",
      properties: {
        temperature: { type: "STRING" },
        humidity: { type: "STRING" },
        ph: { type: "STRING" },
        ec: { type: "STRING" }
      }
    }
  }
};

const VERIFICATION_PROMPT = `
CRITICAL INSTRUCTION: You are an expert cannabis cultivation analyst conducting a verification check.
Your Goal: Verify a specific plant health issue.

TARGET TO VERIFY: "{{TARGET}}"

Task:
1. Scan the plant images/text specifically for "{{TARGET}}".
2. If found, confirm the issue type, severity, and provide treatment recommendations.
3. If NOT found, return empty lists.
4. DO NOT hallucinate. If the issue is not visible, say so.

Return JSON with:
{
  "summary": "Verification result for {{TARGET}}...",
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
TASK: ANALYZE CANNABIS PLANT HEALTH WITH HIGH PRECISION.

CRITICAL RULES:
- IDENTIFY issues based on visual symptoms and context provided
- EXTRACT ONLY EXPLICITLY VISIBLE symptoms. DO NOT GUESS.
- If a symptom is unclear, mark isConfirmed: false.
- Role descriptions must be specific (e.g., "Nitrogen deficiency in lower leaves", "Spider mite infestation on buds").
- Eliminate hallucinations: If not visible in text/image, do not list it.

ANALYSIS SECTIONS:
1. SUMMARY: Provide a concise overall health assessment.
2. ENTITIES: List EVERY identified item (strain, nutrient, pest, disease, deficiency, symptom).
   - type: "strain" | "nutrient" | "pest" | "disease" | "deficiency" | "symptom"
   - Mark isConfirmed: true for clearly visible issues
3. KEY INSIGHTS: Direct observations backed by visual evidence.
4. SENTIMENT: "healthy" | "warning" | "critical" | "unknown"
5. FLAGGED ISSUES: List all critical problems requiring immediate attention.
6. LOCATIONS: Parts of plant affected (leaves, stems, buds, roots, soil).
7. RECOMMENDATIONS: Specific treatment or corrective actions.
8. VISUAL OBJECTS: Distinctive items visible (mites, spots, discoloration, pests, equipment).
9. ISSUE TYPE: Classify the primary issue (e.g., "Nutrient Deficiency", "Pest Infestation", "Disease", "Environmental Stress").
10. TIMELINE: If growth stage info is provided, extract relevant events.
11. CONFIDENCE: Rate your confidence (0-100) based on image quality and symptom clarity.
12. STRAIN INFO: If strain data is available, extract name, phenotype, stage, flowering days.
13. ENVIRONMENTAL CONDITIONS: If sensor data is provided, extract temp, humidity, pH, EC.

Respond with JSON containing all fields.
`;

/**
 * Analyze plant health using Google Gemini
 */
export async function analyzePlantHealth(
  text: string,
  images: string[],
  apiKey: string,
  modelId: string = "gemini-1.5-flash",
  verificationTarget?: string,
  useSearch: boolean = false,
  mediaItem?: { mimeType: string, data: string }
): Promise<PlantHealthAnalysis> {
  const genAI = new GoogleGenerativeAI(apiKey || process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
    tools: useSearch ? [{ googleSearch: {} }] as any : [],
  }, {
    timeout: 300000 // 5 minutes timeout
  });

  let promptText = "";
  if (verificationTarget) {
    if (typeof verificationTarget === 'object') {
      const vt = verificationTarget as any;
      let contextPrompt = VERIFICATION_PROMPT.replace("{{TARGET}}", vt.name);
      contextPrompt += `\n\nCONTEXT FROM SWARM:\nExpected Type: ${vt.type}\nKey Observation: "${vt.context}"\n\nVERIFICATION INSTRUCTION: Verify if the plant explicitly shows this issue.`;
      promptText = contextPrompt + (text ? `\nCONTEXT DATA:\n${text.substring(0, 40000)}` : '');
    } else {
      promptText = VERIFICATION_PROMPT.replace("{{TARGET}}", verificationTarget) + (text ? `\nCONTEXT DATA:\n${text.substring(0, 40000)}` : '');
    }
  } else {
    promptText = SYSTEM_PROMPT + (text ? `\nCONTEXT DATA:\n${text.substring(0, 40000)}` : '');
  }

  const parts: any[] = [{ text: promptText }];

  // Add images (up to 5)
  for (const img of images.slice(0, 5)) {
    parts.push({
      inlineData: { mimeType: "image/jpeg", data: img }
    });
  }

  // Add video/audio if present
  if (mediaItem) {
    parts.push({
      inlineData: { mimeType: mediaItem.mimeType, data: mediaItem.data }
    });
  }

  try {
    let attempts = 0;
    const maxAttempts = 3;
    let finalError: any;

    while (attempts < maxAttempts) {
      try {
        const result = await model.generateContent({
          contents: [{ role: "user", parts }]
        });

        const response = result.response;
        const responseText = response.text();
        return JSON.parse(responseText);
      } catch (error: any) {
        finalError = error;
        if (error.message?.includes("429") || error.message?.includes("503") || error.status === 429) {
          attempts++;
          console.warn(`Gemini 429/503 hit. Retrying in ${20 * attempts}s... (Attempt ${attempts}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 20000 * attempts));
          continue;
        }
        throw error;
      }
    }
    throw finalError;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      summary: "Analysis failed or returned invalid JSON.",
      entities: [],
      keyInsights: [],
      sentiment: "unknown",
      flaggedIssues: []
    };
  }
}

/**
 * RAG Chat for cultivation assistance
 */
export async function cultivationRagChat(
  query: string,
  contextDocs: any[],
  history: any[],
  modelName: string = 'gemini-1.5-flash',
  apiKey?: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey || process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: modelName });

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

  const historyText = history.slice(-20).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

  const prompt = `
SYSTEM: You are CANNABIS CULTIVATION EXPERT AI (Version 2.0).
You have DIRECT ACCESS to the user's secure cultivation archive.

YOUR MANDATE:
1. DEEP ANALYSIS: Read the "FULL CONTENT" of documents, not just summaries.
2. SYNTHESIS: Connect information across documents (growth stages, nutrients, issues).
3. CITATIONS: Cite sources when asserting facts - append [Filename].
4. ACCURACY: If info is not in documents, say "I cannot find this in the current archive."

ARCHIVE CONTEXT (RAG DATA):
${contextText}

CONVERSATION HISTORY:
${historyText}

CURRENT USER QUERY: ${query}
`;

  const result = await model.generateContent(prompt);
  const response = result.response;

  return response.text() || "The cultivation assistant was unable to synthesize a response.";
}
