import React from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * Shared section primitives for the Settings surface — glass card shells,
 * icon headers, and field wrappers in the Midnight Greenhouse style.
 */

export const SettingsCard: React.FC<{
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ icon: Icon, title, subtitle, children, className = '' }) => (
  <div className={`glass rounded-3xl p-5 sm:p-6 ${className}`}>
    <div className="flex items-center gap-3 mb-1.5">
      <div className="p-2 rounded-xl bg-emerald-400/10 border border-emerald-300/20">
        <Icon className="w-5 h-5 text-emerald-300" strokeWidth={2.2} />
      </div>
      <h2 className="font-display text-lg font-bold text-white tracking-tight">{title}</h2>
    </div>
    {subtitle && <p className="text-white/40 text-sm mb-5 ml-[52px] -mt-1">{subtitle}</p>}
    <div className={subtitle ? '' : 'mt-4'}>{children}</div>
  </div>
);

export const SettingRow: React.FC<{
  icon?: LucideIcon;
  title: string;
  description?: string;
  control: React.ReactNode;
}> = ({ icon: Icon, title, description, control }) => (
  <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] transition-colors">
    <div className="flex items-center gap-3 min-w-0">
      {Icon && <Icon className="w-5 h-5 text-white/40 shrink-0" strokeWidth={2} />}
      <div className="min-w-0">
        <h3 className="font-semibold text-white text-[14px]">{title}</h3>
        {description && <p className="text-[12px] text-white/40 mt-0.5 leading-snug">{description}</p>}
      </div>
    </div>
    <div className="shrink-0">{control}</div>
  </div>
);

export const SettingSelect: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  id?: string;
}> = ({ label, value, onChange, options, id }) => (
  <div>
    <label htmlFor={id} className="block text-[13px] font-semibold text-white/60 mb-2">
      {label}
    </label>
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-glow w-full appearance-none px-4 py-3 pr-10 rounded-2xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-300/50 transition-colors [&>option]:bg-[#0b1410] [&>option]:text-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>
);

export const SettingsField: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div>
    <label className="block text-[13px] font-semibold text-white/60 mb-2">{label}</label>
    {children}
  </div>
);
