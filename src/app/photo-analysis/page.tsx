'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  Upload,
  Camera,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  History,
  X,
  Plus,
  Leaf,
  Droplets,
  Thermometer,
  Bug,
  Virus,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

type PlantOption = { id: string; name: string; strain?: string };
type Analysis = {
  id: string;
  timestamp: string;
  diagnosis: string;
  confidence: number;
  healthScore: number;
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  issues: Array<{
    type: string;
    severity: 'critical' | 'warning' | 'info';
    description: string;
  }>;
};

export default function PhotoAnalysisPage() {
  const [plants, setPlants] = useState<PlantOption[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<string | undefined>(undefined);
  const [imageData, setImageData] = useState<string | undefined>(undefined);
  const [dragActive, setDragActive] = useState(false);
  const [form, setForm] = useState({
    strain: '',
    symptoms: '',
    ph: '',
    temperature: '',
    humidity: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<Analysis[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const loadPlants = async () => {
      try {
        const res = await fetch('/api/plants');
        if (!res.ok) return;
        const data = await res.json();
        setPlants((data.data?.plants || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          strain: p.strain?.name
        })));
      } catch {
        // ignore
      }
    };
    loadPlants();
  }, []);

  const handleFile = useCallback((file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImageData(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleSubmit = async () => {
    if (!imageData) {
      setError('Please upload a plant photo');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const payload = {
        plantId: selectedPlant,
        strain: form.strain || 'Unknown',
        leafSymptoms: form.symptoms || 'No symptoms specified',
        phLevel: form.ph || undefined,
        temperature: form.temperature || undefined,
        humidity: form.humidity || undefined,
        growthStage: 'unspecified',
        medium: 'unspecified',
        plantImage: imageData,
        additionalNotes: form.notes || ''
      };
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.details || 'Analysis failed');
      }
      setResult(data);

      // Add to history
      const newAnalysis: Analysis = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        diagnosis: data.analysis?.diagnosis || 'Analysis Complete',
        confidence: data.analysis?.confidence || data.analysis?.healthScore || 0,
        healthScore: data.analysis?.healthScore || 0,
        recommendations: data.analysis?.recommendations || { immediate: [], shortTerm: [], longTerm: [] },
        issues: data.analysis?.identifiedIssues || []
      };
      setAnalysisHistory(prev => [newAnalysis, ...prev].slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'warning': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/20 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  Photo Analysis
                </h1>
                <p className="text-sm text-slate-400">AI-powered plant health diagnosis</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-slate-700 hover:bg-slate-800"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="w-4 h-4 mr-2" />
              History ({analysisHistory.length})
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Upload Card */}
            <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-b border-slate-800">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  Analyze Your Plant
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {/* Drag & Drop Zone */}
                <div
                  className={cn(
                    "relative border-2 border-dashed rounded-xl p-12 transition-all duration-200",
                    dragActive
                      ? "border-emerald-500 bg-emerald-500/5"
                      : "border-slate-700 hover:border-slate-600",
                    imageData && "p-6"
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {imageData ? (
                    <div className="space-y-4">
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-950">
                        <img src={imageData} alt="Preview" className="w-full h-full object-contain" />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => setImageData(undefined)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-center text-slate-400">
                        Image ready for analysis
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-4 text-center">
                      <div className="p-4 bg-emerald-500/10 rounded-full">
                        <Upload className="w-8 h-8 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-slate-200">
                          Drag & drop your plant photo here
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                          or click to browse • JPG, PNG up to 10MB
                        </p>
                      </div>
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <Button type="button" className="bg-emerald-600 hover:bg-emerald-500" asChild>
                          <span>
                            <Plus className="w-4 h-4 mr-2" />
                            Select Image
                          </span>
                        </Button>
                        <Input
                          id="file-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFile(e.target.files?.[0])}
                        />
                      </Label>
                    </div>
                  )}
                </div>

                {/* Quick Info */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                    <Leaf className="w-5 h-5 mx-auto mb-2 text-emerald-400" />
                    <p className="text-xs text-slate-400">Nutrients</p>
                    <p className="text-sm font-semibold text-slate-200">Analysis</p>
                  </div>
                  <div className="text-center p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                    <Bug className="w-5 h-5 mx-auto mb-2 text-amber-400" />
                    <p className="text-xs text-slate-400">Pest & Disease</p>
                    <p className="text-sm font-semibold text-slate-200">Detection</p>
                  </div>
                  <div className="text-center p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                    <Zap className="w-5 h-5 mx-auto mb-2 text-cyan-400" />
                    <p className="text-xs text-slate-400">Instant</p>
                    <p className="text-sm font-semibold text-slate-200">Results</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Details */}
            <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-lg">Analysis Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Plant (optional)</Label>
                    <Select onValueChange={setSelectedPlant} value={selectedPlant}>
                      <SelectTrigger className="bg-slate-950 border-slate-700">
                        <SelectValue placeholder="Attach to plant record" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        {plants.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} {p.strain && `(${p.strain})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Strain</Label>
                    <Input
                      className="bg-slate-950 border-slate-700"
                      placeholder="e.g., Blue Dream"
                      value={form.strain}
                      onChange={(e) => setForm({ ...form, strain: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Symptoms</Label>
                  <Textarea
                    className="bg-slate-950 border-slate-700 min-h-[100px]"
                    placeholder="Describe visible issues, stress, pests, etc."
                    value={form.symptoms}
                    onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <Droplets className="w-4 h-4" />
                      pH Level
                    </Label>
                    <Input
                      className="bg-slate-950 border-slate-700"
                      placeholder="6.2"
                      value={form.ph}
                      onChange={(e) => setForm({ ...form, ph: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <Thermometer className="w-4 h-4" />
                      Temp (°F)
                    </Label>
                    <Input
                      className="bg-slate-950 border-slate-700"
                      placeholder="75"
                      value={form.temperature}
                      onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <Droplets className="w-4 h-4" />
                      Humidity (%)
                    </Label>
                    <Input
                      className="bg-slate-950 border-slate-700"
                      placeholder="55"
                      value={form.humidity}
                      onChange={(e) => setForm({ ...form, humidity: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Additional Notes</Label>
                  <Textarea
                    className="bg-slate-950 border-slate-700 min-h-[80px]"
                    placeholder="Anything else the AI should know..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold py-6 text-lg shadow-lg shadow-emerald-500/20"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !imageData}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Run Photo Analysis
                    </>
                  )}
                </Button>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Results & History */}
          <div className="space-y-6">
            {/* Analysis Result */}
            {result && (
              <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800 sticky top-24">
                <CardHeader className="border-b border-slate-800">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      Analysis Complete
                    </span>
                    {result.analysis?.healthScore && (
                      <span className={cn("text-2xl font-bold", getHealthColor(result.analysis.healthScore))}>
                        {result.analysis.healthScore}%
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-200 mb-1">
                      {result.analysis?.diagnosis || 'Analysis Complete'}
                    </p>
                    {result.analysis?.confidence && (
                      <p className="text-sm text-slate-400">
                        Confidence: {result.analysis.confidence}%
                      </p>
                    )}
                  </div>

                  {result.analysis?.identifiedIssues && result.analysis.identifiedIssues.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-300">Identified Issues</p>
                      {result.analysis.identifiedIssues.map((issue: any, idx: number) => (
                        <div
                          key={idx}
                          className={cn(
                            "p-3 rounded-lg border text-sm",
                            getSeverityColor(issue.severity)
                          )}
                        >
                          <p className="font-semibold">{issue.type}</p>
                          <p className="text-xs mt-1 opacity-90">{issue.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {Array.isArray(result.analysis?.recommendations?.immediate) && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Immediate Actions
                      </p>
                      <ul className="space-y-2">
                        {result.analysis.recommendations.immediate.map((rec: string, idx: number) => (
                          <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                            <span className="text-emerald-400 mt-1">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.analysis?.trichomeAnalysis && (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <p className="text-sm font-semibold text-purple-400 flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4" />
                        Trichome Analysis
                      </p>
                      <p className="text-xs text-slate-300">{result.analysis.trichomeAnalysis}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            {!result && (
              <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800">
                <CardHeader className="border-b border-slate-800">
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm text-slate-300">Total Analyses</span>
                    </div>
                    <span className="text-lg font-bold text-slate-200">{analysisHistory.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm text-slate-300">Active Plants</span>
                    </div>
                    <span className="text-lg font-bold text-slate-200">{plants.length}</span>
                  </div>
                  {analysisHistory.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm text-slate-300">Avg Health Score</span>
                      </div>
                      <span className={cn("text-lg font-bold", getHealthColor(
                        Math.round(analysisHistory.reduce((sum, a) => sum + a.healthScore, 0) / analysisHistory.length)
                      ))}>
                        {Math.round(analysisHistory.reduce((sum, a) => sum + a.healthScore, 0) / analysisHistory.length)}%
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Analysis History Panel */}
        {showHistory && (
          <Card className="mt-6 bg-slate-900/50 backdrop-blur-sm border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Analysis History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {analysisHistory.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No analysis history yet</p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analysisHistory.map((analysis) => (
                    <div
                      key={analysis.id}
                      className="p-4 bg-slate-950/50 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-slate-400">
                          {new Date(analysis.timestamp).toLocaleDateString()}
                        </p>
                        <span className={cn("text-sm font-bold", getHealthColor(analysis.healthScore))}>
                          {analysis.healthScore}%
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-200 mb-2 line-clamp-2">
                        {analysis.diagnosis}
                      </p>
                      <p className="text-xs text-slate-400">Confidence: {analysis.confidence}%</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
