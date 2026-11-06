import React, { useCallback, useEffect, useState } from 'react';
import { API_ORIGIN } from '../../lib/api-origin';

// Harvest view: the frontend surface for /api/harvest (wave 2 API,
// wave 4 UI). Lists harvest events per plant with wet/dry weights and
// dry/cure progress, and supports create / edit / delete against the
// real API. Yield summary comes from /api/grow/stats.

interface HarvestPlant {
  id: string;
  name: string;
  strainId?: string | null;
  stage?: string | null;
}

interface HarvestRecord {
  id: string;
  plantId: string;
  plant?: HarvestPlant | null;
  harvestedAt: string;
  wetWeightGrams?: number | null;
  dryWeightGrams?: number | null;
  dryStartedAt?: string | null;
  dryEndedAt?: string | null;
  cureStartedAt?: string | null;
  cureEndedAt?: string | null;
  notes?: string | null;
}

interface PlantOption {
  id: string;
  name: string;
}

interface HarvestForm {
  plantId: string;
  harvestedAt: string;
  wetWeightGrams: string;
  dryWeightGrams: string;
  dryStartedAt: string;
  dryEndedAt: string;
  cureStartedAt: string;
  cureEndedAt: string;
  notes: string;
}

const emptyForm = (): HarvestForm => ({
  plantId: '',
  harvestedAt: new Date().toISOString().slice(0, 10),
  wetWeightGrams: '',
  dryWeightGrams: '',
  dryStartedAt: '',
  dryEndedAt: '',
  cureStartedAt: '',
  cureEndedAt: '',
  notes: '',
});

function toDateInput(value?: string | null): string {
  return value ? value.slice(0, 10) : '';
}

function formFromRecord(record: HarvestRecord): HarvestForm {
  return {
    plantId: record.plantId,
    harvestedAt: toDateInput(record.harvestedAt),
    wetWeightGrams: record.wetWeightGrams != null ? String(record.wetWeightGrams) : '',
    dryWeightGrams: record.dryWeightGrams != null ? String(record.dryWeightGrams) : '',
    dryStartedAt: toDateInput(record.dryStartedAt),
    dryEndedAt: toDateInput(record.dryEndedAt),
    cureStartedAt: toDateInput(record.cureStartedAt),
    cureEndedAt: toDateInput(record.cureEndedAt),
    notes: record.notes ?? '',
  };
}

function stageOf(record: HarvestRecord): string {
  if (record.cureEndedAt) return 'Cured';
  if (record.cureStartedAt) return 'Curing';
  if (record.dryEndedAt) return 'Dried';
  if (record.dryStartedAt) return 'Drying';
  return 'Fresh';
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function formatGrams(value?: number | null): string {
  return value == null ? '—' : `${value} g`;
}

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return body;
}

const Harvest: React.FC = () => {
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
  const [plants, setPlants] = useState<PlantOption[]>([]);
  const [avgYield, setAvgYield] = useState<number | null>(null);
  const [efficiency, setEfficiency] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<HarvestForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [harvestBody, statsBody, plantsBody] = await Promise.all([
        api('/api/harvest'),
        api('/api/grow/stats').catch(() => null),
        api('/api/plants').catch(() => null),
      ]);
      setHarvests(harvestBody.harvests ?? harvestBody.data?.harvests ?? []);
      if (statsBody?.data) {
        setAvgYield(statsBody.data.avgYield ?? null);
        setEfficiency(statsBody.data.efficiency ?? null);
      }
      const plantList =
        plantsBody?.data?.plants ?? plantsBody?.plants ?? plantsBody?.data ?? [];
      if (Array.isArray(plantList)) {
        setPlants(
          plantList
            .filter((p: any) => p && typeof p.id === 'string')
            .map((p: any) => ({ id: p.id, name: p.name || p.id })),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load harvests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = (field: keyof HarvestForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.plantId) {
      setError('Pick the plant this harvest came from.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {
      plantId: form.plantId,
      harvestedAt: form.harvestedAt || undefined,
      wetWeightGrams: form.wetWeightGrams === '' ? null : Number(form.wetWeightGrams),
      dryWeightGrams: form.dryWeightGrams === '' ? null : Number(form.dryWeightGrams),
      dryStartedAt: form.dryStartedAt || null,
      dryEndedAt: form.dryEndedAt || null,
      cureStartedAt: form.cureStartedAt || null,
      cureEndedAt: form.cureEndedAt || null,
      notes: form.notes.trim() || null,
    };
    try {
      if (editingId) {
        await api('/api/harvest', {
          method: 'PUT',
          body: JSON.stringify({ id: editingId, ...payload }),
        });
      } else {
        await api('/api/harvest', { method: 'POST', body: JSON.stringify(payload) });
      }
      setForm(emptyForm());
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save harvest');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (record: HarvestRecord) => {
    setEditingId(record.id);
    setForm(formFromRecord(record));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (record: HarvestRecord) => {
    if (!window.confirm(`Delete the harvest for ${record.plant?.name || record.plantId}?`)) return;
    try {
      await api(`/api/harvest?id=${encodeURIComponent(record.id)}`, { method: 'DELETE' });
      if (editingId === record.id) {
        setEditingId(null);
        setForm(emptyForm());
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete harvest');
    }
  };

  const inputClass =
    'w-full rounded-md bg-gray-900 border border-white/10 px-3 py-2 text-sm text-gray-100 focus:border-emerald-500 focus:outline-none';
  const labelClass = 'block text-xs uppercase tracking-wide text-gray-400 mb-1';

  return (
    <div className="flex-1 overflow-y-auto bg-gray-900 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-100">
              Harvest <span className="text-emerald-400">log</span>
            </h1>
            <p className="text-sm text-gray-400">
              Every harvest event, its weights, and where it is in dry &amp; cure.
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2">
              <div className="text-gray-400">Harvests</div>
              <div className="text-lg font-semibold text-gray-100">{harvests.length}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2">
              <div className="text-gray-400">Avg dry yield</div>
              <div className="text-lg font-semibold text-gray-100">
                {avgYield == null ? '—' : `${avgYield} g`}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2">
              <div className="text-gray-400">Dry / wet</div>
              <div className="text-lg font-semibold text-gray-100">
                {efficiency == null ? '—' : `${efficiency}%`}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-300">
            {editingId ? 'Edit harvest' : 'Record a harvest'}
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="col-span-2">
              <label className={labelClass}>Plant</label>
              <select
                className={inputClass}
                value={form.plantId}
                onChange={(e) => setField('plantId', e.target.value)}
              >
                <option value="">Select a plant…</option>
                {plants.map((plant) => (
                  <option key={plant.id} value={plant.id}>
                    {plant.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Harvested</label>
              <input
                type="date"
                className={inputClass}
                value={form.harvestedAt}
                onChange={(e) => setField('harvestedAt', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Stage</label>
              <div className="px-1 py-2 text-sm text-gray-300">
                {editingId
                  ? stageOf(harvests.find((h) => h.id === editingId) || ({} as HarvestRecord))
                  : 'Fresh'}
              </div>
            </div>
            <div>
              <label className={labelClass}>Wet weight (g)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                className={inputClass}
                value={form.wetWeightGrams}
                onChange={(e) => setField('wetWeightGrams', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Dry weight (g)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                className={inputClass}
                value={form.dryWeightGrams}
                onChange={(e) => setField('dryWeightGrams', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Dry started</label>
              <input
                type="date"
                className={inputClass}
                value={form.dryStartedAt}
                onChange={(e) => setField('dryStartedAt', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Dry ended</label>
              <input
                type="date"
                className={inputClass}
                value={form.dryEndedAt}
                onChange={(e) => setField('dryEndedAt', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Cure started</label>
              <input
                type="date"
                className={inputClass}
                value={form.cureStartedAt}
                onChange={(e) => setField('cureStartedAt', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Cure ended</label>
              <input
                type="date"
                className={inputClass}
                value={form.cureEndedAt}
                onChange={(e) => setField('cureEndedAt', e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Notes</label>
              <input
                type="text"
                className={inputClass}
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Partial harvest, tops only…"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add harvest'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm());
                }}
                className="rounded-md border border-white/15 px-4 py-2 text-sm text-gray-200 hover:bg-white/10"
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>

        {loading ? (
          <p className="text-sm text-gray-400">Loading harvests…</p>
        ) : harvests.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-gray-400">
            No harvests recorded yet. When a crop comes down, log it above — weights and dry/cure
            dates fill in as it progresses.
          </div>
        ) : (
          <div className="space-y-3">
            {harvests.map((record) => (
              <div
                key={record.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-gray-100">
                    {record.plant?.name || record.plantId}
                    <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                      {stageOf(record)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">{formatDate(record.harvestedAt)}</div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-300 md:grid-cols-4">
                  <div>Wet: {formatGrams(record.wetWeightGrams)}</div>
                  <div>Dry: {formatGrams(record.dryWeightGrams)}</div>
                  <div>
                    Dry: {formatDate(record.dryStartedAt)} → {formatDate(record.dryEndedAt)}
                  </div>
                  <div>
                    Cure: {formatDate(record.cureStartedAt)} → {formatDate(record.cureEndedAt)}
                  </div>
                </div>
                {record.notes && <p className="mt-2 text-sm text-gray-400">{record.notes}</p>}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleEdit(record)}
                    className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-gray-200 hover:bg-white/10"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => void handleDelete(record)}
                    className="rounded-md border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Harvest;
