'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  Upload,
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Zap,
  Plus
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type BatchImage = {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  result?: any;
  error?: string;
};

interface BatchPhotoAnalysisProps {
  onAnalysisComplete?: (results: BatchImage[]) => void;
}

export function BatchPhotoAnalysis({ onAnalysisComplete }: BatchPhotoAnalysisProps) {
  const [images, setImages] = useState<BatchImage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = useCallback((files: FileList) => {
    const newImages: BatchImage[] = [];

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) return;

      const reader = new FileReader();
      reader.onload = () => {
        const newImage: BatchImage = {
          id: Math.random().toString(36).substring(7),
          file,
          preview: reader.result as string,
          status: 'pending'
        };

        setImages(prev => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const analyzeBatch = async () => {
    if (images.length === 0) return;

    setIsAnalyzing(true);
    setProgress(0);

    const results = [...images];
    let completed = 0;

    for (let i = 0; i < results.length; i++) {
      const image = results[i];

      // Update status to analyzing
      setImages(prev => prev.map(img =>
        img.id === image.id ? { ...img, status: 'analyzing' } : img
      ));

      try {
        const payload = {
          strain: 'Unknown',
          leafSymptoms: 'Batch analysis',
          plantImage: image.preview,
          growthStage: 'unspecified',
          medium: 'unspecified'
        };

        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Analysis failed');
        }

        // Update with result
        image.status = 'complete';
        image.result = data;

        setImages(prev => prev.map(img =>
          img.id === image.id ? { ...img, status: 'complete', result: data } : img
        ));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Analysis failed';
        image.status = 'error';
        image.error = errorMsg;

        setImages(prev => prev.map(img =>
          img.id === image.id ? { ...img, status: 'error', error: errorMsg } : img
        ));
      }

      completed++;
      setProgress((completed / results.length) * 100);
    }

    setIsAnalyzing(false);
    onAnalysisComplete?.(results);
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-800">
      <CardHeader className="border-b border-slate-800">
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-400" />
          Batch Photo Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Upload Zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-8 transition-all duration-200",
            "border-slate-700 hover:border-slate-600"
          )}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="p-4 bg-purple-500/10 rounded-full">
              <Upload className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-200">
                Drop multiple plant photos here
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Analyze up to 10 plants at once • JPG, PNG up to 10MB each
              </p>
            </div>
            <label className="cursor-pointer">
              <Button className="bg-purple-600 hover:bg-purple-500" asChild>
                <span>
                  <Plus className="w-4 h-4 mr-2" />
                  Select Multiple Images
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              />
            </label>
          </div>
        </div>

        {/* Image Grid */}
        {images.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-300">
                {images.length} image{images.length !== 1 ? 's' : ''} selected
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700 hover:bg-slate-800"
                onClick={() => setImages([])}
              >
                Clear All
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative group bg-slate-950/50 border border-slate-800 rounded-lg overflow-hidden"
                >
                  {/* Image Preview */}
                  <div className="aspect-square relative">
                    <img
                      src={image.preview}
                      alt={`Preview of ${image.file.name}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Status Overlay */}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      {image.status === 'pending' && (
                        <Layers className="w-8 h-8 text-slate-400" />
                      )}
                      {image.status === 'analyzing' && (
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                      )}
                      {image.status === 'complete' && (
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      )}
                      {image.status === 'error' && (
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                      )}
                    </div>

                    {/* Remove Button */}
                    {!isAnalyzing && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 w-6 h-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            onClick={() => removeImage(image.id)}
                            aria-label={`Remove ${image.file.name}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Remove image</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {/* Health Score Badge */}
                    {image.status === 'complete' && image.result?.analysis?.healthScore && (
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/80 rounded text-xs font-bold">
                        <span className={getHealthColor(image.result.analysis.healthScore)}>
                          {image.result.analysis.healthScore}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status Bar */}
                  <div className="p-2 border-t border-slate-800">
                    <p className="text-xs text-slate-400 truncate">
                      {image.file.name}
                    </p>
                    {image.status === 'error' && (
                      <p className="text-xs text-red-400 truncate">{image.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            {isAnalyzing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Analyzing images...</span>
                  <span className="text-slate-200">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Analyze Button */}
            {!isAnalyzing && images.length > 0 && (
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-6"
                onClick={analyzeBatch}
                disabled={images.length === 0}
              >
                <Zap className="w-5 h-5 mr-2" />
                Analyze All {images.length} Images
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
