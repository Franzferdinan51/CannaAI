import React from 'react';
import { AnalysisFormData } from '../../types/scanner';
import { Droplets, Thermometer, Wind, Sun, FlaskConical, Sprout } from 'lucide-react';

interface EnvironmentalFormProps {
  formData: AnalysisFormData;
  onChange: (field: keyof AnalysisFormData, value: string) => void;
  showAdvanced?: boolean;
  className?: string;
}

const EnvironmentalForm: React.FC<EnvironmentalFormProps> = ({
  formData,
  onChange,
  showAdvanced = false,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Primary Environmental Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* pH Level */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Droplets className="w-4 h-4 inline mr-1" />
            pH Level
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="14"
            placeholder="6.2"
            value={formData.phLevel}
            onChange={(e) => onChange('phLevel', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Optimal: 6.0-7.0</p>
        </div>

        {/* Temperature */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Thermometer className="w-4 h-4 inline mr-1" />
            Temperature (°{formData.temperatureUnit})
          </label>
          <input
            type="number"
            step="0.1"
            placeholder={formData.temperatureUnit === 'F' ? '75' : '24'}
            value={formData.temperature}
            onChange={(e) => onChange('temperature', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Optimal: {formData.temperatureUnit === 'F' ? '68-78°F' : '20-26°C'}
          </p>
        </div>

        {/* Humidity */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Wind className="w-4 h-4 inline mr-1" />
            Humidity (%)
          </label>
          <input
            type="number"
            step="1"
            min="0"
            max="100"
            placeholder="50"
            value={formData.humidity}
            onChange={(e) => onChange('humidity', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Optimal: 40-60%</p>
        </div>

        {/* Growth Stage */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Sprout className="w-4 h-4 inline mr-1" />
            Growth Stage
          </label>
          <select
            value={formData.growthStage}
            onChange={(e) => onChange('growthStage', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="seedling">Seedling</option>
            <option value="vegetative">Vegetative</option>
            <option value="flowering">Flowering</option>
            <option value="harvest">Harvest</option>
          </select>
        </div>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Advanced Parameters</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Growing Medium */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <FlaskConical className="w-4 h-4 inline mr-1" />
                Growing Medium
              </label>
              <select
                value={formData.medium}
                onChange={(e) => onChange('medium', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="soil">Soil</option>
                <option value="hydroponic">Hydroponic</option>
                <option value="coco">Coco Coir</option>
                <option value="aeroponic">Aeroponic</option>
              </select>
            </div>

            {/* Focus Area */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Focus Area
              </label>
              <select
                value={formData.pestDiseaseFocus}
                onChange={(e) => onChange('pestDiseaseFocus', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="general">General Health</option>
                <option value="pests">Pests</option>
                <option value="diseases">Diseases</option>
                <option value="nutrients">Nutrients</option>
                <option value="environmental">Environmental</option>
              </select>
            </div>

            {/* Temperature Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Temperature Unit
              </label>
              <select
                value={formData.temperatureUnit}
                onChange={(e) => onChange('temperatureUnit', e.target.value as 'C' | 'F')}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="F">Fahrenheit (°F)</option>
                <option value="C">Celsius (°C)</option>
              </select>
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Urgency Level
              </label>
              <select
                value={formData.urgency}
                onChange={(e) => onChange('urgency', e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="low">Low - Routine Check</option>
                <option value="medium">Medium - Monitor Closely</option>
                <option value="high">High - Attention Needed</option>
                <option value="critical">Critical - Immediate Action</option>
              </select>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Additional Notes
            </label>
            <textarea
              placeholder="Any additional information that might help with the analysis..."
              value={formData.additionalNotes}
              onChange={(e) => onChange('additionalNotes', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          </div>
        </div>
      )}

      {/* Environmental Tips */}
      <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/20">
        <h4 className="text-sm font-medium text-blue-300 mb-2">
          <Sun className="w-4 h-4 inline mr-1" />
          Environmental Tips
        </h4>
        <ul className="text-xs text-blue-200 space-y-1">
          <li>• Monitor pH regularly - affects nutrient uptake</li>
          <li>• Maintain stable temperature - avoid fluctuations</li>
          <li>• Control humidity - prevents mold and stress</li>
          <li>• Adjust parameters based on growth stage</li>
        </ul>
      </div>
    </div>
  );
};

export default EnvironmentalForm;