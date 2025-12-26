/**
 * Argumentation Framework
 * Structured debate and argument mapping for cultivation decisions
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ArgumentClaim,
  CouncilPersona,
  CULTIVATION_PERSONAS
} from '../../types/council';

const getAiClient = (apiKey: string) => {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("API Key not found");
  return new GoogleGenerativeAI({ apiKey: key });
};

/**
 * Extract arguments from discussion
 */
export async function extractArguments(
  discussion: string,
  topic: string,
  apiKey: string
): Promise<ArgumentClaim[]> {
  const ai = getAiClient(apiKey);
  const model = ai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.6,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          arguments: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                claim: { type: "STRING" },
                evidence: { type: "ARRAY", items: { type: "STRING" } },
                conclusion: { type: "STRING" },
                confidence: { type: "NUMBER" },
                proposedBy: { type: "STRING" }
              },
              required: ["claim", "evidence", "conclusion", "confidence", "proposedBy"]
            }
          }
        },
        required: ["arguments"]
      }
    }
  });

  const prompt = `Analyze this discussion about: "${topic}"

DISCUSSION:
${discussion}

Extract all arguments in the following format:
- CLAIM: What is being argued
- EVIDENCE: Supporting facts, data, or reasoning
- CONCLUSION: What follows from the claim and evidence
- CONFIDENCE: How confident is the arguer (0-1)
- PROPOSED_BY: Who made this argument

Focus on well-structured, complete arguments.`;

  try {
    const response = await model.generateContent(prompt);
    const result = JSON.parse(response.response.text());

    return result.arguments.map((arg: any, index: number) => ({
      id: crypto.randomUUID(),
      claim: arg.claim,
      evidence: arg.evidence,
      conclusion: arg.conclusion,
      confidence: arg.confidence,
      proposedBy: arg.proposedBy
    }));
  } catch (error) {
    console.error("Error extracting arguments:", error);
    return [];
  }
}

/**
 * Evaluate argument strength
 */
export function evaluateArgumentStrength(argument: ArgumentClaim): {
  score: number;
  factors: {
    evidenceQuality: number;
    logicalCoherence: number;
    confidence: number;
    specificity: number;
  };
  reasoning: string;
} {
  // Evidence quality: number and specificity of evidence
  const evidenceQuality = Math.min(1, argument.evidence.length * 0.3);

  // Logical coherence: claim -> evidence -> conclusion flow
  const logicalCoherence = argument.claim.length > 0 && argument.conclusion.length > 0 ? 0.8 : 0.5;

  // Confidence from original argument
  const confidence = argument.confidence;

  // Specificity: detailed claims are stronger
  const specificity = Math.min(1, argument.claim.length / 200);

  // Overall score (weighted average)
  const score = (evidenceQuality * 0.35) + (logicalCoherence * 0.25) + (confidence * 0.25) + (specificity * 0.15);

  let reasoning = `Argument strength score: ${(score * 100).toFixed(0)}%. `;
  reasoning += `Evidence quality: ${(evidenceQuality * 100).toFixed(0)}%, `;
  reasoning += `Logical coherence: ${(logicalCoherence * 100).toFixed(0)}%, `;
  reasoning += `Confidence: ${(confidence * 100).toFixed(0)}%, `;
  reasoning += `Specificity: ${(specificity * 100).toFixed(0)}%.`;

  return {
    score,
    factors: {
      evidenceQuality,
      logicalCoherence,
      confidence,
      specificity
    },
    reasoning
  };
}

/**
 * Find counter-arguments
 */
export async function findCounterArguments(
  argument: ArgumentClaim,
  apiKey: string
): Promise<ArgumentClaim[]> {
  const ai = getAiClient(apiKey);
  const model = ai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          counterArguments: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                claim: { type: "STRING" },
                evidence: { type: "ARRAY", items: { type: "STRING" } },
                conclusion: { type: "STRING" },
                confidence: { type: "NUMBER" },
                proposedBy: { type: "STRING" }
              },
              required: ["claim", "evidence", "conclusion", "confidence", "proposedBy"]
            }
          }
        },
        required: ["counterArguments"]
      }
    }
  });

  const prompt = `ORIGINAL ARGUMENT:
CLAIM: ${argument.claim}
EVIDENCE: ${argument.evidence.join('; ')}
CONCLUSION: ${argument.conclusion}

Generate 2-3 strong counter-arguments that challenge this position. Each counter-argument should:
- Directly address the original claim
- Provide contradictory evidence or reasoning
- Lead to an opposite or different conclusion
- Be realistic and well-reasoned`;

  try {
    const response = await model.generateContent(prompt);
    const result = JSON.parse(response.response.text());

    return result.counterArguments.map((arg: any) => ({
      id: crypto.randomUUID(),
      claim: arg.claim,
      evidence: arg.evidence,
      conclusion: arg.conclusion,
      confidence: arg.confidence,
      proposedBy: arg.proposedBy
    }));
  } catch (error) {
    console.error("Error finding counter-arguments:", error);
    return [];
  }
}

/**
 * Synthesize arguments into a conclusion
 */
export async function synthesizeArguments(
  arguments: ArgumentClaim[],
  topic: string,
  apiKey: string
): Promise<{
  synthesis: string;
  consensusLevel: 'strong' | 'moderate' | 'weak' | 'none';
  keyPoints: string[];
  recommendations: string[];
}> {
  const ai = getAiClient(apiKey);
  const model = ai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.6,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          synthesis: { type: "STRING" },
          consensusLevel: { type: "STRING", enum: ["strong", "moderate", "weak", "none"] },
          keyPoints: { type: "ARRAY", items: { type: "STRING" } },
          recommendations: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["synthesis", "consensusLevel", "keyPoints", "recommendations"]
      }
    }
  });

  const argText = arguments.map((arg, i) =>
    `ARGUMENT ${i + 1}:\nClaim: ${arg.claim}\nEvidence: ${arg.evidence.join('; ')}\nConclusion: ${arg.conclusion}`
  ).join('\n\n');

  const prompt = `TOPIC: ${topic}

ARGUMENTS:
${argText}

Synthesize these arguments into a coherent conclusion. Provide:
1. A synthesis that captures the main points
2. The consensus level (strong, moderate, weak, none)
3. Key points that emerge
4. Actionable recommendations based on the arguments`;

  try {
    const response = await model.generateContent(prompt);
    const result = JSON.parse(response.response.text());

    return {
      synthesis: result.synthesis,
      consensusLevel: result.consensusLevel,
      keyPoints: result.keyPoints || [],
      recommendations: result.recommendations || []
    };
  } catch (error) {
    console.error("Error synthesizing arguments:", error);
    return {
      synthesis: "Failed to synthesize arguments",
      consensusLevel: 'none',
      keyPoints: [],
      recommendations: []
    };
  }
}

/**
 * Build argument map
 */
export function buildArgumentMap(
  arguments: ArgumentClaim[]
): {
  nodes: Array<{
    id: string;
    claim: string;
    type: 'support' | 'oppose';
    strength: number;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: 'supports' | 'opposes' | 'qualifies';
  }>;
} {
  const nodes = arguments.map(arg => ({
    id: arg.id,
    claim: arg.claim.substring(0, 100),
    type: arg.confidence > 0.6 ? 'support' : 'oppose',
    strength: arg.confidence
  }));

  // Simple clustering: group related arguments by keywords
  const edges: Array<{ from: string; to: string; type: 'supports' | 'opposes' | 'qualifies' }> = [];

  for (let i = 0; i < arguments.length; i++) {
    for (let j = i + 1; j < arguments.length; j++) {
      const arg1 = arguments[i];
      const arg2 = arguments[j];

      // Check for supporting/opposing relationships based on claim similarity
      const words1 = new Set(arg1.claim.toLowerCase().split(/\s+/));
      const words2 = new Set(arg2.claim.toLowerCase().split(/\s+/));

      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);
      const similarity = intersection.size / union.size;

      if (similarity > 0.3) {
        // Related arguments
        if (arg1.confidence > 0.5 && arg2.confidence > 0.5) {
          edges.push({ from: arg1.id, to: arg2.id, type: 'supports' });
        } else if (arg1.confidence < 0.4 || arg2.confidence < 0.4) {
          edges.push({ from: arg1.id, to: arg2.id, type: 'opposes' });
        } else {
          edges.push({ from: arg1.id, to: arg2.id, type: 'qualifies' });
        }
      }
    }
  }

  return { nodes, edges };
}

/**
 * Format arguments for display
 */
export function formatArgumentsForDisplay(arguments: ArgumentClaim[]): string {
  if (arguments.length === 0) {
    return "No arguments to display.";
  }

  let output = "# Argument Map\n\n";

  arguments.forEach((arg, index) => {
    const evaluation = evaluateArgumentStrength(arg);

    output += `## Argument ${index + 1}\n`;
    output += `**Claim:** ${arg.claim}\n\n`;
    output += `**Evidence:**\n`;
    arg.evidence.forEach(evidence => {
      output += `- ${evidence}\n`;
    });
    output += `\n**Conclusion:** ${arg.conclusion}\n\n`;
    output += `**Proposed by:** ${arg.proposedBy}\n`;
    output += `**Strength:** ${(evaluation.score * 100).toFixed(0)}%\n`;
    output += `\n---\n\n`;
  });

  return output;
}

/**
 * Compare arguments
 */
export function compareArguments(
  arg1: ArgumentClaim,
  arg2: ArgumentClaim
): {
  stronger: ArgumentClaim;
  reason: string;
  similarity: number;
} {
  const eval1 = evaluateArgumentStrength(arg1);
  const eval2 = evaluateArgumentStrength(arg2);

  const stronger = eval1.score >= eval2.score ? arg1 : arg2;
  const weaker = eval1.score >= eval2.score ? arg2 : arg1;

  let reason = "";
  if (Math.abs(eval1.score - eval2.score) < 0.1) {
    reason = "Both arguments are of similar strength.";
  } else {
    const diff = Math.abs(eval1.score - eval2.score);
    reason = `The stronger argument has a ${(diff * 100).toFixed(0)}% higher score, primarily due to `;

    const factors1 = eval1.factors;
    const factors2 = eval2.factors;

    if (Math.abs(factors1.evidenceQuality - factors2.evidenceQuality) > 0.2) {
      reason += "better evidence quality.";
    } else if (Math.abs(factors1.logicalCoherence - factors2.logicalCoherence) > 0.2) {
      reason += "stronger logical coherence.";
    } else if (Math.abs(factors1.confidence - factors2.confidence) > 0.2) {
      reason += "higher confidence.";
    } else {
      reason += "overall better structure.";
    }
  }

  // Calculate similarity
  const words1 = new Set(arg1.claim.toLowerCase().split(/\s+/));
  const words2 = new Set(arg2.claim.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  const similarity = intersection.size / union.size;

  return {
    stronger,
    reason,
    similarity
  };
}
