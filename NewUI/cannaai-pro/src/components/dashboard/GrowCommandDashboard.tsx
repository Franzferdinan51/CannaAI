import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Brain,
  Camera,
  CheckCircle,
  ClipboardList,
  Droplets,
  Leaf,
  MessageSquare,
  Plus,
  RefreshCw,
  Sprout,
  Thermometer,
  Wind,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { API_ORIGIN } from '../../lib/api-origin';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface GrowPlant {
  id: string;
  name: string;
  stage?: string | null;
  age?: number | null;
  plantedDate?: string | null;
  notes?: string | null;
  strain?: { id: string; name: string; type?: string | null; lineage?: string | null; description?: string | null } | null;
  room?: { id: string; name: string } | null;
  location?: { id: string; name: string } | null;
  images?: Array<{ id: string; url: string; description?: string; isPrimary?: boolean; capturedAt?: string }>;
}

interface GrowToday {
  generatedAt: string;
  rooms: Array<{ id: string; name: string; active: boolean }>;
  plants: GrowPlant[];
  primaryPlant: GrowPlant | null;
  targets: { temperatureF: [number, number]; humidity: [number, number]; vpd: [number, number] };
  climate: {
    sensorId: string;
    sensorName?: string | null;
    timestamp: string;
    temperature: number | null;
    humidity: number | null;
    vpd: number | null;
    vpdDevice: number | null;
    vpdCalculated: number | null;
    ports: Array<{ port: number; speed?: number; mode?: string; on?: boolean }>;
    source?: string | null;
  } | null;
  last24Hours: {
    temperature: { min: number | null; max: number | null; average: number | null; count: number };
    humidity: { min: number | null; max: number | null; average: number | null; count: number };
    vpd: { min: number | null; max: number | null; average: number | null; count: number };
    points: Array<{ timestamp: string; temperature: number | null; humidity: number | null; vpd: number | null }>;
  };
  tasks: Array<{ id: string; title: string; description?: string | null; type?: string | null; priority?: string | null; status: string; plantId?: string | null; scheduledAt?: string | null; createdAt: string }>;
  alerts: Array<{ id: string; type: string; severity: string; message: string; createdAt: string }>;
  actions: Array<{ id: string; plantId?: string | null; type: string; description: string; status: string; createdAt: string }>;
  analyses: Array<{ id: string; plantId?: string | null; plantName?: string | null; provider?: string | null; result?: any; createdAt: string }>;
  latestPhoto: { plantId: string; plantName: string; image: { url: string; description?: string; capturedAt?: string } } | null;
}

interface HealthInfo {
  status?: string;
  providers?: { primary?: string | null; available?: string[]; unavailable?: string[] };
}

const api = (path: string) => `${API_ORIGIN}${path}`;

async function fetchJson(path: string, init?: RequestInit) {
  const response = await fetch(api(path), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return body;
}

function formatTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${formatTime(value)}`;
}

function dayCount(plantedDate?: string | null) {
  if (!plantedDate) return null;
  const planted = new Date(plantedDate).getTime();
  if (Number.isNaN(planted)) return null;
  return Math.max(0, Math.floor((Date.now() - planted) / 86_400_000));
}

function targetStatus(value: number | null, range: [number, number]) {
  if (value === null) return { label: 'No reading', tone: 'text-gray-400 border-gray-600' };
  if (value < range[0]) return { label: 'Below target', tone: 'text-blue-300 border-blue-400/30' };
  if (value > range[1]) return { label: 'Above target', tone: 'text-amber-300 border-amber-400/30' };
  return { label: 'In target', tone: 'text-emerald-300 border-emerald-400/30' };
}

function imageSrc(url: string) {
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

function analysisSummary(result: any) {
  const value = result?.analysis || result || {};
  return {
    diagnosis: typeof value.diagnosis === 'string' ? value.diagnosis : null,
    healthScore: typeof value.healthScore === 'number' ? value.healthScore : null,
  };
}

const GrowCommandDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<GrowToday | null>(null);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [journalPlantId, setJournalPlantId] = useState('');
  const [journalType, setJournalType] = useState('observation');
  const [journalText, setJournalText] = useState('');
  const [journalBusy, setJournalBusy] = useState(false);
  const [journalMessage, setJournalMessage] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskBusy, setTaskBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [today, healthBody] = await Promise.allSettled([
        fetchJson('/api/grow/today'),
        fetchJson('/api/health'),
      ]);
      if (today.status === 'fulfilled') {
        setData(today.value.data as GrowToday);
        setError(null);
      } else {
        setError(today.reason instanceof Error ? today.reason.message : 'Could not load grow data.');
      }
      if (healthBody.status === 'fulfilled') setHealth(healthBody.value as HealthInfo);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const chartData = useMemo(
    () =>
      (data?.last24Hours.points || []).map((point) => ({
        ...point,
        label: formatTime(point.timestamp),
      })),
    [data],
  );

  const submitJournal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!journalText.trim()) return;
    setJournalBusy(true);
    setJournalMessage(null);
    try {
      await fetchJson('/api/actions', {
        method: 'POST',
        body: JSON.stringify({
          plantId: journalPlantId || undefined,
          type: journalType,
          description: journalText.trim(),
          status: 'completed',
        }),
      });
      setJournalText('');
      setJournalMessage('Logged.');
      await load();
    } catch (err) {
      setJournalMessage(err instanceof Error ? err.message : 'Could not save that entry.');
    } finally {
      setJournalBusy(false);
    }
  };

  const addTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    setTaskBusy(true);
    try {
      await fetchJson('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: taskTitle.trim(), type: 'monitoring', priority: 'medium', status: 'pending' }),
      });
      setTaskTitle('');
      await load();
    } finally {
      setTaskBusy(false);
    }
  };

  const completeTask = async (taskId: string) => {
    await fetchJson(`/api/tasks/${encodeURIComponent(taskId)}/complete`, { method: 'POST', body: JSON.stringify({}) });
    await load();
  };

  if (loading && !data) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-gray-400">
        <RefreshCw className="mr-3 h-5 w-5 animate-spin" /> Loading the grow…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center">
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-amber-300" />
        <h2 className="text-xl font-bold text-white">Grow data did not load</h2>
        <p className="mt-2 text-sm text-gray-400">{error || 'The CannaAI backend did not answer.'}</p>
        <Button type="button" onClick={() => void load()} className="mt-5 bg-emerald-600 hover:bg-emerald-500">
          Try again
        </Button>
      </div>
    );
  }

  const climate = data.climate;
  const primary = data.primaryPlant;
  const strain = primary?.strain;
  const roomName = primary?.room?.name || primary?.location?.name || data.rooms.find((room) => room.active)?.name || 'Grow room';
  const tempStatus = targetStatus(climate?.temperature ?? null, data.targets.temperatureF);
  const humidityStatus = targetStatus(climate?.humidity ?? null, data.targets.humidity);
  const vpdStatus = targetStatus(climate?.vpd ?? null, data.targets.vpd);
  const climateAgeMinutes = climate ? Math.max(0, Math.round((Date.now() - new Date(climate.timestamp).getTime()) / 60_000)) : null;

  const climateCards = [
    {
      label: 'Temperature',
      icon: Thermometer,
      value: climate?.temperature != null ? `${climate.temperature.toFixed(1)}°F` : '—',
      sub: climate?.temperature != null ? `${(((climate.temperature - 32) * 5) / 9).toFixed(1)}°C · target ${data.targets.temperatureF[0]}–${data.targets.temperatureF[1]}°F` : 'No reading yet',
      status: tempStatus,
      range: data.last24Hours.temperature,
      rangeLabel: '24h low / high',
    },
    {
      label: 'Humidity',
      icon: Droplets,
      value: climate?.humidity != null ? `${climate.humidity.toFixed(0)}%` : '—',
      sub: `Target ${data.targets.humidity[0]}–${data.targets.humidity[1]}% RH`,
      status: humidityStatus,
      range: data.last24Hours.humidity,
      rangeLabel: '24h low / high',
    },
    {
      label: 'VPD',
      icon: Wind,
      value: climate?.vpd != null ? `${climate.vpd.toFixed(2)} kPa` : '—',
      sub: climate
        ? `Device ${climate.vpdDevice != null ? climate.vpdDevice.toFixed(2) : '—'} · Computed ${climate.vpdCalculated != null ? climate.vpdCalculated.toFixed(2) : '—'} · Target ${data.targets.vpd[0].toFixed(1)}–${data.targets.vpd[1].toFixed(1)} kPa`
        : `Target ${data.targets.vpd[0].toFixed(1)}–${data.targets.vpd[1].toFixed(1)} kPa for this stage`,
      status: vpdStatus,
      range: data.last24Hours.vpd,
      rangeLabel: '24h low / high',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 px-1 pb-4 sm:px-2">
      {/* Header */}
      <div className="glass-deep relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`pill ${climate ? 'pill-live' : 'pill-bad'}`}>
                {climate && <span className="dot-pulse !h-1.5 !w-1.5" />}
                {climate ? `${roomName} live` : 'No sensor reading'}
              </span>
              {climateAgeMinutes !== null && (
                <span className="pill pill-dim">Sensor updated {climateAgeMinutes <= 1 ? 'just now' : `${climateAgeMinutes} min ago`}</span>
              )}
              <span className="pill pill-dim">{data.plants.length} active plant{data.plants.length === 1 ? '' : 's'}</span>
              {data.alerts.length > 0 && <span className="pill pill-warn">{data.alerts.length} open alert{data.alerts.length === 1 ? '' : 's'}</span>}
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-[38px]">
              Grow <span className="gradient-text text-glow-leaf">command</span>
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-white/50">
              {primary
                ? `${data.plants.length} ${strain?.name || 'plants'} in the ${roomName}, ${primary.stage || 'growing'} stage${dayCount(primary.plantedDate) !== null ? `, day ${dayCount(primary.plantedDate)}` : ''}. Everything on this page is live data from the tent and the grow log — nothing is demo data.`
                : 'No active plants yet. Add the first plant and this page becomes its command center.'}
            </p>
            {strain?.lineage && <p className="mt-1.5 text-sm text-white/35">Lineage: {strain.lineage}</p>}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button type="button" onClick={() => navigate('/scanner')} className="btn-primary-glow h-11 rounded-2xl px-5">
              <Camera className="mr-2 h-4.5 w-4.5" /> Scan a plant
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/chat')} className="h-11 rounded-2xl px-5">
              <MessageSquare className="mr-2 h-4 w-4" /> Ask local AI
            </Button>
            <Button type="button" variant="outline" onClick={() => void load()} className="h-11 rounded-2xl px-4" aria-label="Refresh grow data">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Refresh hit a snag: {error}. Showing the last data that loaded.
        </p>
      )}

      {/* Climate */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {climateCards.map((card) => (
          <Card key={card.label} className="card-hover">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.06]">
                    <card.icon className="h-[18px] w-[18px] text-emerald-300" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">{card.label}</p>
                    <p className="text-[11px] text-white/30">{roomName}</p>
                  </div>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${card.status.tone}`}>{card.status.label}</span>
              </div>
              <p className="mt-4 font-display text-[34px] font-bold leading-none text-white">{card.value}</p>
              <p className="mt-2 text-xs text-white/40">{card.sub}</p>
              <p className="mt-1 text-xs text-white/30">
                {card.rangeLabel}: {card.range.min != null ? card.range.min : '—'} / {card.range.max != null ? card.range.max : '—'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Trend + photo */}
        <div className="min-w-0 space-y-4 xl:col-span-2">
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[17px]">
                <Activity className="h-5 w-5 text-blue-300" /> Last 24 hours in the tent
              </CardTitle>
              <CardDescription>Real AC Infinity readings, collected every five minutes</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 1 ? (
                <div className="h-[260px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="growTemp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fb923c" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="growHum" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} dy={6} minTickGap={40} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(10,15,13,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff', fontSize: 12 }}
                        labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                      />
                      <Area type="monotone" dataKey="temperature" stroke="#fb923c" strokeWidth={2.5} fill="url(#growTemp)" name="Temp (°F)" dot={false} connectNulls />
                      <Area type="monotone" dataKey="humidity" stroke="#60a5fa" strokeWidth={2.5} fill="url(#growHum)" name="Humidity (%)" dot={false} connectNulls />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-white/35">Not enough readings yet to draw the last 24 hours. The collector adds a point every five minutes.</p>
              )}
              {climate && climate.ports.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {climate.ports.filter((port) => typeof port.speed === 'number').map((port) => (
                    <span key={port.port} className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/50">
                      Port {port.port}: level {port.speed}
                    </span>
                  ))}
                  <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/35">Levels are controller settings; the AI program runs the tent.</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[17px]">
                <Camera className="h-5 w-5 text-emerald-300" /> Latest tent photo
              </CardTitle>
              <CardDescription>{data.latestPhoto ? `${data.latestPhoto.plantName} · ${formatDateTime(data.latestPhoto.image.capturedAt)}` : 'Photos you attach to a plant show up here'}</CardDescription>
            </CardHeader>
            <CardContent>
              {data.latestPhoto ? (
                <figure>
                  <img src={imageSrc(data.latestPhoto.image.url)} alt={`Latest photo of ${data.latestPhoto.plantName}`} className="max-h-[420px] w-full rounded-2xl border border-white/[0.07] object-cover" />
                  {data.latestPhoto.image.description && <figcaption className="mt-2 text-sm text-white/45">{data.latestPhoto.image.description}</figcaption>}
                </figure>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-10 text-center">
                  <p className="text-sm text-white/40">No plant photo attached yet.</p>
                  <Button type="button" variant="outline" onClick={() => navigate('/plants')} className="mt-4 rounded-xl">
                    Open Plants to add one
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Crop + AI */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[17px]">
                <Sprout className="h-5 w-5 text-emerald-300" /> The crop
              </CardTitle>
              <CardDescription>{roomName}{strain ? ` · ${strain.name}` : ''}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {data.plants.length === 0 && <p className="text-sm text-white/35">No active plants.</p>}
              {data.plants.map((plant) => (
                <button
                  key={plant.id}
                  type="button"
                  onClick={() => navigate('/plants')}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 text-left transition-colors hover:border-emerald-400/30"
                >
                  <span>
                    <span className="block text-sm font-semibold text-white/85">{plant.name}</span>
                    <span className="block text-xs text-white/35">{plant.strain?.name || 'Unknown strain'} · {plant.stage || 'unknown stage'}</span>
                  </span>
                  <Badge variant="secondary" className="!normal-case !tracking-normal">
                    {dayCount(plant.plantedDate) !== null ? `Day ${dayCount(plant.plantedDate)}` : '—'}
                  </Badge>
                </button>
              ))}
              {strain?.description && <p className="pt-1 text-sm leading-relaxed text-white/45">{strain.description}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[17px]">
                <Brain className="h-5 w-5 text-lime-300" /> Local AI
              </CardTitle>
              <CardDescription>LM Studio on the Mac Studio — free and local</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className={`pill ${health?.status === 'ok' ? 'pill-live' : 'pill-dim'}`}>{health?.status === 'ok' ? 'Backend healthy' : 'Backend status unknown'}</span>
                {health?.providers?.primary && <span className="pill pill-dim">Primary: {health.providers.primary}</span>}
                <span className="pill pill-dim">Vision pinned: ornith-1.5-9b</span>
              </div>
              {health?.providers?.available && health.providers.available.length > 0 && (
                <p className="text-xs text-white/35">Available providers: {health.providers.available.join(', ')}</p>
              )}
              {data.analyses.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">Latest analyses on this crop</p>
                  {data.analyses.slice(0, 3).map((analysis) => {
                    const summary = analysisSummary(analysis.result);
                    return (
                      <div key={analysis.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5">
                        <p className="text-sm font-medium text-white/80">{summary.diagnosis || 'Analysis recorded'}</p>
                        <p className="mt-0.5 text-xs text-white/35">
                          {analysis.plantName || 'Plant'} · {formatDateTime(analysis.createdAt)}{analysis.provider ? ` · ${analysis.provider}` : ''}{summary.healthScore !== null ? ` · health ${summary.healthScore}/100` : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-white/40">No AI analyses on this crop yet. Run a scan and the results land here.</p>
              )}
              <div className="flex gap-2">
                <Button type="button" onClick={() => navigate('/scanner')} className="btn-primary-glow flex-1 rounded-xl">
                  <Camera className="mr-2 h-4 w-4" /> Scan
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/chat')} className="flex-1 rounded-xl">
                  <MessageSquare className="mr-2 h-4 w-4" /> Chat
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[17px]">
                <AlertTriangle className="h-5 w-5 text-amber-300" /> Alerts
              </CardTitle>
              <CardDescription>Unacknowledged alerts from the grow</CardDescription>
            </CardHeader>
            <CardContent>
              {data.alerts.length === 0 ? (
                <p className="py-2 text-sm text-white/35">All quiet in the tent.</p>
              ) : (
                <div className="space-y-2">
                  {data.alerts.slice(0, 6).map((alert) => (
                    <div key={alert.id} className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] px-3.5 py-2.5">
                      <p className="text-sm text-white/80">{alert.message}</p>
                      <p className="mt-0.5 text-xs text-white/35">{alert.severity} · {formatDateTime(alert.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[17px]">
              <ClipboardList className="h-5 w-5 text-blue-300" /> Open tasks
            </CardTitle>
            <CardDescription>What the grow still needs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={addTask} className="flex gap-2">
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Add a task — e.g. Water the seedlings"
                className="h-10 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white placeholder:text-white/25"
              />
              <Button type="submit" disabled={taskBusy || !taskTitle.trim()} className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500">
                <Plus className="mr-1.5 h-4 w-4" /> Add
              </Button>
            </form>
            {data.tasks.length === 0 ? (
              <p className="py-2 text-sm text-white/35">No open tasks. The grow is caught up.</p>
            ) : (
              <div className="space-y-2">
                {data.tasks.slice(0, 8).map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white/85">{task.title}</p>
                      <p className="text-xs text-white/35">
                        {task.priority || 'medium'} priority{task.scheduledAt ? ` · due ${formatDateTime(task.scheduledAt)}` : ''}
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => void completeTask(task.id)} className="shrink-0 rounded-lg">
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Done
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Journal */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[17px]">
              <Leaf className="h-5 w-5 text-emerald-300" /> Grow journal
            </CardTitle>
            <CardDescription>Watering, feeding, and what you noticed — saved to the grow log</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={submitJournal} className="space-y-2.5">
              <div className="flex gap-2">
                <select
                  value={journalPlantId}
                  onChange={(event) => setJournalPlantId(event.target.value)}
                  className="h-10 flex-1 rounded-xl border border-white/10 bg-[#12161c] px-2.5 text-sm text-white"
                  aria-label="Journal plant"
                >
                  <option value="">Whole crop</option>
                  {data.plants.map((plant) => (
                    <option key={plant.id} value={plant.id}>{plant.name}</option>
                  ))}
                </select>
                <select
                  value={journalType}
                  onChange={(event) => setJournalType(event.target.value)}
                  className="h-10 flex-1 rounded-xl border border-white/10 bg-[#12161c] px-2.5 text-sm text-white"
                  aria-label="Journal entry type"
                >
                  <option value="observation">Observation</option>
                  <option value="watering">Watering</option>
                  <option value="feeding">Feeding</option>
                  <option value="training">Training</option>
                  <option value="treating">Treatment</option>
                  <option value="transplanting">Transplanting</option>
                </select>
              </div>
              <textarea
                value={journalText}
                onChange={(event) => setJournalText(event.target.value)}
                placeholder="What happened in the tent?"
                className="min-h-[72px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/25"
              />
              <div className="flex items-center justify-between">
                {journalMessage ? <p className="text-xs text-white/40">{journalMessage}</p> : <span />}
                <Button type="submit" disabled={journalBusy || !journalText.trim()} className="rounded-xl bg-emerald-600 hover:bg-emerald-500">
                  {journalBusy ? 'Saving…' : 'Log entry'}
                </Button>
              </div>
            </form>
            {data.actions.length > 0 && (
              <div className="space-y-2 border-t border-white/[0.06] pt-3">
                {data.actions.slice(0, 6).map((action) => (
                  <div key={action.id} className="flex gap-3 px-1 py-1">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400/70" />
                    <div className="min-w-0">
                      <p className="text-sm text-white/75">{action.description}</p>
                      <p className="text-xs text-white/30">
                        {action.type} · {formatDateTime(action.createdAt)}
                        {action.plantId ? ` · ${data.plants.find((plant) => plant.id === action.plantId)?.name || 'plant'}` : ' · whole crop'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="pb-2 text-center text-xs text-white/25">
        Updated {formatDateTime(data.generatedAt)} · CannaAI on Robin · Sensor data from the AC Infinity collector
      </p>
    </div>
  );
};

export default GrowCommandDashboard;
