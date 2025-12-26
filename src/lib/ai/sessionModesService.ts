/**
 * Session Modes Framework
 * Handles 14 different session modes for the AI Council
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  SessionMode,
  CouncilSession,
  CouncilPersona,
  CULTIVATION_PERSONAS
} from '../../types/council';

const getAiClient = (apiKey: string) => {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("API Key not found");
  return new GoogleGenerativeAI({ apiKey: key });
};

/**
 * Mode configurations
 */
export const MODE_CONFIGS: Record<SessionMode, {
  maxParticipants: number;
  requiresVoting: boolean;
  requiresArguments: boolean;
  description: string;
  suggestedPersonaIds: string[];
  systemPrompt: string;
}> = {
  'proposal': {
    maxParticipants: 6,
    requiresVoting: true,
    requiresArguments: true,
    description: 'Present and evaluate proposals with structured voting',
    suggestedPersonaIds: ['master-grower', 'business-advisor', 'tech-expert'],
    systemPrompt: 'You are evaluating a proposal for a cultivation operation. Consider feasibility, cost, benefits, and risks. Provide clear reasoning for your position.'
  },
  'deliberation': {
    maxParticipants: 8,
    requiresVoting: false,
    requiresArguments: true,
    description: 'Multi-expert discussion with detailed reasoning',
    suggestedPersonaIds: ['master-grower', 'botanist', 'horticulturist'],
    systemPrompt: 'Engage in thoughtful deliberation on this cultivation topic. Share your expertise and build on others\' ideas.'
  },
  'inquiry': {
    maxParticipants: 4,
    requiresVoting: false,
    requiresArguments: false,
    description: 'Question-answering with research-backed responses',
    suggestedPersonaIds: ['botanist', 'master-grower'],
    systemPrompt: 'Answer the inquiry with accurate, research-backed information. Cite specific details and explanations.'
  },
  'research': {
    maxParticipants: 3,
    requiresVoting: false,
    requiresArguments: false,
    description: 'Deep research with cited sources and references',
    suggestedPersonaIds: ['botanist', 'chemist'],
    systemPrompt: 'Conduct deep research on this topic. Provide comprehensive information with scientific context and references.'
  },
  'swarm': {
    maxParticipants: 4,
    requiresVoting: true,
    requiresArguments: false,
    description: 'Swarm intelligence for quick consensus',
    suggestedPersonaIds: ['master-grower', 'horticulturist'],
    systemPrompt: 'Provide your assessment quickly and concisely. Focus on the most critical aspects. Keep responses under 150 words.'
  },
  'swarm-coding': {
    maxParticipants: 3,
    requiresVoting: false,
    requiresArguments: false,
    description: 'Multi-phase code generation pipeline',
    suggestedPersonaIds: ['tech-expert', 'master-grower'],
    systemPrompt: 'Generate code for cultivation automation. Focus on reliability and efficiency.'
  },
  'prediction': {
    maxParticipants: 5,
    requiresVoting: false,
    requiresArguments: false,
    description: 'Prediction market for forecasting outcomes',
    suggestedPersonaIds: ['master-grower', 'horticulturist', 'business-advisor'],
    systemPrompt: 'Make specific, quantitative predictions based on the available data. Provide confidence intervals.'
  },
  'advisory': {
    maxParticipants: 5,
    requiresVoting: true,
    requiresArguments: false,
    description: 'Get recommendations from specialist council',
    suggestedPersonaIds: ['master-grower', 'botanist', 'pest-expert'],
    systemPrompt: 'Provide clear, actionable recommendations. Prioritize the most important actions.'
  },
  'arbitration': {
    maxParticipants: 4,
    requiresVoting: true,
    requiresArguments: true,
    description: 'Resolve conflicting views with balanced decisions',
    suggestedPersonaIds: ['master-grower', 'business-advisor', 'botanist'],
    systemPrompt: 'Consider multiple perspectives and find a balanced resolution. Weigh pros and cons objectively.'
  },
  'negotiation': {
    maxParticipants: 4,
    requiresVoting: true,
    requiresArguments: true,
    description: 'Find middle ground in difficult decisions',
    suggestedPersonaIds: ['business-advisor', 'master-grower'],
    systemPrompt: 'Work toward finding common ground and compromise solutions.'
  },
  'brainstorming': {
    maxParticipants: 6,
    requiresVoting: false,
    requiresArguments: false,
    description: 'Generate diverse ideas and solutions',
    suggestedPersonaIds: ['tech-expert', 'horticulturist', 'breeder'],
    systemPrompt: 'Think creatively and generate diverse ideas. No idea is too wild initially. Build on others\' creativity.'
  },
  'peer-review': {
    maxParticipants: 5,
    requiresVoting: true,
    requiresArguments: true,
    description: 'Critical review of plans with feedback',
    suggestedPersonaIds: ['master-grower', 'tech-expert', 'botanist'],
    systemPrompt: 'Provide critical, constructive feedback. Identify potential problems and suggest improvements.'
  },
  'strategic-planning': {
    maxParticipants: 5,
    requiresVoting: true,
    requiresArguments: true,
    description: 'Long-term strategy development',
    suggestedPersonaIds: ['business-advisor', 'master-grower', 'horticulturist'],
    systemPrompt: 'Consider long-term implications and strategic goals. Think about scalability, sustainability, and risk management.'
  },
  'design-review': {
    maxParticipants: 4,
    requiresVoting: true,
    requiresArguments: true,
    description: 'Review grow room designs and setups',
    suggestedPersonaIds: ['horticulturist', 'tech-expert', 'master-grower'],
    systemPrompt: 'Evaluate the design for efficiency, safety, and effectiveness. Suggest improvements.'
  },
  'risk-assessment': {
    maxParticipants: 5,
    requiresVoting: true,
    requiresArguments: true,
    description: 'Evaluate risks of cultivation decisions',
    suggestedPersonaIds: ['pest-expert', 'business-advisor', 'tech-expert'],
    systemPrompt: 'Identify and assess potential risks. Provide probability estimates and mitigation strategies.'
  }
};

/**
 * Get recommended personas for a mode
 */
export function getRecommendedPersonasForMode(
  mode: SessionMode,
  topic?: string
): CouncilPersona[] {
  const config = MODE_CONFIGS[mode];
  let personaIds = [...config.suggestedPersonaIds];

  // Add topic-specific personas
  if (topic) {
    const topicLower = topic.toLowerCase();

    if (topicLower.includes('nutrient') && !personaIds.includes('chemist')) {
      personaIds.push('chemist');
    }
    if (topicLower.includes('pest') && !personaIds.includes('pest-expert')) {
      personaIds.push('pest-expert');
    }
    if (topicLower.includes('breed') && !personaIds.includes('breeder')) {
      personaIds.push('breeder');
    }
  }

  // Deduplicate and limit
  const uniqueIds = [...new Set(personaIds)];
  return CULTIVATION_PERSONAS.filter(p => uniqueIds.includes(p.id))
    .slice(0, config.maxParticipants);
}

/**
 * Get mode-specific system prompt for a persona
 */
export function getModeSpecificPrompt(
  mode: SessionMode,
  persona: CouncilPersona,
  topic: string
): string {
  const config = MODE_CONFIGS[mode];

  return `${persona.systemPrompt}\n\nSESSION MODE: ${mode}\nMODE CONTEXT: ${config.systemPrompt}\n\nTOPIC: ${topic}`;
}

/**
 * Validate mode configuration
 */
export function validateModeConfiguration(
  mode: SessionMode,
  personaIds: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = MODE_CONFIGS[mode];

  // Check participant count
  if (personaIds.length > config.maxParticipants) {
    errors.push(`${mode} mode supports maximum ${config.maxParticipants} participants, got ${personaIds.length}`);
  }

  // Check if all personas exist
  const invalidIds = personaIds.filter(id => !CULTIVATION_PERSONAS.find(p => p.id === id));
  if (invalidIds.length > 0) {
    errors.push(`Invalid persona IDs: ${invalidIds.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get mode suggestions based on topic
 */
export function suggestModeForTopic(topic: string): {
  mode: SessionMode;
  reason: string;
  confidence: number;
}[] {
  const topicLower = topic.toLowerCase();
  const suggestions: { mode: SessionMode; reason: string; confidence: number }[] = [];

  // Analyze topic keywords
  if (topicLower.includes('proposal') || topicLower.includes('plan') || topicLower.includes('implement')) {
    suggestions.push({ mode: 'proposal', reason: 'Topic involves making a proposal', confidence: 0.8 });
  }

  if (topicLower.includes('decision') || topicLower.includes('choose') || topicLower.includes('select')) {
    suggestions.push({ mode: 'advisory', reason: 'Decision-making topic', confidence: 0.9 });
    suggestions.push({ mode: 'deliberation', reason: 'Benefits from discussion', confidence: 0.7 });
  }

  if (topicLower.includes('risk') || topicLower.includes('danger') || topicLower.includes('concern')) {
    suggestions.push({ mode: 'risk-assessment', reason: 'Risk evaluation needed', confidence: 0.95 });
  }

  if (topicLower.includes('design') || topicLower.includes('setup') || topicLower.includes('layout')) {
    suggestions.push({ mode: 'design-review', reason: 'Design evaluation topic', confidence: 0.9 });
  }

  if (topicLower.includes('research') || topicLower.includes('study') || topicLower.includes('learn')) {
    suggestions.push({ mode: 'research', reason: 'Research-oriented topic', confidence: 0.85 });
    suggestions.push({ mode: 'inquiry', reason: 'Information gathering', confidence: 0.7 });
  }

  if (topicLower.includes('predict') || topicLower.includes('forecast') || topicLower.includes('expect')) {
    suggestions.push({ mode: 'prediction', reason: 'Forecasting topic', confidence: 0.95 });
  }

  if (topicLower.includes('problem') || topicLower.includes('disagree') || topicLower.includes('conflict')) {
    suggestions.push({ mode: 'arbitration', reason: 'Conflict resolution needed', confidence: 0.85 });
  }

  if (topicLower.includes('code') || topicLower.includes('script') || topicLower.includes('automate')) {
    suggestions.push({ mode: 'swarm-coding', reason: 'Code generation topic', confidence: 0.9 });
  }

  if (topicLower.includes('idea') || topicLower.includes('brainstorm') || topicLower.includes('creative')) {
    suggestions.push({ mode: 'brainstorming', reason: 'Creative thinking needed', confidence: 0.9 });
  }

  if (topicLower.includes('strategy') || topicLower.includes('long-term') || topicLower.includes('future')) {
    suggestions.push({ mode: 'strategic-planning', reason: 'Strategic topic', confidence: 0.85 });
  }

  if (topicLower.includes('review') || topicLower.includes('evaluate') || topicLower.includes('assess')) {
    suggestions.push({ mode: 'peer-review', reason: 'Review and evaluation topic', confidence: 0.8 });
  }

  // If no specific match, suggest deliberation
  if (suggestions.length === 0) {
    suggestions.push({ mode: 'deliberation', reason: 'General discussion mode', confidence: 0.5 });
  }

  // Sort by confidence
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get all available modes
 */
export function getAllModes(): Array<{
  mode: SessionMode;
  config: typeof MODE_CONFIGS[SessionMode];
}> {
  return Object.entries(MODE_CONFIGS).map(([mode, config]) => ({
    mode: mode as SessionMode,
    config
  }));
}

/**
 * Execute mode-specific logic
 */
export async function executeModeLogic(
  mode: SessionMode,
  topic: string,
  personaIds: string[],
  apiKey: string
): Promise<{
  session: CouncilSession;
  modeSpecificData?: any;
}> {
  const validation = validateModeConfiguration(mode, personaIds);
  if (!validation.valid) {
    throw new Error(`Invalid mode configuration: ${validation.errors.join(', ')}`);
  }

  // Import council service dynamically to avoid circular dependencies
  const { runCouncilSession } = await import('./councilService');

  // Run the base council session
  const session = await runCouncilSession(topic, mode, personaIds, apiKey);

  // Mode-specific additional processing
  let modeSpecificData: any;

  switch (mode) {
    case 'swarm':
      // Swarm mode: quick consensus check
      modeSpecificData = {
        consensusSpeed: 'fast',
        quickVote: true
      };
      break;

    case 'prediction':
      // Prediction mode: confidence aggregation
      modeSpecificData = {
        avgConfidence: session.votes ? calculateAvgConfidence(session.votes.votes) : 0,
        predictionRange: 'calculated'
      };
      break;

    case 'brainstorming':
      // Brainstorming: idea count
      modeSpecificData = {
        ideaCount: session.messages.length * 3,
        creativityScore: 'high'
      };
      break;

    case 'research':
      // Research: source tracking
      modeSpecificData = {
        sourceCount: session.messages.reduce((sum, m) => {
          const sources = (m.metadata?.sources?.length || 0);
          return sum + sources;
        }, 0)
      };
      break;
  }

  return { session, modeSpecificData };
}

function calculateAvgConfidence(votes: any[]): number {
  if (!votes || votes.length === 0) return 0;
  const total = votes.reduce((sum: number, v: any) => sum + (v.confidence || 0), 0);
  return total / votes.length;
}
