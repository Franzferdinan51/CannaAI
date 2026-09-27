import React from 'react';
import { motion } from 'framer-motion';
import {
  Thermometer, Droplets, Droplet, Sun, FlaskConical, Zap, Cloud, Wind,
  Brain, Upload, Loader2, AlertCircle, CheckCircle, AlertTriangle,
  Sparkles, ArrowRight, Activity, Leaf, Camera
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';

export interface Strain {
  id: string;
  name: string;
  type: string;
  lineage?: string;
  isPurpleStrain?: boolean;
}

export interface AnalysisResult {
  diagnosis?: string;
  urgency?: string;
  confidence?: number;
  healthScore?: number;
  causes?: string[];
  strainSpecificAdvice?: string;
  reasoning?: Array<{ step: string; weight: number; explanation: string }>;
  recommendations?: string[] | { immediate?: string[]; shortTerm?: string[]; longTerm?: string[] };
}

export interface Notification {
  id: number;
  type: 'alert' | 'info' | 'success' | 'error';
  message: string;
  time: string;
}

interface OverviewTabProps {
  sensorData: { temperature: number; humidity: number; soilMoisture: number; lightIntensity: number; ph: number; ec: number; co2: number; vpd: number };
  isConnected: boolean;
  strains: Strain[];
  notifications: Notification[];
  formData: { strain: string; leafSymptoms: string; plantImage: string | null };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  image: string | null;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFormSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  formError: string | null;
  setFormError: (v: string | null) => void;
  analysisResult: AnalysisResult | null;
  analysisMetadata: { provider: string; fallbackUsed?: boolean; fallbackReason?: string } | null;
  analysisError: string | null;
  onOpenScanner: () => void;
}

/** Ring gauge for a single vital sign */
function VitalGauge({ label, value, unit, icon: Icon, pct, color, sub }: {
  label: string; value: string; unit: string; icon: any; pct: number; color: string; sub: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="glass card-hover rounded-2xl p-5 relative overflow-hidden"
    >
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-25" style={{ background: color }} />
      <div className="flex items-start justify-between relative">
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08]" style={{ color }}>
            <Icon className="w-[18px] h-[18px]" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">{label}</p>
            <p className="text-[11px] text-white/30">{sub}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="font-display text-[32px] leading-none font-bold text-white">
            {value}<span className="text-[15px] font-semibold text-white/40 ml-1">{unit}</span>
          </p>
        </div>
        <div
          className="gauge-track w-16 h-16 rounded-full grid place-items-center"
          style={{ ['--gauge-pct' as any]: pct, ['--gauge-color' as any]: color }}
        >
          <div className="w-[52px] h-[52px] rounded-full bg-[#0a0f0d] grid place-items-center">
            <span className="text-[11px] font-bold" style={{ color }}>{Math.round(pct)}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const trendsData = [
  { time: '00:00', temp: 22, hum: 50, co2: 800 },
  { time: '04:00', temp: 21, hum: 52, co2: 750 },
  { time: '08:00', temp: 23, hum: 55, co2: 900 },
  { time: '12:00', temp: 25, hum: 48, co2: 1200 },
  { time: '16:00', temp: 24, hum: 50, co2: 1100 },
  { time: '20:00', temp: 22, hum: 53, co2: 850 },
  { time: '24:00', temp: 21, hum: 55, co2: 800 },
];

export default function OverviewTab(props: OverviewTabProps) {
  const { sensorData, isConnected, strains, notifications } = props;
  const { formData, setFormData, image, handleImageUpload, handleFormSubmit, isLoading, formError, setFormError, analysisResult, analysisMetadata, analysisError, onOpenScanner } = props;

  const healthScore = analysisResult?.healthScore;
  const alertCount = notifications.filter(n => n.type === 'alert' || n.type === 'error').length;

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      {/* ---------- Hero ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="glass-deep rounded-3xl p-6 sm:p-8 relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 right-0 w-[420px] h-[420px] rounded-full blur-[110px] opacity-30 bg-emerald-500" />
          <div className="absolute -bottom-32 left-1/3 w-[360px] h-[360px] rounded-full blur-[110px] opacity-20 bg-lime-400" />
        </div>
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span className={`pill ${isConnected ? 'pill-live' : 'pill-bad'}`}>
                {isConnected && <span className="dot-pulse !w-1.5 !h-1.5" />}
                {isConnected ? 'Tent live' : 'Offline'}
              </span>
              {alertCount > 0 && (
                <span className="pill pill-warn">{alertCount} alert{alertCount > 1 ? 's' : ''}</span>
              )}
              <span className="pill pill-dim">{strains.length} strains in library</span>
            </div>
            <h1 className="font-display text-3xl sm:text-[40px] font-extrabold tracking-tight leading-[1.05]">
              {timeGreeting()}, <span className="gradient-text text-glow-leaf">grower</span>
            </h1>
            <p className="mt-2.5 text-white/50 text-[15px] max-w-xl leading-relaxed">
              Your canopy is <span className="text-emerald-300 font-semibold">thriving</span> — environment is in the sweet spot and the AI is standing by for your next plant check.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={onOpenScanner} className="btn-primary-glow rounded-2xl h-12 px-6 text-[15px]">
              <Camera className="w-5 h-5 mr-2" strokeWidth={2.4} />
              Scan a plant
            </Button>
            {healthScore != null && (
              <div className="glass rounded-2xl px-5 py-2.5 flex items-center gap-3">
                <Leaf className="w-5 h-5 text-emerald-300" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Last health score</p>
                  <p className="font-display text-xl font-bold text-white">{healthScore}<span className="text-sm text-white/40">/100</span></p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ---------- Vital gauges ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <VitalGauge label="Temperature" value={sensorData.temperature.toFixed(1)} unit="°C" icon={Thermometer}
          pct={Math.min(100, (sensorData.temperature / 35) * 100)} color="#fb923c" sub="Canopy zone" />
        <VitalGauge label="Humidity" value={sensorData.humidity.toFixed(0)} unit="%" icon={Droplets}
          pct={sensorData.humidity} color="#60a5fa" sub="Relative humidity" />
        <VitalGauge label="VPD" value={sensorData.vpd.toFixed(2)} unit="kPa" icon={Cloud}
          pct={Math.min(100, (sensorData.vpd / 1.6) * 100)} color="#a78bfa" sub="Vapor pressure deficit" />
        <VitalGauge label="pH Level" value={sensorData.ph.toFixed(1)} unit="" icon={FlaskConical}
          pct={Math.min(100, (sensorData.ph / 14) * 100)} color="#34d399" sub="Nutrient solution" />
      </div>

      {/* ---------- AI analysis + results ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }}>
          <Card className="card-hover h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2.5 text-[17px]">
                  <span className="grid place-items-center w-9 h-9 rounded-xl bg-emerald-400/15 border border-emerald-400/25">
                    <Brain className="w-[18px] h-[18px] text-emerald-300" />
                  </span>
                  Quick diagnosis
                </CardTitle>
                <Badge variant="lime"><Sparkles className="w-3 h-3 mr-1" /> Local AI</Badge>
              </div>
              <CardDescription>Snap a photo or describe symptoms — get a diagnosis in seconds</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/60 text-[13px] font-semibold">Strain</Label>
                  <Select value={formData.strain} onValueChange={(val) => { setFormError(null); setFormData((prev: any) => ({ ...prev, strain: val })); }}>
                    <SelectTrigger aria-label="Select plant strain" className="input-luxe text-white">
                      <SelectValue placeholder="Select Strain" />
                    </SelectTrigger>
                    <SelectContent className="glass-deep border-white/10">
                      {strains.map(s => (
                        <SelectItem key={s.id} value={s.name} className="focus:bg-emerald-400/10 text-white/80">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/60 text-[13px] font-semibold">Plant photo</Label>
                  <label className="group flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-white/12 rounded-2xl cursor-pointer bg-white/[0.02] hover:bg-emerald-400/[0.05] hover:border-emerald-400/40 transition-all duration-300 overflow-hidden">
                    <div className="flex flex-col items-center justify-center px-4 text-center">
                      {image ? (
                        <img src={image} alt="Plant preview" className="h-28 object-contain rounded-xl" />
                      ) : (
                        <>
                          <span className="grid place-items-center w-11 h-11 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 mb-2.5 group-hover:scale-110 transition-transform">
                            <Upload className="w-5 h-5 text-emerald-300" />
                          </span>
                          <p className="text-sm text-white/45">Drop a leaf photo here, or <span className="text-emerald-300 font-semibold">browse</span></p>
                          <p className="text-[11px] text-white/25 mt-1">Vision AI reads spots, discoloration & pests</p>
                        </>
                      )}
                    </div>
                    <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                  </label>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/60 text-[13px] font-semibold">What do you see?</Label>
                  <Textarea
                    placeholder="Yellow tips, curling leaves, tiny webs…"
                    value={formData.leafSymptoms}
                    onChange={(e) => { setFormError(null); setFormData((prev: any) => ({ ...prev, leafSymptoms: e.target.value })); }}
                    className="input-luxe text-white min-h-[88px] resize-none"
                  />
                </div>

                {formError && <p role="alert" className="text-sm text-red-300 bg-red-400/10 border border-red-400/20 rounded-xl px-3.5 py-2.5">{formError}</p>}
                {analysisError && (
                  <div role="alert" className="text-sm text-red-300 bg-red-400/10 border border-red-400/20 rounded-xl px-3.5 py-2.5 flex gap-2.5">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{analysisError}</span>
                  </div>
                )}

                <Button type="submit" disabled={isLoading} className="btn-primary-glow w-full h-12 rounded-2xl text-[15px]">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Reading your plant…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" strokeWidth={2.4} />
                      Diagnose now
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results panel */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.14 }}>
          <Card className="h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[17px]">Diagnosis result</CardTitle>
                {analysisMetadata && (
                  <Badge variant="secondary" className="!normal-case !tracking-normal">{analysisMetadata.provider}</Badge>
                )}
              </div>
              <CardDescription>
                {analysisMetadata?.fallbackUsed
                  ? `Completed via fallback — ${analysisMetadata.fallbackReason || 'primary provider unavailable'}`
                  : 'Powered by your local vision model'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!analysisResult && !isLoading && (
                <div className="h-[380px] flex flex-col items-center justify-center text-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.015]">
                  <span className="grid place-items-center w-14 h-14 rounded-2xl bg-white/[0.04] float-slow">
                    <Leaf className="w-7 h-7 text-emerald-300/50" />
                  </span>
                  <p className="text-white/45 text-sm max-w-[240px]">Run a diagnosis and the AI's findings will bloom here</p>
                </div>
              )}
              {isLoading && (
                <div className="h-[380px] flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-[3px] border-emerald-400/20 border-t-emerald-400 animate-spin" />
                    <Brain className="absolute inset-0 m-auto w-6 h-6 text-emerald-300" />
                  </div>
                  <p className="text-white/50 text-sm">Analyzing leaf patterns…</p>
                  <div className="w-48 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 shimmer" />
                  </div>
                </div>
              )}
              {analysisResult && (
                <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                  <div className="glass rounded-2xl p-4 border-l-2 !border-l-emerald-400">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300/70 mb-1.5">Diagnosis</p>
                    <h3 className="font-display text-lg font-bold text-white leading-snug">{analysisResult.diagnosis || 'Analysis complete'}</h3>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {analysisResult.urgency && (
                        <span className={`pill ${analysisResult.urgency === 'high' ? 'pill-bad' : analysisResult.urgency === 'medium' ? 'pill-warn' : 'pill-live'}`}>
                          {analysisResult.urgency} priority
                        </span>
                      )}
                      {analysisResult.confidence != null && (
                        <span className="pill pill-dim">{Math.round(analysisResult.confidence * 100)}% confidence</span>
                      )}
                      {analysisResult.healthScore != null && (
                        <span className="pill pill-live">Health {analysisResult.healthScore}/100</span>
                      )}
                    </div>
                  </div>
                  {analysisResult.causes && analysisResult.causes.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/35 mb-2">Likely causes</p>
                      <ul className="space-y-1.5">
                        {analysisResult.causes.map((c, i) => (
                          <li key={i} className="flex gap-2.5 text-sm text-white/70 bg-white/[0.03] rounded-xl px-3.5 py-2.5">
                            <AlertTriangle className="w-4 h-4 text-amber-300/80 mt-0.5 shrink-0" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysisResult.recommendations && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/35 mb-2">Recommendations</p>
                      <ul className="space-y-1.5">
                        {(Array.isArray(analysisResult.recommendations)
                          ? analysisResult.recommendations
                          : [...(analysisResult.recommendations.immediate || []), ...(analysisResult.recommendations.shortTerm || []), ...(analysisResult.recommendations.longTerm || [])]
                        ).slice(0, 6).map((r, i) => (
                          <li key={i} className="flex gap-2.5 text-sm text-white/70 bg-emerald-400/[0.05] border border-emerald-400/10 rounded-xl px-3.5 py-2.5">
                            <CheckCircle className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysisResult.strainSpecificAdvice && (
                    <div className="rounded-2xl bg-lime-400/[0.06] border border-lime-400/15 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lime-300/70 mb-1.5">Strain-specific tip</p>
                      <p className="text-sm text-white/70 leading-relaxed">{analysisResult.strainSpecificAdvice}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ---------- Secondary stats ---------- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Soil moisture', value: `${sensorData.soilMoisture}%`, icon: Droplet, color: '#22d3ee' },
          { label: 'Light intensity', value: `${sensorData.lightIntensity}`, unit: 'µmol', icon: Sun, color: '#facc15' },
          { label: 'EC level', value: `${sensorData.ec}`, unit: 'mS/cm', icon: Zap, color: '#34d399' },
          { label: 'CO₂', value: `${sensorData.co2}`, unit: 'ppm', icon: Wind, color: '#a3e635' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 * i }}
            className="glass card-hover rounded-2xl p-4 flex items-center gap-3.5"
          >
            <span className="grid place-items-center w-11 h-11 rounded-2xl shrink-0" style={{ background: `${s.color}14`, border: `1px solid ${s.color}30` }}>
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">{s.label}</p>
              <p className="font-display text-xl font-bold text-white truncate">
                {s.value}{s.unit && <span className="text-xs font-semibold text-white/35 ml-1">{s.unit}</span>}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ---------- Trends + alerts ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[17px] flex items-center gap-2.5">
                    <span className="grid place-items-center w-9 h-9 rounded-xl bg-blue-400/10 border border-blue-400/20">
                      <Activity className="w-[18px] h-[18px] text-blue-300" />
                    </span>
                    Environmental trends
                  </CardTitle>
                  <CardDescription className="mt-1.5">24-hour temperature & humidity</CardDescription>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-white/50"><span className="w-2.5 h-2.5 rounded-full bg-orange-400" /> Temp</span>
                  <span className="flex items-center gap-1.5 text-white/50"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Humidity</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ovTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fb923c" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ovHum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} dy={6} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(10,15,13,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(12px)' }}
                      itemStyle={{ color: '#fff', fontSize: 12 }}
                      labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                    />
                    <Area type="monotone" dataKey="temp" stroke="#fb923c" strokeWidth={2.5} fillOpacity={1} fill="url(#ovTemp)" name="Temp (°C)" dot={false} activeDot={{ r: 4, fill: '#fb923c' }} />
                    <Area type="monotone" dataKey="hum" stroke="#60a5fa" strokeWidth={2.5} fillOpacity={1} fill="url(#ovHum)" name="Humidity (%)" dot={false} activeDot={{ r: 4, fill: '#60a5fa' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.16 }}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-[17px]">Grow feed</CardTitle>
              <CardDescription>Latest alerts & activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {notifications.length === 0 && (
                  <p className="text-sm text-white/35 text-center py-10">All quiet in the tent 🌿</p>
                )}
                {notifications.slice(0, 6).map((n) => (
                  <div key={n.id} className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
                    <span className={`grid place-items-center w-8 h-8 rounded-xl shrink-0 ${
                      n.type === 'alert' || n.type === 'error'
                        ? 'bg-red-400/10 border border-red-400/20'
                        : n.type === 'success'
                          ? 'bg-emerald-400/10 border border-emerald-400/20'
                          : 'bg-amber-400/10 border border-amber-400/20'
                    }`}>
                      {n.type === 'alert' || n.type === 'error'
                        ? <AlertCircle className="w-4 h-4 text-red-300" />
                        : n.type === 'success'
                          ? <CheckCircle className="w-4 h-4 text-emerald-300" />
                          : <AlertTriangle className="w-4 h-4 text-amber-300" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-white/80 leading-snug">{n.message}</p>
                      <p className="text-[11px] text-white/30 mt-1">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="ghost" size="sm" className="w-full mt-3 text-white/50 hover:text-white" onClick={onOpenScanner}>
                Open full scanner <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
