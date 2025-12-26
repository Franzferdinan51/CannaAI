import { ModelConfig } from "../../types/plant-analysis";
import { cultivationRagChat } from "./geminiService";
import { localRagChat } from "./lmstudioService";
import { openrouterRagChat } from "./openrouterService";

/**
 * RAG Chat System for Cultivation Assistance
 * Provides intelligent chat with full access to cultivation document archive
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  references?: string[];
}

export interface ChatResponse {
  response: string;
  provider: string;
  references: string[];
  hasContext: boolean;
  contextDocs: number;
}

/**
 * Select chat provider based on config
 */
function selectChatProvider(config: ModelConfig): string {
  const priority = ['gemini', 'openrouter', 'lmstudio', 'lmstudio2', 'lmstudio3', 'lmstudio4'];

  for (const provider of priority) {
    if (provider === 'gemini' && config.enabled.gemini && config.geminiKey) {
      return 'gemini';
    }
    if (provider === 'openrouter' && config.enabled.openrouter && config.openRouterKey) {
      return 'openrouter';
    }
    if (provider.startsWith('lmstudio')) {
      const endpoint = provider === 'lmstudio' ? config.lmStudioEndpoint :
        provider === 'lmstudio2' ? config.lmStudioEndpoint2 :
        provider === 'lmstudio3' ? config.lmStudioEndpoint3 :
        config.lmStudioEndpoint4;
      if (config.enabled[provider as keyof typeof config.enabled] && endpoint) {
        return provider;
      }
    }
  }

  throw new Error("No chat provider available");
}

/**
 * Search documents relevant to query
 */
export function searchRelevantDocs(
  query: string,
  documents: any[],
  maxDocs: number = 5
): any[] {
  if (documents.length === 0) return [];

  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/).filter(w => w.length > 3);

  // Score documents by relevance
  const scored = documents.map(doc => {
    let score = 0;

    // Check summary
    if (doc.analysis?.summary) {
      const summary = doc.analysis.summary.toLowerCase();
      keywords.forEach(kw => {
        if (summary.includes(kw)) score += 2;
      });
    }

    // Check entities
    if (doc.analysis?.entities) {
      doc.analysis.entities.forEach((e: any) => {
        if (e.name && queryLower.includes(e.name.toLowerCase())) score += 3;
        if (e.type && queryLower.includes(e.type.toLowerCase())) score += 2;
      });
    }

    // Check content
    if (doc.content) {
      const content = doc.content.toLowerCase();
      keywords.forEach(kw => {
        if (content.includes(kw)) score += 1;
      });
    }

    // Boost for critical findings
    if (doc.analysis?.sentiment === 'critical') score += 1;

    return { doc, score };
  });

  // Return top N docs
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxDocs)
    .map(s => s.doc);
}

/**
 * Extract references from response
 */
function extractReferences(response: string, docs: any[]): string[] {
  const refs = new Set<string>();

  // Look for [Filename] patterns
  const refPattern = /\[([^\]]+)\]/g;
  let match;
  while ((match = refPattern.exec(response)) !== null) {
    refs.add(match[1]);
  }

  // Also check which docs were actually used
  docs.forEach(doc => {
    if (response.includes(doc.name) || response.includes(doc.id)) {
      refs.add(doc.name);
    }
  });

  return Array.from(refs);
}

/**
 * Main RAG chat function
 */
export async function ragChat(
  query: string,
  documents: any[],
  history: ChatMessage[],
  config: ModelConfig,
  preferredProvider?: string
): Promise<ChatResponse> {
  // Step 1: Find relevant documents
  const relevantDocs = searchRelevantDocs(query, documents);

  console.log(`[RAG CHAT] Found ${relevantDocs.length} relevant documents for query`);

  // Step 2: Select provider
  const provider = preferredProvider || selectChatProvider(config);

  // Step 3: Run chat
  let responseText: string;

  try {
    switch (provider) {
      case 'gemini':
        responseText = await cultivationRagChat(
          query,
          relevantDocs,
          history,
          'gemini-1.5-flash',
          config.geminiKey
        );
        break;

      case 'openrouter':
        responseText = await openrouterRagChat(
          query,
          relevantDocs,
          history,
          config.openRouterKey,
          config.openRouterModel
        );
        break;

      case 'lmstudio':
        responseText = await localRagChat(
          query,
          relevantDocs,
          history,
          config.lmStudioEndpoint,
          config.lmStudioModel
        );
        break;

      case 'lmstudio2':
        responseText = await localRagChat(
          query,
          relevantDocs,
          history,
          config.lmStudioEndpoint2,
          config.lmStudioModel2
        );
        break;

      case 'lmstudio3':
        responseText = await localRagChat(
          query,
          relevantDocs,
          history,
          config.lmStudioEndpoint3,
          config.lmStudioModel3
        );
        break;

      case 'lmstudio4':
        responseText = await localRagChat(
          query,
          relevantDocs,
          history,
          config.lmStudioEndpoint4,
          config.lmStudioModel4
        );
        break;

      default:
        throw new Error(`Unknown chat provider: ${provider}`);
    }
  } catch (error) {
    console.error(`[RAG CHAT] Provider ${provider} failed:`, error);

    // Fallback to next available provider
    if (provider !== 'gemini' && config.enabled.gemini && config.geminiKey) {
      responseText = await cultivationRagChat(query, relevantDocs, history, 'gemini-1.5-flash', config.geminiKey);
    } else {
      responseText = "I apologize, but I'm having trouble accessing the knowledge base right now. Please try again.";
    }
  }

  // Step 4: Extract references
  const references = extractReferences(responseText, relevantDocs);

  return {
    response: responseText,
    provider,
    references,
    hasContext: relevantDocs.length > 0,
    contextDocs: relevantDocs.length
  };
}

/**
 * Suggested questions based on documents
 */
export function getSuggestedQuestions(documents: any[]): string[] {
  const questions: string[] = [];

  // Analyze documents to generate relevant questions
  const hasStrains = documents.some(d =>
    d.analysis?.entities?.some((e: any) => e.type === 'strain')
  );
  if (hasStrains) {
    questions.push("What strains am I currently growing?");
    questions.push("What are the flowering times for my strains?");
  }

  const hasIssues = documents.some(d =>
    d.analysis?.sentiment === 'critical' || d.analysis?.sentiment === 'warning'
  );
  if (hasIssues) {
    questions.push("What problems were detected in my plants?");
    questions.push("What treatments do I need to apply?");
  }

  const hasNutrients = documents.some(d =>
    d.analysis?.entities?.some((e: any) => e.type === 'nutrient' || e.type === 'deficiency')
  );
  if (hasNutrients) {
    questions.push("What nutrient deficiencies do I have?");
    questions.push("What's my feeding schedule?");
  }

  const hasPests = documents.some(d =>
    d.analysis?.entities?.some((e: any) => e.type === 'pest' || e.type === 'disease')
  );
  if (hasPests) {
    questions.push("What pests or diseases were found?");
    questions.push("How do I treat the identified pests?");
  }

  // Default questions
  if (questions.length === 0) {
    questions.push("How do I improve my plant health?");
    questions.push("What should I check during flowering?");
    questions.push("What are common cannabis nutrient problems?");
  }

  return questions.slice(0, 6);
}
