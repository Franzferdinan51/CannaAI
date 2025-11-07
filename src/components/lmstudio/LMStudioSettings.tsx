'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Bot,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Brain,
  Sprout,
  HardDrive,
  Clock,
  User,
  Zap
} from 'lucide-react';

interface LMStudioModel {
  id: string;
  name: string;
  filename: string;
  author: string;
  sizeFormatted: string;
  sizeGB: number;
  quantization: string;
  capabilities: string[];
  contextLength: number;
  modified: string;
  filepath: string;
  metadata: any;
}

interface LMStudioResponse {
  status: string;
  lmStudioRunning: boolean;
  models: LMStudioModel[];
  summary: {
    total: number;
    vision: number;
    textOnly: number;
    plantAnalysis: number;
  };
  timestamp: string;
}

export function LMStudioSettings() {
  const [models, setModels] = useState<LMStudioModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [lmStudioRunning, setLmStudioRunning] = useState(false);
  const [summary, setSummary] = useState<any>({});
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/lmstudio/models');
      const data: LMStudioResponse = await response.json();

      if (data.status === 'success') {
        setModels(data.models);
        setLmStudioRunning(data.lmStudioRunning);
        setSummary(data.summary);
      } else {
        setError(data.error || 'Failed to load models');
      }
    } catch (error) {
      setError('Failed to connect to LM Studio scanner');
      console.error('Error loading models:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadModels();
    setRefreshing(false);
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    // Here you would typically save the selected model to your app state
    console.log('Selected model:', modelId);
  };

  const getCapabilityIcon = (capability: string) => {
    switch (capability) {
      case 'vision':
      case 'image-analysis':
        return <Eye className="h-3 w-3" />;
      case 'plant-analysis':
      case 'classification':
        return <Sprout className="h-3 w-3" />;
      case 'text-generation':
        return <Brain className="h-3 w-3" />;
      case 'code-generation':
        return <Zap className="h-3 w-3" />;
      default:
        return <Bot className="h-3 w-3" />;
    }
  };

  const getCapabilityColor = (capability: string) => {
    switch (capability) {
      case 'vision':
      case 'image-analysis':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'plant-analysis':
      case 'classification':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'text-generation':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'code-generation':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            LM Studio Models
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span>Scanning for LM Studio models...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              LM Studio Models
              {lmStudioRunning ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!lmStudioRunning && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                LM Studio is not currently running. Start LM Studio to use these models for inference.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {summary.total || 0}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Total Models</div>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {summary.vision || 0}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">Vision Models</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {summary.plantAnalysis || 0}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">Plant Analysis</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {summary.textOnly || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Text Only</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Models List */}
      {models.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Available Models ({models.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {models.map((model) => (
                  <div
                    key={model.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedModel === model.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                    onClick={() => handleSelectModel(model.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg truncate">{model.name}</h3>
                          {selectedModel === model.id && (
                            <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{model.author}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            <span>{model.sizeFormatted}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{(model.contextLength / 1000).toFixed(1)}k context</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs">
                              {model.quantization}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {model.capabilities.map((capability) => (
                            <Badge
                              key={capability}
                              variant="secondary"
                              className={`text-xs flex items-center gap-1 ${getCapabilityColor(capability)}`}
                            >
                              {getCapabilityIcon(capability)}
                              {capability.replace('-', ' ')}
                            </Badge>
                          ))}
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {model.filename}
                        </div>
                      </div>
                    </div>

                    {selectedModel === model.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-green-600 dark:text-green-400">
                            ✓ Selected for use in CannaAI
                          </div>
                          <Button size="sm" variant="outline">
                            Configure Settings
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No LM Studio Models Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Make sure LM Studio is installed and you have downloaded some GGUF models.
            </p>
            <div className="space-y-2 text-sm text-left max-w-md mx-auto">
              <p className="font-medium">Common LM Studio paths:</p>
              <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Windows: %LOCALAPPDATA%/LM-Studio/models</li>
                <li>• macOS: ~/Library/Application Support/LM-Studio/models</li>
                <li>• Linux: ~/.local/share/LM-Studio/models</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}