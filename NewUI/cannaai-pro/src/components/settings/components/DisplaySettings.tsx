import React from 'react';
import { Monitor, Smartphone, BarChart3 } from 'lucide-react';
import SettingToggle from './SettingToggle';
import { useSettingsStore } from '../store';

const DisplaySettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const display = settings?.display;
  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Monitor className="w-5 h-5 text-emerald-400" />
          Display Settings
        </h2>
        <p className="text-gray-400 mb-6">
          Customize the appearance and layout of the interface
        </p>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-gray-400" />
              <div>
                <h3 className="font-medium text-white">Compact Mode</h3>
                <p className="text-sm text-gray-400">Use more compact layout</p>
              </div>
            </div>
            <SettingToggle label="Compact Mode" checked={display?.compactMode ?? false} onCheckedChange={(compactMode) => display && updateSettings({ display: { ...display, compactMode } })} />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-gray-400" />
              <div>
                <h3 className="font-medium text-white">Animations</h3>
                <p className="text-sm text-gray-400">Enable interface animations</p>
              </div>
            </div>
            <SettingToggle label="Animations" checked={display?.animationsEnabled ?? true} onCheckedChange={(animationsEnabled) => display && updateSettings({ display: { ...display, animationsEnabled } })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Chart Refresh Rate</label>
            <select value={String(display?.chartRefreshRate ?? 30)} onChange={(event) => display && updateSettings({ display: { ...display, chartRefreshRate: Number(event.target.value) } })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
              <option value="1">Real-time (1s)</option>
              <option value="5">Fast (5s)</option>
              <option value="10">Normal (10s)</option>
              <option value="30">Slow (30s)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisplaySettings;
