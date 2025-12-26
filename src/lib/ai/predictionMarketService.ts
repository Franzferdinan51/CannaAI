/**
 * Prediction Market Service
 * Forecasting and superforecasting for cultivation outcomes
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  PredictionMarketItem,
  CouncilPersona,
  CULTIVATION_PERSONAS
} from '../../types/council';

/**
 * Get AI client
 */
const getAiClient = (apiKey: string) => {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("API Key not found");
  }
  return new GoogleGenerativeAI({ apiKey: key });
};

/**
 * Generate predictions from multiple experts
 */
export async function generatePredictions(
  question: string,
  category: PredictionMarketItem['category'],
  context: string,
  apiKey: string,
  participantIds?: string[]
): Promise<PredictionMarketItem[]> {
  const participants = participantIds
    ? CULTIVATION_PERSONAS.filter(p => participantIds.includes(p.id))
    : CULTIVATION_PERSONAS.filter(p => p.isActive).slice(0, 5);

  if (participants.length === 0) {
    throw new Error("No valid participants for prediction");
  }

  const predictions: PredictionMarketItem[] = [];

  for (const persona of participants) {
    try {
      const prediction = await generateSinglePrediction(
        persona,
        question,
        category,
        context,
        apiKey
      );
      predictions.push(prediction);
    } catch (error) {
      console.error(`Error generating prediction for ${persona.name}:`, error);
    }
  }

  return predictions;
}

/**
 * Generate a single prediction from a persona
 */
async function generateSinglePrediction(
  persona: CouncilPersona,
  question: string,
  category: string,
  context: string,
  apiKey: string
): Promise<PredictionMarketItem> {
  const ai = getAiClient(apiKey);
  const model = ai.getGenerativeModel({
    model: persona.modelId,
    generationConfig: {
      temperature: 0.6, // Slightly lower for predictions
      maxOutputTokens: 800,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          predictedOutcome: { type: "STRING" },
          confidence: { type: "NUMBER" },
          reasoning: { type: "STRING" }
        },
        required: ["predictedOutcome", "confidence", "reasoning"]
      }
    }
  });

  const prompt = `${persona.systemPrompt}\n\nPREDICTION QUESTION: ${question}\n\nCATEGORY: ${category}\n\nCONTEXT:\n${context}\n\nProvide your prediction with a confidence score (0-1) and detailed reasoning. Be specific and quantitative where possible.`;

  try {
    const response = await model.generateContent(prompt);
    const result = JSON.parse(response.response.text());

    return {
      id: crypto.randomUUID(),
      question,
      category,
      predictedOutcome: result.predictedOutcome,
      confidence: result.confidence,
      reasoning: result.reasoning,
      botId: persona.id,
      botName: persona.name,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error in prediction for ${persona.name}:`, error);
    throw error;
  }
}

/**
 * Calculate consensus prediction
 */
export function calculateConsensusPrediction(
  predictions: PredictionMarketItem[]
): {
  consensusOutcome: string;
  avgConfidence: number;
  confidenceInterval: { min: number; max: number };
  disagreement: number;
} {
  if (predictions.length === 0) {
    return {
      consensusOutcome: "Insufficient data",
      avgConfidence: 0,
      confidenceInterval: { min: 0, max: 0 },
      disagreement: 0
    };
  }

  // Calculate average confidence
  const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;

  // Calculate confidence interval
  const confidences = predictions.map(p => p.confidence);
  const minConfidence = Math.min(...confidences);
  const maxConfidence = Math.max(...confidences);

  // Calculate disagreement (standard deviation of normalized outcomes)
  const disagreement = calculateDisagreement(predictions);

  // Determine consensus outcome (weighted by confidence)
  const weightedPredictions = predictions.map(p => ({
    outcome: p.predictedOutcome,
    weight: p.confidence
  }));

  // For numeric outcomes, calculate weighted average
  const numericOutcomes = predictions
    .map(p => parseFloat(p.predictedOutcome))
    .filter(n => !isNaN(n));

  let consensusOutcome: string;
  if (numericOutcomes.length >= predictions.length / 2) {
    // Most predictions are numeric
    const weightedAvg = numericOutcomes.reduce((sum, val, i) => {
      return sum + (val * predictions[i].confidence);
    }, 0) / predictions.reduce((sum, p) => sum + p.confidence, 0);
    consensusOutcome = weightedAvg.toFixed(2);
  } else {
    // Text outcomes - use most confident prediction
    const mostConfident = predictions.reduce((prev, current) =>
      current.confidence > prev.confidence ? current : prev
    );
    consensusOutcome = mostConfident.predictedOutcome;
  }

  return {
    consensusOutcome,
    avgConfidence,
    confidenceInterval: { min: minConfidence, max: maxConfidence },
    disagreement
  };
}

/**
 * Calculate disagreement between predictions
 */
function calculateDisagreement(predictions: PredictionMarketItem[]): number {
  if (predictions.length < 2) return 0;

  // Simple disagreement: variance of confidence scores
  const confidences = predictions.map(p => p.confidence);
  const mean = confidences.reduce((a, b) => a + b) / confidences.length;
  const variance = confidences.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / confidences.length;

  return Math.sqrt(variance);
}

/**
 * Resolve a prediction against actual outcome
 */
export function resolvePrediction(
  prediction: PredictionMarketItem,
  actualOutcome: string
): PredictionMarketItem {
  let accuracy = 0;

  // For numeric outcomes, calculate percentage error
  const predictedNum = parseFloat(prediction.predictedOutcome);
  const actualNum = parseFloat(actualOutcome);

  if (!isNaN(predictedNum) && !isNaN(actualNum)) {
    const error = Math.abs(predictedNum - actualNum) / actualNum;
    accuracy = Math.max(0, 1 - error);
  } else {
    // For text outcomes, simple binary accuracy
    accuracy = prediction.predictedOutcome.toLowerCase() === actualOutcome.toLowerCase() ? 1 : 0;
  }

  return {
    ...prediction,
    resolution: {
      actualOutcome,
      accuracy,
      resolvedAt: new Date().toISOString()
    }
  };
}

/**
 * Get prediction accuracy statistics
 */
export function getPredictionAccuracyStats(
  resolvedPredictions: PredictionMarketItem[]
): {
  overallAccuracy: number;
  accuracyByCategory: Map<string, number>;
  accuracyByBot: Map<string, number>;
  bestPredictor: string;
  worstPredictor: string;
} {
  if (resolvedPredictions.length === 0) {
    return {
      overallAccuracy: 0,
      accuracyByCategory: new Map(),
      accuracyByBot: new Map(),
      bestPredictor: "N/A",
      worstPredictor: "N/A"
    };
  }

  // Overall accuracy
  const totalAccuracy = resolvedPredictions.reduce((sum, p) => {
    return sum + (p.resolution?.accuracy || 0);
  }, 0);
  const overallAccuracy = totalAccuracy / resolvedPredictions.length;

  // By category
  const accuracyByCategory = new Map<string, number>();
  const categoryTotals = new Map<string, { sum: number; count: number }>();

  resolvedPredictions.forEach(p => {
    const current = categoryTotals.get(p.category) || { sum: 0, count: 0 };
    current.sum += p.resolution?.accuracy || 0;
    current.count += 1;
    categoryTotals.set(p.category, current);
  });

  categoryTotals.forEach(({ sum, count }, category) => {
    accuracyByCategory.set(category, sum / count);
  });

  // By bot
  const accuracyByBot = new Map<string, number>();
  const botTotals = new Map<string, { sum: number; count: number }>();

  resolvedPredictions.forEach(p => {
    const current = botTotals.get(p.botName) || { sum: 0, count: 0 };
    current.sum += p.resolution?.accuracy || 0;
    current.count += 1;
    botTotals.set(p.botName, current);
  });

  botTotals.forEach(({ sum, count }, botName) => {
    accuracyByBot.set(botName, sum / count);
  });

  // Find best and worst
  let bestPredictor = "N/A";
  let worstPredictor = "N/A";
  let bestAccuracy = -1;
  let worstAccuracy = 1;

  accuracyByBot.forEach((accuracy, botName) => {
    if (accuracy > bestAccuracy) {
      bestAccuracy = accuracy;
      bestPredictor = botName;
    }
    if (accuracy < worstAccuracy) {
      worstAccuracy = accuracy;
      worstPredictor = botName;
    }
  });

  return {
    overallAccuracy,
    accuracyByCategory,
    accuracyByBot,
    bestPredictor,
    worstPredictor
  };
}

/**
 * Suggest prediction questions based on context
 */
export async function suggestPredictionQuestions(
  context: string,
  apiKey: string
): Promise<string[]> {
  const ai = getAiClient(apiKey);
  const model = ai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          questions: {
            type: "ARRAY",
            items: { type: "STRING" }
          }
        },
        required: ["questions"]
      }
    }
  });

  const prompt = `Based on this cultivation context:\n\n${context}\n\nGenerate 5 specific, measurable prediction questions that would be valuable for a grower to ask. Questions should be about yield, harvest timing, potency, quality, or risks. Each question should be answerable with a specific prediction.`;

  try {
    const response = await model.generateContent(prompt);
    const result = JSON.parse(response.response.text());
    return result.questions || [];
  } catch (error) {
    console.error("Error generating prediction questions:", error);
    return [];
  }
}

/**
 * Create a prediction market session
 */
export interface PredictionMarketSession {
  id: string;
  question: string;
  category: PredictionMarketItem['category'];
  context: string;
  predictions: PredictionMarketItem[];
  consensus: ReturnType<typeof calculateConsensusPrediction>;
  status: 'open' | 'closed';
  createdAt: string;
  closedAt?: string;
  resolution?: {
    actualOutcome: string;
    resolvedAt: string;
  };
}

export async function createPredictionMarket(
  question: string,
  category: PredictionMarketItem['category'],
  context: string,
  apiKey: string,
  participantIds?: string[]
): Promise<PredictionMarketSession> {
  const predictions = await generatePredictions(
    question,
    category,
    context,
    apiKey,
    participantIds
  );

  const consensus = calculateConsensusPrediction(predictions);

  return {
    id: crypto.randomUUID(),
    question,
    category,
    context,
    predictions,
    consensus,
    status: 'open',
    createdAt: new Date().toISOString()
  };
}

/**
 * Close a prediction market and resolve
 */
export function closePredictionMarket(
  session: PredictionMarketSession,
  actualOutcome: string
): PredictionMarketSession {
  const resolvedPredictions = session.predictions.map(p =>
    resolvePrediction(p, actualOutcome)
  );

  return {
    ...session,
    predictions: resolvedPredictions,
    status: 'closed',
    closedAt: new Date().toISOString(),
    resolution: {
      actualOutcome,
      resolvedAt: new Date().toISOString()
    }
  };
}
