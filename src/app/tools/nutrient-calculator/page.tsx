'use client';

import React, { useState, useEffect } from 'react';
import {
  Calculator, Beaker, Droplet, Save, History, Trash2, Plus, Copy,
  Download, Upload, FlaskConical, BookOpen, AlertCircle, CheckCircle,
  TrendingUp, Clock, Settings, RefreshCw, ArrowLeft, Home,
  TestTube, Beaker as BeakerIcon, Sparkles, Target, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

interface NutrientRecipe {
  id: string;
  name: string;
  waterAmount: number;
  growthStage: string;
  baseNutrients: {
    grow: number;
    micro: number;
    bloom: number;
  };
  additives: {
    calmag: number;
    silica: number;
    enzymes: number;
  };
  totalMl: number;
  ecEstimate: number;
  phAdjustment: string;
  notes: string;
  createdAt: string;
  isPreset: boolean;
}

interface CalculationResults {
  totalBaseNutrients: number;
  totalAdditives: number;
  totalMl: number;
  ecEstimate: number;
  recommendedPh: string;
  warnings: string[];
  tips: string[];
}

// Preset recipes for different growth stages
const PRESET_RECIPES: NutrientRecipe[] = [
  {
    id: 'seedling_preset',
    name: 'Seedling Strength (Week 1-2)',
    waterAmount: 10,
    growthStage: 'seedling',
    baseNutrients: { grow: 0.5, micro: 0.5, bloom: 0.5 },
    additives: { calmag: 1.0, silica: 0.5, enzymes: 0 },
    totalMl: 0,
    ecEstimate: 0.8,
    phAdjustment: '5.8 - 6.2',
    notes: 'Very light feeding for seedlings. Focus on root development.',
    createdAt: new Date().toISOString(),
    isPreset: true
  },
  {
    id: 'early_veg_preset',
    name: 'Early Vegetative (Week 3-4)',
    waterAmount: 10,
    growthStage: 'vegetative',
    baseNutrients: { grow: 2.0, micro: 2.0, bloom: 1.0 },
    additives: { calmag: 2.0, silica: 1.0, enzymes: 0.5 },
    totalMl: 0,
    ecEstimate: 1.2,
    phAdjustment: '5.8 - 6.2',
    notes: 'Balanced NPK ratio for vigorous vegetative growth.',
    createdAt: new Date().toISOString(),
    isPreset: true
  },
  {
    id: 'mid_veg_preset',
    name: 'Mid Vegetative (Week 5-6)',
    waterAmount: 10,
    growthStage: 'vegetative',
    baseNutrients: { grow: 3.0, micro: 2.5, bloom: 1.5 },
    additives: { calmag: 2.5, silica: 1.5, enzymes: 1.0 },
    totalMl: 0,
    ecEstimate: 1.6,
    phAdjustment: '5.8 - 6.2',
    notes: 'Increased nutrients for rapid vegetative expansion.',
    createdAt: new Date().toISOString(),
    isPreset: true
  },
  {
    id: 'late_veg_preset',
    name: 'Late Vegetative (Pre-Flower)',
    waterAmount: 10,
    growthStage: 'vegetative',
    baseNutrients: { grow: 2.5, micro: 3.0, bloom: 2.0 },
    additives: { calmag: 3.0, silica: 2.0, enzymes: 1.0 },
    totalMl: 0,
    ecEstimate: 1.8,
    phAdjustment: '5.8 - 6.2',
    notes: 'Transition mix preparing plants for flowering phase.',
    createdAt: new Date().toISOString(),
    isPreset: true
  },
  {
    id: 'early_flower_preset',
    name: 'Early Flowering (Week 1-3)',
    waterAmount: 10,
    growthStage: 'flowering',
    baseNutrients: { grow: 1.5, micro: 3.0, bloom: 3.5 },
    additives: { calmag: 3.0, silica: 2.0, enzymes: 1.5 },
    totalMl: 0,
    ecEstimate: 2.0,
    phAdjustment: '5.8 - 6.2',
    notes: 'High phosphorus for bud development with reduced nitrogen.',
    createdAt: new Date().toISOString(),
    isPreset: true
  },
  {
    id: 'mid_flower_preset',
    name: 'Peak Flowering (Week 4-6)',
    waterAmount: 10,
    growthStage: 'flowering',
    baseNutrients: { grow: 1.0, micro: 2.5, bloom: 4.5 },
    additives: { calmag: 2.5, silica: 2.0, enzymes: 2.0 },
    totalMl: 0,
    ecEstimate: 2.2,
    phAdjustment: '5.8 - 6.2',
    notes: 'Maximum flowering nutrients for bud bulking.',
    createdAt: new Date().toISOString(),
    isPreset: true
  },
  {
    id: 'late_flower_preset',
    name: 'Late Flowering (Week 7-8)',
    waterAmount: 10,
    growthStage: 'flowering',
    baseNutrients: { grow: 0.5, micro: 2.0, bloom: 4.0 },
    additives: { calmag: 2.0, silica: 1.5, enzymes: 2.5 },
    totalMl: 0,
    ecEstimate: 1.8,
    phAdjustment: '5.8 - 6.2',
    notes: 'Reduced nitrogen, flushing begins in final week.',
    createdAt: new Date().toISOString(),
    isPreset: true
  },
  {
    id: 'flushing_preset',
    name: 'Flushing (Final 1-2 weeks)',
    waterAmount: 10,
    growthStage: 'flushing',
    baseNutrients: { grow: 0, micro: 0, bloom: 0 },
    additives: { calmag: 1.0, silica: 1.0, enzymes: 2.0 },
    totalMl: 0,
    ecEstimate: 0.4,
    phAdjustment: '6.0 - 6.8',
    notes: 'Only enzymes and minimal additives to flush nutrients.',
    createdAt: new Date().toISOString(),
    isPreset: true
  }
];

export default function NutrientCalculatorPage() {
  const [currentRecipe, setCurrentRecipe] = useState({
    name: '',
    waterAmount: 10,
    growthStage: 'vegetative',
    baseNutrients: { grow: 2.0, micro: 2.0, bloom: 1.0 },
    additives: { calmag: 2.0, silica: 1.0, enzymes: 0.5 },
    notes: ''
  });

  const [savedRecipes, setSavedRecipes] = useState<NutrientRecipe[]>(PRESET_RECIPES);
  const [calculationResults, setCalculationResults] = useState<CalculationResults | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [showTip, setShowTip] = useState(true);

  // Load saved recipes from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('nutrientRecipes');
    if (stored) {
      try {
        const recipes = JSON.parse(stored);
        setSavedRecipes([...PRESET_RECIPES, ...recipes]);
      } catch (error) {
        console.error('Error loading saved recipes:', error);
      }
    }
  }, []);

  // Calculate recipe whenever inputs change
  useEffect(() => {
    calculateRecipe();
  }, [currentRecipe]);

  const calculateRecipe = () => {
    const { waterAmount, baseNutrients, additives, growthStage } = currentRecipe;

    // Calculate totals
    const totalBaseNutrients = baseNutrients.grow + baseNutrients.micro + baseNutrients.bloom;
    const totalAdditives = additives.calmag + additives.silica + additives.enzymes;
    const totalMl = (totalBaseNutrients + totalAdditives) * waterAmount;

    // Estimate EC based on total concentration and growth stage
    let baseEC = 0.5; // Base EC for water
    if (growthStage === 'seedling') baseEC = 0.3;
    else if (growthStage === 'vegetative') baseEC = 0.5;
    else if (growthStage === 'flowering') baseEC = 0.6;
    else if (growthStage === 'flushing') baseEC = 0.2;

    const ecEstimate = parseFloat((baseEC + (totalMl / waterAmount) * 0.15).toFixed(1));

    // Determine recommended pH based on growth stage
    let recommendedPh = '5.8 - 6.2';
    if (growthStage === 'flushing') recommendedPh = '6.0 - 6.8';

    // Generate warnings
    const warnings: string[] = [];
    if (totalMl / waterAmount > 15) {
      warnings.push('High nutrient concentration - risk of burn');
    }
    if (ecEstimate > 2.5) {
      warnings.push('High EC levels - consider diluting');
    }
    if (growthStage === 'seedling' && totalMl / waterAmount > 5) {
      warnings.push('Too strong for seedlings - reduce concentration');
    }

    // Generate tips
    const tips: string[] = [];
    if (growthStage === 'vegetative') {
      tips.push('Monitor for rapid growth - may need to increase nutrients');
    } else if (growthStage === 'flowering') {
      tips.push('Watch for signs of nutrient burn during peak flowering');
      tips.push('Consider adding bloom boosters in weeks 4-6');
    }
    if (additives.silica > 0) {
      tips.push('Silica helps strengthen cell walls and improves stress resistance');
    }

    setCalculationResults({
      totalBaseNutrients,
      totalAdditives,
      totalMl,
      ecEstimate,
      recommendedPh,
      warnings,
      tips
    });
  };

  const handlePresetSelect = (presetId: string) => {
    const preset = PRESET_RECIPES.find(r => r.id === presetId);
    if (preset) {
      setCurrentRecipe({
        name: preset.name,
        waterAmount: preset.waterAmount,
        growthStage: preset.growthStage,
        baseNutrients: { ...preset.baseNutrients },
        additives: { ...preset.additives },
        notes: preset.notes
      });
      setSelectedPreset(presetId);
    }
  };

  const handleSaveRecipe = () => {
    if (!currentRecipe.name.trim()) {
      alert('Please enter a recipe name');
      return;
    }

    const newRecipe: NutrientRecipe = {
      id: Date.now().toString(),
      name: currentRecipe.name,
      waterAmount: currentRecipe.waterAmount,
      growthStage: currentRecipe.growthStage,
      baseNutrients: { ...currentRecipe.baseNutrients },
      additives: { ...currentRecipe.additives },
      totalMl: calculationResults?.totalMl || 0,
      ecEstimate: calculationResults?.ecEstimate || 0,
      phAdjustment: calculationResults?.recommendedPh || '5.8 - 6.2',
      notes: currentRecipe.notes,
      createdAt: new Date().toISOString(),
      isPreset: false
    };

    const updatedRecipes = [...savedRecipes.filter(r => !r.isPreset), newRecipe];
    setSavedRecipes([...PRESET_RECIPES, ...updatedRecipes]);

    // Save to localStorage
    localStorage.setItem('nutrientRecipes', JSON.stringify(updatedRecipes));

    setShowSaveDialog(false);
    setCurrentRecipe(prev => ({ ...prev, name: '' }));
    setSelectedPreset('');
  };

  const handleDeleteRecipe = (recipeId: string) => {
    if (confirm('Are you sure you want to delete this recipe?')) {
      const updatedRecipes = savedRecipes.filter(r => r.id !== recipeId);
      setSavedRecipes(updatedRecipes);

      // Update localStorage
      const userRecipes = updatedRecipes.filter(r => !r.isPreset);
      localStorage.setItem('nutrientRecipes', JSON.stringify(userRecipes));
    }
  };

  const handleLoadRecipe = (recipe: NutrientRecipe) => {
    setCurrentRecipe({
      name: recipe.name,
      waterAmount: recipe.waterAmount,
      growthStage: recipe.growthStage,
      baseNutrients: { ...recipe.baseNutrients },
      additives: { ...recipe.additives },
      notes: recipe.notes
    });
    setSelectedPreset(recipe.isPreset ? recipe.id : '');
  };

  const exportRecipes = () => {
    const userRecipes = savedRecipes.filter(r => !r.isPreset);
    const dataStr = JSON.stringify(userRecipes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `nutrient-recipes-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-lime-900 text-white p-4">
      {/* Header */}
      <header className="mb-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-emerald-300 hover:text-lime-400">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="bg-lime-500 p-2 rounded-full">
              <Calculator className="h-6 w-6 text-emerald-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-lime-300 to-emerald-300">
                Nutrient Calculator Pro
              </h1>
              <p className="text-emerald-300 text-sm">Advanced nutrient mixing and recipe management</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={exportRecipes}>
              <Download className="h-4 w-4 mr-2" />
              Export Recipes
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Calculator */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Presets */}
          <Card className="bg-emerald-800/50 border-emerald-700">
            <CardHeader>
              <CardTitle className="text-lime-300 flex items-center">
                <Sparkles className="h-5 w-5 mr-2" />
                Quick Start Presets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {PRESET_RECIPES.filter(r => r.growthStage === currentRecipe.growthStage).map((preset) => (
                  <Button
                    key={preset.id}
                    variant={selectedPreset === preset.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetSelect(preset.id)}
                    className={`text-xs ${selectedPreset === preset.id ? 'bg-lime-600 text-emerald-900' : 'text-emerald-300'}`}
                  >
                    {preset.name.split('(')[0].trim()}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-emerald-400 mt-2">
                Select a preset for your current growth stage to get started quickly
              </p>
            </CardContent>
          </Card>

          {/* Calculator Input */}
          <Card className="bg-emerald-800/50 border-emerald-700">
            <CardHeader>
              <CardTitle className="text-lime-300 flex items-center">
                <Beaker className="h-5 w-5 mr-2" />
                Nutrient Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-emerald-300 text-sm font-medium">Recipe Name</Label>
                  <Input
                    value={currentRecipe.name}
                    onChange={(e) => setCurrentRecipe(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Week 4 Vegetative"
                    className="bg-emerald-900/50 border-emerald-600 text-emerald-200 mt-1"
                  />
                </div>

                <div>
                  <Label className="text-emerald-300 text-sm font-medium">Water Amount (Liters)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={currentRecipe.waterAmount}
                    onChange={(e) => setCurrentRecipe(prev => ({ ...prev, waterAmount: parseFloat(e.target.value) || 0 }))}
                    className="bg-emerald-900/50 border-emerald-600 text-emerald-200 mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-emerald-300 text-sm font-medium">Growth Stage</Label>
                <Select
                  value={currentRecipe.growthStage}
                  onValueChange={(value) => setCurrentRecipe(prev => ({ ...prev, growthStage: value }))}
                >
                  <SelectTrigger className="bg-emerald-900/50 border-emerald-600 text-emerald-200 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-emerald-800 border-emerald-700">
                    <SelectItem value="seedling">Seedling</SelectItem>
                    <SelectItem value="vegetative">Vegetative</SelectItem>
                    <SelectItem value="flowering">Flowering</SelectItem>
                    <SelectItem value="flushing">Flushing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-emerald-700" />

              {/* Base Nutrients */}
              <div>
                <Label className="text-lime-300 text-sm font-medium flex items-center mb-3">
                  <TestTube className="h-4 w-4 mr-2" />
                  Base Nutrients (ml/L)
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['grow', 'micro', 'bloom'].map((nutrient) => (
                    <div key={nutrient} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-emerald-300 text-sm capitalize">{nutrient}</Label>
                        <Badge variant="outline" className="text-xs bg-emerald-700/50">
                          {(currentRecipe.baseNutrients[nutrient as keyof typeof currentRecipe.baseNutrients] * currentRecipe.waterAmount).toFixed(1)} ml
                        </Badge>
                      </div>
                      <Input
                        type="number"
                        step="0.1"
                        value={currentRecipe.baseNutrients[nutrient as keyof typeof currentRecipe.baseNutrients]}
                        onChange={(e) => setCurrentRecipe(prev => ({
                          ...prev,
                          baseNutrients: {
                            ...prev.baseNutrients,
                            [nutrient]: parseFloat(e.target.value) || 0
                          }
                        }))}
                        className="bg-emerald-900/50 border-emerald-600 text-emerald-200"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-emerald-700" />

              {/* Additives */}
              <div>
                <Label className="text-lime-300 text-sm font-medium flex items-center mb-3">
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Additives (ml/L)
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['calmag', 'silica', 'enzymes'].map((additive) => (
                    <div key={additive} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-emerald-300 text-sm capitalize">{additive}</Label>
                        <Badge variant="outline" className="text-xs bg-emerald-700/50">
                          {(currentRecipe.additives[additive as keyof typeof currentRecipe.additives] * currentRecipe.waterAmount).toFixed(1)} ml
                        </Badge>
                      </div>
                      <Input
                        type="number"
                        step="0.1"
                        value={currentRecipe.additives[additive as keyof typeof currentRecipe.additives]}
                        onChange={(e) => setCurrentRecipe(prev => ({
                          ...prev,
                          additives: {
                            ...prev.additives,
                            [additive]: parseFloat(e.target.value) || 0
                          }
                        }))}
                        className="bg-emerald-900/50 border-emerald-600 text-emerald-200"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-emerald-700" />

              {/* Notes */}
              <div>
                <Label className="text-emerald-300 text-sm font-medium">Notes</Label>
                <Textarea
                  value={currentRecipe.notes}
                  onChange={(e) => setCurrentRecipe(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any notes about this recipe..."
                  className="bg-emerald-900/50 border-emerald-600 text-emerald-200 mt-1"
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-lime-600 hover:bg-lime-500 text-emerald-900">
                      <Save className="h-4 w-4 mr-2" />
                      Save Recipe
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-emerald-800 border-emerald-700">
                    <DialogHeader>
                      <DialogTitle className="text-lime-300">Save Nutrient Recipe</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-emerald-300">
                        Save "{currentRecipe.name || 'Untitled Recipe'}" to your recipe collection?
                      </p>
                      <div className="flex space-x-3">
                        <Button onClick={handleSaveRecipe} className="bg-lime-600 hover:bg-lime-500 text-emerald-900">
                          Save Recipe
                        </Button>
                        <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" onClick={() => {
                  setCurrentRecipe({
                    name: '',
                    waterAmount: 10,
                    growthStage: 'vegetative',
                    baseNutrients: { grow: 2.0, micro: 2.0, bloom: 1.0 },
                    additives: { calmag: 2.0, silica: 1.0, enzymes: 0.5 },
                    notes: ''
                  });
                  setSelectedPreset('');
                }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Panel */}
          {calculationResults && (
            <Card className="bg-gradient-to-r from-lime-800/50 to-emerald-800/50 border-lime-600">
              <CardHeader>
                <CardTitle className="text-lime-300 flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Calculation Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-emerald-400 text-xs">Total Base Nutrients</p>
                    <p className="text-lime-300 text-xl font-bold">{calculationResults.totalBaseNutrients.toFixed(1)}</p>
                    <p className="text-emerald-400 text-xs">ml/L</p>
                  </div>
                  <div className="text-center">
                    <p className="text-emerald-400 text-xs">Total Additives</p>
                    <p className="text-lime-300 text-xl font-bold">{calculationResults.totalAdditives.toFixed(1)}</p>
                    <p className="text-emerald-400 text-xs">ml/L</p>
                  </div>
                  <div className="text-center">
                    <p className="text-emerald-400 text-xs">Total Volume</p>
                    <p className="text-lime-300 text-xl font-bold">{calculationResults.totalMl.toFixed(1)}</p>
                    <p className="text-emerald-400 text-xs">ml</p>
                  </div>
                  <div className="text-center">
                    <p className="text-emerald-400 text-xs">Est. EC</p>
                    <p className="text-lime-300 text-xl font-bold">{calculationResults.ecEstimate}</p>
                    <p className="text-emerald-400 text-xs">mS/cm</p>
                  </div>
                </div>

                {/* pH Recommendation */}
                <div className="bg-emerald-900/50 rounded-lg p-3 mb-4">
                  <p className="text-lime-300 text-sm font-medium mb-1">Recommended pH Range</p>
                  <p className="text-emerald-200 text-lg font-bold">{calculationResults.recommendedPh}</p>
                </div>

                {/* Warnings */}
                {calculationResults.warnings.length > 0 && (
                  <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3 mb-4">
                    <p className="text-orange-300 text-sm font-medium mb-2 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Warnings
                    </p>
                    {calculationResults.warnings.map((warning, index) => (
                      <p key={index} className="text-orange-200 text-xs">• {warning}</p>
                    ))}
                  </div>
                )}

                {/* Tips */}
                {calculationResults.tips.length > 0 && (
                  <div className="bg-emerald-900/30 border border-emerald-600 rounded-lg p-3">
                    <p className="text-lime-300 text-sm font-medium mb-2 flex items-center">
                      <Zap className="h-4 w-4 mr-2" />
                      Pro Tips
                    </p>
                    {calculationResults.tips.map((tip, index) => (
                      <p key={index} className="text-emerald-200 text-xs">• {tip}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Tips */}
          {showTip && (
            <Card className="bg-gradient-to-r from-blue-800/50 to-purple-800/50 border-blue-600">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-blue-300 text-sm font-medium mb-2 flex items-center">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Quick Tip
                    </p>
                    <p className="text-blue-200 text-xs">
                      Start with a preset recipe for your growth stage, then adjust based on your plant's response. Always measure EC and pH after mixing!
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTip(false)}
                    className="text-blue-300 hover:text-blue-200"
                  >
                    ×
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recipe History */}
          <Card className="bg-emerald-800/50 border-emerald-700">
            <CardHeader>
              <CardTitle className="text-lime-300 flex items-center">
                <History className="h-5 w-5 mr-2" />
                Saved Recipes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {savedRecipes.length === 0 ? (
                  <p className="text-emerald-400 text-sm">No saved recipes yet</p>
                ) : (
                  savedRecipes.map((recipe) => (
                    <motion.div
                      key={recipe.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-emerald-900/50 rounded-lg p-3 cursor-pointer hover:bg-emerald-900/70 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div
                          className="flex-1"
                          onClick={() => handleLoadRecipe(recipe)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-emerald-200 text-sm font-medium">{recipe.name}</p>
                            {recipe.isPreset && (
                              <Badge variant="outline" className="text-xs bg-lime-700/50 text-lime-300">
                                Preset
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-emerald-400">
                            <span>{recipe.waterAmount}L</span>
                            <span>•</span>
                            <span>{recipe.growthStage}</span>
                            <span>•</span>
                            <span>{recipe.ecEstimate} EC</span>
                          </div>
                        </div>
                        {!recipe.isPreset && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRecipe(recipe.id);
                            }}
                            className="text-red-400 hover:text-red-300 ml-2"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Mixing Instructions */}
          <Card className="bg-emerald-800/50 border-emerald-700">
            <CardHeader>
              <CardTitle className="text-lime-300 flex items-center">
                <BeakerIcon className="h-5 w-5 mr-2" />
                Mixing Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="bg-lime-600 rounded-full w-6 h-6 flex items-center justify-center text-emerald-900 text-xs font-bold">1</div>
                  <p className="text-emerald-300 text-sm">Start with clean water at room temperature</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-lime-600 rounded-full w-6 h-6 flex items-center justify-center text-emerald-900 text-xs font-bold">2</div>
                  <p className="text-emerald-300 text-sm">Add Micro nutrient first, stir thoroughly</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-lime-600 rounded-full w-6 h-6 flex items-center justify-center text-emerald-900 text-xs font-bold">3</div>
                  <p className="text-emerald-300 text-sm">Add Grow nutrient, mix well</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-lime-600 rounded-full w-6 h-6 flex items-center justify-center text-emerald-900 text-xs font-bold">4</div>
                  <p className="text-emerald-300 text-sm">Add Bloom nutrient, mix thoroughly</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-lime-600 rounded-full w-6 h-6 flex items-center justify-center text-emerald-900 text-xs font-bold">5</div>
                  <p className="text-emerald-300 text-sm">Add additives (CalMag, Silica, Enzymes)</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-lime-600 rounded-full w-6 h-6 flex items-center justify-center text-emerald-900 text-xs font-bold">6</div>
                  <p className="text-emerald-300 text-sm">Measure and adjust pH if needed</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-lime-600 rounded-full w-6 h-6 flex items-center justify-center text-emerald-900 text-xs font-bold">7</div>
                  <p className="text-emerald-300 text-sm">Measure EC to confirm concentration</p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                <p className="text-yellow-300 text-xs font-medium mb-1">Important!</p>
                <p className="text-yellow-200 text-xs">
                  Always add nutrients to water, never water to nutrients. Mix thoroughly between each addition.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}