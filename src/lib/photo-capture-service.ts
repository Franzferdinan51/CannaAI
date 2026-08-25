import { prisma } from '@/lib/prisma';
import { analyzePlantHealth } from '@/lib/ai';

function asJsonRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function executeCapture(taskId: string) {
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId }, include: { plant: true } });
    if (!task) return;
    const taskData = asJsonRecord(task.data);

    await prisma.task.update({ where: { id: taskId }, data: { status: 'running' } });
    const captureResult = {
      success: false,
      captureRequestedAt: new Date().toISOString(),
      deviceInfo: asJsonRecord(taskData.deviceInfo),
      message: 'Waiting for a connected capture agent to provide imageData'
    };

    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'awaiting_capture', data: { ...taskData, ...captureResult } }
    });

    if (task.plantId && typeof taskData.imageData === 'string') {
      await triggerAnalysisAfterCapture(task.plantId, taskData.imageData, taskData);
    }
  } catch (error) {
    console.error('Capture execution error:', error);
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'failed',
        data: { error: error instanceof Error ? error.message : 'Unknown error', failedAt: new Date().toISOString() }
      }
    });
  }
}

export async function triggerAnalysisAfterCapture(plantId: string, imageData: string, captureData: any) {
  try {
    // A connected phone/microscope capture is an explicit user/agent request.
    // Run the real local-first vision path even when no legacy automation rule
    // exists; the old implementation only inserted a history placeholder.
    await executeAnalysisAction(plantId, imageData, captureData, {
      ...(asJsonRecord(captureData?.analysisConfig)),
      source: 'agent_photo_capture'
    });
  } catch (error) {
    console.error('Post-capture analysis error:', error);
    await prisma.analysisHistory.create({
      data: {
        plantId,
        analysisType: 'automated_photo_error',
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'AI analysis failed'
        },
        metadata: {
          source: 'auto_capture',
          capturedAt: captureData?.capturedAt || null
        }
      }
    }).catch((historyError) => console.error('Failed to persist capture analysis error:', historyError));
  }
}

async function executeAnalysisAction(plantId: string, imageData: string, captureData: any, config: any) {
  const captureConfig = asJsonRecord(captureData?.config);
  const analysisContext = { ...captureConfig, ...asJsonRecord(captureData) };
  const analysis = await analyzePlantHealth(imageData, {
    model: typeof analysisContext.model === 'string' ? analysisContext.model : undefined,
    primaryProvider: typeof analysisContext.primaryProvider === 'string' ? analysisContext.primaryProvider : undefined,
    strain: typeof analysisContext.strain === 'string' ? analysisContext.strain : undefined,
    growthStage: typeof analysisContext.growthStage === 'string' ? analysisContext.growthStage : undefined,
    medium: typeof analysisContext.medium === 'string' ? analysisContext.medium : undefined,
    temperature: typeof analysisContext.temperature === 'number' ? analysisContext.temperature : undefined,
    humidity: typeof analysisContext.humidity === 'number' ? analysisContext.humidity : undefined,
    phLevel: typeof analysisContext.phLevel === 'number' ? analysisContext.phLevel : undefined,
    symptoms: Array.isArray(analysisContext.symptoms) ? analysisContext.symptoms : undefined
  });

  await prisma.analysisHistory.create({
    data: {
      plantId,
      analysisType: 'automated_photo',
      data: {
        diagnosis: analysis.diagnosis,
        confidence: analysis.confidence,
        recommendations: analysis.recommendations,
        urgency: analysis.urgency,
        potentialIssues: analysis.potentialIssues,
        suggestedActions: analysis.suggestedActions,
        nextSteps: analysis.nextSteps
      },
      metadata: {
        source: config?.source || 'auto_capture',
        capturedAt: captureData?.capturedAt || null,
        deviceInfo: captureData?.deviceInfo || null,
        captureTask: captureData?.taskId || null
      }
    }
  });

  return analysis;
}
