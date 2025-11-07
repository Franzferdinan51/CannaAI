'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Bot,
  Send,
  Image,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface ChatResponse {
  content: string;
  model: string;
  usage?: any;
  timestamp: string;
  provider: string;
}

export function LMStudioTest() {
  const [prompt, setPrompt] = useState('Analyze this plant image for health issues and provide treatment recommendations.');
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');

  const testModels = async () => {
    try {
      const response = await fetch('/api/lmstudio/models');
      const data = await response.json();

      if (data.status === 'success' && data.models.length > 0) {
        console.log('Found models:', data.models);
      } else {
        console.log('No models found or error:', data);
      }
    } catch (error) {
      console.error('Error testing models:', error);
    }
  };

  const testLMStudioConnection = async () => {
    try {
      setIsLoading(true);
      setError('');
      setResponse(null);

      const payload = {
        prompt,
        systemPrompt: "You are an expert plant health analyzer and cultivation specialist. Provide detailed analysis and actionable advice.",
        temperature: 0.7,
        maxTokens: 512,
        modelId: selectedModel || undefined
      };

      const response = await fetch('/api/lmstudio/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result: ChatResponse = await response.json();
      setResponse(result);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    testModels();
  }, []);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          LM Studio Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Test Prompt
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter a test prompt..."
                className="min-h-[100px]"
              />
            </div>

            <Button
              onClick={testLMStudioConnection}
              disabled={isLoading || !prompt.trim()}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Test LM Studio
            </Button>

            {error && (
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-4">
            {response && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Response received</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {response.model}
                    </Badge>
                    <Badge variant="outline">
                      {response.provider}
                    </Badge>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">
                      {response.content}
                    </p>
                  </div>

                  {response.usage && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Tokens used: {response.usage.total_tokens || 'N/A'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!response && !error && !isLoading && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Bot className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">
                  Enter a prompt and click test to verify LM Studio integration
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Debugging Info:</h4>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p>• Make sure LM Studio is running on localhost:1234</p>
            <p>• Load some GGUF models in LM Studio</p>
            <p>• Check browser console for detailed logs</p>
            <p>• Verify API endpoints: /api/lmstudio/models and /api/lmstudio/chat</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}