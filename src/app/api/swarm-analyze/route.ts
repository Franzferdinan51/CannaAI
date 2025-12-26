import { NextRequest, NextResponse } from 'next/server';
import { runSwarmAnalysis } from '@/lib/ai/swarmOrchestrator';
import { runDualCheckPipeline } from '@/lib/ai/verificationPipeline';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

/**
 * Swarm Analysis API Endpoint
 * POST /api/swarm-analyze
 *
 * Body:
 * - text: string (context data, sensor readings, etc)
 * - images: string[] (base64 encoded images)
 * - config: ModelConfig (AI provider configuration)
 * - useDualCheck: boolean (enable verification pipeline)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text = '', images = [], config, useDualCheck = false } = body;

    if (!config) {
      return NextResponse.json(
        { error: 'Model configuration required' },
        { status: 400 }
      );
    }

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'At least one image is required' },
        { status: 400 }
      );
    }

    console.log(`[SWARM API] Starting ${config.swarmMode} mode with ${images.length} images...`);

    let result;

    if (useDualCheck) {
      // Use dual-check verification pipeline
      const verificationResult = await runDualCheckPipeline(text, images, config);

      result = {
        analysis: verificationResult.verifiedAnalysis || verificationResult.primaryAnalysis,
        verificationStatus: verificationResult.verificationStatus,
        verificationProvider: verificationResult.verificationProvider,
        criticalFindings: verificationResult.criticalFindings,
        mode: 'dual-check'
      };
    } else {
      // Use swarm analysis
      const swarmResult = await runSwarmAnalysis(text, images, config);

      result = {
        analysis: swarmResult.finalAnalysis,
        providerResults: swarmResult.providerResults,
        consensusLevel: swarmResult.consensusLevel,
        processingTime: swarmResult.processingTime,
        mode: swarmResult.mode
      };
    }

    console.log(`[SWARM API] Analysis complete`);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('[SWARM API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Analysis failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
