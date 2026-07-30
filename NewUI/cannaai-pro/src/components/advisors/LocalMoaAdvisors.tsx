import React, { useEffect, useState } from 'react';
import { AlertCircle, BrainCircuit, CheckCircle2, Loader2, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';

type Provider = { id: string; healthy: boolean; status: string; capabilities: { text?: boolean } };
type Stage = { role: string; provider: string; model: string; latency: number };
type Result = { answer: string; stages: Stage[] };

export default function LocalMoaAdvisors() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [provider, setProvider] = useState('auto');
  const [task, setTask] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.advisors.status()
      .then((response: any) => setProviders((response.providers || []).filter((item: Provider) => item.capabilities?.text)))
      .catch(() => setError('Could not load AI provider status. Check the CannaAI backend connection.'));
  }, []);

  async function runAdvisors(event: React.FormEvent) {
    event.preventDefault();
    if (!task.trim() || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response: any = await api.advisors.run({ task: task.trim(), context: context.trim() || undefined, provider });
      setResult(response);
    } catch (requestError: any) {
      setError(requestError?.data?.error || requestError?.message || 'The advisor workflow could not complete.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-[#0f1419] text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-[#181b21] to-[#181b21] p-6">
          <div className="flex gap-4 items-start">
            <div className="rounded-xl bg-emerald-500/20 p-3 text-emerald-300"><BrainCircuit size={28} /></div>
            <div>
              <div className="flex flex-wrap gap-2 items-center">
                <h1 className="text-2xl font-bold text-white">Local MoA Advisors</h1>
                <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">Provider-aware</span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">Replaces the old agent-team workflow with a focused planner, skeptic, and final synthesizer. It uses your chosen connected provider and follows CannaAI&apos;s normal provider fallback rules.</p>
            </div>
          </div>
        </section>

        <form onSubmit={runAdvisors} className="rounded-2xl border border-gray-800 bg-[#181b21] p-5 sm:p-6 space-y-5">
          <div className="grid gap-5 md:grid-cols-[1fr_220px]">
            <label className="block"><span className="text-sm font-semibold text-gray-200">What do you need advice on?</span>
              <textarea value={task} onChange={(event) => setTask(event.target.value)} rows={4} maxLength={12000} placeholder="Example: Leaves are curling after a feed in week 3 of flower. What should I check first?" className="mt-2 w-full resize-y rounded-xl border border-gray-700 bg-[#0f1419] p-3 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none" />
            </label>
            <label className="block"><span className="text-sm font-semibold text-gray-200">AI provider</span>
              <select value={provider} onChange={(event) => setProvider(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-700 bg-[#0f1419] p-3 text-sm text-white focus:border-emerald-500 focus:outline-none">
                <option value="auto">Auto-select best connected provider</option>
                {providers.map((item) => <option key={item.id} value={item.id} disabled={!item.healthy}>{item.id}{item.healthy ? '' : ' (unavailable)'}</option>)}
              </select>
              <p className="mt-2 text-xs leading-5 text-gray-500">The selected provider is preferred for all three stages. If it fails, CannaAI falls back to another available provider.</p>
            </label>
          </div>
          <label className="block"><span className="text-sm font-semibold text-gray-200">Relevant context <span className="font-normal text-gray-500">(optional)</span></span>
            <textarea value={context} onChange={(event) => setContext(event.target.value)} rows={3} maxLength={20000} placeholder="Strain, medium, EC/pH, temperature/RH, timeline, photos already reviewed, etc." className="mt-2 w-full resize-y rounded-xl border border-gray-700 bg-[#0f1419] p-3 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none" />
          </label>
          <button type="submit" disabled={loading || !task.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-[#06120c] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}{loading ? 'Consulting advisors…' : 'Run advisor workflow'}
          </button>
        </form>

        {error && <div className="flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"><AlertCircle className="shrink-0" size={20} />{error}</div>}
        {result && <section className="rounded-2xl border border-gray-800 bg-[#181b21] p-5 sm:p-6"><div className="flex items-center gap-2"><Sparkles className="text-emerald-400" size={20} /><h2 className="text-lg font-bold">Final recommendation</h2></div><div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-200">{result.answer}</div><div className="mt-6 grid gap-3 sm:grid-cols-3">{result.stages.map((stage) => <div key={stage.role} className="rounded-xl border border-gray-800 bg-[#0f1419] p-3"><div className="flex items-center gap-2 text-sm font-semibold text-white"><CheckCircle2 size={16} className="text-emerald-400" />{stage.role}</div><div className="mt-1 text-xs text-gray-400">{stage.provider} · {stage.model}</div><div className="mt-1 text-xs text-gray-500">{stage.latency} ms</div></div>)}</div></section>}
        <div className="flex gap-2 text-xs text-gray-500"><ShieldCheck size={16} className="shrink-0 text-emerald-500" />Advisors only reason over the task and supplied context. They do not control grow equipment or make changes on their own.</div>
      </div>
    </div>
  );
}
