import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Bot, Calendar, CheckCircle2, Clock3, Droplets, History, Lightbulb, RefreshCw, Settings, Shield, Thermometer, Wind, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../lib/api';

type AutomationTab = 'overview' | 'controls' | 'scheduling' | 'history' | 'safety';
type AutomationState = { config: Record<string, unknown>; checkedAt: Date | null; loading: boolean; error: string | null };
const systems = [
  { name: 'Climate Control', detail: 'Temperature and humidity management', icon: Thermometer, color: 'text-orange-300' },
  { name: 'Irrigation', detail: 'Watering and nutrient delivery', icon: Droplets, color: 'text-blue-300' },
  { name: 'Lighting', detail: 'Schedules and intensity control', icon: Lightbulb, color: 'text-yellow-300' },
  { name: 'Air Quality', detail: 'CO₂ and circulation monitoring', icon: Wind, color: 'text-cyan-300' },
];

export default function AutomationSimple() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AutomationTab>('overview');
  const [state, setState] = useState<AutomationState>({ config: {}, checkedAt: null, loading: true, error: null });
  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await fetch(apiUrl('/automation'));
      if (!response.ok) throw new Error(`Automation status returned ${response.status}`);
      const payload = await response.json();
      setState({ config: payload.data || {}, checkedAt: new Date(), loading: false, error: null });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, checkedAt: new Date(), error: error instanceof Error ? error.message : 'Unable to load automation status.' }));
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const goToSettings = () => { navigate('/settings'); };
  const tabs: Array<{ id: AutomationTab; label: string; icon: React.ComponentType<{ size?: number }> }> = [
    { id: 'overview', label: 'Overview', icon: Activity }, { id: 'controls', label: 'Controls', icon: Settings }, { id: 'scheduling', label: 'Scheduling', icon: Calendar }, { id: 'history', label: 'History', icon: History }, { id: 'safety', label: 'Safety', icon: Shield },
  ];
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const offset = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + offset + tabs.length) % tabs.length;
    if (offset || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setTab(tabs[nextIndex].id);
    }
  };
  return (
    <div className="min-h-full bg-gray-900 text-white p-4 sm:p-6 lg:p-8"><div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-850/60 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-500/15 p-3 text-emerald-300"><Bot size={28} /></div><div><h1 className="text-2xl font-bold">Automation System</h1><p className="text-sm text-gray-400">Status, schedules, and device-control readiness</p></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void refresh()} disabled={state.loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800 disabled:cursor-wait disabled:opacity-60"><RefreshCw size={16} className={state.loading ? 'animate-spin' : ''} /> Refresh status</button><button type="button" onClick={goToSettings} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-gray-950 hover:bg-emerald-400"><Settings size={16} /> Configure</button></div></header>
      <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-3" role="tablist" aria-label="Automation sections">{tabs.map(({ id, label, icon: Icon }, index) => <button key={id} id={`automation-tab-${id}`} type="button" role="tab" aria-selected={tab === id} aria-controls={`automation-panel-${id}`} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)} onKeyDown={(event) => handleTabKeyDown(event, index)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${tab === id ? 'bg-emerald-500/15 text-emerald-300' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}><Icon size={16} /> {label}</button>)}</div>
      {state.error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"><XCircle className="mr-2 inline" size={16} />{state.error}</div>}
      <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100"><div className="flex items-start gap-3"><Shield className="mt-0.5 shrink-0 text-amber-300" size={18} /><div><p className="font-semibold">Live device actions are unavailable</p><p className="mt-1 text-amber-200/80">CannaAI can display configuration and prepare schedules, but it will not claim to control equipment until a supported controller is connected.</p></div></div></section>
      <div id={`automation-panel-${tab}`} role="tabpanel" aria-labelledby={`automation-tab-${tab}`} tabIndex={0}>
        {tab === 'overview' && <><div className="grid gap-4 sm:grid-cols-3"><StatusCard icon={<CheckCircle2 className="text-emerald-300" />} label="Backend status" value={state.loading ? 'Checking…' : state.error ? 'Unavailable' : 'Online'} /><StatusCard icon={<Clock3 className="text-blue-300" />} label="Last checked" value={state.loading ? 'Checking…' : state.checkedAt ? state.checkedAt.toLocaleTimeString() : 'Not checked'} /><StatusCard icon={<Shield className="text-amber-300" />} label="Controller" value="Not connected" /></div><div className="grid gap-4 md:grid-cols-2">{systems.map(({ name, detail, icon: Icon, color }) => <div key={name} className="rounded-xl border border-gray-800 bg-gray-800/60 p-5"><div className="flex items-center gap-3"><Icon className={color} size={22} /><div><h2 className="font-semibold">{name}</h2><p className="text-sm text-gray-400">{detail}</p></div></div><p className="mt-4 text-sm text-gray-500">No connected device data</p></div>)}</div></>}
        {tab === 'controls' && <UnavailablePanel title="Controls are paused" description="Connect a supported device controller before sending climate, irrigation, lighting, or air-quality commands." />}
        {tab === 'scheduling' && <UnavailablePanel title="Scheduling is ready for configuration" description="Schedules can be configured once a controller is connected. No schedule will run silently in the background." action="Open settings" onAction={goToSettings} />}
        {tab === 'history' && <UnavailablePanel title="No automation activity yet" description="Controller actions and safety events will appear here after a supported device integration is connected." />}
        {tab === 'safety' && <UnavailablePanel title="Safety monitoring is not connected" description="CannaAI will keep live actions paused until device telemetry and safety limits are available." />}
      </div>
      <p className="text-xs text-gray-500">{state.loading ? 'Loading automation configuration…' : Object.keys(state.config).length ? 'Automation configuration loaded from the local backend.' : 'No automation configuration has been saved yet.'}</p>
    </div></div>
  );
}
function StatusCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-xl border border-gray-800 bg-gray-800/60 p-5"><div className="flex items-center gap-2 text-sm text-gray-400">{icon}{label}</div><p className="mt-3 text-xl font-semibold text-white">{value}</p></div>; }
function UnavailablePanel({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) { return <div className="rounded-xl border border-gray-800 bg-gray-800/50 p-8 text-center"><Shield className="mx-auto mb-4 text-amber-300" size={34} /><h2 className="text-xl font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-400">{description}</p>{action && onAction && <button type="button" onClick={onAction} className="mt-5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-emerald-400">{action}</button>}</div>; }
