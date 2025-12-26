import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  // Load initial data
  const loadInitialData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const [plantsResponse, strainsResponse, inventoryResponse] = await Promise.all([
        plantsAPI.getPlants(),
        plantsAPI.getStrains(),
        plantsAPI.getPlantInventory()
      ]);

      setState(prev => ({
        ...prev,
        plants: plantsResponse.plants,
        strains: strainsResponse,
        inventory: inventoryResponse,
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load data'
      }));
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

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
    const newFilter = { ...state.filter, search: query };
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
    // This would open the analysis interface
    setState(prev => ({ ...prev, activeTab: 'analysis' }));
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
      <div className="border-b border-gray-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
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
      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-800 bg-[#181b21] p-4">
          <Tabs
            value={state.activeTab}
            onValueChange={handleTabChange}
            orientation="vertical"
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-1 gap-2 bg-transparent">
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
          <div className="mt-6 space-y-4">
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
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
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
                        <p className="text-gray-400">Activity feed coming soon...</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-[#181b21] border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-white">Health Trends</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-400">Health trends chart coming soon...</p>
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
                        onClick={() => setState(prev => ({ ...prev, viewMode: 'grid' }))}
                        className="border-gray-700"
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={state.viewMode === 'list' ? 'default' : 'outline'}
                        size="sm"
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
                  onStrainDelete={(strainId) => {
                    setState(prev => ({
                      ...prev,
                      strains: prev.strains.filter(strain => strain.id !== strainId)
                    }));
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
                      <Button variant="outline" size="sm" className="border-gray-700">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                      <Button variant="outline" size="sm" className="border-gray-700">
                        <Upload className="w-4 h-4 mr-2" />
                        Import
                      </Button>
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
                      <p className="text-gray-400">Settings interface coming soon...</p>
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
                onSubmit={handleCreatePlant}
                onCancel={() => setShowPlantForm(false)}
                isLoading={state.isCreating}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Plants;