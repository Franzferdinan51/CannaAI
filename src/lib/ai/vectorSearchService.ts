/**
 * Vector Database & Semantic Search Service
 * In-memory vector storage with similarity search for council data
 */

import {
  VectorDocument,
  SemanticSearchResult
} from '../../types/council';

/**
 * In-memory vector storage
 */
const vectorStore = new Map<string, VectorDocument>();

/**
 * Simple text embedding (TF-IDF like approach)
 * For production, consider using actual embeddings like OpenAI's or Gemini's
 */
function generateEmbedding(text: string): number[] {
  // Tokenize and normalize
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 2);

  // Create term frequency map
  const termFreq = new Map<string, number>();
  tokens.forEach(token => {
    termFreq.set(token, (termFreq.get(token) || 0) + 1);
  });

  // Convert to fixed-size vector (512 dimensions)
  const embedding = new Array(512).fill(0);

  // Hash-based sparse embedding
  termFreq.forEach((freq, term) => {
    // Use simple hash to distribute term values across dimensions
    let hash = 0;
    for (let i = 0; i < term.length; i++) {
      hash = ((hash << 5) - hash) + term.charCodeAt(i);
      hash = hash & hash;
    }

    const dim1 = Math.abs(hash) % 512;
    const dim2 = Math.abs((hash >> 8)) % 512;

    embedding[dim1] += freq / tokens.length;
    embedding[dim2] += freq / tokens.length;
  });

  return embedding;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0;

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  if (norm1 === 0 || norm2 === 0) return 0;

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Add a document to the vector store
 */
export async function addDocument(
  content: string,
  metadata: VectorDocument['metadata']
): Promise<string> {
  const id = crypto.randomUUID();
  const embedding = generateEmbedding(content);

  const document: VectorDocument = {
    id,
    content,
    embedding,
    metadata
  };

  vectorStore.set(id, document);
  return id;
}

/**
 * Add multiple documents in batch
 */
export async function addDocuments(
  documents: Array<{
    content: string;
    metadata: VectorDocument['metadata'];
  }>
): Promise<string[]> {
  const ids: string[] = [];

  for (const doc of documents) {
    const id = await addDocument(doc.content, doc.metadata);
    ids.push(id);
  }

  return ids;
}

/**
 * Semantic search
 */
export async function semanticSearch(
  query: string,
  options?: {
    limit?: number;
    threshold?: number;
    categoryFilter?: string;
    tagFilter?: string;
  }
): Promise<SemanticSearchResult[]> {
  const {
    limit = 10,
    threshold = 0.1,
    categoryFilter,
    tagFilter
  } = options || {};

  const queryEmbedding = generateEmbedding(query);

  // Calculate similarities
  const results: SemanticSearchResult[] = [];

  vectorStore.forEach(doc => {
    // Apply filters
    if (categoryFilter && doc.metadata.category !== categoryFilter) {
      return;
    }
    if (tagFilter && !doc.metadata.tags.includes(tagFilter)) {
      return;
    }

    const similarity = cosineSimilarity(queryEmbedding, doc.embedding);

    if (similarity >= threshold) {
      // Find highlight (sentence with highest similarity to query)
      const sentences = doc.content.split(/[.!?]+/);
      let bestSentence = '';
      let bestScore = 0;

      sentences.forEach(sentence => {
        const sentEmbedding = generateEmbedding(sentence.trim());
        const score = cosineSimilarity(queryEmbedding, sentEmbedding);
        if (score > bestScore) {
          bestScore = score;
          bestSentence = sentence.trim();
        }
      });

      results.push({
        document: doc,
        similarity,
        highlight: bestSentence || doc.content.substring(0, 200)
      });
    }
  });

  // Sort by similarity and limit
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Delete documents by filter
 */
export async function deleteDocuments(filter: {
  category?: string;
  sessionId?: string;
  before?: Date;
}): Promise<number> {
  let deleted = 0;

  const toDelete: string[] = [];

  vectorStore.forEach((doc, id) => {
    let match = true;

    if (filter.category && doc.metadata.category !== filter.category) {
      match = false;
    }
    if (filter.sessionId && doc.metadata.sessionId !== filter.sessionId) {
      match = false;
    }
    if (filter.before && new Date(doc.metadata.timestamp) > filter.before) {
      match = false;
    }

    if (match) {
      toDelete.push(id);
    }
  });

  toDelete.forEach(id => {
    vectorStore.delete(id);
    deleted++;
  });

  return deleted;
}

/**
 * Get document by ID
 */
export async function getDocument(id: string): Promise<VectorDocument | null> {
  return vectorStore.get(id) || null;
}

/**
 * Update document
 */
export async function updateDocument(
  id: string,
  updates: {
    content?: string;
    metadata?: Partial<VectorDocument['metadata']>;
  }
): Promise<boolean> {
  const doc = vectorStore.get(id);
  if (!doc) return false;

  if (updates.content) {
    doc.content = updates.content;
    doc.embedding = generateEmbedding(updates.content);
  }

  if (updates.metadata) {
    doc.metadata = { ...doc.metadata, ...updates.metadata };
  }

  vectorStore.set(id, doc);
  return true;
}

/**
 * Find similar documents
 */
export async function findSimilar(
  documentId: string,
  limit: number = 5
): Promise<SemanticSearchResult[]> {
  const doc = vectorStore.get(documentId);
  if (!doc) return [];

  const results: SemanticSearchResult[] = [];

  vectorStore.forEach((otherDoc, otherId) => {
    if (otherId === documentId) return;

    const similarity = cosineSimilarity(doc.embedding, otherDoc.embedding);

    results.push({
      document: otherDoc,
      similarity,
      highlight: otherDoc.content.substring(0, 200)
    });
  });

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Get statistics
 */
export async function getVectorStats(): Promise<{
  totalDocuments: number;
  documentsByCategory: Map<string, number>;
  documentsByTag: Map<string, number>;
  oldestDocument: Date | null;
  newestDocument: Date | null;
}> {
  const totalDocuments = vectorStore.size;
  const documentsByCategory = new Map<string, number>();
  const documentsByTag = new Map<string, number>();

  let oldestDate: Date | null = null;
  let newestDate: Date | null = null;

  vectorStore.forEach(doc => {
    // Count by category
    const cat = doc.metadata.category;
    documentsByCategory.set(cat, (documentsByCategory.get(cat) || 0) + 1);

    // Count by tags
    doc.metadata.tags.forEach(tag => {
      documentsByTag.set(tag, (documentsByTag.get(tag) || 0) + 1);
    });

    // Track dates
    const date = new Date(doc.metadata.timestamp);
    if (!oldestDate || date < oldestDate) oldestDate = date;
    if (!newestDate || date > newestDate) newestDate = date;
  });

  return {
    totalDocuments,
    documentsByCategory,
    documentsByTag,
    oldestDocument: oldestDate,
    newestDocument: newestDate
  };
}

/**
 * Clear all documents
 */
export async function clearVectorStore(): Promise<void> {
  vectorStore.clear();
}

/**
 * Index council session data
 */
export async function indexCouncilSession(
  sessionId: string,
  messages: Array<{
    personaId: string;
    personaName: string;
    content: string;
  }>,
  topic: string
): Promise<string[]> {
  const documentIds: string[] = [];

  // Index each message
  messages.forEach((msg, index) => {
    const metadata: VectorDocument['metadata'] = {
      sessionId,
      personaId: msg.personaId,
      category: 'council-message',
      timestamp: new Date().toISOString(),
      tags: [topic, msg.personaName, 'session']
    };

    const id = addDocument(msg.content, metadata);
    documentIds.push(id);
  });

  // Index session summary
  const summaryMetadata: VectorDocument['metadata'] = {
    sessionId,
    category: 'council-session',
    timestamp: new Date().toISOString(),
    tags: [topic, 'summary', 'session']
  };

  const summary = `Session: ${topic}. Participants: ${messages.map(m => m.personaName).join(', ')}. ${messages.length} messages exchanged.`;
  const summaryId = await addDocument(summary, summaryMetadata);
  documentIds.push(summaryId);

  return documentIds;
}

/**
 * Smart query with context
 */
export async function smartQuery(
  query: string,
  context?: {
    sessionId?: string;
    personaId?: string;
    category?: string;
  },
  limit: number = 5
): Promise<{
  results: SemanticSearchResult[];
  contextSummary: string;
}> {
  let searchOptions: any = { limit };

  if (context?.category) {
    searchOptions.categoryFilter = context.category;
  }

  const results = await semanticSearch(query, searchOptions);

  // Generate context summary
  let contextSummary = `Found ${results.length} relevant documents for query: "${query}"`;

  if (context?.sessionId) {
    contextSummary += ` in session ${context.sessionId}`;
  }
  if (context?.personaId) {
    contextSummary += ` from persona ${context.personaId}`;
  }

  return {
    results,
    contextSummary
  };
}

/**
 * Export vector store (for backup)
 */
export async function exportVectorStore(): Promise<string> {
  const docs = Array.from(vectorStore.values());
  return JSON.stringify(docs, null, 2);
}

/**
 * Import vector store (from backup)
 */
export async function importVectorStore(jsonData: string): Promise<number> {
  try {
    const docs = JSON.parse(jsonData) as VectorDocument[];

    docs.forEach(doc => {
      vectorStore.set(doc.id, doc);
    });

    return docs.length;
  } catch (error) {
    console.error("Error importing vector store:", error);
    return 0;
  }
}
