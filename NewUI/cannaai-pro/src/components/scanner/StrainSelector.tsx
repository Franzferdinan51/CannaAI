import React, { useState, useEffect } from 'react';
import { Search, Sprout, Plus, Info } from 'lucide-react';
import { api } from '../../lib/api';
import { Strain } from '../../types/scanner';

interface StrainSelectorProps {
  selectedStrain: string;
  onStrainSelect: (strain: string) => void;
  className?: string;
}

interface CustomStrainForm {
  name: string;
  type: string;
  lineage: string;
  description: string;
  isPurpleStrain: boolean;
  optimalPhMin: string;
  optimalPhMax: string;
  optimalTempMin: string;
  optimalTempMax: string;
  optimalHumidityMin: string;
  optimalHumidityMax: string;
}

const defaultStrains: Strain[] = [
  {
    id: 'strain_001',
    name: 'Blue Dream',
    type: 'Hybrid (60% Sativa)',
    lineage: 'Blueberry x Haze',
    description: 'Popular hybrid known for balanced effects and resilience',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'soil' },
      temperature: { veg: [22, 26], flower: [20, 24] },
      humidity: { veg: [60, 70], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Magnesium', 'Calcium']
  },
  {
    id: 'strain_002',
    name: 'Granddaddy Purple',
    type: 'Indica',
    lineage: 'Purple Urkle x Big Bud',
    description: 'Classic purple strain known for vibrant colors',
    isPurpleStrain: true,
    optimalConditions: {
      ph: { range: [6.2, 6.8], medium: 'soil' },
      temperature: { veg: [20, 24], flower: [18, 22] },
      humidity: { veg: [50, 60], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Phosphorus', 'Magnesium']
  },
  {
    id: 'strain_003',
    name: 'Girl Scout Cookies',
    type: 'Hybrid',
    lineage: 'OG Kush x Durban Poison',
    description: 'Potent hybrid with complex flavor profile',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'soil' },
      temperature: { veg: [22, 26], flower: [20, 24] },
      humidity: { veg: [50, 60], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Calcium', 'Magnesium']
  },
  {
    id: 'strain_004',
    name: 'Sour Diesel',
    type: 'Sativa Dominant',
    lineage: 'Chemdawg 91 x Super Skunk',
    description: 'Energetic sativa with pungent aroma',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'soil' },
      temperature: { veg: [24, 28], flower: [22, 26] },
      humidity: { veg: [50, 60], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Nitrogen', 'Iron']
  }
];

const StrainSelector: React.FC<StrainSelectorProps> = ({ selectedStrain, onStrainSelect, className = '' }) => {
  const [strains, setStrains] = useState<Strain[]>(defaultStrains);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [selectedStrainInfo, setSelectedStrainInfo] = useState<Strain | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [customForm, setCustomForm] = useState<CustomStrainForm>({
    name: '',
    type: 'Hybrid',
    lineage: '',
    description: '',
    isPurpleStrain: false,
    optimalPhMin: '6.0',
    optimalPhMax: '6.5',
    optimalTempMin: '22',
    optimalTempMax: '26',
    optimalHumidityMin: '50',
    optimalHumidityMax: '60'
  });

  useEffect(() => {
    fetchStrains();
  }, []);

  const fetchStrains = async () => {
    try {
      const response = await api.strains.list();
      if (response && response.strains && response.strains.length > 0) {
        setStrains([...response.strains, ...defaultStrains]);
      }
    } catch (error) {
      console.warn('Failed to fetch strains, using defaults:', error);
    }
  };

  const filteredStrains = strains.filter(strain =>
    strain.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    strain.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (strain.lineage && strain.lineage.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddCustomStrain = async () => {
    if (!customForm.name.trim()) {
      alert('Please enter a strain name');
      return;
    }

    setIsLoading(true);
    try {
      const newStrain: Partial<Strain> = {
        name: customForm.name.trim(),
        type: customForm.type,
        lineage: customForm.lineage.trim() || undefined,
        description: customForm.description.trim() || undefined,
        isPurpleStrain: customForm.isPurpleStrain,
        optimalConditions: {
          ph: { range: [parseFloat(customForm.optimalPhMin), parseFloat(customForm.optimalPhMax)], medium: 'soil' },
          temperature: {
            veg: [parseFloat(customForm.optimalTempMin), parseFloat(customForm.optimalTempMax)],
            flower: [parseFloat(customForm.optimalTempMin) - 2, parseFloat(customForm.optimalTempMax) - 2]
          },
          humidity: {
            veg: [parseInt(customForm.optimalHumidityMin), parseInt(customForm.optimalHumidityMax)],
            flower: [parseInt(customForm.optimalHumidityMin) - 10, parseInt(customForm.optimalHumidityMax) - 10]
          },
          light: { veg: '18/6', flower: '12/12' }
        }
      };

      const response = await api.scanner.addCustomStrain(newStrain);
      if (response) {
        const addedStrain = response.strain || newStrain;
        setStrains(prev => [{ ...addedStrain, id: Date.now().toString() }, ...prev]);
        onStrainSelect(newStrain.name);
        setShowCustomForm(false);
        resetCustomForm();
      }
    } catch (error) {
      console.error('Failed to add custom strain:', error);
      alert('Failed to add custom strain. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetCustomForm = () => {
    setCustomForm({
      name: '',
      type: 'Hybrid',
      lineage: '',
      description: '',
      isPurpleStrain: false,
      optimalPhMin: '6.0',
      optimalPhMax: '6.5',
      optimalTempMin: '22',
      optimalTempMax: '26',
      optimalHumidityMin: '50',
      optimalHumidityMax: '60'
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Add */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search strains..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowCustomForm(!showCustomForm)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Strain
        </button>
      </div>

      {/* Custom Strain Form */}
      {showCustomForm && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 space-y-4">
          <h4 className="text-sm font-medium text-white">Add Custom Strain</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Strain Name *</label>
              <input
                type="text"
                value={customForm.name}
                onChange={(e) => setCustomForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="e.g., My Special Strain"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
              <select
                value={customForm.type}
                onChange={(e) => setCustomForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="Indica">Indica</option>
                <option value="Sativa">Sativa</option>
                <option value="Hybrid">Hybrid</option>
                <option value="CBD">CBD</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1">Lineage</label>
              <input
                type="text"
                value={customForm.lineage}
                onChange={(e) => setCustomForm(prev => ({ ...prev, lineage: e.target.value }))}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="e.g., Parent A x Parent B"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
              <textarea
                value={customForm.description}
                onChange={(e) => setCustomForm(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                placeholder="Brief description of the strain characteristics..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="purpleStrain"
                checked={customForm.isPurpleStrain}
                onChange={(e) => setCustomForm(prev => ({ ...prev, isPurpleStrain: e.target.checked }))}
                className="rounded text-emerald-500 focus:ring-emerald-500"
              />
              <label htmlFor="purpleStrain" className="text-sm text-gray-300">Purple Strain</label>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">pH Range</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.1"
                  value={customForm.optimalPhMin}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, optimalPhMin: e.target.value }))}
                  className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  step="0.1"
                  value={customForm.optimalPhMax}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, optimalPhMax: e.target.value }))}
                  className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Temperature Range (°C)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={customForm.optimalTempMin}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, optimalTempMin: e.target.value }))}
                  className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  value={customForm.optimalTempMax}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, optimalTempMax: e.target.value }))}
                  className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Humidity Range (%)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={customForm.optimalHumidityMin}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, optimalHumidityMin: e.target.value }))}
                  className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  value={customForm.optimalHumidityMax}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, optimalHumidityMax: e.target.value }))}
                  className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setShowCustomForm(false);
                resetCustomForm();
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddCustomStrain}
              disabled={isLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
            >
              {isLoading ? 'Adding...' : 'Add Strain'}
            </button>
          </div>
        </div>
      )}

      {/* Strain List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredStrains.map((strain) => (
          <div
            key={strain.id}
            onClick={() => {
              onStrainSelect(strain.name);
              setSelectedStrainInfo(strain);
            }}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              selectedStrain === strain.name
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <Sprout className={`w-5 h-5 mt-0.5 ${
                  strain.isPurpleStrain ? 'text-purple-400' : 'text-emerald-400'
                }`} />
                <div className="flex-1">
                  <h4 className="text-white font-medium">{strain.name}</h4>
                  <p className="text-sm text-gray-400">{strain.type}</p>
                  {strain.lineage && (
                    <p className="text-xs text-gray-500 mt-1">{strain.lineage}</p>
                  )}
                </div>
              </div>
              {strain.isPurpleStrain && (
                <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
                  Purple
                </span>
              )}
            </div>

            {strain.description && (
              <p className="text-xs text-gray-400 mt-2 line-clamp-2">{strain.description}</p>
            )}
          </div>
        ))}

        {filteredStrains.length === 0 && (
          <div className="text-center py-8">
            <Sprout className="w-12 h-12 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400">No strains found</p>
            <p className="text-sm text-gray-500">Try adjusting your search or add a custom strain</p>
          </div>
        )}
      </div>

      {/* Selected Strain Info */}
      {selectedStrainInfo && selectedStrainInfo.name === selectedStrain && (
        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
          <h4 className="text-sm font-medium text-white mb-3 flex items-center">
            <Info className="w-4 h-4 mr-2" />
            {selectedStrainInfo.name} Details
          </h4>

          {selectedStrainInfo.optimalConditions && (
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400">pH Range:</span>
                  <span className="text-gray-300 ml-2">
                    {selectedStrainInfo.optimalConditions.ph.range[0]}-{selectedStrainInfo.optimalConditions.ph.range[1]}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Temperature:</span>
                  <span className="text-gray-300 ml-2">
                    {selectedStrainInfo.optimalConditions.temperature.veg[0]}-{selectedStrainInfo.optimalConditions.temperature.veg[1]}°C
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Humidity:</span>
                  <span className="text-gray-300 ml-2">
                    {selectedStrainInfo.optimalConditions.humidity.veg[0]}-{selectedStrainInfo.optimalConditions.humidity.veg[1]}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Light Cycle:</span>
                  <span className="text-gray-300 ml-2">
                    {selectedStrainInfo.optimalConditions.light.veg}
                  </span>
                </div>
              </div>

              {selectedStrainInfo.commonDeficiencies && selectedStrainInfo.commonDeficiencies.length > 0 && (
                <div className="pt-2 border-t border-gray-700">
                  <span className="text-gray-400">Common Issues:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedStrainInfo.commonDeficiencies.map((deficiency, i) => (
                      <span key={i} className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded">
                        {deficiency}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StrainSelector;