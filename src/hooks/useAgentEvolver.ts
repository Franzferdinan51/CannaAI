/**
 * React hook for Agent Evolver functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { AgentEvolverSettings } from '@/components/ai/AgentEvolverSettings';
import { getAgentEvolverClient, initializeAgentEvolver } from '@/lib/agent-evolver';

interface AgentEvolverHook {
  isEvolverEnabled: boolean;
  isInitialized: boolean;
  metrics: any;
  updateSettings: (settings: Partial<AgentEvolverSettings>) => Promise<void>;
  triggerEvolution: (type: string, data: any) => Promise<void>;
  resetMetrics: () => void;
}

export function useAgentEvolver(): AgentEvolverHook {
  const [isEvolverEnabled, setIsEvolverEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);

  // Initialize Agent Evolver when settings are loaded
  useEffect(() => {
    const initialize = async () => {
      try {
        const response = await fetch('/api/settings?action=get_agent_evolver');
        const data = await response.json();

        if (data.success && data.agentEvolverSettings) {
          const settings = data.agentEvolverSettings;

          // Initialize the client if it's not already initialized
          if (!getAgentEvolverClient()) {
            initializeAgentEvolver({
              enabled: settings.enabled,
              evolutionLevel: settings.evolutionLevel,
              learningRate: settings.learningRate,
              performanceThreshold: settings.performanceThreshold,
              autoOptimization: settings.autoOptimization,
              riskTolerance: settings.riskTolerance,
              customPrompts: settings.customPrompts || [],
              integrationSettings: settings.integrationSettings
            });
          }

          setIsEvolverEnabled(settings.enabled);
          setMetrics(settings.performanceMetrics);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize Agent Evolver:', error);
      }
    };

    initialize();
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<AgentEvolverSettings>) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_agent_evolver',
          settings: newSettings
        })
      });

      const data = await response.json();

      if (data.success) {
        const evolverClient = getAgentEvolverClient();
        if (evolverClient) {
          evolverClient.updateConfig(data.agentEvolverSettings);
        }
        setIsEvolverEnabled(data.agentEvolverSettings.enabled);
        setMetrics(data.agentEvolverSettings.performanceMetrics);
      }
    } catch (error) {
      console.error('Failed to update Agent Evolver settings:', error);
    }
  }, []);

  const triggerEvolution = useCallback(async (type: string, data: any) => {
    try {
      const evolverClient = getAgentEvolverClient();
      if (!evolverClient) {
        console.warn('Agent Evolver client not initialized');
        return;
      }

      // Record the evolution attempt
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_evolution_record',
          settings: {
            record: {
              type: type,
              description: `Evolution triggered: ${type}`,
              success: true,
              improvement: 0.02, // Default improvement
              metadata: data
            }
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        // Update metrics locally
        setMetrics(prev => ({
          ...prev,
          totalOptimizations: prev.totalOptimizations + 1,
          successfulEvolutions: prev.successfulEvolutions + 1,
          evolutionProgress: Math.min(prev.evolutionProgress + 0.01, 1.0)
        }));
      }
    } catch (error) {
      console.error('Failed to trigger evolution:', error);
    }
  }, [getAgentEvolverClient]));

  const resetMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear_evolution_history'
        })
      });

      const data = await response.json();
      if (data.success) {
        setMetrics({
          accuracy: 0.85,
          responseTime: 2.3,
          resourceUsage: 0.45,
          evolutionProgress: 0.0,
          totalOptimizations: 0,
          successfulEvolutions: 0,
          failedEvolutions: 0,
          averageImprovement: 0.0
        });
      }
    } catch (error) {
      console.error('Failed to reset metrics:', error);
    }
  }, []);

  return {
    isEvolverEnabled,
    isInitialized,
    metrics,
    updateSettings,
    triggerEvolution,
    resetMetrics
  };
}