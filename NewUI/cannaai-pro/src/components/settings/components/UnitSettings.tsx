import React from 'react';
import { Thermometer, Weight, Ruler, Gauge, Sun } from 'lucide-react';

const UnitSettings: React.FC = () => {
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
              <select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                <option>Celsius (°C)</option>
                <option>Fahrenheit (°F)</option>
                <option>Kelvin (K)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Weight</label>
              <select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                <option>Grams (g)</option>
                <option>Ounces (oz)</option>
                <option>Pounds (lbs)</option>
                <option>Kilograms (kg)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Distance</label>
              <select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                <option>Centimeters (cm)</option>
                <option>Inches (in)</option>
                <option>Meters (m)</option>
                <option>Feet (ft)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Pressure</label>
              <select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
                <option>PSI</option>
                <option>Bar</option>
                <option>kPa</option>
                <option>hPa</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitSettings;
