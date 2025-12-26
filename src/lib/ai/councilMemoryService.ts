/**
 * Council Memory Service
 * Bot-specific memory system with 30-day retention
 */

import {
  MemoryEntry,
  CouncilMessage,
  CouncilSession,
  CouncilPersona
} from '../../types/council';

/**
 * In-memory storage (production should use persistent storage)
 */
const memoryStorage = new Map<string, MemoryEntry[]>();
const sessionMemories = new Map<string, string[]>(); // sessionId -> memoryEntry IDs

/**
 * Extract memories from a council session
 */
export function extractMemoriesFromSession(
  session: CouncilSession,
  participants: CouncilPersona[]
): MemoryEntry[] {
  const memories: MemoryEntry[] = [];

  session.messages.forEach(message => {
    // Extract key information from each message
    const keyPoints = extractKeyPoints(message.content, session.topic);

    keyPoints.forEach(point => {
      const memory: MemoryEntry = {
        id: crypto.randomUUID(),
        personaId: message.personaId,
        sessionId: session.id,
        topic: session.topic,
        content: `${message.personaName}: ${point}`,
        importance: calculateImportance(point, session),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        accessCount: 0,
        lastAccessed: new Date().toISOString()
      };

      memories.push(memory);
    });
  });

  return memories;
}

/**
 * Extract key points from a message
 */
function extractKeyPoints(content: string, topic: string): string[] {
  const keyPoints: string[] = [];
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);

  // Filter for sentences containing important keywords
  const importantKeywords = [
    'recommend', 'suggest', 'should', 'must', 'critical', 'important',
    'optimal', 'best', 'avoid', 'warning', 'essential', 'key',
    'nutrient', 'temperature', 'humidity', 'light', 'harvest',
    'flowering', 'vegetative', 'pest', 'disease', 'deficiency',
    'yield', 'potency', 'terpene', 'cannabinoid'
  ];

  sentences.forEach(sentence => {
    const lower = sentence.toLowerCase();
    const hasKeyword = importantKeywords.some(kw => lower.includes(kw));
    const hasNumber = /\d+/.test(sentence);

    // Include sentences with keywords or specific data
    if (hasKeyword || hasNumber) {
      keyPoints.push(sentence.trim());
    }
  });

  // Return top 3 key points max per message
  return keyPoints.slice(0, 3);
}

/**
 * Calculate importance score (0-1)
 */
function calculateImportance(content: string, session: CouncilSession): number {
  let score = 0.5; // Base importance

  const lower = content.toLowerCase();

  // High importance indicators
  if (lower.includes('critical') || lower.includes('must') || lower.includes('avoid')) {
    score += 0.2;
  }
  if (lower.includes('optimal') || lower.includes('best')) {
    score += 0.1;
  }
  if (/\d+\s*(degrees?|percent?|%|days?|hours?|weeks?)/.test(content)) {
    score += 0.15; // Specific measurements are important
  }

  // Session mode adjustments
  if (session.mode === 'advisory' || session.mode === 'peer-review') {
    score += 0.1;
  }

  // Vote weight consideration
  if (session.votes?.consensus === 'strong-agree') {
    score += 0.1;
  }

  return Math.min(1, score);
}

/**
 * Save memories to storage
 */
export async function saveMemories(memories: MemoryEntry[]): Promise<void> {
  memories.forEach(memory => {
    const personaMemories = memoryStorage.get(memory.personaId) || [];
    personaMemories.push(memory);
    memoryStorage.set(memory.personaId, personaMemories);

    // Track session memories
    const sessionIds = sessionMemories.get(memory.sessionId) || [];
    sessionIds.push(memory.id);
    sessionMemories.set(memory.sessionId, sessionIds);
  });
}

/**
 * Retrieve memories for a persona
 */
export async function getMemoriesForPersona(
  personaId: string,
  maxMemories: number = 20
): Promise<MemoryEntry[]> {
  const memories = memoryStorage.get(personaId) || [];

  // Filter out expired memories
  const now = new Date();
  const validMemories = memories.filter(m => new Date(m.expiresAt) > now);

  // Sort by importance and recency
  const sorted = validMemories.sort((a, b) => {
    // Higher importance first
    if (b.importance !== a.importance) {
      return b.importance - a.importance;
    }
    // More recently accessed first
    return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
  });

  // Update access count for returned memories
  const topMemories = sorted.slice(0, maxMemories);
  topMemories.forEach(memory => {
    memory.accessCount++;
    memory.lastAccessed = new Date().toISOString();
  });

  return topMemories;
}

/**
 * Retrieve memories for a topic
 */
export async function getMemoriesForTopic(
  topic: string,
  personaId?: string,
  maxMemories: number = 10
): Promise<MemoryEntry[]> {
  const allMemories: MemoryEntry[] = [];

  // Collect memories
  if (personaId) {
    allMemories.push(...(memoryStorage.get(personaId) || []));
  } else {
    memoryStorage.forEach(memories => allMemories.push(...memories));
  }

  // Filter for topic relevance
  const topicLower = topic.toLowerCase();
  const relevantMemories = allMemories.filter(m => {
    const memoryTopic = m.topic.toLowerCase();
    const content = m.content.toLowerCase();

    // Direct topic match or semantic similarity
    return memoryTopic.includes(topicLower) ||
           content.includes(topicLower) ||
           topicLower.includes(memoryTopic);
  });

  // Sort by relevance and importance
  const sorted = relevantMemories.sort((a, b) => {
    // Topic match priority
    const aTopicMatch = a.topic.toLowerCase() === topicLower ? 1 : 0;
    const bTopicMatch = b.topic.toLowerCase() === topicLower ? 1 : 0;
    if (aTopicMatch !== bTopicMatch) return bTopicMatch - aTopicMatch;

    // Then importance
    if (b.importance !== a.importance) return b.importance - a.importance;

    // Then recency
    return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
  });

  return sorted.slice(0, maxMemories);
}

/**
 * Search memories by keyword
 */
export async function searchMemories(
  query: string,
  personaId?: string,
  maxResults: number = 15
): Promise<MemoryEntry[]> {
  const queryLower = query.toLowerCase();
  const allMemories: MemoryEntry[] = [];

  if (personaId) {
    allMemories.push(...(memoryStorage.get(personaId) || []));
  } else {
    memoryStorage.forEach(memories => allMemories.push(...memories));
  }

  // Filter out expired
  const now = new Date();
  const validMemories = allMemories.filter(m => new Date(m.expiresAt) > now);

  // Search by content
  const results = validMemories.filter(m => {
    return m.content.toLowerCase().includes(queryLower) ||
           m.topic.toLowerCase().includes(queryLower);
  });

  // Sort by relevance and importance
  const sorted = results.sort((a, b) => {
    // Exact query match gets priority
    const aExact = a.content.toLowerCase().includes(queryLower);
    const bExact = b.content.toLowerCase().includes(queryLower);
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    return b.importance - a.importance;
  });

  return sorted.slice(0, maxResults);
}

/**
 * Clean up expired memories
 */
export async function cleanupExpiredMemories(): Promise<number> {
  let cleaned = 0;
  const now = new Date();

  memoryStorage.forEach((memories, personaId) => {
    const validMemories = memories.filter(m => {
      const isExpired = new Date(m.expiresAt) <= now;
      if (isExpired) cleaned++;
      return !isExpired;
    });
    memoryStorage.set(personaId, validMemories);
  });

  return cleaned;
}

/**
 * Get memory statistics
 */
export async function getMemoryStats(personaId?: string): Promise<{
  totalMemories: number;
  avgImportance: number;
  topTopics: string[];
  expiringSoon: number;
}> {
  const allMemories: MemoryEntry[] = [];

  if (personaId) {
    allMemories.push(...(memoryStorage.get(personaId) || []));
  } else {
    memoryStorage.forEach(memories => allMemories.push(...memories));
  }

  // Filter out expired
  const now = new Date();
  const validMemories = allMemories.filter(m => new Date(m.expiresAt) > now);

  // Calculate stats
  const totalMemories = validMemories.length;
  const avgImportance = validMemories.length > 0
    ? validMemories.reduce((sum, m) => sum + m.importance, 0) / validMemories.length
    : 0;

  // Top topics
  const topicCounts = new Map<string, number>();
  validMemories.forEach(m => {
    topicCounts.set(m.topic, (topicCounts.get(m.topic) || 0) + 1);
  });
  const topTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  // Expiring soon (within 3 days)
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const expiringSoon = validMemories.filter(m => new Date(m.expiresAt) <= threeDaysFromNow).length;

  return {
    totalMemories,
    avgImportance,
    topTopics,
    expiringSoon
  };
}

/**
 * Format memories as context for AI
 */
export function formatMemoriesAsContext(memories: MemoryEntry[]): string {
  if (memories.length === 0) {
    return "No relevant memories found.";
  }

  let context = "Relevant information from previous discussions:\n\n";

  memories.forEach(memory => {
    context += `- [${memory.topic}] ${memory.content}\n`;
  });

  return context;
}

/**
 * Export all memories (for backup)
 */
export async function exportAllMemories(): Promise<string> {
  const allMemories: MemoryEntry[] = [];

  memoryStorage.forEach(memories => allMemories.push(...memories));

  return JSON.stringify(allMemories, null, 2);
}

/**
 * Import memories (from backup)
 */
export async function importMemories(jsonData: string): Promise<number> {
  try {
    const memories = JSON.parse(jsonData) as MemoryEntry[];

    memories.forEach(memory => {
      const personaMemories = memoryStorage.get(memory.personaId) || [];
      personaMemories.push(memory);
      memoryStorage.set(memory.personaId, personaMemories);
    });

    return memories.length;
  } catch (error) {
    console.error("Error importing memories:", error);
    return 0;
  }
}

/**
 * Clear all memories for a persona
 */
export async function clearPersonaMemories(personaId: string): Promise<void> {
  memoryStorage.delete(personaId);
}

/**
 * Clear all memories (dangerous!)
 */
export async function clearAllMemories(): Promise<void> {
  memoryStorage.clear();
  sessionMemories.clear();
}
