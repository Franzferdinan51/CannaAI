import React from 'react';
import { Database, Download, Upload, Shield } from 'lucide-react';
import SettingToggle from './SettingToggle';
import { useSettingsStore } from '../store';

const DataSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const data = settings?.data;
  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-400" />
          Data Settings
        </h2>
        <p className="text-gray-400 mb-6">
          Manage data storage, backups, and export preferences
        </p>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-gray-400" />
              <div>
                <h3 className="font-medium text-white">Auto Backup</h3>
                <p className="text-sm text-gray-400">Automatically backup data</p>
              </div>
            </div>
            <SettingToggle label="Auto Backup" checked={data?.backupEnabled ?? true} onCheckedChange={(backupEnabled) => data && updateSettings({ data: { ...data, backupEnabled } })} />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-gray-400" />
              <div>
                <h3 className="font-medium text-white">Cloud Sync</h3>
                <p className="text-sm text-gray-400">Sync data to cloud storage</p>
              </div>
            </div>
            <SettingToggle label="Cloud Sync" checked={data?.cloudSync ?? false} onCheckedChange={(cloudSync) => data && updateSettings({ data: { ...data, cloudSync } })} />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <div>
                <h3 className="font-medium text-white">Data Validation</h3>
                <p className="text-sm text-gray-400">Validate data integrity</p>
              </div>
            </div>
            <SettingToggle label="Data Validation" checked={data?.dataValidation ?? true} onCheckedChange={(dataValidation) => data && updateSettings({ data: { ...data, dataValidation } })} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataSettings;
