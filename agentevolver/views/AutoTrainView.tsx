
import React, { useState } from 'react';
import { Wand2, Database, Target, UploadCloud, Play, Settings2, FolderOpen, Globe, FileText, Link, Library, FileCode2, Image as ImageIcon, Server, RefreshCw, CheckCircle2, AlertTriangle, Dna } from 'lucide-react';
import { AppSettings } from '../types';

interface AutoTrainViewProps {
  onLaunchAutoTrain: (config: any) => void;
  appSettings: AppSettings;
}

type DataSource = 'local' | 'web' | 'hf' | 'raw' | 'image';
type ModelSource = 'preset' | 'local';

const AutoTrainView: React.FC<AutoTrainViewProps> = ({ onLaunchAutoTrain, appSettings }) => {
  const [taskType, setTaskType] = useState('sft');

  // Data Source State
  const [dataSource, setDataSource] = useState<DataSource>('local');
  const [localPath, setLocalPath] = useState('');
  const [webUrl, setWebUrl] = useState('');
  const [webDepth, setWebDepth] = useState(1);
  const [hfDataset, setHfDataset] = useState('');
  const [rawText, setRawText] = useState('');

  // Image Training State
  const [imagePath, setImagePath] = useState('');
  const [imageResolution, setImageResolution] = useState(512);
  const [captionStrategy, setCaptionStrategy] = useState('txt_files');

  // Model & Params State
  const [modelSource, setModelSource] = useState<ModelSource>('preset');
  const [baseModel, setBaseModel] = useState('Qwen2.5-7B-Instruct');
  const [localModels, setLocalModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState(false);

  const [targetAccuracy, setTargetAccuracy] = useState(0.95);
  const [savePath, setSavePath] = useState('./autotrain_output');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fetchLocalModels = async () => {
    setIsLoadingModels(true);
    setModelFetchError(false);
    try {
        const response = await fetch(`${appSettings.baseUrl}/models`);
        if (response.ok) {
            const data = await response.json();
            // LM Studio / OpenAI compatible structure: { data: [{ id: "model-id", ... }] }
            const models = data.data?.map((m: any) => m.id) || [];
            setLocalModels(models);
            if (models.length > 0) {
                setBaseModel(models[0]);
            }
        } else {
            throw new Error("API returned " + response.status);
        }
    } catch (e) {
        console.warn("Could not connect to Local LLM. Using simulated models for demo.", e);
        setModelFetchError(true);
        // Fallback Mock Models so the UI is usable
        const mockModels = ['Simulated-Llama-3-8B', 'Simulated-Mistral-7B', 'Simulated-Qwen-14B'];
        setLocalModels(mockModels);
        setBaseModel(mockModels[0]);
    } finally {
        setIsLoadingModels(false);
    }
  };

  const handleStart = () => {
    setIsAnalyzing(true);

    // Construct config based on source
    const config = {
        taskType,
        baseModel,
        modelSource, // 'preset' or 'local'
        targetAccuracy,
        savePath,
        dataSource,
        dataConfig: {} as any
    };

    if (dataSource === 'local') config.dataConfig = { path: localPath };
    if (dataSource === 'web') config.dataConfig = { url: webUrl, depth: webDepth };
    if (dataSource === 'hf') config.dataConfig = { datasetId: hfDataset };
    if (dataSource === 'raw') config.dataConfig = { textLength: rawText.length, preview: rawText.substring(0, 50) };
    if (dataSource === 'image') config.dataConfig = { path: imagePath, resolution: imageResolution, captionStrategy };

    setTimeout(() => {
        setIsAnalyzing(false);
        onLaunchAutoTrain(config);
    }, 2000); // Mock analysis delay
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-end border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
             <Wand2 className="text-violet-400" />
             AutoTrain Pipeline
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Automated hyperparameter optimization. Ingest data from files, web, HuggingFace, or image folders.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Configuration */}
        <div className="lg:col-span-2 space-y-6">

            {/* 1. Task Definition */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Target size={100} />
                 </div>
                 <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold">1</span>
                    Define Task
                 </h3>

                 <div className="grid grid-cols-3 gap-4">
                    <button
                        onClick={() => setTaskType('sft')}
                        className={`p-4 rounded-xl border text-left transition-all ${
                            taskType === 'sft'
                            ? 'bg-violet-600/20 border-violet-500 ring-1 ring-violet-500'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                        }`}
                    >
                        <div className="font-semibold text-slate-200 mb-1">Supervised Finetuning</div>
                        <div className="text-xs text-slate-400">Standard instruction following (SFT) or VLM tuning.</div>
                    </button>
                    <button
                        onClick={() => setTaskType('dpo')}
                        className={`p-4 rounded-xl border text-left transition-all ${
                            taskType === 'dpo'
                            ? 'bg-violet-600/20 border-violet-500 ring-1 ring-violet-500'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                        }`}
                    >
                        <div className="font-semibold text-slate-200 mb-1">DPO / ORPO</div>
                        <div className="text-xs text-slate-400">Preference alignment and RLHF.</div>
                    </button>
                    <button
                        onClick={() => setTaskType('evolution')}
                        className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                            taskType === 'evolution'
                            ? 'bg-emerald-600/20 border-emerald-500 ring-1 ring-emerald-500'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                        }`}
                    >
                        <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1">
                            Agent Evolution
                            <Dna size={14} className="text-emerald-400" />
                        </div>
                        <div className="text-xs text-slate-400">Genetic prompt optimization & weight evolution.</div>
                    </button>
                 </div>
            </div>

            {/* 2. Data Source */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                 <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold">2</span>
                    Data Source
                 </h3>

                 {/* Source Tabs */}
                 <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    {[
                        { id: 'local', label: 'Local File', icon: FolderOpen },
                        { id: 'image', label: 'Image Dataset', icon: ImageIcon },
                        { id: 'web', label: 'Web Scraper', icon: Globe },
                        { id: 'hf', label: 'HuggingFace', icon: Library },
                        { id: 'raw', label: 'Raw Text', icon: FileCode2 },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setDataSource(tab.id as DataSource)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                                dataSource === tab.id
                                ? 'bg-slate-800 text-white border border-slate-600 shadow-sm'
                                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                            }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                 </div>

                 {/* Source Inputs */}
                 <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">

                    {dataSource === 'local' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Dataset Path or Directory</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={localPath}
                                    onChange={(e) => setLocalPath(e.target.value)}
                                    placeholder="/path/to/data.jsonl OR /path/to/docs_folder/"
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-mono text-sm"
                                />
                                <button className="px-4 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300">
                                    <UploadCloud size={18} />
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-500">Supports .jsonl, .csv, or a folder of .txt/.pdf/.md files for unstructured training.</p>
                        </div>
                    )}

                    {dataSource === 'image' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Image Directory</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={imagePath}
                                        onChange={(e) => setImagePath(e.target.value)}
                                        placeholder="/path/to/images/"
                                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-mono text-sm"
                                    />
                                    <button className="px-4 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300">
                                        <FolderOpen size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Resolution</label>
                                    <select
                                        value={imageResolution}
                                        onChange={(e) => setImageResolution(parseInt(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-mono text-sm"
                                    >
                                        <option value={256}>256x256 (Fast)</option>
                                        <option value={512}>512x512 (Standard)</option>
                                        <option value={768}>768x768 (High)</option>
                                        <option value={1024}>1024x1024 (SDXL)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Caption Source</label>
                                    <select
                                        value={captionStrategy}
                                        onChange={(e) => setCaptionStrategy(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-mono text-sm"
                                    >
                                        <option value="txt_files">Matching .txt files</option>
                                        <option value="metadata">metadata.jsonl</option>
                                        <option value="filenames">Filenames</option>
                                        <option value="autocaption">Auto-Caption (BLIP2)</option>
                                    </select>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500">Supported formats: JPG, PNG, WEBP. Ensure directory contains pairs or metadata.</p>
                        </div>
                    )}

                    {dataSource === 'web' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Target URL</label>
                                <div className="flex gap-2">
                                    <Globe className="text-slate-500 mt-3" size={16}/>
                                    <input
                                        type="text"
                                        value={webUrl}
                                        onChange={(e) => setWebUrl(e.target.value)}
                                        placeholder="https://docs.python.org/3/"
                                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-mono text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="space-y-2 flex-1">
                                    <label className="text-sm font-medium text-slate-300">Crawl Depth</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="5"
                                        value={webDepth}
                                        onChange={(e) => setWebDepth(parseInt(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-mono text-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-8">
                                    <input type="checkbox" id="clean-html" defaultChecked className="w-4 h-4 accent-violet-500" />
                                    <label htmlFor="clean-html" className="text-sm text-slate-400">Clean HTML (Boilerplate removal)</label>
                                </div>
                            </div>
                            <p className="text-[10px] text-yellow-500/80">⚠️ Web scraping will autonomously follow links within the same domain up to the specified depth.</p>
                        </div>
                    )}

                    {dataSource === 'hf' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">HuggingFace Dataset ID</label>
                            <div className="flex gap-2">
                                <Library className="text-slate-500 mt-3" size={16}/>
                                <input
                                    type="text"
                                    value={hfDataset}
                                    onChange={(e) => setHfDataset(e.target.value)}
                                    placeholder="user/dataset-name"
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-mono text-sm"
                                />
                            </div>
                            <p className="text-[10px] text-slate-500">Will automatically attempt to load the 'train' split.</p>
                        </div>
                    )}

                     {dataSource === 'raw' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Paste Training Data</label>
                            <textarea
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                placeholder="Paste unstructured text, code snippets, or logs here..."
                                className="w-full h-48 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-mono text-xs resize-none custom-scroll"
                            />
                             <p className="text-[10px] text-slate-500">{rawText.length} characters. Recommended for quick context injection.</p>
                        </div>
                    )}

                 </div>
            </div>

             {/* 3. Base Model & Output */}
             <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                 <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold">3</span>
                    Model & Output
                 </h3>

                 {/* Model Source Toggle */}
                 <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-700 mb-4 w-fit">
                      <button
                          onClick={() => setModelSource('preset')}
                          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                              modelSource === 'preset' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                          }`}
                      >
                          Standard Presets
                      </button>
                      <button
                          onClick={() => setModelSource('local')}
                          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
                              modelSource === 'local' ? 'bg-emerald-600/20 text-emerald-400 shadow' : 'text-slate-400 hover:text-slate-200'
                          }`}
                      >
                          <Server size={12} />
                          LM Studio / Local
                      </button>
                  </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Base Model</label>

                        {modelSource === 'preset' ? (
                            <select
                                value={baseModel}
                                onChange={(e) => setBaseModel(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none"
                            >
                                <option value="Qwen2.5-7B-Instruct">Qwen2.5-7B-Instruct (Recommended)</option>
                                <option value="Llama-3-8B-Instruct">Llama-3-8B-Instruct</option>
                                <option value="Mistral-7B-Instruct-v0.3">Mistral-7B-Instruct-v0.3</option>
                            </select>
                        ) : (
                            <div className="flex gap-2">
                                <select
                                    value={baseModel}
                                    onChange={(e) => setBaseModel(e.target.value)}
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    {localModels.length === 0 && <option value="">No models found...</option>}
                                    {localModels.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={fetchLocalModels}
                                    disabled={isLoadingModels}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 rounded-lg border border-slate-700 transition-colors"
                                    title={`Fetch from ${appSettings.baseUrl}`}
                                >
                                    <RefreshCw size={18} className={isLoadingModels ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        )}
                        {modelSource === 'local' && (
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                    Fetching from: <code className="text-slate-400">{appSettings.baseUrl}</code>
                                </p>
                                {modelFetchError && (
                                    <p className="text-[10px] text-yellow-500 flex items-center gap-1">
                                        <AlertTriangle size={10} />
                                        Using Mock Data
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Save Checkpoints To</label>
                        <input
                            type="text"
                            value={savePath}
                            onChange={(e) => setSavePath(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none font-mono text-sm"
                        />
                    </div>
                 </div>
            </div>

        </div>

        {/* Right Column: Constraints & Launch */}
        <div className="space-y-6">
             <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 h-fit sticky top-6">
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                    <Settings2 size={18} className="text-emerald-500" />
                    Auto-Optimization
                </h3>

                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium text-slate-300">Target Accuracy</label>
                            <span className="text-emerald-400 font-mono text-sm">{(targetAccuracy * 100).toFixed(0)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0.8"
                            max="0.99"
                            step="0.01"
                            value={targetAccuracy}
                            onChange={(e) => setTargetAccuracy(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            AutoTrain will iterate hyperparameters until this metric is met or early stopping triggers.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Estimated Resources</h4>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-500">GPU VRAM:</span>
                            <span className="text-slate-200">~22 GB</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Est. Time:</span>
                            <span className="text-slate-200">4h 30m</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleStart}
                    disabled={isAnalyzing}
                    className="w-full mt-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    {isAnalyzing ? (
                        <>Processing Source...</>
                    ) : (
                        <>
                            <Play fill="currentColor" size={18} />
                            Start AutoTrain Job
                        </>
                    )}
                </button>
             </div>

             {dataSource === 'web' && (
                <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl">
                    <h4 className="text-blue-400 text-sm font-bold flex items-center gap-2 mb-2">
                        <Globe size={14} />
                        Web Scraping Tip
                    </h4>
                    <p className="text-xs text-blue-200/70 leading-relaxed">
                        Ensure you have permission to scrape the target domain. The spider respects robots.txt by default.
                    </p>
                </div>
             )}

             {dataSource === 'local' && (
                <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl">
                    <h4 className="text-blue-400 text-sm font-bold flex items-center gap-2 mb-2">
                        <FileText size={14} />
                        Unstructured Data
                    </h4>
                    <p className="text-xs text-blue-200/70 leading-relaxed">
                        If pointing to a directory, we will attempt to extract text from all PDF, TXT, and Markdown files found.
                    </p>
                </div>
             )}

             {dataSource === 'image' && (
                <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl">
                    <h4 className="text-blue-400 text-sm font-bold flex items-center gap-2 mb-2">
                        <ImageIcon size={14} />
                        Image Training Tip
                    </h4>
                    <p className="text-xs text-blue-200/70 leading-relaxed">
                        For best VLM fine-tuning, verify that text files have the exact same filename as their corresponding image (e.g. <code>img1.jpg</code> and <code>img1.txt</code>).
                    </p>
                </div>
             )}
        </div>

      </div>
    </div>
  );
};

export default AutoTrainView;
