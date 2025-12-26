import React, { useState } from 'react';
import { Dna, Activity, Zap, Sprout, Heart, Loader2, ArrowRight, GitMerge, Pencil, Save, X, Beaker, Leaf, Plus, ClipboardList, Move, Trash2, Bot } from 'lucide-react';
import { BreedingProject, BreedingStatus, GeneticAnalysis, LineageNode, Strain } from '../types/canopy';
import { analyzeGenetics } from '../lib/ai/canopyService';

interface BreedingLabProps {
  strains: Strain[];
  setStrains: React.Dispatch<React.SetStateAction<Strain[]>>;
  breedingProjects?: BreedingProject[];
  setBreedingProjects?: React.Dispatch<React.SetStateAction<BreedingProject[]>>;
  apiKey: string;
  onTriggerAI?: (prompt: string) => void;
}

const STATUS_COLUMNS: BreedingStatus[] = ['Planning', 'Pollination', 'Seed Harvest', 'Pheno Hunting', 'Completed'];

export function BreedingLab({ strains, setStrains, breedingProjects = [], setBreedingProjects, apiKey, onTriggerAI }: BreedingLabProps) {
  const [activeTab, setActiveTab] = useState<'analysis' | 'projects'>('analysis');
  const [selectedStrainId, setSelectedStrainId] = useState<string>(strains[0]?.id || '');
  const [analysis, setAnalysis] = useState<GeneticAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPheno, setExpandedPheno] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editLineageData, setEditLineageData] = useState<{
    parents: LineageNode[],
    grandparents: LineageNode[]
  }>({ parents: [], grandparents: [] });

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    motherId: '',
    fatherId: '',
    notes: ''
  });

  const selectedStrain = strains.find(s => s.id === selectedStrainId);

  const runAnalysis = async () => {
    if (!selectedStrain) return;
    setIsLoading(true);
    setError(null);
    setExpandedPheno(null);
    try {
      const result = await analyzeGenetics(selectedStrain, strains, apiKey);
      setAnalysis(result);
    } catch (err) {
      setError("Failed to analyze genetics. Ensure AI settings are correct.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveLineage = () => {
    if (!selectedStrain) return;
    const cleanParents = editLineageData.parents.filter(p => p.name.trim() !== '');
    const cleanGrandparents = editLineageData.grandparents.filter(p => p.name.trim() !== '');
    setStrains(prev => prev.map(s =>
      s.id === selectedStrainId
        ? { ...s, parents: cleanParents, grandparents: cleanGrandparents }
        : s
    ));
    setIsEditModalOpen(false);
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setBreedingProjects) return;
    const mother = strains.find(s => s.id === newProject.motherId);
    const father = strains.find(s => s.id === newProject.fatherId);

    const projectName = newProject.name || `${mother?.name || 'Unknown'} x ${father?.name || 'Unknown'}`;

    const project: BreedingProject = {
      id: crypto.randomUUID(),
      name: projectName,
      motherId: newProject.motherId,
      fatherId: newProject.fatherId,
      status: 'Planning',
      startDate: new Date().toLocaleDateString(),
      notes: newProject.notes
    };

    setBreedingProjects(prev => [...prev, project]);
    setIsProjectModalOpen(false);
    setNewProject({ name: '', motherId: '', fatherId: '', notes: '' });
  };

  const NodeTypeBadge = ({ type }: { type: string }) => {
    const colorClass =
      type.toLowerCase().includes('sativa') ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
      type.toLowerCase().includes('indica') ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colorClass}`}>{type}</span>;
  };

  const LineageCard = ({ node, role }: { node?: LineageNode, role: string }) => {
    if (!node || !node.name) return (
      <div className="flex flex-col items-center justify-center p-3 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg h-20 w-32 bg-gray-50 dark:bg-gray-800/50">
        <span className="text-xs text-gray-400">Unknown</span>
      </div>
    );
    return (
      <div className="flex flex-col items-center p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm w-32 relative group hover:border-green-500 transition-colors z-10">
        <span className="absolute -top-2 bg-gray-100 dark:bg-gray-700 text-[9px] text-gray-500 dark:text-gray-400 px-1 rounded">{role}</span>
        <div className="w-full text-center truncate font-semibold text-xs text-gray-800 dark:text-gray-200 mt-1 mb-1">{node.name}</div>
        <NodeTypeBadge type={node.type} />
      </div>
    );
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white dark:bg-gray-800 rounded-full text-green-600 dark:text-green-400 shadow-sm">
            <Dna size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Breeding Lab</h1>
            <p className="text-gray-500">Plan crosses & track genetic projects</p>
          </div>
        </div>

        <div className="flex bg-white dark:bg-gray-900 p-1 rounded-xl border shadow-sm">
          <button onClick={() => setActiveTab('analysis')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${activeTab === 'analysis' ? 'bg-green-100 text-green-700' : 'text-gray-500'}`}>
            <Activity size={16} /> Analysis
          </button>
          <button onClick={() => setActiveTab('projects')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${activeTab === 'projects' ? 'bg-green-100 text-green-700' : 'text-gray-500'}`}>
            <ClipboardList size={16} /> Project Board
          </button>
        </div>
      </div>

      {activeTab === 'analysis' ? (
        <>
          <div className="flex items-center gap-2 mb-8 bg-white dark:bg-gray-900 p-2 rounded-xl border w-fit">
            <span className="text-sm font-medium ml-2 text-gray-500">Target Strain:</span>
            <select value={selectedStrainId} onChange={(e) => setSelectedStrainId(e.target.value)} className="bg-transparent text-gray-800 dark:text-white text-sm font-bold px-2 outline-none min-w-[150px]">
              {strains.map(s => <option key={s.id} value={s.id}>{s.name}</option>)})
            </select>
            <button onClick={runAnalysis} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              Run AI Analysis
            </button>
          </div>

          {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl">{error}</div>}

          {!analysis && !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-dashed">
              <GitMerge size={48} className="mb-4 opacity-20" />
              <p className="font-medium mb-4 text-gray-400">Select a strain to visualize lineage</p>
            </div>
          )}

          {analysis && !isLoading && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 flex flex-col items-center">
                <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
                  <GitMerge size={18} className="text-green-500" /> Genetic Lineage
                </h3>

                <div className="flex flex-col items-center">
                  <div className="flex gap-8 mb-8">
                    <div className="flex gap-2">
                      <LineageCard node={analysis.grandparents?.[0]} role="GP 1" />
                      <LineageCard node={analysis.grandparents?.[1]} role="GP 2" />
                    </div>
                    <div className="flex gap-2">
                      <LineageCard node={analysis.grandparents?.[2]} role="GP 3" />
                      <LineageCard node={analysis.grandparents?.[3]} role="GP 4" />
                    </div>
                  </div>

                  <div className="flex gap-24 mb-8">
                    <LineageCard node={analysis.parents?.[0]} role="Mother" />
                    <LineageCard node={analysis.parents?.[1]} role="Father" />
                  </div>

                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-xl w-48 text-center">
                    <div className="font-bold text-gray-800 dark:text-white text-lg">{analysis.strainName}</div>
                    <div className="text-sm text-gray-500">{selectedStrain?.breeder}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Beaker size={18} className="text-pink-500" /> Breeding Suggestions
                </h3>

                <div className="grid gap-4">
                  {analysis.recommendations?.map((rec) => (
                    <div key={rec.partnerId} className="bg-white dark:bg-gray-900 rounded-xl p-5 hover:shadow-md">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-2xl font-black font-mono">{rec.projectedName}</div>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{rec.synergyAnalysis}</p>

                      {rec.dominantTerpenes?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {rec.dominantTerpenes.map((terp, i) => (
                            <span key={i} className="text-xs font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                              <Leaf size={8} className="inline mr-1" /> {terp}
                            </span>
                          ))}
                        </div>
                      )}

                      <button onClick={() => setExpandedPheno(expandedPheno === rec.partnerId ? null : rec.partnerId)} className="w-full py-2 px-4 rounded bg-gray-50 text-sm font-bold">
                        {expandedPheno === rec.partnerId ? 'Hide' : 'Show'} Phenotypes
                      </button>

                      {expandedPheno === rec.partnerId && rec.potentialPhenotypes && (
                        <div className="mt-4 space-y-3">
                          {rec.potentialPhenotypes.map((pheno, i) => (
                            <div key={i} className="bg-gray-50 rounded p-3 text-sm">
                              <div className="font-bold">{pheno.name}</div>
                              <div className="text-gray-600 text-xs">{pheno.description}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-500">Drag and drop projects to track progress</p>
          <button onClick={() => setIsProjectModalOpen(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
            <Plus size={16} /> New Project
          </button>
        </div>
      )}
    </div>
  );
}
