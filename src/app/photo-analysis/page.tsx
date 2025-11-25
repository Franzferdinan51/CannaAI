 'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload } from 'lucide-react';

type PlantOption = { id: string; name: string };

export default function PhotoAnalysisPage() {
  const [plants, setPlants] = useState<PlantOption[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<string | undefined>(undefined);
  const [imageData, setImageData] = useState<string | undefined>(undefined);
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

  useEffect(() => {
    const loadPlants = async () => {
      try {
        const res = await fetch('/api/plants');
        if (!res.ok) return;
        const data = await res.json();
        setPlants((data.data?.plants || []).map((p: any) => ({ id: p.id, name: p.name })));
      } catch {
        // ignore
      }
    };
    loadPlants();
  }, []);

  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-widest text-emerald-400">Photo Analysis</p>
          <h1 className="text-3xl font-bold">Upload a plant photo for AI diagnosis</h1>
          <p className="text-slate-400">
            This is the primary workflow for CannaAI. Upload a photo, describe symptoms, and optionally attach it to a plant record.
            Analyses are stored and tied to your plants for history and follow-up.
          </p>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-xl">Analysis Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plant (optional)</Label>
                <Select onValueChange={setSelectedPlant} value={selectedPlant}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Attach to a plant record" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {plants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Strain</Label>
                <Input
                  className="bg-slate-800 border-slate-700"
                  placeholder="e.g., Blue Dream"
                  value={form.strain}
                  onChange={(e) => setForm({ ...form, strain: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Symptoms</Label>
              <Textarea
                className="bg-slate-800 border-slate-700 min-h-[120px]"
                placeholder="Describe visible issues, stress, pests, etc."
                value={form.symptoms}
                onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>pH</Label>
                <Input
                  className="bg-slate-800 border-slate-700"
                  placeholder="6.2"
                  value={form.ph}
                  onChange={(e) => setForm({ ...form, ph: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Temperature (°F)</Label>
                <Input
                  className="bg-slate-800 border-slate-700"
                  placeholder="75"
                  value={form.temperature}
                  onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Humidity (%)</Label>
                <Input
                  className="bg-slate-800 border-slate-700"
                  placeholder="55"
                  value={form.humidity}
                  onChange={(e) => setForm({ ...form, humidity: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                className="bg-slate-800 border-slate-700 min-h-[80px]"
                placeholder="Anything else the AI should know"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Plant Photo</Label>
              <div className="flex items-center gap-3">
                <Input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])} className="bg-slate-800 border-slate-700" />
                {imageData && <span className="text-xs text-emerald-400">Image attached</span>}
              </div>
            </div>

            <Button
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Run Photo Analysis
            </Button>

            {error && <p className="text-red-400 text-sm">{error}</p>}
          </CardContent>
        </Card>

        {result && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-xl">Analysis Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-lg font-semibold text-emerald-400">{result.analysis?.diagnosis || 'Analysis Complete'}</p>
              <p className="text-slate-300">Confidence: {result.analysis?.confidence || result.analysis?.healthScore || '?'}%</p>
              {Array.isArray(result.analysis?.recommendations?.immediate) && (
                <div>
                  <p className="text-sm uppercase tracking-wide text-slate-400 mb-1">Immediate Actions</p>
                  <ul className="list-disc list-inside text-slate-200 space-y-1">
                    {result.analysis.recommendations.immediate.map((rec: string, idx: number) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
