import { useState, useEffect, useCallback } from 'react';
import {
  PlantContext,
  Message,
  EnvironmentalData,
  AgenticTrigger,
  AutonomousAction,
  PatternAnalysis,
  AgenticContext
} from '../types/assistant';

export const useAgenticAI = (
  plantContext: PlantContext,
  agenticEnabled: boolean,
  isOpen: boolean,
  agenticContext: AgenticContext,
  agenticTriggers: AgenticTrigger[],
  environmentalHistory: EnvironmentalData[]
) => {
  const [proactiveAlerts, setProactiveAlerts] = useState<Message[]>([]);
  const [autonomousActions, setAutonomousActions] = useState<AutonomousAction[]>([]);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);

  // Analyze environmental conditions for issues
  const analyzeEnvironmentalConditions = useCallback((env: PlantContext['environment']) => {
    const issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      recommendation: string;
    }> = [];

    // Temperature analysis
    if (env.temperature < 18) {
      issues.push({
        type: 'temperature_low',
        severity: 'high',
        message: `Temperature too low: ${env.temperature}°C`,
        recommendation: 'Increase temperature to 22-26°C for optimal growth'
      });
    } else if (env.temperature > 30) {
      issues.push({
        type: 'temperature_high',
        severity: 'critical',
        message: `Temperature too high: ${env.temperature}°C`,
        recommendation: 'Reduce temperature immediately to prevent heat stress'
      });
    }

    // Humidity analysis
    if (env.humidity < 40) {
      issues.push({
        type: 'humidity_low',
        severity: 'medium',
        message: `Humidity too low: ${env.humidity}%`,
        recommendation: 'Increase humidity to 50-60% for optimal transpiration'
      });
    } else if (env.humidity > 70) {
      issues.push({
        type: 'humidity_high',
        severity: 'high',
        message: `Humidity too high: ${env.humidity}%`,
        recommendation: 'Reduce humidity to prevent mold and mildew'
      });
    }

    // pH analysis
    if (env.ph < 5.5) {
      issues.push({
        type: 'ph_low',
        severity: 'high',
        message: `pH too low: ${env.ph}`,
        recommendation: 'Adjust pH to 6.0-6.5 for optimal nutrient uptake'
      });
    } else if (env.ph > 7.0) {
      issues.push({
        type: 'ph_high',
        severity: 'medium',
        message: `pH too high: ${env.ph}`,
        recommendation: 'Lower pH to 6.0-6.5 range'
      });
    }

    // EC analysis
    if (env.ec > 2.0) {
      issues.push({
        type: 'ec_high',
        severity: 'high',
        message: `EC too high: ${env.ec}`,
        recommendation: 'Reduce nutrient concentration to prevent burn'
      });
    } else if (env.ec < 0.8 && plantContext.growthStage !== 'seedling') {
      issues.push({
        type: 'ec_low',
        severity: 'medium',
        message: `EC too low: ${env.ec}`,
        recommendation: 'Increase nutrient concentration for healthy growth'
      });
    }

    return issues;
  }, [plantContext.growthStage]);

  // Generate proactive alerts
  const generateProactiveAlerts = useCallback((issues: Array<any>) => {
    const alertMessage: Message = {
      id: Date.now().toString(),
      type: 'agentic',
      content: `🤖 **Autonomous Analysis Complete**\n\nDetected ${issues.length} issue(s):\n\n${issues.map(issue =>
        `**${issue.severity.toUpperCase()}**: ${issue.message}\n*Recommendation*: ${issue.recommendation}`
      ).join('\n\n')}\n\nWould you like me to create an action plan to address these issues?`,
      timestamp: new Date(),
      messageType: 'proactive',
      urgency: issues.some(i => i.severity === 'critical') ? 'critical' :
        issues.some(i => i.severity === 'high') ? 'high' : 'medium',
      confidence: 0.92
    };

    setProactiveAlerts(prev => [...prev, alertMessage]);

    return alertMessage;
  }, []);

  // Detect patterns in environmental data
  const detectPatterns = useCallback(() => {
    if (environmentalHistory.length < 5) return null;

    const recent = environmentalHistory.slice(-5);

    // Detect temperature trends
    const tempTrend = recent.map(d => d.temperature);
    const isTempRising = tempTrend.every((temp, i) => i === 0 || temp >= tempTrend[i - 1]);
    const isTempFalling = tempTrend.every((temp, i) => i === 0 || temp <= tempTrend[i - 1]);

    if (isTempRising && tempTrend[tempTrend.length - 1] > 28) {
      return generatePatternAlert('temperature_rising', 'Temperature trending upward', 'Consider cooling measures');
    } else if (isTempFalling && tempTrend[tempTrend.length - 1] < 20) {
      return generatePatternAlert('temperature_falling', 'Temperature trending downward', 'Consider heating measures');
    }

    // Detect humidity trends
    const humidityTrend = recent.map(d => d.humidity);
    const isHumidityRising = humidityTrend.every((hum, i) => i === 0 || hum >= humidityTrend[i - 1]);

    if (isHumidityRising && humidityTrend[humidityTrend.length - 1] > 65) {
      return generatePatternAlert('humidity_rising', 'Humidity increasing steadily', 'Increase ventilation to prevent mold');
    }

    return null;
  }, [environmentalHistory]);

  // Generate pattern-based alerts
  const generatePatternAlert = useCallback((type: string, title: string, recommendation: string) => {
    const patternAnalysis: PatternAnalysis = {
      id: Date.now().toString(),
      type: 'trend',
      title,
      description: `Detected ${type.replace('_', ' ')} pattern in recent data`,
      confidence: 0.85,
      timeframe: 'Last 2.5 minutes',
      implications: ['May affect plant health if trend continues'],
      recommendations: [recommendation],
      data: { trend: type }
    };

    const alertMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'agentic',
      content: `📊 **Pattern Detection**\n\n${title}\n\n${recommendation}\n\nConfidence: ${Math.round(patternAnalysis.confidence * 100)}%`,
      timestamp: new Date(),
      messageType: 'prediction',
      urgency: 'medium',
      confidence: patternAnalysis.confidence,
      patternAnalysis
    };

    return alertMessage;
  }, []);

  // Perform autonomous analysis
  const performAutonomousAnalysis = useCallback(() => {
    const currentEnv = plantContext.environment;
    const issues = analyzeEnvironmentalConditions(currentEnv);

    if (issues.length > 0) {
      const alert = generateProactiveAlerts(issues);
      return { issues, alert };
    }

    // Check for patterns
    const patternAlert = detectPatterns();
    if (patternAlert) {
      return { issues: [], alert: patternAlert };
    }

    // Update last analysis time
    setLastAnalysis(new Date());

    return { issues: [], alert: null };
  }, [plantContext, analyzeEnvironmentalConditions, generateProactiveAlerts, detectPatterns]);

  return {
    proactiveAlerts,
    setProactiveAlerts,
    autonomousActions,
    setAutonomousActions,
    lastAnalysis,
    setLastAnalysis,
    analyzeEnvironmentalConditions,
    generateProactiveAlerts,
    detectPatterns,
    performAutonomousAnalysis
  };
};
