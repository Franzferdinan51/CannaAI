'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Camera,
  Image as ImageIcon,
  X,
  AlertCircle,
  Info,
  Activity,
  Leaf,
  Thermometer,
  Droplets,
  Sun,
  FlaskConical,
  Bug,
  Eye
} from 'lucide-react';

import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Textarea } from './ui/Textarea';
import { Select } from './ui/Select';
import { Badge } from './ui/Badge';
import { Progress } from './ui/Progress';
import { Separator } from './ui/Separator';
import { Alert } from './ui/Alert';
import { ScrollArea } from './ui/ScrollArea';

import {
  AnalysisFormData,
  AnalysisResponse,
  SensorData,
  Strain,
  Notification
} from '../types';

import { apiClient, isNetworkError, getErrorMessage } from '../services/api';

interface PhotoAnalysisProps {
  strains: Strain[];
  sensorData?: SensorData;
  onAnalysisComplete?: (result: AnalysisResponse) => void;
  onNotification?: (notification: Notification) => void;
  className?: string;
}

export function PhotoAnalysis({
  strains,
  sensorData,
  onAnalysisComplete,
  onNotification,
  className = ''
}: PhotoAnalysisProps) {
  // Form state
  const [formData, setFormData] = useState<AnalysisFormData>({
    strain: 'Select Strain',
    leafSymptoms: '',
    phLevel: '',
    temperature: sensorData ? Math.round(sensorData.temperature).toString() : '',
    humidity: sensorData ? sensorData.humidity.toString() : '',
    medium: 'soil',
    growthStage: 'flowering',
    plantImage: null,
    pestDiseaseFocus: 'all',
    urgency: 'medium',
    additionalNotes: ''
  });

  // UI state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Image handling
  const handleImageSelect = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      setFormData(prev => ({ ...prev, plantImage: file }));

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      onNotification?.({
        id: Date.now(),
        type: 'error',
        message: 'Please select a valid image file',
        time: 'Just now'
      });
    }
  }, [onNotification]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  }, [handleImageSelect]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  }, [handleImageSelect]);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.strain || formData.strain === 'Select Strain') {
      onNotification?.({
        id: Date.now(),
        type: 'alert',
        message: 'Please select a strain',
        time: 'Just now'
      });
      return;
    }

    setIsAnalyzing(true);
    setUploadProgress(0);

    try {
      // Convert image to base64 if present
      let imageBase64 = null;
      if (formData.plantImage) {
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(formData.plantImage);
        });
        setUploadProgress(30);
      }

      // Prepare analysis request
      const analysisRequest = {
        strain: formData.strain,
        leafSymptoms: formData.leafSymptoms,
        phLevel: formData.phLevel,
        temperature: formData.temperature,
        humidity: formData.humidity,
        medium: formData.medium,
        growthStage: formData.growthStage,
        plantImage: imageBase64,
        pestDiseaseFocus: formData.pestDiseaseFocus,
        urgency: formData.urgency,
        additionalNotes: formData.additionalNotes
      };

      setUploadProgress(60);

      // Send analysis request
      const response = await apiClient.analyzePlant(analysisRequest);

      setUploadProgress(90);
      setAnalysisResult(response);

      // Success notification
      onNotification?.({
        id: Date.now(),
        type: 'info',
        message: `Analysis completed using ${response.metadata?.provider || 'AI'}`,
        time: 'Just now'
      });

      // Callback
      onAnalysisComplete?.(response);

      setUploadProgress(100);

    } catch (error) {
      console.error('Analysis failed:', error);

      // Handle different error types
      if (isNetworkError(error)) {
        onNotification?.({
          id: Date.now(),
          type: 'error',
          message: 'Network error. Please check your connection and try again.',
          time: 'Just now'
        });
      } else {
        onNotification?.({
          id: Date.now(),
          type: 'error',
          message: getErrorMessage(error),
          time: 'Just now'
        });
      }
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      strain: 'Select Strain',
      leafSymptoms: '',
      phLevel: '',
      temperature: sensorData ? Math.round(sensorData.temperature).toString() : '',
      humidity: sensorData ? sensorData.humidity.toString() : '',
      medium: 'soil',
      growthStage: 'flowering',
      plantImage: null,
      pestDiseaseFocus: 'all',
      urgency: 'medium',
      additionalNotes: ''
    });
    setImagePreview(null);
    setAnalysisResult(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [sensorData]);

  // Environment auto-fill from sensor data
  useEffect(() => {
    if (sensorData && !formData.temperature) {
      setFormData(prev => ({
        ...prev,
        temperature: Math.round(sensorData.temperature).toString(),
        humidity: sensorData.humidity.toString()
      }));
    }
  }, [sensorData, formData.temperature]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Analysis Form */}
      <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm shadow-lg">
        <Card.Header>
          <Card.Title className="text-slate-100 flex items-center">
            <Brain className="w-5 h-5 mr-2 text-emerald-400" />
            Enhanced Plant Analysis
          </Card.Title>
          <Card.Description className="text-slate-400">
            Upload plant photos and provide detailed information for comprehensive AI diagnosis
          </Card.Description>
        </Card.Header>

        <Card.Content>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload Section */}
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center">
                <Camera className="w-4 h-4 mr-2" />
                Plant Image
                <Badge variant="outline" className="ml-2 border-emerald-500/50 text-emerald-400">
                  Recommended
                </Badge>
              </Label>

              <div
                className={`relative border-2 border-dashed rounded-lg transition-colors ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-950/20'
                    : 'border-slate-700 bg-slate-950/30 hover:border-emerald-500/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {imagePreview ? (
                  <div className="relative p-4">
                    <img
                      src={imagePreview}
                      alt="Plant preview"
                      className="w-full h-48 object-contain rounded-md bg-slate-800/50"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      onClick={() => {
                        setImagePreview(null);
                        setFormData(prev => ({ ...prev, plantImage: null }));
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 cursor-pointer"
                       onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-12 h-12 mb-4 text-slate-500" />
                    <p className="text-sm text-slate-400 mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-slate-500">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileInput}
                  disabled={isAnalyzing}
                />
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Strain</Label>
                <Select
                  value={formData.strain}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, strain: value }))}
                  disabled={isAnalyzing}
                >
                  <Select.Trigger className="bg-slate-950/50 border-slate-700 text-slate-200 focus:ring-emerald-500/50">
                    <Select.Value placeholder="Select Strain" />
                  </Select.Trigger>
                  <Select.Content className="bg-slate-900 border-slate-700 text-slate-200">
                    {strains.map(strain => (
                      <Select.Item key={strain.id} value={strain.name}>
                        <div className="flex items-center">
                          {strain.isPurpleStrain && (
                            <div className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                          )}
                          {strain.name}
                        </div>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Growth Stage</Label>
                <Select
                  value={formData.growthStage}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, growthStage: value }))}
                  disabled={isAnalyzing}
                >
                  <Select.Trigger className="bg-slate-950/50 border-slate-700 text-slate-200 focus:ring-emerald-500/50">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content className="bg-slate-900 border-slate-700 text-slate-200">
                    <Select.Item value="seedling">Seedling</Select.Item>
                    <Select.Item value="vegetative">Vegetative</Select.Item>
                    <Select.Item value="flowering">Flowering</Select.Item>
                    <Select.Item value="harvest">Harvest</Select.Item>
                  </Select.Content>
                </Select>
              </div>
            </div>

            {/* Environmental Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center">
                  <Thermometer className="w-4 h-4 mr-2" />
                  Temperature (°F)
                </Label>
                <Input
                  type="number"
                  value={formData.temperature}
                  onChange={(e) => setFormData(prev => ({ ...prev, temperature: e.target.value }))}
                  placeholder="75"
                  className="bg-slate-950/50 border-slate-700 text-slate-200 focus:ring-emerald-500/50"
                  disabled={isAnalyzing}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center">
                  <Droplets className="w-4 h-4 mr-2" />
                  Humidity (%)
                </Label>
                <Input
                  type="number"
                  value={formData.humidity}
                  onChange={(e) => setFormData(prev => ({ ...prev, humidity: e.target.value }))}
                  placeholder="55"
                  className="bg-slate-950/50 border-slate-700 text-slate-200 focus:ring-emerald-500/50"
                  disabled={isAnalyzing}
                />
              </div>
            </div>

            {/* Symptoms Description */}
            <div className="space-y-2">
              <Label className="text-slate-300">Symptoms & Observations</Label>
              <Textarea
                value={formData.leafSymptoms}
                onChange={(e) => setFormData(prev => ({ ...prev, leafSymptoms: e.target.value }))}
                placeholder="Describe what you observe on the plant: leaf discoloration, spots, curling, growth issues, etc..."
                className="bg-slate-950/50 border-slate-700 text-slate-200 focus:ring-emerald-500/50 min-h-[100px]"
                disabled={isAnalyzing}
              />
            </div>

            {/* Advanced Options Toggle */}
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="text-slate-400 hover:text-slate-200"
              >
                <FlaskConical className="w-4 h-4 mr-2" />
                {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
              </Button>
            </div>

            {/* Advanced Options */}
            <AnimatePresence>
              {showAdvancedOptions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 border-t border-slate-800 pt-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">pH Level</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.phLevel}
                        onChange={(e) => setFormData(prev => ({ ...prev, phLevel: e.target.value }))}
                        placeholder="6.2"
                        className="bg-slate-950/50 border-slate-700 text-slate-200 focus:ring-emerald-500/50"
                        disabled={isAnalyzing}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300">Growing Medium</Label>
                      <Select
                        value={formData.medium}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, medium: value }))}
                        disabled={isAnalyzing}
                      >
                        <Select.Trigger className="bg-slate-950/50 border-slate-700 text-slate-200 focus:ring-emerald-500/50">
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content className="bg-slate-900 border-slate-700 text-slate-200">
                          <Select.Item value="soil">Soil</Select.Item>
                          <Select.Item value="hydroponic">Hydroponic</Select.Item>
                          <Select.Item value="aeroponic">Aeroponic</Select.Item>
                          <Select.Item value="coco">Coco Coir</Select.Item>
                        </Select.Content>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300">Focus Area</Label>
                      <Select
                        value={formData.pestDiseaseFocus}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, pestDiseaseFocus: value }))}
                        disabled={isAnalyzing}
                      >
                        <Select.Trigger className="bg-slate-950/50 border-slate-700 text-slate-200 focus:ring-emerald-500/50">
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content className="bg-slate-900 border-slate-700 text-slate-200">
                          <Select.Item value="all">General Analysis</Select.Item>
                          <Select.Item value="pests">Pest Issues</Select.Item>
                          <Select.Item value="disease">Disease Concerns</Select.Item>
                          <Select.Item value="nutrients">Nutrient Problems</Select.Item>
                          <Select.Item value="environmental">Environmental Stress</Select.Item>
                        </Select.Content>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300">Urgency Level</Label>
                      <Select
                        value={formData.urgency}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, urgency: value }))}
                        disabled={isAnalyzing}
                      >
                        <Select.Trigger className="bg-slate-950/50 border-slate-700 text-slate-200 focus:ring-emerald-500/50">
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content className="bg-slate-900 border-slate-700 text-slate-200">
                          <Select.Item value="low">Low - Monitoring</Select.Item>
                          <Select.Item value="medium">Medium - Attention Needed</Select.Item>
                          <Select.Item value="high">High - Action Required</Select.Item>
                          <Select.Item value="critical">Critical - Immediate Action</Select.Item>
                        </Select.Content>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Additional Notes</Label>
                    <Textarea
                      value={formData.additionalNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                      placeholder="Any other relevant information about growing conditions, recent changes, etc..."
                      className="bg-slate-950/50 border-slate-700 text-slate-200 focus:ring-emerald-500/50"
                      disabled={isAnalyzing}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upload Progress */}
            <AnimatePresence>
              {isAnalyzing && uploadProgress > 0 && uploadProgress < 100 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Processing analysis...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="bg-slate-800" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form Actions */}
            <div className="flex items-center space-x-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(5,150,105,0.3)] transition-all duration-300"
                disabled={isAnalyzing}
                loading={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Analyze Plant
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isAnalyzing}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Reset
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>

      {/* Analysis Results */}
      <AnimatePresence>
        {analysisResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <Card className="border-emerald-500/20 bg-emerald-950/10 backdrop-blur-sm shadow-lg">
              <Card.Header>
                <Card.Title className="flex items-center text-emerald-400">
                  <Activity className="w-5 h-5 mr-2" />
                  Analysis Results
                  {analysisResult.metadata?.provider && (
                    <Badge variant="outline" className="ml-auto border-emerald-500/50 text-emerald-400">
                      {analysisResult.metadata.provider === 'fallback' ? 'Rule-Based' : 'AI Analysis'}
                    </Badge>
                  )}
                </Card.Title>
              </Card.Header>

              <Card.Content>
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-6">
                    {/* Header Section */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {analysisResult.analysis.diagnosis || 'Analysis Complete'}
                        </h3>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge className={
                            analysisResult.analysis.urgency === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                            analysisResult.analysis.urgency === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' :
                            analysisResult.analysis.urgency === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                            'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                          }>
                            {analysisResult.analysis.urgency || 'NORMAL'}
                          </Badge>
                          <span className="text-xs text-slate-400">
                            Confidence: {analysisResult.analysis.confidence || 0}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-4xl font-bold ${
                          (analysisResult.analysis.healthScore ?? 0) > 70 ? "text-emerald-400" :
                          (analysisResult.analysis.healthScore ?? 0) > 40 ? "text-amber-400" :
                          "text-red-400"
                        }`}>
                          {analysisResult.analysis.healthScore || '?'}
                        </div>
                        <div className="text-xs text-slate-500 uppercase font-medium tracking-wider">
                          Health Score
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-slate-700" />

                    {/* Identified Causes */}
                    {analysisResult.analysis.causes && analysisResult.analysis.causes.length > 0 && (
                      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-2 text-amber-400" />
                          Identified Causes
                        </h4>
                        <ul className="space-y-2">
                          {analysisResult.analysis.causes.map((cause, i) => (
                            <li key={i} className="flex items-start text-sm text-slate-400">
                              <span className="mr-2 text-amber-500">•</span>
                              {cause}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Strain-Specific Advice */}
                    {analysisResult.analysis.strainSpecificAdvice && (
                      <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/30">
                        <h4 className="text-sm font-medium text-purple-300 mb-2 flex items-center">
                          <Leaf className="w-4 h-4 mr-2" />
                          Strain-Specific Advice: {formData.strain}
                        </h4>
                        <p className="text-sm text-slate-300 italic">
                          "{analysisResult.analysis.strainSpecificAdvice}"
                        </p>
                      </div>
                    )}

                    {/* Detailed Analysis Reasoning */}
                    {analysisResult.analysis.reasoning && (
                      <details className="bg-slate-900/50 rounded-lg border border-slate-800">
                        <summary className="flex items-center justify-between p-3 cursor-pointer text-sm font-medium text-slate-400 hover:text-slate-300">
                          <span className="flex items-center">
                            <Eye className="w-4 h-4 mr-2" />
                            View Detailed Analysis Reasoning
                          </span>
                        </summary>
                        <div className="p-4 pt-0 space-y-3 border-t border-slate-800/50">
                          {analysisResult.analysis.reasoning.map((step, i) => (
                            <div key={i} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-300">
                                  {step.step}
                                </span>
                                <Badge variant="outline" className="border-blue-500/50 text-blue-400 text-xs">
                                  {step.weight}% weight
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed">
                                {step.explanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {/* Recommendations */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-slate-300 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" />
                        Recommended Actions
                      </h4>

                      {analysisResult.analysis.recommendations &&
                       typeof analysisResult.analysis.recommendations === 'object' ? (
                        <div className="grid grid-cols-1 gap-4">
                          {Object.entries(analysisResult.analysis.recommendations).map(([key, actions]) => {
                            if (!Array.isArray(actions) || actions.length === 0) return null;

                            const urgencyColors = {
                              immediate: 'border-red-500/50 bg-red-500/10',
                              shortTerm: 'border-amber-500/50 bg-amber-500/10',
                              longTerm: 'border-blue-500/50 bg-blue-500/10'
                            } as const;

                            const urgencyLabels = {
                              immediate: 'Immediate Action',
                              shortTerm: 'Short Term',
                              longTerm: 'Long Term'
                            } as const;

                            return (
                              <div
                                key={key}
                                className={`rounded-lg border p-4 ${urgencyColors[key as keyof typeof urgencyColors]}`}
                              >
                                <h5 className="text-sm font-semibold mb-3 capitalize">
                                  {urgencyLabels[key as keyof typeof urgencyLabels]}
                                </h5>
                                <ul className="space-y-2">
                                  {(actions as string[]).map((action, i) => (
                                    <li key={i} className="flex items-start text-sm text-slate-300">
                                      <span className="mr-2 text-emerald-500">•</span>
                                      {action}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      ) : Array.isArray(analysisResult.analysis.recommendations) ? (
                        <ul className="space-y-2">
                          {analysisResult.analysis.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start text-sm text-slate-300">
                              <span className="mr-2 text-emerald-500">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <Alert className="border-slate-700 bg-slate-800/50">
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-slate-400">
                            No specific recommendations available for this analysis.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    {/* Provider Information */}
                    {analysisResult.metadata && (
                      <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                        <h4 className="text-sm font-medium text-slate-300 mb-2">Analysis Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Provider:</span>
                            <span className="ml-2 text-slate-300">{analysisResult.metadata.provider}</span>
                          </div>
                          {analysisResult.metadata.fallbackUsed && (
                            <div>
                              <span className="text-slate-500">Fallback Reason:</span>
                              <span className="ml-2 text-slate-300">
                                {analysisResult.metadata.fallbackReason || 'Unknown'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </Card.Content>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}