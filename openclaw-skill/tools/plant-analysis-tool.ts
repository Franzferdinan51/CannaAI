/**
 * Plant Analysis Tool for OpenClaw Agents
 * 
 * Complete plant health analysis workflow:
 * 1. Capture photo
 * 2. AI analysis (Qwen 3.5 Plus)
 * 3. Parse results
 * 4. Report to user
 * 5. Take action
 */

import { sendToOpenClaw } from '../lib/openclaw-provider';

export interface PlantIssue {
  type: 'nutrient' | 'pest' | 'disease' | 'environmental' | 'other';
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  symptoms: string[];
  treatment: string;
  urgency: string;
}

export interface PlantAnalysis {
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  issues: PlantIssue[];
  growthStage: 'seedling' | 'vegetative' | 'flowering' | 'harvest_ready';
  recommendations: string[];
  followUpNeeded: boolean;
  followUpDays: number;
}

/**
 * Analyze plant photo using BEST AI model (Qwen 3.5 Plus)
 */
export async function analyzePlantPhoto(imageBase64: string): Promise<PlantAnalysis> {
  // Send to OpenClaw with visual task type (auto-uses Qwen 3.5 Plus)
  const response = await sendToOpenClaw([
    {
      role: 'system',
      content: `You are an expert cannabis cultivation specialist with 20+ years experience.
      
Analyze this plant photo comprehensively and provide structured output:

1. Overall health assessment (excellent/good/fair/poor/critical)
2. Growth stage (seedling/vegetative/flowering/harvest_ready)
3. Any issues detected:
   - Type (nutrient/pest/disease/environmental/other)
   - Name (specific deficiency/pest/disease)
   - Severity (low/medium/high/critical)
   - Confidence (0-1)
   - Symptoms observed
   - Treatment recommendations
   - Urgency level
4. Specific actionable recommendations (numbered list)
5. Follow-up needed (yes/no) and timeframe (days)

Be specific, accurate, and provide actionable advice. If you see no issues, say so clearly.`
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Analyze this cannabis plant for health issues, nutrient deficiencies, pests, and diseases. Provide specific diagnosis and treatment recommendations.'
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${imageBase64}` }
        }
      ]
    }
  ], {
    taskType: 'visual',  // Auto-uses Qwen 3.5 Plus (BEST for plant vision)
    maxTokens: 2500,
    temperature: 0.3,  // Lower temperature for more accurate analysis
  });

  // Parse AI response into structured format
  return parseAnalysis(response.content || '');
}

/**
 * Parse AI response into structured PlantAnalysis
 */
function parseAnalysis(aiResponse: string): PlantAnalysis {
  // Extract structured data from AI response
  // This is a simplified parser - in production, use LLM parsing or regex
  
  const analysis: PlantAnalysis = {
    overallHealth: 'good',
    issues: [],
    growthStage: 'vegetative',
    recommendations: [],
    followUpNeeded: false,
    followUpDays: 7,
  };

  // Parse overall health
  if (aiResponse.includes('critical') || aiResponse.includes('CRITICAL')) {
    analysis.overallHealth = 'critical';
  } else if (aiResponse.includes('poor') || aiResponse.includes('POOR')) {
    analysis.overallHealth = 'poor';
  } else if (aiResponse.includes('fair') || aiResponse.includes('FAIR')) {
    analysis.overallHealth = 'fair';
  } else if (aiResponse.includes('excellent') || aiResponse.includes('EXCELLENT')) {
    analysis.overallHealth = 'excellent';
  }

  // Parse growth stage
  if (aiResponse.includes('seedling') || aiResponse.includes('SEEDLING')) {
    analysis.growthStage = 'seedling';
  } else if (aiResponse.includes('flowering') || aiResponse.includes('FLOWERING')) {
    analysis.growthStage = 'flowering';
  } else if (aiResponse.includes('harvest') || aiResponse.includes('HARVEST')) {
    analysis.growthStage = 'harvest_ready';
  }

  // Parse issues (simplified - production would use better parsing)
  if (aiResponse.includes('nitrogen') || aiResponse.includes('Nitrogen')) {
    analysis.issues.push({
      type: 'nutrient',
      name: 'Nitrogen Deficiency',
      severity: 'medium',
      confidence: 0.85,
      symptoms: ['Yellowing lower leaves'],
      treatment: 'Add nitrogen-rich fertilizer',
      urgency: 'medium'
    });
  }

  // Parse recommendations
  const recLines = aiResponse.split('\n').filter(line => 
    line.match(/^\d+\./) || line.includes('Recommendation')
  );
  analysis.recommendations = recLines.slice(0, 5);

  // Parse follow-up
  if (aiResponse.includes('follow-up') || aiResponse.includes('Follow-up') || aiResponse.includes('check again')) {
    analysis.followUpNeeded = true;
    const daysMatch = aiResponse.match(/(\d+)\s*days?/);
    analysis.followUpDays = daysMatch ? parseInt(daysMatch[1]) : 7;
  }

  return analysis;
}

/**
 * Generate user-friendly report from analysis
 */
export function generateReport(analysis: PlantAnalysis): string {
  const healthEmoji = {
    'excellent': '✅',
    'good': '🌿',
    'fair': '⚠️',
    'poor': '❗',
    'critical': '🚨'
  };

  let report = `${healthEmoji[analysis.overallHealth]} **Plant Health Analysis Report**\n\n`;
  report += `**Overall Health:** ${analysis.overallHealth.toUpperCase()}\n`;
  report += `**Growth Stage:** ${analysis.growthStage.replace('_', ' ').toUpperCase()}\n\n`;

  if (analysis.issues.length > 0) {
    report += `⚠️ **Issues Detected:**\n\n`;
    
    for (const issue of analysis.issues) {
      report += `**${issue.name}** (${issue.severity})\n`;
      report += `- Type: ${issue.type}\n`;
      report += `- Confidence: ${(issue.confidence * 100).toFixed(0)}%\n`;
      report += `- Symptoms: ${issue.symptoms.join(', ')}\n`;
      report += `- Treatment: ${issue.treatment}\n`;
      report += `- Urgency: ${issue.urgency}\n\n`;
    }
  } else {
    report += `✅ **No Issues Detected** - Plant looks healthy!\n\n`;
  }

  report += `📋 **Recommendations:**\n`;
  analysis.recommendations.forEach((rec, i) => {
    report += `${i+1}. ${rec}\n`;
  });

  if (analysis.followUpNeeded) {
    report += `\n📅 **Follow-up:** Check again in ${analysis.followUpDays} days`;
  }

  return report;
}

/**
 * Complete plant health check workflow
 */
export async function performPlantHealthCheck(imageBase64: string): Promise<{
  analysis: PlantAnalysis;
  report: string;
  actionsRequired: number;
}> {
  // Step 1 & 2: Analyze photo
  const analysis = await analyzePlantPhoto(imageBase64);
  
  // Step 3: Generate report
  const report = generateReport(analysis);
  
  // Step 4: Count actions required
  const actionsRequired = analysis.issues.filter(
    i => i.severity === 'high' || i.severity === 'critical'
  ).length;
  
  return {
    analysis,
    report,
    actionsRequired
  };
}

export default {
  analyzePlantPhoto,
  generateReport,
  performPlantHealthCheck,
};
