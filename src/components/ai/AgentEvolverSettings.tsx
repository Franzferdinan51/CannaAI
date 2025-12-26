'use client';

import React, { useState, useEffect } from 'react';
import { enhancedAgentEvolver } from '@/lib/agent-evolver-enhanced';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  Bot,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Brain,
  Settings,
  Settings2,
  Zap,
  Target,
  TrendingUp,
  Shield,
  FileText,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Play,
  Pause,
  RotateCcw,
  BarChart3,
  Activity,
  Lightbulb,
  Cpu,
  Database,
  Clock,
  AlertTriangle
} from 'lucide-react';

// Agent Evolver Settings Interface
interface AgentEvolverSettings {
  enabled: boolean;
  evolutionLevel: 'basic' | 'advanced' | 'expert';
  learningRate: number;
  performanceThreshold: number;
  autoOptimization: boolean;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  customPrompts: CustomPrompt[];
  performanceMetrics: PerformanceMetrics;
  evolutionHistory: EvolutionRecord[];
  integrationSettings: IntegrationSettings;
}

interface CustomPrompt {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: 'analysis' | 'automation' | 'troubleshooting' | 'optimization' | 'custom';
  enabled: boolean;
  createdAt: string;
  lastUsed: string;
  successRate: number;
}

interface PerformanceMetrics {
  accuracy: number;
  responseTime: number;
  resourceUsage: number;
  evolutionProgress: number;
  totalOptimizations: number;
  successfulEvolutions: number;
  failedEvolutions: number;
  averageImprovement: number;
}

interface EvolutionRecord {
  id: string;
  timestamp: string;
  type: 'optimization' | 'prompt_evolution' | 'parameter_tuning' | 'architecture_change';
  description: string;
  success: boolean;
  improvement: number;
  metadata: any;
}

interface IntegrationSettings {
  aiProviderIntegration: boolean;
  automationSync: boolean;
  dataAnalysisIntegration: boolean;
  realTimeOptimization: boolean;
  crossAgentLearning: boolean;
}

const defaultCustomPrompts: CustomPrompt[] = [
  {
    id: '1',
    name: 'Advanced Plant Analysis',
    description: 'Deep analysis of plant health with strain-specific considerations',
    prompt: 'Analyze this cannabis plant with consideration for genetics, environmental factors, and growth stage. Provide detailed recommendations...',
    category: 'analysis',
    enabled: true,
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
    successRate: 92
  },
  {
    id: '2',
    name: 'Smart Automation Rules',
    description: 'Intelligent automation decision making based on sensor data patterns',
    prompt: 'Evaluate sensor data trends and recommend optimal automation adjustments for cannabis cultivation...',
    category: 'automation',
    enabled: true,
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
    successRate: 88
  }
];

export function AgentEvolverSettings() {
  const [settings, setSettings] = useState<AgentEvolverSettings>({
    enabled: false,
    evolutionLevel: 'basic',
    learningRate: 0.1,
    performanceThreshold: 0.8,
    autoOptimization: false,
    riskTolerance: 'moderate',
    customPrompts: defaultCustomPrompts,
    performanceMetrics: {
      accuracy: 0.85,
      responseTime: 2.3,
      resourceUsage: 0.45,
      evolutionProgress: 0.0,
      totalOptimizations: 0,
      successfulEvolutions: 0,
      failedEvolutions: 0,
      averageImprovement: 0.0
    },
    evolutionHistory: [],
    integrationSettings: {
      aiProviderIntegration: true,
      automationSync: false,
      dataAnalysisIntegration: true,
      realTimeOptimization: false,
      crossAgentLearning: false
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEvolverActive, setIsEvolverActive] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
  const [promptFormData, setPromptFormData] = useState<Partial<CustomPrompt>>({
    name: '',
    description: '',
    prompt: '',
    category: 'custom',
    enabled: true
  });

  // Enhanced AI functionality state
  const [testTemplate, setTestTemplate] = useState('');
  const [isTestingEvolution, setIsTestingEvolution] = useState(false);
  const [testResult, setTestResult] = useState<{
    templateName: string;
    evolvedPrompt: string;
  } | null>(null);

  useEffect(() => {
    loadAgentEvolverSettings();
  }, []);

  const loadAgentEvolverSettings = async () => {
    try {
      const response = await fetch('/api/settings?action=get_agent_evolver');
      const data = await response.json();

      if (data.success && data.agentEvolverSettings) {
        setSettings(data.agentEvolverSettings);
        setIsEvolverActive(data.agentEvolverSettings.enabled);
      }
    } catch (error) {
      console.error('Error loading Agent Evolver settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (updates: Partial<AgentEvolverSettings>) => {
    setIsSaving(true);
    setSuccess('');
    setError('');

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_agent_evolver',
          settings: updates
        })
      });

      const data = await response.json();
      if (data.success) {
        setSettings(prev => ({ ...prev, ...updates }));
        setSuccess('Agent Evolver settings saved successfully');
      } else {
        setError(data.error || 'Failed to save settings');
      }
    } catch (error) {
      setError('Failed to connect to server');
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEvolver = async () => {
    const newState = !isEvolverActive;
    setIsEvolverActive(newState);
    await saveSettings({ enabled: newState });
  };

  const handleEvolutionLevelChange = async (level: 'basic' | 'advanced' | 'expert') => {
    await saveSettings({ evolutionLevel: level });
  };

  const handleLearningRateChange = async (value: number[]) => {
    await saveSettings({ learningRate: value[0] });
  };

  const handleRiskToleranceChange = async (tolerance: 'conservative' | 'moderate' | 'aggressive') => {
    await saveSettings({ riskTolerance: tolerance });
  };

  const handleIntegrationChange = async (key: keyof IntegrationSettings, value: boolean) => {
    const updatedIntegrations = {
      ...settings.integrationSettings,
      [key]: value
    };
    await saveSettings({ integrationSettings: updatedIntegrations });
  };

  const saveCustomPrompt = async () => {
    if (!promptFormData.name || !promptFormData.prompt) {
      setError('Prompt name and content are required');
      return;
    }

    try {
      const newPrompt: CustomPrompt = {
        id: editingPrompt?.id || Date.now().toString(),
        name: promptFormData.name,
        description: promptFormData.description || '',
        prompt: promptFormData.prompt,
        category: promptFormData.category || 'custom',
        enabled: promptFormData.enabled ?? true,
        createdAt: editingPrompt?.createdAt || new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        successRate: editingPrompt?.successRate || 0
      };

      const updatedPrompts = editingPrompt
        ? settings.customPrompts.map(p => p.id === editingPrompt.id ? newPrompt : p)
        : [...settings.customPrompts, newPrompt];

      await saveSettings({ customPrompts: updatedPrompts });
      setShowPromptDialog(false);
      setEditingPrompt(null);
      setPromptFormData({ name: '', description: '', prompt: '', category: 'custom', enabled: true });
      setSuccess('Custom prompt saved successfully');
    } catch (error) {
      setError('Failed to save custom prompt');
    }
  };

  const deleteCustomPrompt = async (promptId: string) => {
    const updatedPrompts = settings.customPrompts.filter(p => p.id !== promptId);
    await saveSettings({ customPrompts: updatedPrompts });
    setSuccess('Custom prompt deleted successfully');
  };

  const toggleCustomPrompt = async (promptId: string, enabled: boolean) => {
    const updatedPrompts = settings.customPrompts.map(p =>
      p.id === promptId ? { ...p, enabled } : p
    );
    await saveSettings({ customPrompts: updatedPrompts });
  };

  const getEvolutionLevelColor = (level: string) => {
    switch (level) {
      case 'basic': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'advanced': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'expert': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getRiskToleranceColor = (tolerance: string) => {
    switch (tolerance) {
      case 'conservative': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'aggressive': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'analysis': return <Brain className="h-3 w-3" />;
      case 'automation': return <Zap className="h-3 w-3" />;
      case 'troubleshooting': return <AlertTriangle className="h-3 w-3" />;
      case 'optimization': return <TrendingUp className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  // Test Enhanced Evolution functionality
  const testEnhancedEvolution = async () => {
    if (!testTemplate) return;

    setIsTestingEvolution(true);
    setTestResult(null);

    try {
      // Update evolution context with current plant data
      enhancedAgentEvolver.updateEvolutionContext({
        plantData: {
          strain: 'Blue Dream',
          symptoms: ['Yellowing leaves', 'Slow growth'],
          environmentalData: {
            temperature: 75,
            humidity: 60,
            ph: 6.2,
            ec: 1.4,
            lightIntensity: 800,
            co2: 1200
          },
          growthStage: 'vegetative'
        },
        userPreferences: {
          riskTolerance: settings.riskTolerance,
          focusAreas: ['yield_optimization', 'plant_health'],
          preferredResponseStyle: 'detailed'
        }
      });

      // Get evolved prompt
      const evolvedPrompt = enhancedAgentEvolver.getEvolvedPrompt(testTemplate, {
        strain: 'Blue Dream',
        symptoms: 'Yellowing leaves, slow growth',
        temperature: 75,
        humidity: 60,
        ph: 6.2,
        ec: 1.4,
        lightIntensity: 800,
        co2: 1200,
        growthStage: 'vegetative'
      });

      // Get template name
      const template = enhancedAgentEvolver.getPromptTemplates().find(t => t.id === testTemplate);

      setTestResult({
        templateName: template?.name || 'Unknown',
        evolvedPrompt: evolvedPrompt
      });

      setSuccess('Enhanced evolution test completed successfully');
    } catch (error) {
      console.error('Enhanced evolution test failed:', error);
      setError('Enhanced evolution test failed');
    } finally {
      setIsTestingEvolution(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Agent Evolver Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading Agent Evolver settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-800">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-purple-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="h-6 w-6 mr-2 text-purple-400" />
              Agent Evolver Settings
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={isEvolverActive ? "default" : "secondary"}
                className={`${isEvolverActive ? 'bg-green-600' : 'bg-gray-600'}`}
              >
                {isEvolverActive ? 'Active' : 'Inactive'}
              </Badge>
              <Button
                onClick={toggleEvolver}
                variant={isEvolverActive ? "destructive" : "default"}
                size="sm"
                disabled={isSaving}
              >
                {isEvolverActive ? (
                  <><Pause className="h-4 w-4 mr-2" />Disable</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" />Enable</>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                {success}
              </AlertDescription>
            </Alert>
          )}
          <p className="text-purple-200">
            Configure the AI Agent Evolver for intelligent optimization and learning capabilities.
            The evolver continuously improves performance based on usage patterns and feedback.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="configuration" className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-purple-900/20 border-purple-800">
          <TabsTrigger value="configuration" className="data-[state=active]:bg-purple-800 text-purple-200">
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="prompts" className="data-[state=active]:bg-purple-800 text-purple-200">
            <FileText className="h-4 w-4 mr-2" />
            Custom Prompts
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-purple-800 text-purple-200">
            <BarChart3 className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="integration" className="data-[state=active]:bg-purple-800 text-purple-200">
            <Zap className="h-4 w-4 mr-2" />
            Integration
          </TabsTrigger>
          <TabsTrigger value="advanced" className="data-[state=active]:bg-purple-800 text-purple-200">
            <Brain className="h-4 w-4 mr-2" />
            Advanced AI
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-purple-800 text-purple-200">
            <Clock className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-6">
          <Card className="bg-purple-900/30 border-purple-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-purple-300 flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Evolution Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Evolution Level */}
              <div className="space-y-2">
                <Label className="text-purple-300">Evolution Level</Label>
                <Select value={settings.evolutionLevel} onValueChange={handleEvolutionLevelChange}>
                  <SelectTrigger className="bg-purple-800 border-purple-700 text-purple-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">
                      <div className="flex items-center gap-2">
                        <Badge className={getEvolutionLevelColor('basic')}>Basic</Badge>
                        <span>Safe, conservative improvements</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="advanced">
                      <div className="flex items-center gap-2">
                        <Badge className={getEvolutionLevelColor('advanced')}>Advanced</Badge>
                        <span>Balanced optimization strategies</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="expert">
                      <div className="flex items-center gap-2">
                        <Badge className={getEvolutionLevelColor('expert')}>Expert</Badge>
                        <span>Aggressive learning and adaptation</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Learning Rate */}
              <div className="space-y-2">
                <Label className="text-purple-300">Learning Rate: {(settings.learningRate * 100).toFixed(0)}%</Label>
                <Slider
                  value={[settings.learningRate]}
                  onValueChange={handleLearningRateChange}
                  max={1.0}
                  min={0.01}
                  step={0.01}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-purple-400">
                  <span>Slow & Safe</span>
                  <span>Fast & Aggressive</span>
                </div>
              </div>

              {/* Performance Threshold */}
              <div className="space-y-2">
                <Label className="text-purple-300">Performance Threshold: {(settings.performanceThreshold * 100).toFixed(0)}%</Label>
                <Slider
                  value={[settings.performanceThreshold]}
                  onValueChange={(value) => saveSettings({ performanceThreshold: value[0] })}
                  max={1.0}
                  min={0.1}
                  step={0.05}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-purple-400">
                  <span>Lenient</span>
                  <span>Strict</span>
                </div>
              </div>

              {/* Risk Tolerance */}
              <div className="space-y-2">
                <Label className="text-purple-300">Risk Tolerance</Label>
                <Select value={settings.riskTolerance} onValueChange={handleRiskToleranceChange}>
                  <SelectTrigger className="bg-purple-800 border-purple-700 text-purple-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">
                      <div className="flex items-center gap-2">
                        <Badge className={getRiskToleranceColor('conservative')}>Conservative</Badge>
                        <span>Minimal risk, slow improvement</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="moderate">
                      <div className="flex items-center gap-2">
                        <Badge className={getRiskToleranceColor('moderate')}>Moderate</Badge>
                        <span>Balanced approach</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="aggressive">
                      <div className="flex items-center gap-2">
                        <Badge className={getRiskToleranceColor('aggressive')}>Aggressive</Badge>
                        <span>Maximum optimization potential</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Auto-Optimization */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-purple-300">Auto-Optimization</Label>
                  <p className="text-sm text-purple-400">Automatically optimize performance based on usage patterns</p>
                </div>
                <Switch
                  checked={settings.autoOptimization}
                  onCheckedChange={(checked) => saveSettings({ autoOptimization: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Prompts Tab */}
        <TabsContent value="prompts" className="space-y-6">
          <Card className="bg-purple-900/30 border-purple-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-purple-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Custom Prompts
                </div>
                <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => {
                      setEditingPrompt(null);
                      setPromptFormData({ name: '', description: '', prompt: '', category: 'custom', enabled: true });
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Prompt
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-purple-950 border-purple-800">
                    <DialogHeader>
                      <DialogTitle className="text-purple-200">
                        {editingPrompt ? 'Edit Custom Prompt' : 'Add Custom Prompt'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-purple-300">Prompt Name</Label>
                        <Input
                          value={promptFormData.name}
                          onChange={(e) => setPromptFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter prompt name"
                          className="bg-purple-800 border-purple-700 text-purple-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-purple-300">Description</Label>
                        <Input
                          value={promptFormData.description}
                          onChange={(e) => setPromptFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Brief description of the prompt's purpose"
                          className="bg-purple-800 border-purple-700 text-purple-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-purple-300">Category</Label>
                        <Select
                          value={promptFormData.category}
                          onValueChange={(value: any) => setPromptFormData(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger className="bg-purple-800 border-purple-700 text-purple-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="analysis">Analysis</SelectItem>
                            <SelectItem value="automation">Automation</SelectItem>
                            <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
                            <SelectItem value="optimization">Optimization</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-purple-300">Prompt Content</Label>
                        <Textarea
                          value={promptFormData.prompt}
                          onChange={(e) => setPromptFormData(prev => ({ ...prev, prompt: e.target.value }))}
                          placeholder="Enter the detailed prompt content..."
                          rows={8}
                          className="bg-purple-800 border-purple-700 text-purple-200"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-purple-300">Enable Prompt</Label>
                          <p className="text-sm text-purple-400">Whether this prompt is available for use</p>
                        </div>
                        <Switch
                          checked={promptFormData.enabled}
                          onCheckedChange={(checked) => setPromptFormData(prev => ({ ...prev, enabled: checked }))}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowPromptDialog(false)}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button onClick={saveCustomPrompt}>
                          <Save className="h-4 w-4 mr-2" />
                          {editingPrompt ? 'Update' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {settings.customPrompts.map((prompt) => (
                  <div key={prompt.id} className="border border-purple-700 rounded-lg p-4 bg-purple-900/20">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getCategoryIcon(prompt.category)}
                          <h4 className="font-medium text-purple-200">{prompt.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {prompt.category}
                          </Badge>
                          {prompt.enabled && (
                            <Badge className="bg-green-600 text-xs">Active</Badge>
                          )}
                        </div>
                        <p className="text-sm text-purple-400 mb-2">{prompt.description}</p>
                        <div className="flex items-center gap-4 text-xs text-purple-500">
                          <span>Success Rate: {prompt.successRate}%</span>
                          <span>Last Used: {new Date(prompt.lastUsed).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={prompt.enabled}
                          onCheckedChange={(checked) => toggleCustomPrompt(prompt.id, checked)}
                          size="sm"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingPrompt(prompt);
                            setPromptFormData(prompt);
                            setShowPromptDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCustomPrompt(prompt.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {settings.customPrompts.length === 0 && (
                  <div className="text-center py-8 text-purple-400">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No custom prompts created yet</p>
                    <p className="text-sm">Click "Add Prompt" to create your first custom prompt</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-purple-900/30 border-purple-800">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-purple-300 flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Current Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-300">Accuracy</span>
                    <span className="text-purple-200">{(settings.performanceMetrics.accuracy * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={settings.performanceMetrics.accuracy * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-300">Response Time</span>
                    <span className="text-purple-200">{settings.performanceMetrics.responseTime}s</span>
                  </div>
                  <Progress value={(1 - Math.min(settings.performanceMetrics.responseTime / 5, 1)) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-300">Resource Usage</span>
                    <span className="text-purple-200">{(settings.performanceMetrics.resourceUsage * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={settings.performanceMetrics.resourceUsage * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-300">Evolution Progress</span>
                    <span className="text-purple-200">{(settings.performanceMetrics.evolutionProgress * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={settings.performanceMetrics.evolutionProgress * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-900/30 border-purple-800">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-purple-300 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Evolution Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{settings.performanceMetrics.successfulEvolutions}</div>
                    <div className="text-sm text-purple-300">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{settings.performanceMetrics.failedEvolutions}</div>
                    <div className="text-sm text-purple-300">Failed</div>
                  </div>
                </div>
                <div className="space-y-2 pt-4 border-t border-purple-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-300">Total Optimizations</span>
                    <span className="text-purple-200">{settings.performanceMetrics.totalOptimizations}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-300">Average Improvement</span>
                    <span className="text-purple-200">{(settings.performanceMetrics.averageImprovement * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-300">Success Rate</span>
                    <span className="text-purple-200">
                      {settings.performanceMetrics.totalOptimizations > 0
                        ? ((settings.performanceMetrics.successfulEvolutions / settings.performanceMetrics.totalOptimizations) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Integration Tab */}
        <TabsContent value="integration" className="space-y-6">
          <Card className="bg-purple-900/30 border-purple-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-purple-300 flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Integration Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 border border-purple-700 rounded-lg bg-purple-900/20">
                  <div className="space-y-0.5">
                    <Label className="text-purple-300">AI Provider Integration</Label>
                    <p className="text-sm text-purple-400">Connect with AI providers for enhanced capabilities</p>
                  </div>
                  <Switch
                    checked={settings.integrationSettings.aiProviderIntegration}
                    onCheckedChange={(checked) => handleIntegrationChange('aiProviderIntegration', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border border-purple-700 rounded-lg bg-purple-900/20">
                  <div className="space-y-0.5">
                    <Label className="text-purple-300">Automation Sync</Label>
                    <p className="text-sm text-purple-400">Synchronize with automation systems for intelligent control</p>
                  </div>
                  <Switch
                    checked={settings.integrationSettings.automationSync}
                    onCheckedChange={(checked) => handleIntegrationChange('automationSync', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border border-purple-700 rounded-lg bg-purple-900/20">
                  <div className="space-y-0.5">
                    <Label className="text-purple-300">Data Analysis Integration</Label>
                    <p className="text-sm text-purple-400">Integrate with data analysis for pattern recognition</p>
                  </div>
                  <Switch
                    checked={settings.integrationSettings.dataAnalysisIntegration}
                    onCheckedChange={(checked) => handleIntegrationChange('dataAnalysisIntegration', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border border-purple-700 rounded-lg bg-purple-900/20">
                  <div className="space-y-0.5">
                    <Label className="text-purple-300">Real-time Optimization</Label>
                    <p className="text-sm text-purple-400">Enable continuous real-time performance optimization</p>
                  </div>
                  <Switch
                    checked={settings.integrationSettings.realTimeOptimization}
                    onCheckedChange={(checked) => handleIntegrationChange('realTimeOptimization', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border border-purple-700 rounded-lg bg-purple-900/20">
                  <div className="space-y-0.5">
                    <Label className="text-purple-300">Cross-Agent Learning</Label>
                    <p className="text-sm text-purple-400">Share learned patterns between different AI agents</p>
                  </div>
                  <Switch
                    checked={settings.integrationSettings.crossAgentLearning}
                    onCheckedChange={(checked) => handleIntegrationChange('crossAgentLearning', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced AI Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <Card className="bg-purple-900/30 border-purple-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-purple-300 flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Enhanced AI Evolution Engine
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  Advanced AI Evolution provides cultivation-specific prompt templates and deep learning integration with your plant analysis system.
                </AlertDescription>
              </Alert>

              {/* Evolution Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-purple-800/50 border-purple-700">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-200">
                      {enhancedAgentEvolver.getEvolutionMetrics().totalEvolutions}
                    </div>
                    <div className="text-sm text-purple-400">Total Evolutions</div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-800/50 border-purple-700">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {enhancedAgentEvolver.getEvolutionMetrics().successRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-purple-400">Success Rate</div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-800/50 border-purple-700">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {enhancedAgentEvolver.getEvolutionMetrics().activeTemplates}
                    </div>
                    <div className="text-sm text-purple-400">Active Templates</div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-800/50 border-purple-700">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      {enhancedAgentEvolver.getEvolutionMetrics().contextDepth}
                    </div>
                    <div className="text-sm text-purple-400">Context Depth</div>
                  </CardContent>
                </Card>
              </div>

              {/* Prompt Templates */}
              <div>
                <Label className="text-purple-200 font-medium mb-3 block">
                  Cultivation-Specific Templates
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {enhancedAgentEvolver.getPromptTemplates().map((template) => (
                    <Card key={template.id} className="bg-purple-800/30 border-purple-700">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-purple-200">{template.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-purple-400 mb-2">
                          Target: {template.evolutionTarget}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {template.variables.slice(0, 3).map((variable) => (
                            <Badge key={variable} variant="secondary" className="text-xs">
                              {variable}
                            </Badge>
                          ))}
                          {template.variables.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.variables.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Test Evolution */}
              <div>
                <Label className="text-purple-200 font-medium mb-3 block">
                  Test Enhanced Evolution
                </Label>
                <div className="flex gap-2">
                  <Select value={testTemplate} onValueChange={setTestTemplate}>
                    <SelectTrigger className="bg-purple-800/50 border-purple-700 text-purple-200">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {enhancedAgentEvolver.getPromptTemplates().map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={testEnhancedEvolution}
                    disabled={!testTemplate || isTestingEvolution}
                    className="bg-purple-700 hover:bg-purple-600"
                  >
                    {isTestingEvolution ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Test Evolution
                  </Button>
                </div>
                {testResult && (
                  <Alert className="mt-3 bg-purple-800/30 border-purple-700">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="text-purple-200">
                        <strong>Template:</strong> {testResult.templateName}<br />
                        <strong>Evolved Prompt:</strong><br />
                        <code className="text-xs bg-purple-900/50 p-2 rounded block mt-1 whitespace-pre-wrap">
                          {testResult.evolvedPrompt}
                        </code>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="bg-purple-900/30 border-purple-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-purple-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Evolution History
                </div>
                <Button variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Clear History
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {settings.evolutionHistory.length === 0 ? (
                <div className="text-center py-8 text-purple-400">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No evolution history available</p>
                  <p className="text-sm">Enable Agent Evolver to start tracking evolution progress</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {settings.evolutionHistory.map((record) => (
                    <div key={record.id} className="border border-purple-700 rounded-lg p-4 bg-purple-900/20">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {record.success ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <X className="h-4 w-4 text-red-400" />
                            )}
                            <span className="font-medium text-purple-200">{record.description}</span>
                            <Badge variant="outline" className="text-xs">
                              {record.type}
                            </Badge>
                          </div>
                          <div className="text-sm text-purple-400">
                            {new Date(record.timestamp).toLocaleString()}
                          </div>
                          {record.success && record.improvement > 0 && (
                            <div className="text-sm text-green-400 mt-1">
                              Improvement: {(record.improvement * 100).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}