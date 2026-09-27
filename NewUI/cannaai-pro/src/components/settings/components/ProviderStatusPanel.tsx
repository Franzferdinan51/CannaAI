import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Wrench,
  XCircle,
} from 'lucide-react';
import { settingsAPI } from '../api-client';

interface ProviderCapabilities {
  text?: boolean;
  vision?: boolean;
  functionCalling?: boolean;
  streaming?: boolean;
}

interface ProviderEntry {
  id?: string;
  name: string;
  type?: string;
  model?: string;
  models?: Array<{ id: string; name: string }>;
  capabilities?: ProviderCapabilities;
  config?: ProviderCapabilities;
  status?: string;
  healthy?: boolean;
  liveDetection?: { available: boolean; reason: string } | null;
}

// Normalize the /api/ai/providers merged view into what the panel renders.
function normalize(p: ProviderEntry) {
  const healthy = p.healthy ?? p.status === 'available' ?? p.liveDetection?.available ?? false;
  const caps = p.capabilities || p.config || {};
  const model = p.model || p.models?.[0]?.id || p.models?.[0]?.name || '';
  // Fall back to the first detected model (e.g. LM Studio's loaded model).
  const detectedModel = !model && Array.isArray((p as any).detectedModels) && (p as any).detectedModels.length > 0
    ? String((p as any).detectedModels[0])
    : '';
  const isLocal = p.type === 'local';
  const reason = !healthy ? p.liveDetection?.reason || '' : '';
  return { healthy, caps, model: model || detectedModel, isLocal, reason };
}

const PROVIDER_LABELS: Record<string, string> = {
  lmstudio: 'LM Studio',
  openclaw: 'OpenClaw',
  hermes: 'Hermes',
  minimax: 'MiniMax',
  bailian: 'Bailian',
  openrouter: 'OpenRouter',
};

const labelFor = (name: string) =>
  PROVIDER_LABELS[name] || name.charAt(0).toUpperCase() + name.slice(1);

function StatusDot({ status }: { status: string }) {
  if (status === 'healthy') {
    return (
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
      </span>
    );
  }
  return <span className="inline-flex h-3 w-3 rounded-full bg-red-500" />;
}

/**
 * Live AI provider status — backed by GET /api/ai/providers (live detection).
 * Shows which providers are actually reachable right now, their honest
 * capabilities, and the configured model (no hard-coded model IDs).
 */
export const ProviderStatusPanel: React.FC = () => {
  const [providers, setProviders] = useState<ProviderEntry[]>([]);
  const [primary, setPrimary] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await settingsAPI.getAIProvidersStatus();
      const list: ProviderEntry[] = Array.isArray(data?.providers)
        ? data.providers
        : Array.isArray(data?.providerStatus)
          ? data.providerStatus
          : [];
      setProviders(list);
      // Best-effort primary: first healthy local provider, else first healthy.
      const norm = list.map((p) => ({ p, n: normalize(p) }));
      const healthyLocal = norm.find(({ n }) => n.healthy && n.isLocal);
      const healthyAny = norm.find(({ n }) => n.healthy);
      setPrimary(
        data?.liveDetection?.primary ||
          healthyLocal?.p.name ||
          healthyAny?.p.name ||
          '',
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not reach the provider status endpoint.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="glass rounded-3xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-400" />
          <h3 className="font-display text-[15px] font-bold text-white tracking-tight">Live Provider Status</h3>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-semibold text-white/70 transition-all hover:bg-white/[0.09] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Checking…' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          <span className="ml-2 text-sm text-white/45">Detecting providers…</span>
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/30 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-300">Provider detection failed</p>
            <p className="mt-1 text-xs text-red-400/80">{error}</p>
          </div>
        </div>
      ) : providers.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/35">
          No providers detected. Check that LM Studio or an agent runtime is running.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => {
            const { healthy, caps, model, isLocal, reason } = normalize(p);
            const capList: string[] = [];
            if (caps.text) capList.push('Text');
            if (caps.vision) capList.push('Vision');
            if (caps.functionCalling) capList.push('Tools');
            if (caps.streaming) capList.push('Streaming');
            return (
              <motion.div
                key={p.id || p.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-lg border p-3.5 ${
                  healthy
                    ? 'border-emerald-900/60 bg-emerald-950/20'
                    : 'border-white/[0.08] bg-white/[0.02] opacity-75'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot status={healthy ? 'healthy' : 'unhealthy'} />
                    <span className="text-sm font-semibold text-white">
                      {labelFor(p.name)}
                    </span>
                    {isLocal && (
                      <span className="rounded bg-blue-900/50 px-1.5 py-0.5 text-[10px] font-medium text-blue-300">
                        LOCAL
                      </span>
                    )}
                    {primary === p.name && healthy && (
                      <span className="rounded bg-emerald-900/50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                        PRIMARY
                      </span>
                    )}
                  </div>
                  {healthy ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                </div>

                {model ? (
                  <p className="mt-2 truncate text-[11px] text-white/40 font-mono" title={model}>
                    Model: <span className="text-white/60">{model}</span>
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-white/30">Model: not configured</p>
                )}

                {capList.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {capList.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/[0.06] border border-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/60"
                      >
                        {c === 'Vision' && <Eye className="h-2.5 w-2.5" />}
                        {c === 'Tools' && <Wrench className="h-2.5 w-2.5" />}
                        {c === 'Text' && <MessageSquareText className="h-2.5 w-2.5" />}
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {!healthy && reason && (
                  <p className="mt-2 text-[11px] leading-snug text-red-400/90">
                    {reason}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-[11px] text-white/30 leading-relaxed">
        Detection order: LM Studio → OpenClaw → Hermes → MiniMax → Bailian → OpenRouter.
        Vision for LM Studio reflects the loaded model.
      </p>
    </div>
  );
};

export default ProviderStatusPanel;
