import { prisma } from '@/lib/prisma';

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
    const rules = await prisma.automationRule.findMany({
      where: { plantId, enabled: true, type: 'trigger' }, include: { trigger: true }
    });
    for (const rule of rules) {
      if (rule.trigger?.type !== 'manual') continue;
      for (const action of rule.actions as any[]) {
        if (action.type === 'analyze') await executeAnalysisAction(plantId, imageData, captureData, action.config);
      }
    }
  } catch (error) {
    console.error('Post-capture analysis error:', error);
  }
}

async function executeAnalysisAction(plantId: string, _imageData: string, captureData: any, _config: any) {
  await prisma.analysisHistory.create({
    data: {
      plantId,
      analysisType: 'photo',
      data: { capturedAt: captureData.capturedAt, deviceInfo: captureData.deviceInfo, analysisType: 'automated_photo_capture' },
      metadata: { source: 'auto_capture', captureTask: captureData.taskId }
    }
  });
}
