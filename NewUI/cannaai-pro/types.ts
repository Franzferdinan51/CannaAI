export interface AnalysisIssue {
  name: string;
  confidence: number;
}

export interface AnalysisResult {
  issues: AnalysisIssue[];
  recommendations: string;
  overallHealth: 'Healthy' | 'Issues Detected' | 'Critical';
}

export interface PlantImage {
  id: string;
  url: string;
  timestamp: string;
  status: 'Processing' | 'Healthy' | 'Warning' | 'Critical'; // UI Status
  batchId: string;
  strain: string;
  analysis?: AnalysisResult;
}
