import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzePlantImage = async (base64Data: string): Promise<AnalysisResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          },
          {
            text: `Analyze this cannabis plant image for health issues. 
            Identify if it is Healthy, has Nutrient Deficiencies, Pests, or Fungal issues like Leaf Septoria.
            Provide a confidence score (0-100) for detected issues.
            Provide actionable recommendations for the grower.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallHealth: {
              type: Type.STRING,
              enum: ['Healthy', 'Issues Detected', 'Critical'],
              description: "The overall health status category of the plant."
            },
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the issue (e.g., Spider Mites, Nitrogen Deficiency)" },
                  confidence: { type: Type.NUMBER, description: "Confidence percentage (0-100)" }
                }
              }
            },
            recommendations: {
              type: Type.STRING,
              description: "Concise, actionable advice for the grower to fix the problems."
            }
          },
          required: ["overallHealth", "issues", "recommendations"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini");
    }
    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Fallback for demo purposes if API fails or key is missing
    return {
      overallHealth: 'Issues Detected',
      issues: [{ name: 'Analysis Failed', confidence: 0 }],
      recommendations: 'Could not analyze image. Please check API Key configuration.'
    };
  }
};
