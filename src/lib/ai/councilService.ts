/**
 * AI Council Service for CannaAI
 * Multi-agent deliberation system with voting, consensus, and specialized personas
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  CouncilSession,
  CouncilMessage,
  CouncilPersona,
  SessionMode,
  CULTIVATION_PERSONAS,
  CouncilVote,
  VotingResult,
  CouncilConfig,
  ArgumentClaim
} from '../../types/council';

const DEFAULT_CONFIG: CouncilConfig = {
  maxParticipants: 8,
  sessionTimeout: 60,
  memoryRetentionDays: 30,
  votingThreshold: 3,
  enableConsensus: true,
  enablePrediction: true,
  defaultModel: 'gemini-2.5-flash',
  defaultTemperature: 0.7
};

/**
 * Get AI client for council operations
 */
const getAiClient = (apiKey: string) => {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("API Key not found");
  }
  return new GoogleGenerativeAI({ apiKey: key });
};

/**
 * Generate response from a specific persona
 */
export async function generatePersonaResponse(
  persona: CouncilPersona,
  topic: string,
  context: CouncilMessage[],
  apiKey: string
): Promise<string> {
  const ai = getAiClient(apiKey);
  const model = ai.getGenerativeModel({
    model: persona.modelId,
    generationConfig: {
      temperature: persona.temperature,
      maxOutputTokens: 1000,
    }
  });

  // Build context from previous messages
  const contextStr = context.length > 0
    ? `\n\nPrevious Discussion:\n${context.map(m => `${m.personaName}: ${m.content}`).join('\n\n')}`
    : '';

  const prompt = `${persona.systemPrompt}\n\nTOPIC: ${topic}${contextStr}\n\nProvide your expert perspective as ${persona.name}. Keep your response focused and actionable (200-300 words).`;

  try {
    const response = await model.generateContent(prompt);
    return response.response.text() || "I couldn't generate a response.";
  } catch (error) {
    console.error(`Error generating response for ${persona.name}:`, error);
    throw error;
  }
}

/**
 * Run a council deliberation session
 */
export async function runCouncilSession(
  topic: string,
  mode: SessionMode,
  personaIds: string[],
  apiKey: string,
  existingSession?: CouncilSession
): Promise<CouncilSession> {
  const participants = CULTIVATION_PERSONAS.filter(p => personaIds.includes(p.id));

  if (participants.length === 0) {
    throw new Error("No valid participants selected");
  }

  const sessionId = existingSession?.id || crypto.randomUUID();
  const existingMessages = existingSession?.messages || [];

  // Generate responses from each participant
  const newMessages: CouncilMessage[] = [];

  for (const persona of participants) {
    const response = await generatePersonaResponse(
      persona,
      topic,
      existingMessages,
      apiKey
    );

    newMessages.push({
      id: crypto.randomUUID(),
      sessionId,
      personaId: persona.id,
      personaName: persona.name,
      content: response,
      timestamp: new Date().toISOString()
    });
  }

  // Calculate voting results if mode requires it
  let votes: VotingResult | undefined;
  if (['proposal', 'advisory', 'arbitration', 'peer-review'].includes(mode)) {
    votes = await calculateVoting(topic, newMessages, participants, apiKey);
  }

  // Generate arguments for deliberation modes
  let arguments: ArgumentClaim[] | undefined;
  if (['deliberation', 'proposal', 'peer-review'].includes(mode)) {
    arguments = await generateArguments(topic, newMessages, participants, apiKey);
  }

  const session: CouncilSession = {
    id: sessionId,
    mode,
    topic,
    description: topic,
    status: 'completed',
    participants: personaIds,
    messages: [...existingMessages, ...newMessages],
    votes,
    arguments,
    createdAt: existingSession?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return session;
}

/**
 * Calculate voting results from council responses
 */
async function calculateVoting(
  topic: string,
  messages: CouncilMessage[],
  participants: CouncilPersona[],
  apiKey: string
): Promise<VotingResult> {
  const ai = getAiClient(apiKey);
  const model = ai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          votes: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                personaId: { type: "STRING" },
                vote: { type: "STRING", enum: ["agree", "disagree", "abstain"] },
                reasoning: { type: "STRING" },
                confidence: { type: "NUMBER" }
              },
              required: ["personaId", "vote", "reasoning", "confidence"]
            }
          }
        },
        required: ["votes"]
      }
    }
  });

  const prompt = `Based on the following expert discussion about: "${topic}"

${messages.map(m => `${m.personaName}: ${m.content}`).join('\n\n')}

Have each expert vote on whether they AGREE with the proposed course of action, DISAGREE, or ABSTAIN.
Provide their reasoning and confidence (0-1).`;

  try {
    const response = await model.generateContent(prompt);
    const result = JSON.parse(response.response.text());

    const votes: CouncilVote[] = result.votes.map((v: any) => ({
      personaId: v.personaId,
      personaName: participants.find(p => p.id === v.personaId)?.name || 'Unknown',
      vote: v.vote,
      reasoning: v.reasoning,
      confidence: v.confidence
    }));

    // Calculate weighted scores
    const agree = votes
      .filter(v => v.vote === 'agree')
      .reduce((sum, v) => {
        const weight = participants.find(p => p.id === v.personaId)?.voteWeight || 1;
        return sum + (weight * v.confidence);
      }, 0);

    const disagree = votes
      .filter(v => v.vote === 'disagree')
      .reduce((sum, v) => {
        const weight = participants.find(p => p.id === v.personaId)?.voteWeight || 1;
        return sum + (weight * v.confidence);
      }, 0);

    const abstain = votes
      .filter(v => v.vote === 'abstain')
      .reduce((sum, v) => {
        const weight = participants.find(p => p.id === v.personaId)?.voteWeight || 1;
        return sum + (weight * v.confidence);
      }, 0);

    const totalWeightedScore = agree - disagree;

    let consensus: VotingResult['consensus'];
    if (totalWeightedScore >= 5) consensus = 'strong-agree';
    else if (totalWeightedScore >= 2) consensus = 'weak-agree';
    else if (totalWeightedScore <= -5) consensus = 'strong-disagree';
    else if (totalWeightedScore <= -2) consensus = 'weak-disagree';
    else consensus = 'neutral';

    return {
      agree,
      disagree,
      abstain,
      totalWeightedScore,
      consensus,
      votes
    };
  } catch (error) {
    console.error("Error calculating votes:", error);
    return {
      agree: 0,
      disagree: 0,
      abstain: 0,
      totalWeightedScore: 0,
      consensus: 'neutral',
      votes: []
    };
  }
}

/**
 * Generate structured arguments from discussion
 */
async function generateArguments(
  topic: string,
  messages: CouncilMessage[],
  participants: CouncilPersona[],
  apiKey: string
): Promise<ArgumentClaim[]> {
  const ai = getAiClient(apiKey);
  const model = ai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.5,
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

  const prompt = `Extract structured arguments from this discussion about: "${topic}"

${messages.map(m => `${m.personaName}: ${m.content}`).join('\n\n')}

Identify 3-5 key arguments with claims, supporting evidence, and conclusions.`;

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
    console.error("Error generating arguments:", error);
    return [];
  }
}

/**
 * Get available personas
 */
export function getAvailablePersonas(): CouncilPersona[] {
  return CULTIVATION_PERSONAS;
}

/**
 * Get persona by ID
 */
export function getPersonaById(id: string): CouncilPersona | undefined {
  return CULTIVATION_PERSONAS.find(p => p.id === id);
}

/**
 * Get recommended personas for a topic
 */
export function getRecommendedPersonas(topic: string, mode: SessionMode): CouncilPersona[] {
  const topicLower = topic.toLowerCase();

  // Topic-based recommendations
  let recommendedIds: string[] = ['master-grower']; // Always include

  if (topicLower.includes('nutrient') || topicLower.includes('feed') || topicLower.includes('deficiency')) {
    recommendedIds.push('botanist', 'chemist');
  }
  if (topicLower.includes('pest') || topicLower.includes('bug') || topicLower.includes('disease') || topicLower.includes('mold')) {
    recommendedIds.push('pest-expert', 'botanist');
  }
  if (topicLower.includes('breed') || topicLower.includes('genetic') || topicLower.includes('phenot') || topicLower.includes('strain')) {
    recommendedIds.push('breeder', 'botanist');
  }
  if (topicLower.includes('light') || topicLower.includes('temp') || topicLower.includes('humid') || topicLower.includes('climate')) {
    recommendedIds.push('horticulturist');
  }
  if (topicLower.includes('auto') || topicLower.includes('sensor') || topicLower.includes('system') || topicLower.includes('software')) {
    recommendedIds.push('tech-expert');
  }
  if (topicLower.includes('business') || topicLower.includes('cost') || topicLower.includes('scale') || topicLower.includes('compliance')) {
    recommendedIds.push('business-advisor');
  }

  // Mode-based additions
  if (mode === 'prediction' || mode === 'advisory') {
    recommendedIds.push('master-grower', 'horticulturist');
  }
  if (mode === 'risk-assessment') {
    recommendedIds.push('pest-expert', 'business-advisor', 'tech-expert');
  }

  // Deduplicate and return
  const uniqueIds = [...new Set(recommendedIds)];
  return CULTIVATION_PERSONAS.filter(p => uniqueIds.includes(p.id)).slice(0, 6);
}

/**
 * Get session mode description
 */
export function getModeDescription(mode: SessionMode): string {
  const descriptions: Record<SessionMode, string> = {
    'proposal': 'Present and evaluate proposals with structured voting',
    'deliberation': 'Multi-expert discussion with detailed reasoning',
    'inquiry': 'Question-answering with research-backed responses',
    'research': 'Deep research with cited sources and references',
    'swarm': 'Swarm intelligence for quick consensus',
    'swarm-coding': 'Multi-phase code generation pipeline',
    'prediction': 'Prediction market for forecasting outcomes',
    'advisory': 'Get recommendations from specialist council',
    'arbitration': 'Resolve conflicting views with balanced decisions',
    'negotiation': 'Find middle ground in difficult decisions',
    'brainstorming': 'Generate diverse ideas and solutions',
    'peer-review': 'Critical review of plans with feedback',
    'strategic-planning': 'Long-term strategy development',
    'design-review': 'Review grow room designs and setups',
    'risk-assessment': 'Evaluate risks of cultivation decisions'
  };

  return descriptions[mode] || mode;
}
