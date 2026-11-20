import { NextRequest, NextResponse } from 'next/server';
import { ragChat, getSuggestedQuestions } from '@/lib/ai/ragChat';
import { getLogger } from '@/lib/logger';

const log = getLogger().child({ tag: '[RAG-CHAT]' });

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes

/**
 * RAG Chat API Endpoint
 * POST /api/rag-chat
 *
 * Body:
 * - query: string (user question)
 * - config: ModelConfig (AI provider configuration)
 * - history: ChatMessage[] (conversation history)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      query,
      config,
      history = [],
      documents = [],
    } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    if (!config) {
      return NextResponse.json(
        { error: 'Model configuration required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(documents)) {
      return NextResponse.json(
        { error: 'Documents must be an array when supplied' },
        { status: 400 }
      );
    }

    log.debug('rag_chat.started', { documentCount: documents.length });

    const response = await ragChat(query, documents, history, config);

    log.debug('rag_chat.completed', { provider: response.provider });

    return NextResponse.json({
      success: true,
      response: response.response,
      provider: response.provider,
      available: response.available,
      references: response.references,
      hasContext: response.hasContext,
      contextDocs: response.contextDocs,
      suggestedQuestions: getSuggestedQuestions(documents)
    });

  } catch (error: any) {
    log.error('rag_chat.failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Chat failed'
      },
      { status: 500 }
    );
  }
}
