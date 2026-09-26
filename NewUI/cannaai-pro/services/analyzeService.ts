import { AnalysisResult } from "../types";
import { apiUrl } from "../src/lib/api-origin";

export const analyzePlantImage = async (base64Data: string): Promise<AnalysisResult> => {
  const image = base64Data.startsWith('data:')
    ? base64Data
    : `data:image/jpeg;base64,${base64Data}`;
  const response = await fetch(apiUrl('/analyze'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plantImage: image,
      leafSymptoms: 'No symptoms specified',
      urgency: 'medium'
    })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success || !payload.analysis) {
    throw new Error(payload?.message || payload?.error || `Analysis request failed (${response.status})`);
  }

  const analysis = payload.analysis;
  const detectedIssues = Array.isArray(analysis.detectedIssues) ? analysis.detectedIssues : [];
  const potentialIssues = Array.isArray(analysis.potentialIssues) ? analysis.potentialIssues : [];
  const rawScore = typeof analysis.healthScore === 'number' ? analysis.healthScore : undefined;
  const overallHealth: AnalysisResult['overallHealth'] = analysis.urgency === 'critical' || (rawScore !== undefined && rawScore < 40)
    ? 'Critical'
    : detectedIssues.length > 0 || (rawScore !== undefined && rawScore < 70)
      ? 'Issues Detected'
      : 'Healthy';

  return {
    overallHealth,
    issues: [...detectedIssues, ...potentialIssues].slice(0, 20).map((issue: any) => ({
      name: typeof issue === 'string' ? issue : String(issue?.name || issue?.issue || 'Unspecified issue'),
      confidence: typeof issue?.confidence === 'number' ? issue.confidence : rawScore ?? 0
    })),
    recommendations: Array.isArray(analysis.recommendations)
      ? analysis.recommendations.join(' ')
      : String(analysis.recommendations || analysis.summary || 'No recommendations were returned.')
  };
};
