import { GoogleGenerativeAI } from "@google/generative-ai";
import { Nutrient, Strain, NutrientType, StrainType, UserSettings, NewsArticle, GeneticAnalysis, UsageLog, LineageNode, ProductAlternative, BreedingProject } from '../types/canopy';

/**
 * Enhanced Gemini AI Service for Canopy Features
 * Adds breeding analysis, strain data fetching, product alternatives, and agentic AI
 */

const getAiClient = (apiKey: string) => {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("API Key not found");
  }
  return new GoogleGenerativeAI({ apiKey: key });
};

/**
 * File to Base64 for AI Vision
 */
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Scan inventory item (nutrient bottle or seed pack) with AI
 */
export const scanInventoryItem = async (
  base64Image: string,
  mode: 'nutrient' | 'strain',
  apiKey: string
): Promise<Partial<Nutrient | Strain>> => {
  const ai = getAiClient(apiKey);
  const modelId = "gemini-2.5-flash";

  let prompt = "";
  let schema: any = {};

  if (mode === 'nutrient') {
    prompt = "Analyze this image of a cannabis nutrient bottle. Extract the Name, Brand, NPK ratio (format N-P-K), and likely Type. If NPK is not visible, use '0-0-0'.";
    schema = {
      type: "OBJECT",
      properties: {
        name: { type: "STRING" },
        brand: { type: "STRING" },
        npk: { type: "STRING" },
        type: { type: "STRING", enum: Object.values(NutrientType) },
      },
      required: ["name", "brand", "type"],
    };
  } else {
    prompt = "Analyze this image of a cannabis seed pack. Extract the Strain Name, Breeder, Type (Indica, Sativa, Hybrid), and estimated Flowering Time in weeks (integer). If Auto-flowering, mark isAuto as true.";
    schema = {
      type: "OBJECT",
      properties: {
        name: { type: "STRING" },
        breeder: { type: "STRING" },
        type: { type: "STRING", enum: Object.values(StrainType) },
        floweringTimeWeeks: { type: "INTEGER" },
        isAuto: { type: "BOOLEAN" },
      },
      required: ["name", "breeder", "type"],
    };
  }

  try {
    const model = ai.getGenerativeModel({
      model: modelId,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const response = await model.generateContent({
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: prompt }
        ]
      }
    });

    if (response.response.text()) {
      return JSON.parse(response.response.text());
    }
    throw new Error("No data returned from AI");
  } catch (error) {
    console.error("Gemini Scan Error:", error);
    throw error;
  }
};

/**
 * Fetch strain data from URL using Google Search
 */
export const fetchStrainDataFromUrl = async (
  url: string,
  apiKey: string
): Promise<Partial<Strain>> => {
  const ai = getAiClient(apiKey);

  const prompt = `TARGET URL: "${url}"

ROLE: You are a research assistant.
OBJECTIVE: Find definitive growing information for the cannabis strain at the provided URL.

INSTRUCTIONS:
1. **Extract Terms**: Identify the Strain Name and Breeder from the URL string itself.
2. **Web Search**:
   - Execute a search for the URL to find the page title and snippet.
   - Execute a search for "[Strain Name] [Breeder] strain info flowering time lineage".
3. **Synthesize**: Combine findings to fill the JSON schema.
4. **Validation**:
   - **Do NOT hallucinate**. If the flowering time is not explicitly found in search results, return null.
   - If the lineage is not explicitly found, return empty lists.
   - Type (Indica/Sativa) is often a percentage (e.g. 60/40). If >50% Indica, label "Indica".

JSON Output Schema:
{
  "name": "string",
  "breeder": "string",
  "type": "Indica" | "Sativa" | "Hybrid" | "Ruderalis",
  "floweringTimeWeeks": number | null,
  "isAuto": boolean,
  "notes": "string (concise summary of effects/flavors)",
  "parents": [{"name": "string", "type": "Indica/Sativa/Hybrid"}]
}
`;

  try {
    const model = ai.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: [{ googleSearch: {} }]
    });

    const response = await model.generateContent(prompt);

    if (response.response.text()) {
      let cleanedText = response.response.text().trim();
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
      }

      try {
        const data = JSON.parse(cleanedText);
        let normalizedType = StrainType.HYBRID;
        if (data.type?.toLowerCase().includes('indica')) normalizedType = StrainType.INDICA;
        else if (data.type?.toLowerCase().includes('sativa')) normalizedType = StrainType.SATIVA;
        else if (data.type?.toLowerCase().includes('auto') || data.type?.toLowerCase().includes('ruderalis') || data.isAuto) normalizedType = StrainType.RUDERALIS;

        return {
          ...data,
          type: normalizedType,
          isAuto: data.isAuto || normalizedType === StrainType.RUDERALIS,
          floweringTimeWeeks: typeof data.floweringTimeWeeks === 'number' ? data.floweringTimeWeeks : null
        };
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError, cleanedText);
        throw new Error("AI returned invalid JSON format.");
      }
    }
    throw new Error("No data returned");
  } catch (error) {
    console.error("Gemini URL Fetch Error:", error);
    throw error;
  }
};

/**
 * Find product alternatives with Google Search
 */
export const findProductAlternatives = async (
  itemName: string,
  brand: string,
  category: 'Nutrient' | 'Seed',
  apiKey: string
): Promise<ProductAlternative[]> => {
  const ai = getAiClient(apiKey);

  const prompt = `Find 3 excellent alternative products for: "${brand} ${itemName}" (${category}).

Criteria:
1. Similar or better quality.
2. Comparable function (e.g. if base nutrient, suggest base nutrient).
3. Include approximate USD price.

Return JSON Array:
[
  { "name": "string", "brand": "string", "approxPrice": number, "reason": "string", "searchQuery": "string" }
]`;

  try {
    const model = ai.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
      tools: [{ googleSearch: {} }]
    });

    const response = await model.generateContent(prompt);

    if (response.response.text()) {
      return JSON.parse(response.response.text()) as ProductAlternative[];
    }
    return [];
  } catch (error) {
    console.error("Alternatives Fetch Error", error);
    throw new Error("Could not find alternatives.");
  }
};

/**
 * Analyze genetics for breeding recommendations
 */
export const analyzeGenetics = async (
  targetStrain: Strain,
  inventory: Strain[],
  apiKey: string
): Promise<GeneticAnalysis> => {
  const ai = getAiClient(apiKey);

  const potentialPartners = inventory
    .filter(s => s.id !== targetStrain.id)
    .map(s => JSON.stringify({ id: s.id, name: s.name, type: s.type, breeder: s.breeder }))
    .join('\n');

  let knownLineageContext = "";
  if (targetStrain.parents && targetStrain.parents.length > 0) {
    const parentStr = targetStrain.parents.map(p => `${p.name} (${p.type})`).join(', ');
    knownLineageContext += `KNOWN PARENTS: ${parentStr}.\n`;
  }

  const prompt = `Analyze the cannabis strain "${targetStrain.name}" by ${targetStrain.breeder}.
  ${knownLineageContext ? `IMPORTANT: Use this lineage:\n${knownLineageContext}` : 'TASK 1: Determine lineage.'}

TASK 2: Suggest Breeding Matches from "Potential Partners".
Potential Partners List:
${potentialPartners}

IMPORTANT REQUIREMENTS:
1. For each recommendation, predict 2-3 specific potential phenotypes.
2. For EACH phenotype, provide a 'name' (e.g. 'Berry Pheno') and a DETAILED 'description'.

Expected JSON Structure:
{
  "strainName": "string",
  "parents": [{"name": "string", "type": "Indica/Sativa/Hybrid"}],
  "grandparents": [],
  "recommendations": [
    {
      "partnerId": "id from list",
      "partnerName": "string",
      "projectedName": "string",
      "synergyAnalysis": "string",
      "dominantTerpenes": ["string"],
      "potentialPhenotypes": [
         { "name": "string", "description": "Detailed description." }
      ]
    }
  ]
}

Return valid JSON matching this schema.
`;

  try {
    const model = ai.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const response = await model.generateContent(prompt);

    if (response.response.text()) {
      return JSON.parse(response.response.text()) as GeneticAnalysis;
    }
    throw new Error("No data returned");
  } catch (error) {
    throw error;
  }
};

/**
 * Analyze grow data for AI insights
 */
export const analyzeGrowData = async (
  logs: UsageLog[],
  nutrients: Nutrient[],
  strains: Strain[],
  apiKey: string
): Promise<string> => {
  const ai = getAiClient(apiKey);

  const logSummary = logs.slice(0, 50).map(l => `${l.date}: ${l.action} ${l.amount}${l.unit} of ${l.itemName} (${l.category})`).join('\n');
  const totalValue = nutrients.reduce((acc, n) => acc + ((n.cost || 0) * (n.bottleCount || 0)), 0) +
    strains.reduce((acc, s) => acc + (s.cost || 0), 0);

  const prompt = `Analyze this grower's data log and inventory value.
Inventory Value: $${totalValue} (approx).
Recent Activity Log:
${logSummary}

Provide 3 key insights in Markdown.
`;

  const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
  const response = await model.generateContent(prompt);

  return response.response.text() || "Could not analyze data.";
};

/**
 * Fetch cannabis news
 */
export const fetchCannabisNews = async (apiKey: string, category: string = 'Latest'): Promise<NewsArticle[]> => {
  try {
    const ai = getAiClient(apiKey);
    const currentDate = new Date().toLocaleDateString();
    let categoryQuery = "regarding Cannabis legislation, industry, and culture";
    if (category !== 'Latest') categoryQuery = `specifically regarding Cannabis ${category}`;

    const prompt = `Find 8 most important and recent news stories ${categoryQuery} in the USA as of today, ${currentDate}.
Return a valid JSON array of NewsArticle objects (headline, summary, source, url, date).
Output strictly valid JSON.`;

    const model = ai.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
      tools: [{ googleSearch: {} }]
    });

    const response = await model.generateContent(prompt);

    if (response.response.text()) {
      let cleanedText = response.response.text().trim();
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
      }
      return JSON.parse(cleanedText) as NewsArticle[];
    }
    return [];
  } catch (error) {
    throw new Error("Failed to fetch news.");
  }
};
