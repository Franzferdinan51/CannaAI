import { NextRequest, NextResponse } from 'next/server';
import { agentEvolverClient } from '@/lib/agent-evolver';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messageId, sentiment, mode, content, provider } = body || {};

    if (!messageId || !sentiment) {
      return NextResponse.json({ success: false, error: 'Missing messageId or sentiment' }, { status: 400 });
    }

    // Basic mapping of sentiment to feedback scores
    const success = sentiment === 'up';
    const feedback = {
      success,
      accuracy: success ? 0.9 : 0.4,
      responseTime: 0,
      userSatisfaction: success ? 0.9 : 0.35
    };

    // Submit to Agent Evolver if available
    try {
      await agentEvolverClient.optimizePrompt(
        content || 'feedback',
        feedback,
        { taskType: mode || 'analysis' }
      );
    } catch (e) {
      console.warn('AgentEvolver feedback failed', e);
    }

    return NextResponse.json({
      success: true,
      messageId,
      provider: provider || 'unknown',
      mode: mode || 'analysis'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
