'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bug,
  Search,
  Camera,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Upload,
  Calendar,
  TrendingUp,
  Shield,
  Info,
  Sprout,
  Eye,
  Heart
} from 'lucide-react';

// Enhanced pest and disease database with comprehensive information
const pestDiseaseDatabase = [
  {
    id: 1,
    name: 'Spider Mites',
    type: 'Pest',
    category: 'Arachnid',
    severity: 'High',
    symptoms: 'Yellow speckling on leaves, fine webbing on undersides of leaves, leaf damage, stunted growth',
    treatment: 'Neem oil spray (2ml/L), predatory mites (Phytoseiulus persimilis), insecticidal soap, ladybug release',
    prevention: 'Maintain 50-60% humidity, regular leaf inspection, quarantine new plants, use beneficial insects',
    lifecycle: 'Egg → Larva → Protonymph → Deutonymph → Adult (5-20 days)',
    favorableConditions: 'Hot dry conditions above 27°C (80°F), low humidity',
    organicControl: 'Neem oil, insecticidal soap, predatory mites',
    chemicalControl: 'Avid, Floramite, Forbid (use sparingly)',
    detectionTips: 'Use magnifying glass to see tiny mites, check undersides of leaves',
    treatmentSchedule: 'Apply neem oil every 3 days for 2 weeks, release predatory mites immediately',
    imageAnalysis: 'Look for yellow speckling patterns, webbing clusters, mite colonies',
    affectedAreas: 'Undersides of leaves, new growth areas'
  },
  {
    id: 2,
    name: 'Powdery Mildew',
    type: 'Fungal',
    category: 'Fungus',
    severity: 'Medium',
    symptoms: 'White powdery coating on leaves, stems, and buds, leaf curling, reduced photosynthesis',
    treatment: 'Sulfur spray, milk solution (1:3 milk to water), copper fungicide, potassium bicarbonate spray',
    prevention: 'Maintain good airflow, proper spacing, 50-60% humidity, avoid leaf wetness',
    lifecycle: 'Spores germinate in 7-10 days under favorable conditions',
    favorableConditions: 'High humidity (50-70%), moderate temperatures (20-25°C/68-77°F), poor airflow',
    organicControl: 'Milk spray, neem oil, potassium bicarbonate, sulfur',
    chemicalControl: 'Sulfur, copper fungicides, systemic fungicides',
    detectionTips: 'Check white spots with magnifying glass, appears first on older leaves',
    treatmentSchedule: 'Apply treatment every 5-7 days until symptoms disappear',
    imageAnalysis: 'White powdery spots that can be rubbed off, spreading pattern analysis',
    affectedAreas: 'Leaf surfaces, stems, bud surfaces'
  },
  {
    id: 3,
    name: 'Root Rot',
    type: 'Fungal',
    category: 'Root Disease',
    severity: 'High',
    symptoms: 'Wilting despite moist soil, yellowing leaves, brown mushy roots, stunted growth, leaf drop',
    treatment: 'Hydrogen peroxide (3% solution) root drench, transplant into fresh soil, beneficial bacteria inoculation',
    prevention: 'Proper drainage, avoid overwatering, use well-draining soil, maintain healthy root zone',
    lifecycle: 'Fungal spores germinate in wet conditions, spread through contaminated soil/tools',
    favorableConditions: 'Overwatering, poor drainage, compacted soil, high moisture',
    organicControl: 'Hydrogen peroxide, beneficial microbes, cinnamon powder, neem oil',
    chemicalControl: 'Systemic fungicides like mefenoxam, metalaxyl',
    detectionTips: 'Check root color (healthy = white, rotted = brown/black), soil smell test',
    treatmentSchedule: 'Immediate treatment required, monitor weekly for 3 weeks',
    imageAnalysis: 'Root color analysis, soil moisture indicators, wilting patterns',
    affectedAreas: 'Root system, soil, lower stems'
  },
  {
    id: 4,
    name: 'Aphids',
    type: 'Pest',
    category: 'Insect',
    severity: 'Medium',
    symptoms: 'Sticky honeydew residue, curling leaves, yellowing, ants present, stunted growth',
    treatment: 'Insecticidal soap, neem oil spray, ladybug release, beneficial nematodes',
    prevention: 'Use beneficial insects, neem oil prophylaxis, companion planting, monitor regularly',
    lifecycle: 'Egg → Nymph → Adult (7-10 days), multiple generations per season',
    favorableConditions: 'Moderate temperatures (20-25°C/68-77°F), new growth',
    organicControl: 'Neem oil, insecticidal soap, beneficial insects (ladybugs, lacewings)',
    chemicalControl: 'Pyrethroids, systemic insecticides',
    detectionTips: 'Check undersides of leaves, look for ant activity, use yellow sticky traps',
    treatmentSchedule: 'Apply every 3 days for 2 weeks, release beneficial insects weekly',
    imageAnalysis: 'Cluster detection on leaf undersides, honeydew residue patterns',
    affectedAreas: 'Undersides of leaves, new growth, stems'
  },
  {
    id: 5,
    name: 'Bud Rot (Botrytis)',
    type: 'Fungal',
    category: 'Bud Disease',
    severity: 'Critical',
    symptoms: 'Gray mold on dense buds, brown necrotic tissue, bud collapse, musty smell',
    treatment: 'Remove affected buds immediately, increase airflow, reduce humidity, copper spray',
    prevention: 'Low humidity (<40%), excellent airflow, proper spacing, avoid overwatering',
    lifecycle: 'Spores germinate in 12-24 hours under high humidity conditions',
    favorableConditions: 'High humidity (>60%), cool temperatures (15-20°C/59-68°F), dense buds',
    organicControl: 'Copper sprays, sulfur, beneficial microbes, proper environmental control',
    chemicalControl: 'Botryticides, systemic fungicides',
    detectionTips: 'Check bud centers with flashlight, look for brown/gray patches',
    treatmentSchedule: 'Immediate removal of affected buds, daily monitoring for 2 weeks',
    imageAnalysis: 'Color changes in bud cores, mold pattern recognition',
    affectedAreas: 'Dense bud sites, lower buds, areas with poor airflow'
  },
  {
    id: 6,
    name: 'Thrips',
    type: 'Pest',
    category: 'Insect',
    severity: 'Medium',
    symptoms: 'Silver patches on leaves, black dots (frass), curled leaves, stunted growth',
    treatment: 'Spinosad spray, blue sticky traps, predatory mites (Amblyseius cucumeris), neem oil',
    prevention: 'Blue sticky traps, beneficial insects, proper humidity, quarantine new plants',
    lifecycle: 'Egg → Larva → Pupa → Adult (14-20 days)',
    favorableConditions: 'Warm temperatures, moderate humidity',
    organicControl: 'Spinosad, beneficial insects, neem oil, sticky traps',
    chemicalControl: 'Systemic insecticides, pyrethroids',
    detectionTips: 'Tap leaves over white paper to see falling insects, use magnifying glass',
    treatmentSchedule: 'Apply every 4-5 days for 2-3 weeks',
    imageAnalysis: 'Silver patch patterns, black frass detection',
    affectedAreas: 'Leaf surfaces, new growth, flowers'
  },
  {
    id: 7,
    name: 'Fungus Gnats',
    type: 'Pest',
    category: 'Fly',
    severity: 'Low',
    symptoms: 'Small black flies near soil, larvae damage roots, reduced growth',
    treatment: 'Sticky traps, hydrogen peroxide soil drench, beneficial nematodes, sand top layer',
    prevention: 'Let soil dry between waterings, use sand top layer, sticky traps',
    lifecycle: 'Egg → Larva → Pupa → Adult (3-4 weeks)',
    favorableConditions: 'Moist soil surface, decaying organic matter',
    organicControl: 'Beneficial nematodes, sticky traps, hydrogen peroxide',
    chemicalControl: 'Bti (Bacillus thuringiensis israelensis)',
    detectionTips: 'Yellow sticky traps, check soil surface for larvae',
    treatmentSchedule: 'Weekly sticky trap replacement, soil drench every 7 days',
    imageAnalysis: 'Adult fly detection patterns, soil surface inspection',
    affectedAreas: 'Soil surface, root zone'
  },
  {
    id: 8,
    name: 'Nutrient Burn',
    type: 'Environmental',
    category: 'Nutrient Issue',
    severity: 'Medium',
    symptoms: 'Yellow/brown leaf tips and edges, clawing leaves, nutrient lockout',
    treatment: 'Flush with pH water (6.0-6.5), reduce nutrient concentration, increase water only',
    prevention: 'Monitor EC levels, follow nutrient schedule, check runoff EC',
    lifecycle: 'N/A - environmental issue',
    favorableConditions: 'Overfertilization, high EC levels, pH imbalances',
    organicControl: 'Proper pH management, organic nutrients, beneficial microbes',
    chemicalControl: 'Proper nutrient management',
    detectionTips: 'Check EC/TDS levels, examine leaf tip burn patterns',
    treatmentSchedule: 'Immediate flush, monitor recovery over 1-2 weeks',
    imageAnalysis: 'Tip burn pattern analysis, clawing detection',
    affectedAreas: 'Leaf tips and edges, new growth'
  },
  {
    id: 9,
    name: 'Heat Stress',
    type: 'Environmental',
    category: 'Environmental',
    severity: 'Medium',
    symptoms: 'Leaves curling up at edges (taco-ing), yellowing, wilting, reduced growth',
    treatment: 'Lower temperature, increase airflow, check light distance, provide shade',
    prevention: 'Maintain 22-28°C (72-82°F), proper ventilation, monitor light intensity',
    lifecycle: 'N/A - environmental issue',
    favorableConditions: 'Temperatures above 30°C (86°F), poor airflow',
    organicControl: 'Environmental management, proper ventilation',
    chemicalControl: 'N/A',
    detectionTips: 'Temperature monitoring, leaf curling patterns',
    treatmentSchedule: 'Immediate temperature adjustment, monitor for 3-5 days',
    imageAnalysis: 'Leaf curling patterns, heat stress indicators',
    affectedAreas: 'Upper leaves, areas closest to light source'
  },
  {
    id: 10,
    name: 'Light Burn',
    type: 'Environmental',
    category: 'Environmental',
    severity: 'Medium',
    symptoms: 'Yellowing at top of plant, bleached leaves, upward curling, brown patches',
    treatment: 'Increase light distance, reduce intensity, adjust light schedule',
    prevention: 'Proper light distance, use PAR meter, gradual intensity increases',
    lifecycle: 'N/A - environmental issue',
    favorableConditions: 'Light too close, high intensity LEDs, long photoperiod',
    organicControl: 'Proper light management',
    chemicalControl: 'N/A',
    detectionTips: 'Check light distance, examine upper leaf damage',
    treatmentSchedule: 'Immediate adjustment, monitor recovery for 1-2 weeks',
    imageAnalysis: 'Upper leaf damage patterns, bleaching detection',
    affectedAreas: 'Upper canopy, areas closest to light'
  }
];

// Treatment tracking interface
interface TreatmentRecord {
  id: string;
  pestDiseaseId: number;
  pestDiseaseName: string;
  treatmentApplied: string;
  date: string;
  nextApplication: string;
  status: 'pending' | 'completed' | 'in-progress';
  notes: string;
}

export default function PestDiseaseIdentifier() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [selectedPestDisease, setSelectedPestDisease] = useState<typeof pestDiseaseDatabase[0] | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [treatmentRecords, setTreatmentRecords] = useState<TreatmentRecord[]>([]);
  const [newTreatment, setNewTreatment] = useState({
    pestDiseaseId: 0,
    treatmentApplied: '',
    notes: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Filter pest/disease database based on search and filters
  const filteredDatabase = pestDiseaseDatabase.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.symptoms.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.treatment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'All' || item.type === selectedType;
    const matchesSeverity = selectedSeverity === 'All' || item.severity === selectedSeverity;

    return matchesSearch && matchesType && matchesSeverity;
  });

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        analyzeImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Analyze uploaded image
  const analyzeImage = (imageData: string) => {
    setIsAnalyzing(true);
    setAnalysisResult('Analyzing image for pest and disease indicators...');

    // Simulate AI analysis
    setTimeout(() => {
      const findings = [
        'Possible nutrient deficiency detected - Yellowing between veins suggests magnesium deficiency',
        'Potential early signs of powdery mildew - White patches detected on leaf surfaces',
        'Spider mite activity suspected - Small speckling pattern observed',
        'Healthy plant tissue - No significant issues detected',
        'Environmental stress indicators - Leaf curling suggests heat or water stress'
      ];

      setAnalysisResult(findings[Math.floor(Math.random() * findings.length)]);
      setIsAnalyzing(false);
    }, 2000);
  };

  // Add new treatment record
  const addTreatmentRecord = () => {
    if (!newTreatment.pestDiseaseId || !newTreatment.treatmentApplied) return;

    const pestDisease = pestDiseaseDatabase.find(p => p.id === newTreatment.pestDiseaseId);
    if (!pestDisease) return;

    const record: TreatmentRecord = {
      id: Date.now().toString(),
      pestDiseaseId: newTreatment.pestDiseaseId,
      pestDiseaseName: pestDisease.name,
      treatmentApplied: newTreatment.treatmentApplied,
      date: new Date().toISOString().split('T')[0],
      nextApplication: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
      notes: newTreatment.notes
    };

    setTreatmentRecords([...treatmentRecords, record]);
    setNewTreatment({ pestDiseaseId: 0, treatmentApplied: '', notes: '' });
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Pest': return <Bug className="h-4 w-4" />;
      case 'Fungal': return <AlertTriangle className="h-4 w-4" />;
      case 'Environmental': return <Eye className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-lime-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-lime-500 to-emerald-600 rounded-xl">
                <Bug className="h-8 w-8 text-emerald-900" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-emerald-100">Pest & Disease Identifier</h1>
                <p className="text-emerald-300">Comprehensive plant health management system</p>
              </div>
            </div>
            <Button
              onClick={() => window.history.back()}
              className="bg-emerald-700 hover:bg-emerald-600 text-emerald-100"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        <Tabs defaultValue="identifier" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-emerald-800/50 border border-emerald-700">
            <TabsTrigger value="identifier" className="text-emerald-200 data-[state=active]:bg-emerald-700">
              <Search className="h-4 w-4 mr-2" />
              Identifier
            </TabsTrigger>
            <TabsTrigger value="visual" className="text-emerald-200 data-[state=active]:bg-emerald-700">
              <Camera className="h-4 w-4 mr-2" />
              Visual Analysis
            </TabsTrigger>
            <TabsTrigger value="treatment" className="text-emerald-200 data-[state=active]:bg-emerald-700">
              <Heart className="h-4 w-4 mr-2" />
              Treatment Tracker
            </TabsTrigger>
            <TabsTrigger value="library" className="text-emerald-200 data-[state=active]:bg-emerald-700">
              <Sprout className="h-4 w-4 mr-2" />
              Knowledge Base
            </TabsTrigger>
          </TabsList>

          {/* Identifier Tab */}
          <TabsContent value="identifier" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Search and Filters */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="bg-emerald-800/50 border-emerald-700">
                  <CardHeader>
                    <CardTitle className="text-emerald-200 flex items-center">
                      <Filter className="h-5 w-5 mr-2" />
                      Search & Filters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-emerald-300 text-sm">Search Symptoms</Label>
                      <Input
                        placeholder="e.g., yellow spots, webbing..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-emerald-700/50 border-emerald-600 text-emerald-200 placeholder-emerald-400"
                      />
                    </div>

                    <div>
                      <Label className="text-emerald-300 text-sm">Type</Label>
                      <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="w-full bg-emerald-700/50 border-emerald-600 text-emerald-200 rounded px-3 py-2"
                      >
                        <option value="All">All Types</option>
                        <option value="Pest">Pests</option>
                        <option value="Fungal">Fungal</option>
                        <option value="Environmental">Environmental</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-emerald-300 text-sm">Severity</Label>
                      <select
                        value={selectedSeverity}
                        onChange={(e) => setSelectedSeverity(e.target.value)}
                        className="w-full bg-emerald-700/50 border-emerald-600 text-emerald-200 rounded px-3 py-2"
                      >
                        <option value="All">All Severities</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="bg-emerald-800/50 border-emerald-700">
                  <CardHeader>
                    <CardTitle className="text-emerald-200 text-sm">Database Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-300">Total Entries:</span>
                      <span className="text-emerald-200 font-medium">{pestDiseaseDatabase.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-300">Filtered Results:</span>
                      <span className="text-emerald-200 font-medium">{filteredDatabase.length}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Results List */}
              <div className="lg:col-span-1 space-y-3">
                <h3 className="text-emerald-200 font-medium flex items-center">
                  <Search className="h-5 w-5 mr-2" />
                  Search Results ({filteredDatabase.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredDatabase.map((item) => (
                    <Card
                      key={item.id}
                      className="bg-emerald-800/50 border-emerald-700 cursor-pointer hover:bg-emerald-800/70 transition-all"
                      onClick={() => setSelectedPestDisease(item)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getTypeIcon(item.type)}
                            <h4 className="font-medium text-emerald-200">{item.name}</h4>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${getSeverityColor(item.severity)}`} />
                        </div>
                        <Badge variant="secondary" className="text-xs bg-emerald-700/50 text-emerald-300 mb-2">
                          {item.type} • {item.category}
                        </Badge>
                        <p className="text-xs text-emerald-400 line-clamp-2">{item.symptoms}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Detailed View */}
              <div className="lg:col-span-1">
                {selectedPestDisease ? (
                  <Card className="bg-emerald-800/50 border-emerald-700">
                    <CardHeader>
                      <CardTitle className="text-emerald-200 flex items-center justify-between">
                        <span>{selectedPestDisease.name}</span>
                        <div className={`w-3 h-3 rounded-full ${getSeverityColor(selectedPestDisease.severity)}`} />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h5 className="font-medium text-lime-300 mb-1">Type & Category</h5>
                        <div className="flex space-x-2">
                          <Badge variant="outline" className="text-xs border-emerald-600 text-emerald-300">
                            {selectedPestDisease.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs border-emerald-600 text-emerald-300">
                            {selectedPestDisease.category}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-lime-300 mb-1">Symptoms</h5>
                        <p className="text-sm text-emerald-200">{selectedPestDisease.symptoms}</p>
                      </div>

                      <div>
                        <h5 className="font-medium text-lime-300 mb-1">Treatment</h5>
                        <p className="text-sm text-emerald-200">{selectedPestDisease.treatment}</p>
                      </div>

                      <div>
                        <h5 className="font-medium text-lime-300 mb-1">Prevention</h5>
                        <p className="text-sm text-emerald-200">{selectedPestDisease.prevention}</p>
                      </div>

                      <Separator className="bg-emerald-700" />

                      <div>
                        <h5 className="font-medium text-lime-300 mb-1">Lifecycle</h5>
                        <p className="text-sm text-emerald-200">{selectedPestDisease.lifecycle}</p>
                      </div>

                      <div>
                        <h5 className="font-medium text-lime-300 mb-1">Favorable Conditions</h5>
                        <p className="text-sm text-emerald-200">{selectedPestDisease.favorableConditions}</p>
                      </div>

                      <div>
                        <h5 className="font-medium text-lime-300 mb-1">Detection Tips</h5>
                        <p className="text-sm text-emerald-200">{selectedPestDisease.detectionTips}</p>
                      </div>

                      <div>
                        <h5 className="font-medium text-lime-300 mb-1">Treatment Schedule</h5>
                        <p className="text-sm text-emerald-200">{selectedPestDisease.treatmentSchedule}</p>
                      </div>

                      <Button
                        onClick={() => {
                          setNewTreatment({
                            pestDiseaseId: selectedPestDisease.id,
                            treatmentApplied: selectedPestDisease.organicControl,
                            notes: ''
                          });
                        }}
                        className="w-full bg-gradient-to-r from-lime-500 to-emerald-600 hover:from-lime-400 hover:to-emerald-500 text-emerald-900 font-medium"
                      >
                        Add Treatment Record
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-emerald-800/50 border-emerald-700">
                    <CardContent className="p-8 text-center">
                      <Search className="h-12 w-12 mx-auto text-emerald-400 mb-4" />
                      <h3 className="text-emerald-200 font-medium mb-2">Select a Pest or Disease</h3>
                      <p className="text-emerald-400 text-sm">
                        Click on an item from the search results to view detailed information
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Visual Analysis Tab */}
          <TabsContent value="visual" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-emerald-800/50 border-emerald-700">
                <CardHeader>
                  <CardTitle className="text-emerald-200 flex items-center">
                    <Camera className="h-5 w-5 mr-2" />
                    Image Upload
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-emerald-600 rounded-lg p-8 text-center">
                    {uploadedImage ? (
                      <div className="space-y-4">
                        <img
                          src={uploadedImage}
                          alt="Uploaded plant"
                          className="max-w-full h-64 mx-auto rounded-lg object-cover"
                        />
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          variant="outline"
                          className="border-emerald-600 text-emerald-300 hover:bg-emerald-700"
                        >
                          Upload Different Image
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Camera className="h-12 w-12 mx-auto text-emerald-400" />
                        <h3 className="text-emerald-200 font-medium">Upload Plant Image</h3>
                        <p className="text-emerald-400 text-sm">
                          Take a clear photo of the affected area for AI analysis
                        </p>
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-gradient-to-r from-lime-500 to-emerald-600 hover:from-lime-400 hover:to-emerald-500 text-emerald-900 font-medium"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Choose Image
                        </Button>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </CardContent>
              </Card>

              <Card className="bg-emerald-800/50 border-emerald-700">
                <CardHeader>
                  <CardTitle className="text-emerald-200 flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    Analysis Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isAnalyzing ? (
                    <div className="text-center py-8">
                      <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-emerald-300">Analyzing image...</p>
                    </div>
                  ) : analysisResult ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-700/30 rounded-lg">
                        <h4 className="font-medium text-lime-300 mb-2">AI Analysis</h4>
                        <p className="text-emerald-200">{analysisResult}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          onClick={() => {
                            // Find matching pests based on analysis
                            const matching = pestDiseaseDatabase.filter(p =>
                              p.symptoms.toLowerCase().includes('yellow') ||
                              p.symptoms.toLowerCase().includes('white') ||
                              p.symptoms.toLowerCase().includes('speckling')
                            );
                            setSelectedPestDisease(matching[0] || null);
                          }}
                          variant="outline"
                          className="border-emerald-600 text-emerald-300 hover:bg-emerald-700"
                        >
                          View Matching Issues
                        </Button>
                        <Button
                          onClick={() => {
                            setAnalysisResult(null);
                            setUploadedImage(null);
                          }}
                          variant="outline"
                          className="border-emerald-600 text-emerald-300 hover:bg-emerald-700"
                        >
                          Analyze Another
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Eye className="h-12 w-12 mx-auto text-emerald-400 mb-4" />
                      <h3 className="text-emerald-200 font-medium mb-2">No Analysis Yet</h3>
                      <p className="text-emerald-400 text-sm">
                        Upload an image to receive AI-powered analysis of potential pests and diseases
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Treatment Tracker Tab */}
          <TabsContent value="treatment" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-emerald-800/50 border-emerald-700">
                <CardHeader>
                  <CardTitle className="text-emerald-200 flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Add Treatment Record
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-emerald-300 text-sm">Issue</Label>
                    <select
                      value={newTreatment.pestDiseaseId}
                      onChange={(e) => setNewTreatment({...newTreatment, pestDiseaseId: parseInt(e.target.value)})}
                      className="w-full bg-emerald-700/50 border-emerald-600 text-emerald-200 rounded px-3 py-2"
                    >
                      <option value={0}>Select an issue...</option>
                      {pestDiseaseDatabase.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-emerald-300 text-sm">Treatment Applied</Label>
                    <Input
                      placeholder="e.g., Neem oil spray 2ml/L"
                      value={newTreatment.treatmentApplied}
                      onChange={(e) => setNewTreatment({...newTreatment, treatmentApplied: e.target.value})}
                      className="bg-emerald-700/50 border-emerald-600 text-emerald-200 placeholder-emerald-400"
                    />
                  </div>

                  <div>
                    <Label className="text-emerald-300 text-sm">Notes</Label>
                    <textarea
                      placeholder="Additional notes about the treatment..."
                      value={newTreatment.notes}
                      onChange={(e) => setNewTreatment({...newTreatment, notes: e.target.value})}
                      className="w-full bg-emerald-700/50 border-emerald-600 text-emerald-200 rounded px-3 py-2 placeholder-emerald-400 min-h-[80px]"
                    />
                  </div>

                  <Button
                    onClick={addTreatmentRecord}
                    className="w-full bg-gradient-to-r from-lime-500 to-emerald-600 hover:from-lime-400 hover:to-emerald-500 text-emerald-900 font-medium"
                    disabled={!newTreatment.pestDiseaseId || !newTreatment.treatmentApplied}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Add Treatment Record
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-emerald-800/50 border-emerald-700">
                <CardHeader>
                  <CardTitle className="text-emerald-200 flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Treatment History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {treatmentRecords.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {treatmentRecords.map((record) => (
                        <div key={record.id} className="p-3 bg-emerald-700/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-emerald-200">{record.pestDiseaseName}</h4>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                record.status === 'completed' ? 'bg-green-600/50 text-green-200' :
                                record.status === 'in-progress' ? 'bg-yellow-600/50 text-yellow-200' :
                                'bg-red-600/50 text-red-200'
                              }`}
                            >
                              {record.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-emerald-300 mb-1">{record.treatmentApplied}</p>
                          <div className="flex justify-between text-xs text-emerald-400">
                            <span>Date: {record.date}</span>
                            <span>Next: {record.nextApplication}</span>
                          </div>
                          {record.notes && (
                            <p className="text-xs text-emerald-400 mt-2 italic">{record.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 mx-auto text-emerald-400 mb-4" />
                      <h3 className="text-emerald-200 font-medium mb-2">No Treatment Records</h3>
                      <p className="text-emerald-400 text-sm">
                        Start tracking your treatments to monitor plant health progress
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Knowledge Base Tab */}
          <TabsContent value="library" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pestDiseaseDatabase.map((item) => (
                <Card key={item.id} className="bg-emerald-800/50 border-emerald-700">
                  <CardHeader>
                    <CardTitle className="text-emerald-200 flex items-center justify-between">
                      <span className="text-sm">{item.name}</span>
                      <div className={`w-2 h-2 rounded-full ${getSeverityColor(item.severity)}`} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex space-x-2">
                      <Badge variant="outline" className="text-xs border-emerald-600 text-emerald-300">
                        {item.type}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-emerald-600 text-emerald-300">
                        {item.severity}
                      </Badge>
                    </div>

                    <div>
                      <h5 className="font-medium text-lime-300 text-xs mb-1">Quick Identification</h5>
                      <p className="text-xs text-emerald-200">{item.symptoms}</p>
                    </div>

                    <div>
                      <h5 className="font-medium text-lime-300 text-xs mb-1">Organic Control</h5>
                      <p className="text-xs text-emerald-200">{item.organicControl}</p>
                    </div>

                    <div>
                      <h5 className="font-medium text-lime-300 text-xs mb-1">Prevention</h5>
                      <p className="text-xs text-emerald-200">{item.prevention}</p>
                    </div>

                    <Button
                      onClick={() => setSelectedPestDisease(item)}
                      variant="outline"
                      className="w-full border-emerald-600 text-emerald-300 hover:bg-emerald-700 text-xs"
                    >
                      View Full Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}