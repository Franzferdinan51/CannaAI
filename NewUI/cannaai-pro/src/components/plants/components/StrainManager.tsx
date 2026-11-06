import React, { useMemo, useState } from 'react';
import { PlantStrain, StrainFormData } from '../types';

// Import UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Import icons
import { Database, Pencil, Plus, X } from 'lucide-react';

interface StrainManagerProps {
  strains: PlantStrain[];
  onStrainCreate: (strain: PlantStrain) => Promise<PlantStrain | void> | PlantStrain | void;
  onStrainUpdate: (strain: PlantStrain) => Promise<PlantStrain | void> | PlantStrain | void;
  onStrainDelete: (strainId: string) => void;
}

const defaultForm: StrainFormData = {
  name: '',
  type: 'hybrid',
  lineage: '',
  description: '',
  isPurpleStrain: false,
  optimalConditions: {
    ph: { range: [6.0, 6.5], medium: 'soil' },
    temperature: { veg: [70, 80], flower: [65, 80] },
    humidity: { veg: [40, 65], flower: [40, 55] },
    light: { veg: '18/6', flower: '12/12' },
  },
  commonDeficiencies: [],
  characteristics: {
    growthPattern: '',
    plantSize: 'medium',
    floweringTime: 0,
    yield: 'medium',
    resistance: { mold: 'medium', pests: 'medium', disease: 'medium' },
    climate: ['temperate'],
  },
  growingDifficulty: 'intermediate',
  floweringTime: 0,
  thcLevel: undefined,
  cbdLevel: undefined,
  effects: [],
  medicalUses: [],
  flavors: [],
  aroma: [],
};

function normalizeType(value: unknown): StrainFormData['type'] {
  const text = String(value || 'hybrid').toLowerCase();
  if (text.startsWith('auto')) return 'autoflowering';
  if (text.startsWith('indica')) return 'indica';
  if (text.startsWith('sativa')) return 'sativa';
  if (text.startsWith('ruderalis')) return 'ruderalis';
  return 'hybrid';
}

function formFromStrain(strain: PlantStrain): StrainFormData {
  return {
    name: strain.name || '',
    type: normalizeType(strain.type),
    lineage: strain.lineage || '',
    description: strain.description || '',
    isPurpleStrain: Boolean(strain.isPurpleStrain),
    optimalConditions: strain.optimalConditions || defaultForm.optimalConditions,
    commonDeficiencies: Array.isArray(strain.commonDeficiencies) ? strain.commonDeficiencies : [],
    characteristics: strain.characteristics || defaultForm.characteristics,
    growingDifficulty: strain.growingDifficulty || 'intermediate',
    floweringTime: strain.floweringTime || strain.characteristics?.floweringTime || 0,
    thcLevel: strain.thcLevel,
    cbdLevel: strain.cbdLevel,
    effects: Array.isArray(strain.effects) ? strain.effects : [],
    medicalUses: Array.isArray(strain.medicalUses) ? strain.medicalUses : [],
    flavors: Array.isArray(strain.flavors) ? strain.flavors : [],
    aroma: Array.isArray(strain.aroma) ? strain.aroma : [],
  };
}

function toPlantStrain(form: StrainFormData, existing?: PlantStrain): PlantStrain {
  const now = new Date().toISOString();
  return {
    ...(existing || {}),
    id: existing?.id || `pending-${Date.now()}`,
    ...form,
    type: form.type,
    images: existing?.images || [],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  } as PlantStrain;
}

const StrainManager: React.FC<StrainManagerProps> = ({
  strains,
  onStrainCreate,
  onStrainUpdate,
  onStrainDelete,
}) => {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<PlantStrain | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<StrainFormData>(defaultForm);
  const [deficienciesText, setDeficienciesText] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const visibleStrains = useMemo(
    () => strains.filter((strain) => `${strain.name} ${strain.lineage || ''}`.toLowerCase().includes(query.toLowerCase())),
    [strains, query],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setDeficienciesText('');
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (strain: PlantStrain) => {
    const next = formFromStrain(strain);
    setEditing(strain);
    setForm(next);
    setDeficienciesText(next.commonDeficiencies.join(', '));
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormError('Give the strain a name.');
      return;
    }
    const payload: StrainFormData = {
      ...form,
      name: form.name.trim(),
      commonDeficiencies: deficienciesText.split(',').map((item) => item.trim()).filter(Boolean),
      characteristics: { ...form.characteristics, floweringTime: form.floweringTime || form.characteristics.floweringTime || 0 },
    };
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await onStrainUpdate(toPlantStrain(payload, editing));
      else await onStrainCreate(toPlantStrain(payload));
      setShowForm(false);
      setEditing(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save the strain.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[#181b21] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Database className="w-5 h-5 mr-2 text-emerald-400" />
            Strain Database
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-gray-400">The real strain library stored in CannaAI. Add, edit, and remove entries here.</p>
            <div className="flex gap-2">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search strains" className="rounded-lg border border-gray-700 bg-[#0f1419] px-3 py-2 text-sm text-white" />
              <Button type="button" onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-500">
                <Plus className="w-4 h-4 mr-1.5" /> Add strain
              </Button>
            </div>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="mt-5 rounded-xl border border-emerald-500/25 bg-[#0f1419] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">{editing ? `Edit ${editing.name}` : 'Add a strain'}</h3>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)} className="text-gray-400" aria-label="Close strain form">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="strain-name" className="text-gray-300">Name *</Label>
                  <Input id="strain-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-[#181b21] border-gray-700 text-white" required />
                </div>
                <div>
                  <Label htmlFor="strain-type" className="text-gray-300">Type</Label>
                  <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as StrainFormData['type'] })}>
                    <SelectTrigger id="strain-type" className="bg-[#181b21] border-gray-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#181b21] border-gray-700">
                      <SelectItem value="indica">Indica</SelectItem>
                      <SelectItem value="sativa">Sativa</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="ruderalis">Ruderalis</SelectItem>
                      <SelectItem value="autoflowering">Autoflowering</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="strain-lineage" className="text-gray-300">Lineage</Label>
                <Input id="strain-lineage" value={form.lineage} onChange={(e) => setForm({ ...form, lineage: e.target.value })} placeholder="Parent A x Parent B, backcrossed to…" className="bg-[#181b21] border-gray-700 text-white" />
              </div>
              <div>
                <Label htmlFor="strain-description" className="text-gray-300">Description</Label>
                <Textarea id="strain-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-[#181b21] border-gray-700 text-white min-h-[80px]" />
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label htmlFor="strain-flowering" className="text-gray-300">Flowering days</Label>
                  <Input id="strain-flowering" type="number" min="0" value={form.floweringTime || ''} onChange={(e) => setForm({ ...form, floweringTime: e.target.value ? Number(e.target.value) : 0 })} className="bg-[#181b21] border-gray-700 text-white" />
                </div>
                <div>
                  <Label htmlFor="strain-thc" className="text-gray-300">THC %</Label>
                  <Input id="strain-thc" type="number" min="0" step="0.1" value={form.thcLevel ?? ''} onChange={(e) => setForm({ ...form, thcLevel: e.target.value ? Number(e.target.value) : undefined })} className="bg-[#181b21] border-gray-700 text-white" />
                </div>
                <div>
                  <Label htmlFor="strain-cbd" className="text-gray-300">CBD %</Label>
                  <Input id="strain-cbd" type="number" min="0" step="0.1" value={form.cbdLevel ?? ''} onChange={(e) => setForm({ ...form, cbdLevel: e.target.value ? Number(e.target.value) : undefined })} className="bg-[#181b21] border-gray-700 text-white" />
                </div>
                <div>
                  <Label htmlFor="strain-difficulty" className="text-gray-300">Difficulty</Label>
                  <Select value={form.growingDifficulty} onValueChange={(value) => setForm({ ...form, growingDifficulty: value as StrainFormData['growingDifficulty'] })}>
                    <SelectTrigger id="strain-difficulty" className="bg-[#181b21] border-gray-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#181b21] border-gray-700">
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="strain-deficiencies" className="text-gray-300">Common deficiencies (comma separated)</Label>
                <Input id="strain-deficiencies" value={deficienciesText} onChange={(e) => setDeficienciesText(e.target.value)} className="bg-[#181b21] border-gray-700 text-white" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.isPurpleStrain} onChange={(e) => setForm({ ...form, isPurpleStrain: e.target.checked })} className="rounded border-gray-700 bg-[#181b21]" />
                Purple strain
              </label>
              {formError && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{formError}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-gray-700 text-gray-300">Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-500">{saving ? 'Saving…' : editing ? 'Save changes' : 'Add strain'}</Button>
              </div>
            </form>
          )}

          <p className="mt-4 text-sm text-gray-500">Showing {visibleStrains.length} of {strains.length} strains</p>
          {visibleStrains.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-gray-700 p-6 text-center text-sm text-gray-400">No matching strains. Use “Add strain” to put a real entry in the library.</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {visibleStrains.map((strain) => (
                <div key={strain.id} className="rounded-lg border border-gray-800 bg-[#0f1419] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-white">{strain.name}</h3>
                      <p className="text-xs text-gray-400">{strain.type} · {strain.lineage || 'Lineage not recorded'}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(strain)} className="text-emerald-300 hover:text-emerald-200">
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onStrainDelete(strain.id)} className="text-red-400 hover:text-red-300">Remove</Button>
                    </div>
                  </div>
                  {strain.description && <p className="mt-2 text-sm text-gray-400">{strain.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500">
                    {strain.isPurpleStrain && <span className="rounded bg-purple-500/10 px-2 py-1 text-purple-300">Purple</span>}
                    {strain.floweringTime ? <span className="rounded bg-white/5 px-2 py-1">{strain.floweringTime} day flower</span> : null}
                    {strain.growingDifficulty && <span className="rounded bg-white/5 px-2 py-1">{strain.growingDifficulty}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StrainManager;
