import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Plant,
  PlantStrain,
  PlantFilter,
  PlantFormData,
  PlantManagementState,
  PlantTab,
  GrowthStage,
  HealthStatus
} from './types';
import plantsAPI from './api-client';

// Import UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

const Separator: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div role="separator" className={`h-px w-full bg-gray-800 ${className}`} />
);

const ScrollArea: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = '' }) => (
  <div className={`overflow-auto ${className}`}>{children}</div>
);

// Import plant subcomponents
import PlantGrid from './components/PlantGrid';
import PlantList from './components/PlantList';
import PlantForm from './components/PlantForm';
import PlantDetails from './components/PlantDetails';
import PlantSearch from './components/PlantSearch';
import PlantInventory from './components/PlantInventory';
import StrainManager from './components/StrainManager';
import PlantAnalysis from './components/PlantAnalysis';
import PlantTasks from './components/PlantTasks';

// Import icons
import {
  Sprout,
  Search,
  Filter,
  Plus,
  Grid3X3,
  List,
  RefreshCw,
  Settings,
  Activity,
  Database,
  BarChart3,
  CheckSquare,
  Leaf,
  AlertTriangle,
  TrendingUp,
  Download,
  Upload
} from 'lucide-react';

const Plants: React.FC = () => {
  const navigate = useNavigate();
  // State management
  const [state, setState] = useState<PlantManagementState>({
    plants: [],
    strains: [],
    inventory: {
      totalPlants: 0,
      activePlants: 0,
      archivedPlants: 0,
      byStage: {} as Record<GrowthStage, number>,
      byHealth: {} as Record<HealthStatus, number>,
      byLocation: {},
      byStrain: {},
      estimatedYield: 0,
      averageHealth: 0,
      upcomingTasks: 0,
      overdueTasks: 0
    },
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    filter: {},
    viewMode: 'grid',
    activeTab: 'overview',
    error: undefined,
    success: undefined
  });

  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [showPlantForm, setShowPlantForm] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const inventoryFileInput = useRef<HTMLInputElement>(null);
  const [autoRefreshPlants, setAutoRefreshPlants] = useState(true);
  const [showArchivedPlants, setShowArchivedPlants] = useState(false);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const [plantsResult, strainsResult, inventoryResult] = await Promise.allSettled([
        plantsAPI.getPlants({ isActive: showArchivedPlants ? undefined : true, includeArchived: showArchivedPlants }),
        plantsAPI.getStrains(),
        plantsAPI.getPlantInventory()
      ]);

      const failures = [
        plantsResult.status === 'rejected' ? 'plants' : null,
        strainsResult.status === 'rejected' ? 'strains' : null,
        inventoryResult.status === 'rejected' ? 'inventory' : null,
      ].filter((section): section is string => Boolean(section));

      setState(prev => ({
        ...prev,
        ...(plantsResult.status === 'fulfilled' ? { plants: plantsResult.value.plants } : {}),
        ...(strainsResult.status === 'fulfilled' ? { strains: strainsResult.value } : {}),
        ...(inventoryResult.status === 'fulfilled' ? { inventory: inventoryResult.value } : {}),
        isLoading: false,
        error: failures.length > 0
          ? `Some plant data could not be loaded (${failures.join(', ')}). Try Refresh to retry.`
          : undefined,
      }));

      if (failures.length > 0) {
        console.warn('Partial plant data load:', failures);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load data'
      }));
    }
  }, [showArchivedPlants]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!autoRefreshPlants) return;
    const refreshTimer = window.setInterval(() => {
      void loadInitialData();
    }, 60_000);
    return () => window.clearInterval(refreshTimer);
  }, [autoRefreshPlants, loadInitialData]);

  // Event handlers
  const handleCreatePlant = async (formData: PlantFormData) => {
    setState(prev => ({ ...prev, isCreating: true, error: undefined }));

    try {
      const newPlant = await plantsAPI.createPlant(formData);
      setState(prev => ({
        ...prev,
        plants: [...prev.plants, newPlant],
        isCreating: false,
        success: 'Plant created successfully'
      }));
      setShowPlantForm(false);

      // Update inventory
      const updatedInventory = await plantsAPI.getPlantInventory();
      setState(prev => ({ ...prev, inventory: updatedInventory }));
    } catch (error) {
      console.error('Failed to create plant:', error);
      setState(prev => ({
        ...prev,
        isCreating: false,
        error: error instanceof Error ? error.message : 'Failed to create plant'
      }));
    }
  };

  const handleUpdatePlant = async (id: string, updates: Partial<Plant>) => {
    setState(prev => ({ ...prev, isUpdating: true, error: undefined }));

    try {
      const updatedPlant = await plantsAPI.updatePlant(id, updates);
      setState(prev => ({
        ...prev,
        plants: prev.plants.map(plant =>
          plant.id === id ? updatedPlant : plant
        ),
        isUpdating: false,
        success: 'Plant updated successfully'
      }));
      setEditingPlant(null);
    } catch (error) {
      console.error('Failed to update plant:', error);
      setState(prev => ({
        ...prev,
        isUpdating: false,
        error: error instanceof Error ? error.message : 'Failed to update plant'
      }));
    }
  };

  const handleDeletePlant = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plant? This action cannot be undone.')) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      await plantsAPI.deletePlant(id);
      setState(prev => ({
        ...prev,
        plants: prev.plants.filter(plant => plant.id !== id),
        isLoading: false,
        success: 'Plant deleted successfully'
      }));
      setSelectedPlant(null);
    } catch (error) {
      console.error('Failed to delete plant:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete plant'
      }));
    }
  };

  const handleFilterChange = (filter: PlantFilter) => {
    setState(prev => ({ ...prev, filter }));
  };

  const handleSearch = async (query: string) => {
    const newFilter = { ...state.filter, search: query, includeArchived: showArchivedPlants };
    setState(prev => ({ ...prev, filter: newFilter, isLoading: true }));

    try {
      const searchResults = await plantsAPI.getPlants(newFilter);
      setState(prev => ({
        ...prev,
        plants: searchResults.plants,
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to search plants:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to search plants'
      }));
    }
  };

  const handleRefresh = () => {
    loadInitialData();
  };

  const handleTabChange = (tab: PlantTab) => {
    setState(prev => ({ ...prev, activeTab: tab }));
    setSelectedPlant(null);
    setEditingPlant(null);
    setShowPlantForm(false);
  };

  const handleSelectPlant = (plant: Plant) => {
    setSelectedPlant(plant);
    setState(prev => ({ ...prev, activeTab: 'details' }));
  };

  const handleEditPlant = (plant: Plant) => {
    setEditingPlant(plant);
    setShowPlantForm(true);
  };

  const handleAnalyzePlant = async (plantId: string) => {
    navigate(`/scanner?plantId=${encodeURIComponent(plantId)}`);
  };

  const exportInventory = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), plants: state.plants }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plant-inventory-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importInventory = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const importedPlants = Array.isArray(parsed) ? parsed : parsed?.plants;
      if (!Array.isArray(importedPlants)) throw new Error('The file must contain a plants array.');
      const result = await plantsAPI.importPlants(file);
      await loadInitialData();
      setState((prev) => ({
        ...prev,
        success: `Imported ${result.imported} plants${result.errors.length ? ` (${result.errors.length} skipped)` : ''}.`,
        error: result.errors.length ? result.errors.join('; ') : undefined
      }));
    } catch (error) {
      setState((prev) => ({ ...prev, error: error instanceof Error ? error.message : 'Invalid inventory file', success: undefined }));
    }
  };

  // Calculate derived statistics
  const activePlants = state.plants.filter(plant => plant.isActive);
  const criticalPlants = activePlants.filter(plant =>
    plant.health.status === 'critical' || plant.health.status === 'poor'
  );
  const averageHealthScore = activePlants.length > 0
    ? activePlants.reduce((sum, plant) => sum + plant.health.score, 0) / activePlants.length
    : 0;

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-[#0f1419]">
      {/* Header */}
      <div className="border-b border-gray-800 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Sprout className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Plant Management</h1>
              <p className="text-sm text-gray-400">Monitor and manage your cannabis plants</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={state.isLoading}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${state.isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              onClick={() => setShowPlantForm(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Plant
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Sidebar */}
        <div className="w-full shrink-0 border-b border-gray-800 bg-[#181b21] p-3 lg:w-64 lg:border-b-0 lg:border-r lg:p-4">
          <Tabs
            value={state.activeTab}
            onValueChange={handleTabChange}
            orientation="vertical"
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 gap-2 bg-transparent sm:grid-cols-4 lg:grid-cols-1">
              <TabsTrigger
                value="overview"
                className="justify-start text-gray-400 hover:text-white data-[state=active]:text-emerald-400 data-[state=active]:bg-emerald-500/10"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="plants"
                className="justify-start text-gray-400 hover:text-white data-[state=active]:text-emerald-400 data-[state=active]:bg-emerald-500/10"
              >
                <Leaf className="w-4 h-4 mr-2" />
                Plants
              </TabsTrigger>
              <TabsTrigger
                value="strains"
                className="justify-start text-gray-400 hover:text-white data-[state=active]:text-emerald-400 data-[state=active]:bg-emerald-500/10"
              >
                <Database className="w-4 h-4 mr-2" />
                Strains
              </TabsTrigger>
              <TabsTrigger
                value="analysis"
                className="justify-start text-gray-400 hover:text-white data-[state=active]:text-emerald-400 data-[state=active]:bg-emerald-500/10"
              >
                <Activity className="w-4 h-4 mr-2" />
                Analysis
              </TabsTrigger>
              <TabsTrigger
                value="inventory"
                className="justify-start text-gray-400 hover:text-white data-[state=active]:text-emerald-400 data-[state=active]:bg-emerald-500/10"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Inventory
              </TabsTrigger>
              <TabsTrigger
                value="tasks"
                className="justify-start text-gray-400 hover:text-white data-[state=active]:text-emerald-400 data-[state=active]:bg-emerald-500/10"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Tasks
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="justify-start text-gray-400 hover:text-white data-[state=active]:text-emerald-400 data-[state=active]:bg-emerald-500/10"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Quick Stats */}
          <div className="mt-4 grid grid-cols-2 gap-3 lg:mt-6 lg:grid-cols-1 lg:space-y-4">
            <div className="bg-[#0f1419] rounded-lg p-3 border border-gray-800">
              <div className="text-xs text-gray-400 mb-1">Active Plants</div>
              <div className="text-xl font-bold text-white">{state.inventory.activePlants}</div>
            </div>

            <div className="bg-[#0f1419] rounded-lg p-3 border border-gray-800">
              <div className="text-xs text-gray-400 mb-1">Avg Health</div>
              <div className="text-xl font-bold text-emerald-400">
                {averageHealthScore.toFixed(1)}%
              </div>
            </div>

            {criticalPlants.length > 0 && (
              <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
                <div className="flex items-center text-xs text-red-400 mb-1">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Needs Attention
                </div>
                <div className="text-xl font-bold text-red-400">{criticalPlants.length}</div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 sm:p-6">
              {/* Error/Success Messages */}
              <AnimatePresence>
                {state.error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
                  >
                    {state.error}
                  </motion.div>
                )}
                {state.success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm"
                  >
                    {state.success}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tab Content */}
              {state.activeTab === 'overview' && (
                <div className="space-y-6">
                  <PlantInventory inventory={state.inventory} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-[#181b21] border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-white">Recent Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {state.plants.length === 0 ? (
                          <div className="space-y-3"><p className="text-sm text-gray-400">No plant activity yet.</p><Button size="sm" onClick={() => setShowPlantForm(true)} className="bg-emerald-600 hover:bg-emerald-500">Add your first plant</Button></div>
                        ) : (
                          <div className="space-y-3">{state.plants.slice(0, 4).map((plant) => <div key={plant.id} className="flex items-center justify-between border-b border-gray-800 pb-2 text-sm"><span className="text-gray-300">{plant.name}</span><span className="text-gray-500 capitalize">{plant.stage}</span></div>)}</div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="bg-[#181b21] border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-white">Health Trends</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {activePlants.length === 0 ? <p className="text-sm text-gray-400">Health trends will appear after plants are added and analyzed.</p> : <div className="space-y-3">{activePlants.slice(0, 5).map((plant) => <div key={plant.id}><div className="mb-1 flex justify-between text-xs"><span className="text-gray-300">{plant.name}</span><span className="text-emerald-400">{plant.health.score.toFixed(0)}%</span></div><div className="h-2 rounded-full bg-gray-800"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, plant.health.score))}%` }} /></div></div>)}</div>}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {state.activeTab === 'plants' && (
                <div className="space-y-6">
                  {/* Search and Filter */}
                  <PlantSearch
                    filter={state.filter}
                    onFilterChange={handleFilterChange}
                    onSearch={handleSearch}
                    onClear={() => handleFilterChange({})}
                    strains={state.strains}
                    isLoading={state.isLoading}
                  />

                  {/* View Mode Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={state.viewMode === 'grid' ? 'default' : 'outline'}
                        size="sm"
                        type="button"
                        aria-label="Grid view"
                        title="Grid view"
                        onClick={() => setState(prev => ({ ...prev, viewMode: 'grid' }))}
                        className="border-gray-700"
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={state.viewMode === 'list' ? 'default' : 'outline'}
                        size="sm"
                        type="button"
                        aria-label="List view"
                        title="List view"
                        onClick={() => setState(prev => ({ ...prev, viewMode: 'list' }))}
                        className="border-gray-700"
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="text-sm text-gray-400">
                      {state.plants.length} plants found
                    </div>
                  </div>

                  {/* Plants Display */}
                  {state.viewMode === 'grid' ? (
                    <PlantGrid
                      plants={state.plants}
                      onSelect={handleSelectPlant}
                      onEdit={handleEditPlant}
                      onDelete={handleDeletePlant}
                      onAnalyze={handleAnalyzePlant}
                      isLoading={state.isLoading}
                    />
                  ) : (
                    <PlantList
                      plants={state.plants}
                      onSelect={handleSelectPlant}
                      onEdit={handleEditPlant}
                      onDelete={handleDeletePlant}
                      onAnalyze={handleAnalyzePlant}
                      isLoading={state.isLoading}
                    />
                  )}
                </div>
              )}

              {state.activeTab === 'strains' && (
                <StrainManager
                  strains={state.strains}
                  onStrainCreate={(strain) => {
                    setState(prev => ({
                      ...prev,
                      strains: [...prev.strains, strain]
                    }));
                  }}
                  onStrainUpdate={(updatedStrain) => {
                    setState(prev => ({
                      ...prev,
                      strains: prev.strains.map(strain =>
                        strain.id === updatedStrain.id ? updatedStrain : strain
                      )
                    }));
                  }}
                  onStrainDelete={async (strainId) => {
                    if (!window.confirm('Remove this strain from the library?')) return;
                    try {
                      await plantsAPI.deleteStrain(strainId);
                      setState(prev => ({
                        ...prev,
                        strains: prev.strains.filter(strain => strain.id !== strainId),
                        success: 'Strain removed successfully'
                      }));
                    } catch (error) {
                      setState(prev => ({
                        ...prev,
                        error: error instanceof Error ? error.message : 'Failed to remove strain'
                      }));
                    }
                  }}
                />
              )}

              {state.activeTab === 'analysis' && (
                <PlantAnalysis
                  plants={state.plants}
                  strains={state.strains}
                  onAnalyze={handleAnalyzePlant}
                />
              )}

              {state.activeTab === 'inventory' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Plant Inventory</h2>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={exportInventory} className="border-gray-700">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => inventoryFileInput.current?.click()} className="border-gray-700">
                        <Upload className="w-4 h-4 mr-2" />
                        Import
                      </Button>
                      <input ref={inventoryFileInput} type="file" accept=".json,application/json" onChange={importInventory} className="hidden" />
                    </div>
                  </div>
                  <PlantInventory inventory={state.inventory} detailed />
                </div>
              )}

              {state.activeTab === 'tasks' && (
                <PlantTasks />
              )}

              {state.activeTab === 'details' && selectedPlant && (
                <PlantDetails
                  plant={selectedPlant}
                  onEdit={handleEditPlant}
                  onDelete={handleDeletePlant}
                  onAnalyze={handleAnalyzePlant}
                  onUpdate={(updates) => handleUpdatePlant(selectedPlant.id, updates)}
                />
              )}

              {state.activeTab === 'settings' && (
                <div className="space-y-6">
                  <Card className="bg-[#181b21] border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white">Plant Management Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg bg-[#0f1419] p-3"><div><p className="text-sm text-white">Auto-refresh plant data</p><p className="text-xs text-gray-400">Refresh the plant list when this workspace is open.</p></div><Switch checked={autoRefreshPlants} onCheckedChange={setAutoRefreshPlants} /></div>
                        <div className="flex items-center justify-between rounded-lg bg-[#0f1419] p-3"><div><p className="text-sm text-white">Show archived plants</p><p className="text-xs text-gray-400">Include archived plants in inventory views.</p></div><Switch checked={showArchivedPlants} onCheckedChange={setShowArchivedPlants} /></div>
                        <p className="text-xs text-gray-500">These display preferences are stored for this session.</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Plant Form Modal */}
      <AnimatePresence>
        {showPlantForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowPlantForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#181b21] border border-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">
                  {editingPlant ? 'Edit Plant' : 'Add New Plant'}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPlantForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </Button>
              </div>

              <PlantForm
                plant={editingPlant || undefined}
                strains={state.strains}
                onRemoveExistingImage={async (imageId) => {
                  if (!editingPlant) return;
                  await plantsAPI.deletePlantImage(editingPlant.id, imageId);
                  setState(prev => ({
                    ...prev,
                    plants: prev.plants.map(plant => plant.id === editingPlant.id
                      ? { ...plant, images: plant.images.filter(image => image.id !== imageId) }
                      : plant
                    )
                  }));
                  setEditingPlant(prev => prev
                    ? { ...prev, images: prev.images.filter(image => image.id !== imageId) }
                    : prev
                  );
                }}
                onSubmit={(formData) => {
                  if (editingPlant) {
                    // Image uploads are handled by the create multipart route;
                    // do not send File objects to the JSON update endpoint.
                    const { images: _images, ...updates } = formData;
                    void handleUpdatePlant(editingPlant.id, updates as Partial<Plant>);
                  } else {
                    void handleCreatePlant(formData);
                  }
                }}
                onCancel={() => {
                  setShowPlantForm(false);
                  setEditingPlant(null);
                }}
                isLoading={state.isCreating || state.isUpdating}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Plants;
