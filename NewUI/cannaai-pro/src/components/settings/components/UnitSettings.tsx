import React from 'react';
import { Thermometer, Weight, Ruler, Wind, Gauge } from 'lucide-react';
import { SettingsCard, SettingSelect } from './SettingsPrimitives';
import { useSettingsStore } from '../store';

const UnitSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const units = settings?.units;
  const set = <K extends keyof NonNullable<typeof units>>(key: K, value: string) => {
    if (units) updateSettings({ units: { ...units, [key]: value } as NonNullable<typeof units> });
  };
  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Gauge}
        title="Units"
        subtitle="Configure measurement units and display preferences"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
            <Thermometer className="w-5 h-5 text-white/40 shrink-0 mt-0.5" strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <SettingSelect
                id="unit-temperature"
                label="Temperature"
                value={units?.temperature || 'celsius'}
                onChange={(v) => set('temperature', v)}
                options={[
                  { value: 'celsius', label: 'Celsius (°C)' },
                  { value: 'fahrenheit', label: 'Fahrenheit (°F)' },
                  { value: 'kelvin', label: 'Kelvin (K)' },
                ]}
              />
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
            <Weight className="w-5 h-5 text-white/40 shrink-0 mt-0.5" strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <SettingSelect
                id="unit-weight"
                label="Weight"
                value={units?.weight || 'grams'}
                onChange={(v) => set('weight', v)}
                options={[
                  { value: 'grams', label: 'Grams (g)' },
                  { value: 'ounces', label: 'Ounces (oz)' },
                  { value: 'pounds', label: 'Pounds (lbs)' },
                  { value: 'kilograms', label: 'Kilograms (kg)' },
                ]}
              />
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
            <Ruler className="w-5 h-5 text-white/40 shrink-0 mt-0.5" strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <SettingSelect
                id="unit-distance"
                label="Distance"
                value={units?.distance || 'centimeters'}
                onChange={(v) => set('distance', v)}
                options={[
                  { value: 'centimeters', label: 'Centimeters (cm)' },
                  { value: 'inches', label: 'Inches (in)' },
                  { value: 'meters', label: 'Meters (m)' },
                  { value: 'feet', label: 'Feet (ft)' },
                ]}
              />
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
            <Wind className="w-5 h-5 text-white/40 shrink-0 mt-0.5" strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <SettingSelect
                id="unit-pressure"
                label="Pressure"
                value={units?.pressure || 'psi'}
                onChange={(v) => set('pressure', v)}
                options={[
                  { value: 'psi', label: 'PSI' },
                  { value: 'bar', label: 'Bar' },
                  { value: 'kpa', label: 'kPa' },
                  { value: 'hpa', label: 'hPa' },
                ]}
              />
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
};

export default UnitSettings;
