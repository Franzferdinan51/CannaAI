import { PlantAnalysis, AnalysisFormData, ScannerStats, PlantImage, CapturedImage } from '../types/scanner';

/**
 * Calculate overall plant health score based on analysis results
 */
export function calculateHealthScore(analysis: PlantAnalysis): number {
  let score = 100;

  // Deduct points based on severity
  switch (analysis.severity) {
    case 'critical': score -= 40; break;
    case 'severe': score -= 30; break;
    case 'moderate': score -= 20; break;
    case 'mild': score -= 10; break;
  }

  // Deduct points for nutrient deficiencies
  if (analysis.nutrientDeficiencies) {
    score -= Math.min(analysis.nutrientDeficiencies.length * 5, 15);
  }

  // Deduct points for pests
  if (analysis.pestsDetected && analysis.pestsDetected.length > 0) {
    score -= Math.min(analysis.pestsDetected.length * 8, 20);
  }

  // Deduct points for diseases
  if (analysis.diseasesDetected && analysis.diseasesDetected.length > 0) {
    score -= Math.min(analysis.diseasesDetected.length * 10, 25);
  }

  // Deduct points for environmental issues
  if (analysis.environmentalFactors && analysis.environmentalFactors.length > 0) {
    score -= Math.min(analysis.environmentalFactors.length * 3, 10);
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Determine status based on health score
 */
export function getHealthStatus(score: number): 'Healthy' | 'Warning' | 'Critical' {
  if (score >= 70) return 'Healthy';
  if (score >= 40) return 'Warning';
  return 'Critical';
}

/**
 * Get severity color classes for UI
 */
export function getSeverityColorClasses(severity: string): { bg: string; text: string; border: string } {
  switch (severity) {
    case 'critical':
      return {
        bg: 'bg-red-900/20',
        text: 'text-red-400',
        border: 'border-red-500/20'
      };
    case 'high':
      return {
        bg: 'bg-orange-900/20',
        text: 'text-orange-400',
        border: 'border-orange-500/20'
      };
    case 'medium':
    case 'moderate':
      return {
        bg: 'bg-yellow-900/20',
        text: 'text-yellow-400',
        border: 'border-yellow-500/20'
      };
    case 'low':
    case 'mild':
      return {
        bg: 'bg-blue-900/20',
        text: 'text-blue-400',
        border: 'border-blue-500/20'
      };
    default:
      return {
        bg: 'bg-gray-900/20',
        text: 'text-gray-400',
        border: 'border-gray-500/20'
      };
  }
}

/**
 * Get urgency color classes for UI
 */
export function getUrgencyColorClasses(urgency: string): { bg: string; text: string; border: string } {
  switch (urgency) {
    case 'critical':
      return {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/20'
      };
    case 'high':
      return {
        bg: 'bg-orange-500/10',
        text: 'text-orange-400',
        border: 'border-orange-500/20'
      };
    case 'medium':
      return {
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
        border: 'border-yellow-500/20'
      };
    case 'low':
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/20'
      };
    default:
      return {
        bg: 'bg-gray-500/10',
        text: 'text-gray-400',
        border: 'border-gray-500/20'
      };
  }
}

/**
 * Generate a unique batch ID
 */
export function generateBatchId(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  let result = '#';

  for (let i = 0; i < 2; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  for (let i = 0; i < 4; i++) {
    result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }

  return result;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }

  // Check file size (50MB limit)
  if (file.size > 50 * 1024 * 1024) {
    return { valid: false, error: 'Image too large. Please use an image under 50MB' };
  }

  // Check file size minimum (10KB)
  if (file.size < 10 * 1024) {
    return { valid: false, error: 'Image too small. Please use a larger image' };
  }

  return { valid: true };
}

/**
 * Compress image before upload
 */
export function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;

        if (width > height) {
          width = Math.min(width, maxWidth);
          height = width / aspectRatio;
        } else {
          height = Math.min(height, maxHeight);
          width = height * aspectRatio;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert file to base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert blob to base64
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Capture photo from video stream
 */
export function capturePhotoFromVideo(video: HTMLVideoElement, quality = 0.9): Promise<CapturedImage> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve({
              blob,
              dataUrl,
              timestamp: new Date().toISOString(),
              metadata: {
                width: canvas.width,
                height: canvas.height,
                fileSize: blob.size,
                format: 'image/jpeg'
              }
            });
          } else {
            reject(new Error('Failed to capture photo'));
          }
        },
        'image/jpeg',
        quality
      );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Calculate scanner statistics
 */
export function calculateScannerStats(images: PlantImage[]): ScannerStats {
  const completedAnalyses = images.filter(img => img.analysis && img.status !== 'Processing');

  if (completedAnalyses.length === 0) {
    return {
      totalScans: images.length,
      healthyPlants: 0,
      plantsNeedingAttention: 0,
      criticalIssues: 0,
      averageHealthScore: 0
    };
  }

  const healthScores = completedAnalyses.map(img => img.analysis!.healthScore);
  const averageHealthScore = Math.round(
    healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length
  );

  const healthyPlants = completedAnalyses.filter(img => img.status === 'Healthy').length;
  const warningPlants = completedAnalyses.filter(img => img.status === 'Warning').length;
  const criticalPlants = completedAnalyses.filter(img => img.status === 'Critical').length;

  const plantsNeedingAttention = warningPlants + criticalPlants;
  const criticalIssues = criticalPlants;

  // Calculate most common issues
  const issueCounts: Record<string, number> = {};
  completedAnalyses.forEach(img => {
    if (img.analysis) {
      img.analysis.symptomsMatched.forEach(symptom => {
        issueCounts[symptom] = (issueCounts[symptom] || 0) + 1;
      });
    }
  });

  const totalIssues = Object.values(issueCounts).reduce((sum, count) => sum + count, 0);
  const mostCommonIssues = Object.entries(issueCounts)
    .map(([issue, count]) => ({
      issue,
      count,
      percentage: Math.round((count / totalIssues) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const lastScanTime = images.length > 0 ? images[0].timestamp : undefined;

  return {
    totalScans: images.length,
    healthyPlants,
    plantsNeedingAttention,
    criticalIssues,
    averageHealthScore,
    lastScanTime,
    mostCommonIssues
  };
}

/**
 * Generate analysis report text
 */
export function generateReportText(analysis: PlantAnalysis, formData: AnalysisFormData): string {
  const timestamp = new Date().toLocaleString();

  let report = `CannaAI Pro Plant Analysis Report\n`;
  report += `Generated: ${timestamp}\n`;
  report += `${'='.repeat(50)}\n\n`;

  report += `PLANT INFORMATION\n`;
  report += `Strain: ${formData.strain}\n`;
  report += `Growth Stage: ${formData.growthStage}\n`;
  report += `Growing Medium: ${formData.medium}\n`;
  if (formData.phLevel) report += `pH Level: ${formData.phLevel}\n`;
  if (formData.temperature) report += `Temperature: ${formData.temperature}°${formData.temperatureUnit}\n`;
  if (formData.humidity) report += `Humidity: ${formData.humidity}%\n`;
  report += `\n`;

  report += `ANALYSIS RESULTS\n`;
  report += `Diagnosis: ${analysis.diagnosis}\n`;
  if (analysis.scientificName) report += `Scientific Name: ${analysis.scientificName}\n`;
  report += `Health Score: ${analysis.healthScore}/100\n`;
  report += `Confidence: ${analysis.confidence}%\n`;
  report += `Severity: ${analysis.severity}\n`;
  report += `Urgency: ${analysis.urgency}\n`;
  report += `\n`;

  if (analysis.symptomsMatched.length > 0) {
    report += `SYMPTOMS IDENTIFIED\n`;
    analysis.symptomsMatched.forEach((symptom, i) => {
      report += `${i + 1}. ${symptom}\n`;
    });
    report += `\n`;
  }

  if (analysis.causes.length > 0) {
    report += `POTENTIAL CAUSES\n`;
    analysis.causes.forEach((cause, i) => {
      report += `${i + 1}. ${cause}\n`;
    });
    report += `\n`;
  }

  if (analysis.treatment.length > 0) {
    report += `RECOMMENDED TREATMENTS\n`;
    analysis.treatment.forEach((treatment, i) => {
      report += `${i + 1}. ${treatment}\n`;
    });
    report += `\n`;
  }

  if (analysis.strainSpecificAdvice) {
    report += `STRAIN-SPECIFIC ADVICE\n`;
    report += `${analysis.strainSpecificAdvice}\n\n`;
  }

  if (analysis.recommendations) {
    if (analysis.recommendations.immediate && analysis.recommendations.immediate.length > 0) {
      report += `IMMEDIATE ACTIONS (24 hours)\n`;
      analysis.recommendations.immediate.forEach((action, i) => {
        report += `${i + 1}. ${action}\n`;
      });
      report += `\n`;
    }

    if (analysis.recommendations.shortTerm && analysis.recommendations.shortTerm.length > 0) {
      report += `SHORT-TERM ACTIONS (1-2 weeks)\n`;
      analysis.recommendations.shortTerm.forEach((action, i) => {
        report += `${i + 1}. ${action}\n`;
      });
      report += `\n`;
    }

    if (analysis.recommendations.longTerm && analysis.recommendations.longTerm.length > 0) {
      report += `LONG-TERM ACTIONS (Ongoing)\n`;
      analysis.recommendations.longTerm.forEach((action, i) => {
        report += `${i + 1}. ${action}\n`;
      });
      report += `\n`;
    }
  }

  if (analysis.followUpSchedule) {
    report += `FOLLOW-UP SCHEDULE\n`;
    report += `${analysis.followUpSchedule}\n\n`;
  }

  if (analysis.prognosis) {
    report += `PROGNOSIS\n`;
    report += `${analysis.prognosis}\n\n`;
  }

  report += `\n${'='.repeat(50)}\n`;
  report += `This report was generated by CannaAI Pro\n`;
  report += `AI-powered plant health analysis system\n`;

  return report;
}

/**
 * Download analysis report as text file
 */
export function downloadReport(analysis: PlantAnalysis, formData: AnalysisFormData, filename?: string) {
  const report = generateReportText(analysis, formData);
  const blob = new Blob([report], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `cannai-analysis-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Check if browser supports camera access
 */
export function checkCameraSupport(): { supported: boolean; message: string } {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      supported: false,
      message: 'Camera access is not supported in this browser or environment'
    };
  }

  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    return {
      supported: false,
      message: 'Camera access requires HTTPS connection (except for localhost)'
    };
  }

  return {
    supported: true,
    message: 'Camera access is supported'
  };
}

/**
 * Get available camera devices
 */
export async function getCameraDevices(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
  } catch (error) {
    console.error('Failed to get camera devices:', error);
    return [];
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}