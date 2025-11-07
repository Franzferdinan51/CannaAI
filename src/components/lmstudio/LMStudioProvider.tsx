
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bot, CheckCircle, AlertCircle } from 'lucide-react';

interface LMStudioModel {
  id: string;
  name: string;
  size: string;
  capabilities: string[];
  provider: string;
}

interface LMStudioProviderProps {
  onModelSelect?: (model: LMStudioModel) => void;
  className?: string;
}

export function LMStudioProvider({ onModelSelect, className }: LMStudioProviderProps) {
  const [models, setModels] = useState<LMStudioModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isHealthy, setIsHealthy] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    checkLMStudioStatus();
    loadModels();
  }, []);

  const checkLMStudioStatus = async () => {
    try {
      const response = await fetch('/api/lmstudio');
      const data = await response.json();

      setIsHealthy(data.status === 'healthy');

      if (data.status === 'healthy' && data.models) {
        setModels(data.models.map((model: any) => ({
          id: model.id,
          name: model.id,
          size: formatFileSize(model.size || 0),
          capabilities: determineCapabilities(model.id),
          provider: 'lmstudio-local'
        })));
      }
    } catch (error) {
      setIsHealthy(false);
      setError('Failed to connect to LM Studio');
    } finally {
      setIsLoading(false);
    }
  };

  const loadModels = async () => {
    // This would load additional local models if needed
    // For now, we rely on the LM Studio API
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const determineCapabilities = (modelId: string) => {
    const capabilities = [];
    const id = modelId.toLowerCase();

    if (id.includes('vision') || id.includes('plant') || id.includes('image')) {
      capabilities.push('vision');
      capabilities.push('image-analysis');
    }

    if (id.includes('classifier') || id.includes('classification')) {
      capabilities.push('classification');
    }

    capabilities.push('text-generation');
    return capabilities;
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    const model = models.find(m => m.id === modelId);
    if (model && onModelSelect) {
      onModelSelect(model);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            LM Studio Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Connecting to LM Studio...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          LM Studio Integration
          {isHealthy ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isHealthy ? (
          <div className="text-center py-4">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 mb-2">
              LM Studio is not running
            </p>
            <p className="text-xs text-gray-500">
              Please start LM Studio to use local models
            </p>
          </div>
        ) : (
          <>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Model
              </label>
              <Select value={selectedModel} onValueChange={handleModelSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a model..." />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{model.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {model.size}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedModel && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Capabilities:</div>
                <div className="flex flex-wrap gap-1">
                  {models
                    .find(m => m.id === selectedModel)
                    ?.capabilities.map((capability) => (
                      <Badge key={capability} variant="secondary" className="text-xs">
                        {capability}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={checkLMStudioStatus}
                className="w-full"
              >
                Refresh Models
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default LMStudioProvider;
