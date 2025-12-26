/**
 * Adaptive Orchestration Service
 * Real-time optimization of AI Council sessions based on metrics
 */

import {
  CouncilSession,
  SessionMetrics,
  AdaptiveOrchestrationConfig,
  OrchestrationAction,
  CouncilPersona,
  SessionMode,
  CULTIVATION_PERSONAS
} from '../../types/council';

/**
 * Default adaptive configuration
 */
const DEFAULT_CONFIG: AdaptiveOrchestrationConfig = {
  enableAutoOptimization: true,
  optimizationInterval: 5, // Check every 5 sessions
  metricsWindow: 10, // Look at last 10 sessions
  qualityThreshold: 0.7, // Minimum quality score (0-1)
  consensusThreshold: 0.6, // Minimum consensus rate
  predictionWindow: 5 // Look ahead 5 sessions
};

/**
 * Calculate session metrics
 */
export function calculateSessionMetrics(
  session: CouncilSession,
  responseTimes: Map<string, number> // personaId -> response time in ms
): SessionMetrics {
  // Calculate average response time
  const totalResponseTime = Array.from(responseTimes.values()).reduce((sum, time) => sum + time, 0);
  const averageResponseTime = responseTimes.size > 0 ? totalResponseTime / responseTimes.size : 0;

  // Calculate participant engagement (based on message length and count)
  const participantEngagement = new Map<string, number>();
  session.participants.forEach(personaId => {
    const personaMessages = session.messages.filter(m => m.personaId === personaId);
    const totalLength = personaMessages.reduce((sum, m) => sum + m.content.length, 0);
    const engagement = personaMessages.length > 0 ? totalLength / personaMessages.length : 0;
    participantEngagement.set(personaId, engagement);
  });

  // Calculate consensus rate
  let consensusRate = 0;
  if (session.votes) {
    const totalVotes = session.votes.votes.length;
    const agreeVotes = session.votes.votes.filter(v => v.vote === 'agree').length;
    consensusRate = totalVotes > 0 ? agreeVotes / totalVotes : 0;
  }

  return {
    sessionId: session.id,
    totalMessages: session.messages.length,
    averageResponseTime,
    consensusRate,
    participantEngagement,
    userSatisfaction: undefined // Would be set by user feedback
  };
}

/**
 * Analyze metrics and recommend optimizations
 */
export async function analyzeAndOptimize(
  recentSessions: CouncilSession[],
  recentMetrics: SessionMetrics[],
  config: AdaptiveOrchestrationConfig = DEFAULT_CONFIG
): Promise<OrchestrationAction> {
  if (!config.enableAutoOptimization) {
    return { type: 'none', reasoning: 'Auto-optimization is disabled' };
  }

  if (recentSessions.length < config.optimizationInterval) {
    return { type: 'none', reasoning: `Not enough sessions yet (${recentSessions.length}/${config.optimizationInterval})` };
  }

  // Calculate aggregate metrics
  const avgQuality = calculateAggregateQuality(recentMetrics);
  const avgConsensus = calculateAggregateConsensus(recentMetrics);
  const avgEngagement = calculateAggregateEngagement(recentMetrics);

  // Check if quality is below threshold
  if (avgQuality < config.qualityThreshold) {
    return {
      type: 'add-participant',
      reasoning: `Low quality score (${avgQuality.toFixed(2)}). Adding specialist may improve results.`,
      personaId: recommendAdditionalPersona(recentSessions[recentSessions.length - 1])
    };
  }

  // Check if consensus is low
  if (avgConsensus < config.consensusThreshold) {
    return {
      type: 'adjust-model',
      reasoning: `Low consensus rate (${avgConsensus.toFixed(2)}). Adjusting temperature may improve alignment.`,
      newTemperature: '0.5' // Lower temperature for more focused responses
    };
  }

  // Check for disengaged participants
  const disengaged = findDisengagedParticipants(avgEngagement, recentMetrics);
  if (disengaged.length > 0) {
    return {
      type: 'remove-participant',
      reasoning: `Removing disengaged participant: ${disengaged[0]}`,
      personaId: disengaged[0]
    };
  }

  // Everything looks good, suggest mode change if beneficial
  const lastSession = recentSessions[recentSessions.length - 1];
  if (lastSession.mode === 'deliberation' && avgConsensus > 0.8) {
    return {
      type: 'change-mode',
      reasoning: 'High consensus achieved. Consider switching to advisory mode for faster decisions.',
      newMode: 'advisory'
    };
  }

  return { type: 'none', reasoning: 'System is performing well. No changes needed.' };
}

/**
 * Calculate aggregate quality score
 */
function calculateAggregateQuality(metrics: SessionMetrics[]): number {
  if (metrics.length === 0) return 0;

  // Quality is a composite of:
  // - User satisfaction (40%)
  // - Consensus rate (30%)
  // - Engagement balance (30%)

  let totalQuality = 0;
  let count = 0;

  metrics.forEach(m => {
    const userScore = m.userSatisfaction ?? 0.7; // Default to 0.7 if not set
    const consensusScore = m.consensusRate;

    // Calculate engagement balance (standard deviation of engagement scores)
    const engagementValues = Array.from(m.participantEngagement.values());
    const avgEngagement = engagementValues.reduce((a, b) => a + b, 0) / engagementValues.length;
    const variance = engagementValues.reduce((sum, val) => sum + Math.pow(val - avgEngagement, 2), 0) / engagementValues.length;
    const balanceScore = Math.max(0, 1 - (variance / 10000)); // Normalize to 0-1

    const quality = (userScore * 0.4) + (consensusScore * 0.3) + (balanceScore * 0.3);
    totalQuality += quality;
    count++;
  });

  return count > 0 ? totalQuality / count : 0;
}

/**
 * Calculate aggregate consensus rate
 */
function calculateAggregateConsensus(metrics: SessionMetrics[]): number {
  if (metrics.length === 0) return 0;

  const total = metrics.reduce((sum, m) => sum + m.consensusRate, 0);
  return total / metrics.length;
}

/**
 * Calculate aggregate engagement per persona
 */
function calculateAggregateEngagement(metrics: SessionMetrics[]): Map<string, number> {
  const engagementSum = new Map<string, number>();
  const engagementCount = new Map<string, number>();

  metrics.forEach(m => {
    m.participantEngagement.forEach((score, personaId) => {
      engagementSum.set(personaId, (engagementSum.get(personaId) || 0) + score);
      engagementCount.set(personaId, (engagementCount.get(personaId) || 0) + 1);
    });
  });

  const avgEngagement = new Map<string, number>();
  engagementSum.forEach((sum, personaId) => {
    const count = engagementCount.get(personaId) || 1;
    avgEngagement.set(personaId, sum / count);
  });

  return avgEngagement;
}

/**
 * Find disengaged participants
 */
function findDisengagedParticipants(
  avgEngagement: Map<string, number>,
  recentMetrics: SessionMetrics[]
): string[] {
  const disengaged: string[] = [];
  const threshold = 500; // Minimum average character count

  avgEngagement.forEach((score, personaId) => {
    if (score < threshold) {
      disengaged.push(personaId);
    }
  });

  return disengaged;
}

/**
 * Recommend an additional persona for a session
 */
function recommendAdditionalPersona(session: CouncilSession): string {
  const topic = session.topic.toLowerCase();
  const currentIds = session.participants;

  // Find missing specialists
  if (topic.includes('nutrient') && !currentIds.includes('chemist')) {
    return 'chemist';
  }
  if (topic.includes('pest') && !currentIds.includes('pest-expert')) {
    return 'pest-expert';
  }
  if (topic.includes('breed') && !currentIds.includes('breeder')) {
    return 'breeder';
  }
  if (topic.includes('light') && !currentIds.includes('horticulturist')) {
    return 'horticulturist';
  }
  if (topic.includes('auto') && !currentIds.includes('tech-expert')) {
    return 'tech-expert';
  }

  // Default to botanist if no specific match
  return 'botanist';
}

/**
 * Generate optimization report
 */
export function generateOptimizationReport(
  sessions: CouncilSession[],
  metrics: SessionMetrics[]
): string {
  if (sessions.length === 0) {
    return "No sessions to analyze.";
  }

  const avgQuality = calculateAggregateQuality(metrics);
  const avgConsensus = calculateAggregateConsensus(metrics);
  const avgResponseTime = metrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / metrics.length;

  let report = "# AI Council Performance Report\n\n";
  report += `**Sessions Analyzed:** ${sessions.length}\n`;
  report += `**Average Quality Score:** ${(avgQuality * 100).toFixed(1)}%\n`;
  report += `**Average Consensus Rate:** ${(avgConsensus * 100).toFixed(1)}%\n`;
  report += `**Average Response Time:** ${(avgResponseTime / 1000).toFixed(2)}s\n\n`;

  // Top performing personas
  const avgEngagement = calculateAggregateEngagement(metrics);
  const sortedEngagement = Array.from(avgEngagement.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  report += "## Top Performing Personas\n\n";
  sortedEngagement.forEach(([personaId, score], index) => {
    const persona = CULTIVATION_PERSONAS.find(p => p.id === personaId);
    report += `${index + 1}. **${persona?.name || personaId}**: ${(score).toFixed(0)} avg chars/response\n`;
  });

  // Mode effectiveness
  const modeStats = new Map<SessionMode, { count: number; avgQuality: number }>();
  sessions.forEach((session, index) => {
    const current = modeStats.get(session.mode) || { count: 0, avgQuality: 0 };
    const quality = calculateAggregateQuality([metrics[index]]);
    modeStats.set(session.mode, {
      count: current.count + 1,
      avgQuality: (current.avgQuality * current.count + quality) / (current.count + 1)
    });
  });

  report += "\n## Mode Effectiveness\n\n";
  Array.from(modeStats.entries())
    .sort((a, b) => b[1].avgQuality - a[1].avgQuality)
    .forEach(([mode, stats]) => {
      report += `- **${mode}**: ${stats.count} sessions, ${(stats.avgQuality * 100).toFixed(1)}% quality\n`;
    });

  // Recommendations
  report += "\n## Recommendations\n\n";

  if (avgQuality < 0.7) {
    report += "- ⚠️ Quality below threshold. Consider adding specialists or adjusting temperature.\n";
  } else {
    report += "- ✅ Quality is good.\n";
  }

  if (avgConsensus < 0.6) {
    report += "- ⚠️ Low consensus. Try using advisory mode for more focused decisions.\n";
  } else {
    report += "- ✅ Consensus rate is healthy.\n";
  }

  return report;
}

/**
 * Get real-time optimization suggestions
 */
export function getOptimizationSuggestions(
  session: CouncilSession,
  metrics: SessionMetrics[]
): string[] {
  const suggestions: string[] = [];

  // Check for long response times
  if (metrics[metrics.length - 1]?.averageResponseTime > 10000) {
    suggestions.push("Some responses are taking >10s. Consider using faster models.");
  }

  // Check for low consensus
  if (metrics[metrics.length - 1]?.consensusRate < 0.5) {
    suggestions.push("Low consensus detected. Try 'advisory' mode for more focused decisions.");
  }

  // Check for too many participants
  if (session.participants.length > 6) {
    suggestions.push("Many participants may slow down deliberation. Consider 3-5 specialists.");
  }

  // Check mode-appropriate participant count
  if (session.mode === 'swarm' && session.participants.length > 4) {
    suggestions.push("Swarm mode works best with 2-3 participants for quick consensus.");
  }

  return suggestions;
}
