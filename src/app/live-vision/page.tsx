'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LiveCamera from '@/components/live-camera';
import {
  Camera,
  Activity,
  AlertTriangle,
  TrendingUp,
  Leaf,
  Droplets,
  Thermometer,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Monitor,
  Webcam
} from 'lucide-react';

interface AnalysisResult {
  timestamp: string;
  healthScore: number;
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    description: string;
    confidence: number;
  }>;
  recommendations: string[];
  captureInfo: {
    device: {
      id: string;
      label: string;
      mode: string;
      type: string;
    };
    resolution: { width: number; height: number };
    captureTime: string;
    processingTime: number;
  };
}

export default function LiveVisionDashboard() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const [autoAnalysis, setAutoAnalysis] = useState(false);
  const [analysisInterval, setAnalysisInterval] = useState(60); // seconds
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [selectedPlant, setSelectedPlant] = useState({
    strain: '',
    growthStage: 'vegetative',
    medium: 'soil'
  });

  // Handle image capture and analysis
  const handleImageCapture = useCallback(async (imageData: string, deviceInfo: any) => {
    setIsAnalyzing(true);
    setConnectionStatus('connected');

    try {
      const response = await fetch('/api/live-vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData,
          deviceInfo,
          plantContext: {
            strain: selectedPlant.strain,
            growthStage: selectedPlant.growthStage,
            medium: selectedPlant.medium,
          },
          analysisOptions: {
            focusArea: deviceInfo.mode === 'microscope' ? 'leaves' : 'general',
            urgencyLevel: 'medium',
            enableChangeDetection: true,
            enableHealthScore: true,
            enableRecommendations: true
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        const analysis: AnalysisResult = {
          timestamp: result.timestamp,
          healthScore: result.analysis.healthScore || 0.85,
          issues: result.analysis.issues || [],
          recommendations: result.analysis.recommendations || [],
          captureInfo: result.analysis.captureInfo
        };

        setCurrentAnalysis(analysis);
        setAnalysisHistory(prev => [analysis, ...prev.slice(0, 9)]); // Keep last 10
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setConnectionStatus('error');
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedPlant]);

  // Get health score color
  const getHealthScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    if (score >= 0.4) return 'text-orange-400';
    return 'text-red-400';
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'medium': return 'bg-yellow-600 text-white';
      case 'low': return 'bg-blue-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <Eye className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-100">Live Plant Vision</h1>
                <p className="text-slate-400">Real-time plant health monitoring with AI analysis</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge
                variant="outline"
                className={`${
                  connectionStatus === 'connected' ? 'border-green-600 text-green-400' :
                  connectionStatus === 'error' ? 'border-red-600 text-red-400' :
                  'border-gray-600 text-gray-400'
                }`}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  connectionStatus === 'connected' ? 'bg-green-400' :
                  connectionStatus === 'error' ? 'bg-red-400' :
                  'bg-gray-400'
                }`} />
                {connectionStatus === 'connected' ? 'Connected' :
                 connectionStatus === 'error' ? 'Error' : 'Disconnected'}
              </Badge>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-slate-800/50 border-slate-600">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-slate-200">{analysisHistory.length}</div>
                <div className="text-sm text-slate-400">Total Analyses</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-600">
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${currentAnalysis ? getHealthScoreColor(currentAnalysis.healthScore) : 'text-slate-400'}`}>
                  {currentAnalysis ? Math.round(currentAnalysis.healthScore * 100) : '--'}%
                </div>
                <div className="text-sm text-slate-400">Current Health</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-600">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {autoAnalysis ? `${analysisInterval}s` : 'Manual'}
                </div>
                <div className="text-sm text-slate-400">Analysis Mode</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-600">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {currentAnalysis?.captureInfo.device.mode === 'microscope' ? 'Microscope' : 'Webcam'}
                </div>
                <div className="text-sm text-slate-400">Active Camera</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Camera and Controls */}
          <div className="space-y-6">
            {/* Live Camera Component */}
            <LiveCamera
              onImageCapture={handleImageCapture}
              autoAnalyze={autoAnalysis}
              analyzeInterval={analysisInterval}
            />

            {/* Plant Context Settings */}
            <Card className="bg-slate-800/50 border-slate-600">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-slate-200">
                  <Leaf className="h-5 w-5 mr-2" />
                  Plant Context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Strain (Optional)
                    </label>
                    <input
                      type="text"
                      value={selectedPlant.strain}
                      onChange={(e) => setSelectedPlant(prev => ({ ...prev, strain: e.target.value }))}
                      placeholder="e.g., Blue Dream"
                      className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Growth Stage
                    </label>
                    <select
                      value={selectedPlant.growthStage}
                      onChange={(e) => setSelectedPlant(prev => ({ ...prev, growthStage: e.target.value }))}
                      className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-slate-200"
                    >
                      <option value="seedling">Seedling</option>
                      <option value="vegetative">Vegetative</option>
                      <option value="flowering">Flowering</option>
                      <option value="harvest">Harvest</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Growing Medium
                  </label>
                  <select
                    value={selectedPlant.medium}
                    onChange={(e) => setSelectedPlant(prev => ({ ...prev, medium: e.target.value }))}
                    className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-slate-200"
                  >
                    <option value="soil">Soil</option>
                    <option value="hydroponic">Hydroponic</option>
                    <option value="aeroponic">Aeroponic</option>
                    <option value="coco">Coco Coir</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Analysis Results */}
          <div className="space-y-6">
            {/* Current Analysis */}
            {currentAnalysis && (
              <Card className="bg-slate-800/50 border-slate-600">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-slate-200">
                    <span className="flex items-center">
                      <Activity className="h-5 w-5 mr-2" />
                      Latest Analysis
                    </span>
                    <Badge variant="outline" className="border-blue-600 text-blue-400">
                      {new Date(currentAnalysis.timestamp).toLocaleTimeString()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Health Score */}
                  <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                    <span className="text-slate-200 font-medium">Health Score</span>
                    <span className={`text-2xl font-bold ${getHealthScoreColor(currentAnalysis.healthScore)}`}>
                      {Math.round(currentAnalysis.healthScore * 100)}%
                    </span>
                  </div>

                  {/* Issues */}
                  {currentAnalysis.issues.length > 0 && (
                    <div>
                      <h4 className="text-slate-200 font-medium mb-2">Issues Detected</h4>
                      <div className="space-y-2">
                        {currentAnalysis.issues.map((issue, index) => (
                          <div key={index} className="flex items-start justify-between p-3 bg-slate-700/30 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <Badge className={getSeverityColor(issue.severity)}>
                                  {issue.severity}
                                </Badge>
                                <span className="text-sm text-slate-300">{issue.category}</span>
                              </div>
                              <p className="text-sm text-slate-400">{issue.description}</p>
                            </div>
                            <span className="text-xs text-slate-500 ml-2">
                              {Math.round(issue.confidence * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {currentAnalysis.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-slate-200 font-medium mb-2">Recommendations</h4>
                      <div className="space-y-1">
                        {currentAnalysis.recommendations.map((rec, index) => (
                          <div key={index} className="flex items-start space-x-2 p-2 bg-green-900/20 rounded border border-green-800/30">
                            <TrendingUp className="h-4 w-4 text-green-400 mt-0.5" />
                            <p className="text-sm text-slate-300">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Capture Info */}
                  <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">
                    <div className="flex justify-between">
                      <span>Device: {currentAnalysis.captureInfo.device.label}</span>
                      <span>Mode: {currentAnalysis.captureInfo.device.mode}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>Resolution: {currentAnalysis.captureInfo.resolution.width}x{currentAnalysis.captureInfo.resolution.height}</span>
                      <span>Processing: {currentAnalysis.captureInfo.processingTime}ms</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analysis History */}
            {analysisHistory.length > 0 && (
              <Card className="bg-slate-800/50 border-slate-600">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-slate-200">
                    <span className="flex items-center">
                      <RotateCcw className="h-5 w-5 mr-2" />
                      Analysis History
                    </span>
                    <Badge variant="outline" className="border-blue-600 text-blue-400">
                      {analysisHistory.length} recent
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {analysisHistory.map((analysis, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            analysis.healthScore >= 0.8 ? 'bg-green-400' :
                            analysis.healthScore >= 0.6 ? 'bg-yellow-400' :
                            analysis.healthScore >= 0.4 ? 'bg-orange-400' :
                            'bg-red-400'
                          }`} />
                          <div>
                            <p className="text-sm text-slate-200">
                              {analysis.captureInfo.device.type}
                            </p>
                            <p className="text-xs text-slate-400">
                              {new Date(analysis.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${getHealthScoreColor(analysis.healthScore)}`}>
                            {Math.round(analysis.healthScore * 100)}%
                          </p>
                          <p className="text-xs text-slate-400">
                            {analysis.issues.length} issues
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Connection Status */}
            {connectionStatus === 'error' && (
              <Alert className="border-red-600 bg-red-950/50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Unable to connect to AI analysis service. Please check your connection and try again.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}