import React from 'react';
import { Database, Download, Upload, Shield } from 'lucide-react';
import SettingToggle from './SettingToggle';
import { SettingsCard, SettingRow } from './SettingsPrimitives';
import { useSettingsStore } from '../store';

const DataSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const data = settings?.data;
  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Database}
        title="Data"
        subtitle="Manage data storage, backups, and export preferences"
      >
        <div className="space-y-3">
          <SettingRow
            icon={Download}
            title="Auto Backup"
            description="Automatically back up your grow data"
            control={
              <SettingToggle
                label="Auto Backup"
                checked={data?.backupEnabled ?? true}
                onCheckedChange={(backupEnabled) => data && updateSettings({ data: { ...data, backupEnabled } })}
              />
            }
          />
          <SettingRow
            icon={Upload}
            title="Cloud Sync"
            description="Sync data to cloud storage"
            control={
              <SettingToggle
                label="Cloud Sync"
                checked={data?.cloudSync ?? false}
                onCheckedChange={(cloudSync) => data && updateSettings({ data: { ...data, cloudSync } })}
              />
            }
          />
          <SettingRow
            icon={Shield}
            title="Data Validation"
            description="Validate data integrity on every save"
            control={
              <SettingToggle
                label="Data Validation"
                checked={data?.dataValidation ?? true}
                onCheckedChange={(dataValidation) => data && updateSettings({ data: { ...data, dataValidation } })}
              />
            }
          />
        </div>
      </SettingsCard>
    </div>
  );
};

export default DataSettings;
