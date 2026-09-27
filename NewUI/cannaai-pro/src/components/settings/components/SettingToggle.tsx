import React, { useState } from 'react';
import { motion } from 'framer-motion';

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
      className={`relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full transition-all duration-300 border ${
        checked
          ? 'bg-emerald-400/25 border-emerald-300/50 shadow-[0_0_16px_-4px_rgba(52,211,153,0.8)]'
          : 'bg-white/[0.06] border-white/12 hover:border-white/20'
      }`}
    >
      <motion.span
        animate={{ x: checked ? 24 : 2 }}
        transition={{ type: 'spring', damping: 26, stiffness: 400 }}
        className={`inline-block h-[22px] w-[22px] rounded-full ${
          checked
            ? 'bg-gradient-to-br from-emerald-200 to-lime-300 shadow-[0_2px_10px_rgba(52,211,153,0.8)]'
            : 'bg-white/50'
        }`}
      />
    </button>
  );
};

export default SettingToggle;
