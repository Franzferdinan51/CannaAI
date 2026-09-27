import React from 'react';
import { Monitor, Smartphone, BarChart3 } from 'lucide-react';
import SettingToggle from './SettingToggle';
import { SettingsCard, SettingRow, SettingSelect } from './SettingsPrimitives';
import { useSettingsStore } from '../store';

const DisplaySettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const display = settings?.display;
  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Monitor}
        title="Display"
        subtitle="Customize the appearance and layout of the interface"
      >
        <div className="space-y-3">
          <SettingRow
            icon={Smartphone}
            title="Compact Mode"
            description="Use a more compact layout"
            control={
              <SettingToggle
                label="Compact Mode"
                checked={display?.compactMode ?? false}
                onCheckedChange={(compactMode) => display && updateSettings({ display: { ...display, compactMode } })}
              />
            }
          />
          <SettingRow
            icon={BarChart3}
            title="Animations"
            description="Enable interface animations"
            control={
              <SettingToggle
                label="Animations"
                checked={display?.animationsEnabled ?? true}
                onCheckedChange={(animationsEnabled) => display && updateSettings({ display: { ...display, animationsEnabled } })}
              />
            }
          />
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
            <SettingSelect
              id="chart-refresh-rate"
              label="Chart Refresh Rate"
              value={String(display?.chartRefreshRate ?? 30)}
              onChange={(v) => display && updateSettings({ display: { ...display, chartRefreshRate: Number(v) } })}
              options={[
                { value: '1', label: 'Real-time (1s)' },
                { value: '5', label: 'Fast (5s)' },
                { value: '10', label: 'Normal (10s)' },
                { value: '30', label: 'Slow (30s)' },
              ]}
            />
          </div>
        </div>
      </SettingsCard>
    </div>
  );
};

export default DisplaySettings;
