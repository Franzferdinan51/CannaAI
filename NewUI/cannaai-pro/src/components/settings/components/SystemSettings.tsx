import React from 'react';
import { Cpu, Moon, Globe, Shield } from 'lucide-react';
import SettingToggle from './SettingToggle';
import { SettingsCard, SettingRow, SettingSelect } from './SettingsPrimitives';
import { useSettingsStore } from '../store';

const SystemSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const system = settings?.system;
  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Cpu}
        title="System"
        subtitle="Configure system preferences and behavior"
      >
        <div className="space-y-3">
          <SettingRow
            icon={Moon}
            title="Dark Mode"
            description="Use the dark botanical theme"
            control={
              <SettingToggle
                label="Dark Mode"
                checked={system?.darkMode ?? true}
                onCheckedChange={(darkMode) => system && updateSettings({ system: { ...system, darkMode } })}
              />
            }
          />
          <SettingRow
            icon={Shield}
            title="Auto-Save"
            description="Automatically save settings as you change them"
            control={
              <SettingToggle
                label="Auto-Save"
                checked={system?.autoSave ?? true}
                onCheckedChange={(autoSave) => system && updateSettings({ system: { ...system, autoSave } })}
              />
            }
          />
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
            <div className="flex items-center gap-3 mb-3">
              <Globe className="w-5 h-5 text-white/40 shrink-0" strokeWidth={2} />
              <div>
                <h3 className="font-semibold text-white text-[14px]">Language</h3>
                <p className="text-[12px] text-white/40 mt-0.5">Interface language</p>
              </div>
            </div>
            <SettingSelect
              id="system-language"
              label=""
              value={system?.language || 'en'}
              onChange={(language) => system && updateSettings({ system: { ...system, language } })}
              options={[
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Spanish' },
                { value: 'fr', label: 'French' },
              ]}
            />
          </div>
        </div>
      </SettingsCard>
    </div>
  );
};

export default SystemSettings;
