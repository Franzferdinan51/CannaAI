import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlantFilter,
  PlantStrain,
  GrowthStage,
  HealthStatus,
  PlantSearchProps
} from '../types';

// Import UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

// Import icons
import {
  Search,
  Filter,
  X,
  SlidersHorizontal,
  Sprout,
  Heart,
  AlertTriangle,
  Calendar,
  MapPin
} from 'lucide-react';

const PlantSearch: React.FC<PlantSearchProps> = ({
  filter,
  onFilterChange,
  onSearch,
  onClear,
  strains = [],
  isLoading = false
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(filter.search || '');

  const handleSearch = () => {
    onSearch(searchQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const updateFilter = (key: keyof PlantFilter, value: any) => {
    onFilterChange({ ...filter, [key]: value });
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    onClear();
    setShowAdvancedFilters(false);
  };

  const hasActiveFilters = Object.keys(filter).some(key => {
    const value = filter[key as keyof PlantFilter];
    return value !== undefined && value !== '' && (Array.isArray(value) ? value.length > 0 : true);
  });

  const getFilterCount = () => {
    return Object.keys(filter).filter(key => {
      const value = filter[key as keyof PlantFilter];
      return value !== undefined && value !== '' && (Array.isArray(value) ? value.length > 0 : true);
    }).length;
  };

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <Card className="bg-[#181b21] border-gray-800">
        <CardContent className="p-4">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
              <Input
                placeholder="Search plants by name, strain, tags, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10 bg-[#0f1419] border-gray-700 text-white"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="border-gray-700 text-gray-300 relative"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs w-5 h-5 rounded-full p-0 flex items-center justify-center">
                  {getFilterCount()}
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearAllFilters}
                className="border-gray-700 text-gray-300"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-[#181b21] border-gray-800 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center">
                    <Filter className="w-5 h-5 mr-2 text-emerald-400" />
                    Advanced Filters
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvancedFilters(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Growth Stage Filter */}
                <div>
                  <Label className="text-gray-300 text-sm font-medium flex items-center mb-2">
                    <Sprout className="w-4 h-4 mr-1" />
                    Growth Stage
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'germination',
                      'seedling',
                      'vegetative',
                      'pre-flowering',
                      'flowering',
                      'ripening',
                      'harvesting'
                    ].map(stage => (
                      <Badge
                        key={stage}
                        variant={filter.stages?.includes(stage as GrowthStage) ? 'default' : 'outline'}
                        className={`cursor-pointer transition-colors ${
                          filter.stages?.includes(stage as GrowthStage)
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'border-gray-700 text-gray-400 hover:border-emerald-500 hover:text-emerald-400'
                        }`}
                        onClick={() => {
                          const currentStages = filter.stages || [];
                          const newStages = currentStages.includes(stage as GrowthStage)
                            ? currentStages.filter(s => s !== stage)
                            : [...currentStages, stage as GrowthStage];
                          updateFilter('stages', newStages.length > 0 ? newStages : undefined);
                        }}
                      >
                        {stage.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Health Status Filter */}
                <div>
                  <Label className="text-gray-300 text-sm font-medium flex items-center mb-2">
                    <Heart className="w-4 h-4 mr-1" />
                    Health Status
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'excellent',
                      'good',
                      'fair',
                      'poor',
                      'critical'
                    ].map(status => (
                      <Badge
                        key={status}
                        variant={filter.healthStatuses?.includes(status as HealthStatus) ? 'default' : 'outline'}
                        className={`cursor-pointer transition-colors ${
                          filter.healthStatuses?.includes(status as HealthStatus)
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'border-gray-700 text-gray-400 hover:border-emerald-500 hover:text-emerald-400'
                        }`}
                        onClick={() => {
                          const currentStatuses = filter.healthStatuses || [];
                          const newStatuses = currentStatuses.includes(status as HealthStatus)
                            ? currentStatuses.filter(s => s !== status)
                            : [...currentStatuses, status as HealthStatus];
                          updateFilter('healthStatuses', newStatuses.length > 0 ? newStatuses : undefined);
                        }}
                      >
                        {status}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Strain Filter */}
                <div>
                  <Label className="text-gray-300 text-sm font-medium mb-2 block">
                    Strains
                  </Label>
                  <Select
                    value={filter.strainIds?.[0] || ''}
                    onValueChange={(value) => {
                      updateFilter('strainIds', value ? [value] : undefined);
                    }}
                  >
                    <SelectTrigger className="bg-[#0f1419] border-gray-700 text-white">
                      <SelectValue placeholder="All strains" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0f1419] border-gray-700">
                      <SelectItem value="">All strains</SelectItem>
                      {strains.map(strain => (
                        <SelectItem key={strain.id} value={strain.id} className="text-white">
                          {strain.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location Filter */}
                <div>
                  <Label className="text-gray-300 text-sm font-medium flex items-center mb-2">
                    <MapPin className="w-4 h-4 mr-1" />
                    Location
                  </Label>
                  <Input
                    placeholder="Filter by location..."
                    value={filter.locations?.[0] || ''}
                    onChange={(e) => {
                      const location = e.target.value.trim();
                      updateFilter('locations', location ? [location] : undefined);
                    }}
                    className="bg-[#0f1419] border-gray-700 text-white"
                  />
                </div>

                {/* Age Range Filter */}
                <div>
                  <Label className="text-gray-300 text-sm font-medium flex items-center mb-2">
                    <Calendar className="w-4 h-4 mr-1" />
                    Age Range (days)
                  </Label>
                  <div className="flex space-x-3">
                    <div>
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filter.ageRange?.min || ''}
                        onChange={(e) => {
                          const min = e.target.value ? Number(e.target.value) : undefined;
                          const max = filter.ageRange?.max;
                          updateFilter('ageRange', min !== undefined || max !== undefined ? { min, max } : undefined);
                        }}
                        className="bg-[#0f1419] border-gray-700 text-white"
                      />
                    </div>
                    <div className="flex items-center text-gray-400">to</div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filter.ageRange?.max || ''}
                        onChange={(e) => {
                          const max = e.target.value ? Number(e.target.value) : undefined;
                          const min = filter.ageRange?.min;
                          updateFilter('ageRange', min !== undefined || max !== undefined ? { min, max } : undefined);
                        }}
                        className="bg-[#0f1419] border-gray-700 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Health Score Range Filter */}
                <div>
                  <Label className="text-gray-300 text-sm font-medium flex items-center mb-2">
                    <Heart className="w-4 h-4 mr-1" />
                    Health Score Range
                  </Label>
                  <div className="flex space-x-3">
                    <div>
                      <Input
                        type="number"
                        placeholder="Min %"
                        value={filter.healthRange?.min || ''}
                        onChange={(e) => {
                          const min = e.target.value ? Number(e.target.value) : undefined;
                          const max = filter.healthRange?.max;
                          updateFilter('healthRange', min !== undefined || max !== undefined ? { min, max } : undefined);
                        }}
                        className="bg-[#0f1419] border-gray-700 text-white"
                      />
                    </div>
                    <div className="flex items-center text-gray-400">to</div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Max %"
                        value={filter.healthRange?.max || ''}
                        onChange={(e) => {
                          const max = e.target.value ? Number(e.target.value) : undefined;
                          const min = filter.healthRange?.min;
                          updateFilter('healthRange', min !== undefined || max !== undefined ? { min, max } : undefined);
                        }}
                        className="bg-[#0f1419] border-gray-700 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active-only"
                      checked={filter.isActive === true}
                      onCheckedChange={(checked) => updateFilter('isActive', checked ? true : undefined)}
                    />
                    <Label htmlFor="active-only" className="text-gray-300">Active plants only</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="has-images"
                      checked={filter.hasImages === true}
                      onCheckedChange={(checked) => updateFilter('hasImages', checked ? true : undefined)}
                    />
                    <Label htmlFor="has-images" className="text-gray-300">Has images</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="has-issues"
                      checked={filter.hasIssues === true}
                      onCheckedChange={(checked) => updateFilter('hasIssues', checked ? true : undefined)}
                    />
                    <Label htmlFor="has-issues" className="text-gray-300">Has issues</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlantSearch;