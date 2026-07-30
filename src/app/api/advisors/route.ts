import { NextRequest, NextResponse } from 'next/server';
import { getLocalMoaAdvisors } from '@/lib/ai/localMoaAdvisors';
import { getUnifiedAI } from '@/lib/ai-providers/unified-ai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const providers = (await getUnifiedAI().refreshProviderHealth()).map((provider) => ({
    id: provider.name,
    status: provider.health.status,
    healthy: provider.health.status !== 'unhealthy',
    capabilities: provider.capabilities
  }));

  return NextResponse.json({
    success: true,
    workflow: 'planner → skeptic → synthesizer',
    providers
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const task = typeof body.task === 'string' ? body.task.trim() : '';
    const context = typeof body.context === 'string' ? body.context.trim() : undefined;
    const provider = typeof body.provider === 'string' && body.provider !== 'auto' ? body.provider : undefined;
    const model = typeof body.model === 'string' ? body.model : undefined;

    if (!task) {
      return NextResponse.json({ success: false, error: 'task is required' }, { status: 400 });
    }
    if (task.length > 12000 || (context?.length || 0) > 20000) {
      return NextResponse.json({ success: false, error: 'Task or context is too long.' }, { status: 400 });
    }

    const result = await getLocalMoaAdvisors().run({ task, context, provider, model });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[Local MoA] Request failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Advisor workflow failed.' },
      { status: 500 }
    );
  }
}
