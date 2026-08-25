import React from 'react';
import { Thermometer, Weight, Ruler, Gauge, Sun } from 'lucide-react';
import { useSettingsStore } from '../store';

const UnitSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const units = settings?.units;
  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Gauge className="w-5 h-5 text-emerald-400" />
          Unit Settings
        </h2>
        <p className="text-gray-400 mb-6">
          Configure measurement units and display preferences
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Temperature</label>
              <select value={units?.temperature || 'celsius'} onChange={(event) => units && updateSettings({ units: { ...units, temperature: event.target.value as any } })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                <option value="celsius">Celsius (°C)</option>
                <option value="fahrenheit">Fahrenheit (°F)</option>
                <option value="kelvin">Kelvin (K)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Weight</label>
              <select value={units?.weight || 'grams'} onChange={(event) => units && updateSettings({ units: { ...units, weight: event.target.value as any } })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                <option value="grams">Grams (g)</option>
                <option value="ounces">Ounces (oz)</option>
                <option value="pounds">Pounds (lbs)</option>
                <option value="kilograms">Kilograms (kg)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Distance</label>
              <select value={units?.distance || 'centimeters'} onChange={(event) => units && updateSettings({ units: { ...units, distance: event.target.value as any } })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                <option value="centimeters">Centimeters (cm)</option>
                <option value="inches">Inches (in)</option>
                <option value="meters">Meters (m)</option>
                <option value="feet">Feet (ft)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Pressure</label>
              <select value={units?.pressure || 'psi'} onChange={(event) => units && updateSettings({ units: { ...units, pressure: event.target.value as any } })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                <option value="psi">PSI</option>
                <option value="bar">Bar</option>
                <option value="kpa">kPa</option>
                <option value="hpa">hPa</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitSettings;
