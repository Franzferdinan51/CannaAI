import React, { useState } from 'react';

interface SettingToggleProps {
  label: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const SettingToggle: React.FC<SettingToggleProps> = ({ label, defaultChecked = false, checked: controlledChecked, onCheckedChange }) => {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const checked = controlledChecked ?? internalChecked;

  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      onClick={() => {
        const nextChecked = !checked;
        if (controlledChecked === undefined) setInternalChecked(nextChecked);
        onCheckedChange?.(nextChecked);
      }}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-emerald-600' : 'bg-gray-600'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
};

export default SettingToggle;
