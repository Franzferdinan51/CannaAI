import React from 'react';
import { Cpu, Moon, Globe, Lock, Shield } from 'lucide-react';
import SettingToggle from './SettingToggle';

const SystemSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-400" />
          System Settings
        </h2>
        <p className="text-gray-400 mb-6">
          Configure system preferences and behavior
        </p>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-gray-400" />
              <div>
                <h3 className="font-medium text-white">Dark Mode</h3>
                <p className="text-sm text-gray-400">Use dark theme</p>
              </div>
            </div>
            <SettingToggle label="Dark Mode" defaultChecked />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <div>
                <h3 className="font-medium text-white">Auto-Save</h3>
                <p className="text-sm text-gray-400">Automatically save settings</p>
              </div>
            </div>
            <SettingToggle label="Auto-Save" defaultChecked />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-gray-400" />
              <div>
                <h3 className="font-medium text-white">Language</h3>
                <p className="text-sm text-gray-400">Interface language</p>
              </div>
            </div>
            <select className="px-3 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
