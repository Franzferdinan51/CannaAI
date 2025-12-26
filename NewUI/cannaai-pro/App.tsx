import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Sprout, Thermometer, Scan, FileText, Settings, Upload, Leaf } from './components/Icons';
import { PlantImage, AnalysisResult } from './types';
import { analyzePlantImage } from './services/geminiService';

// --- MOCK DATA INITIALIZATION ---
const MOCK_IMAGES: PlantImage[] = [
  {
    id: '1',
    url: 'https://images.unsplash.com/photo-1566314737454-47f2f36e42d0?q=80&w=600&auto=format&fit=crop',
    timestamp: '12:35 AM',
    status: 'Healthy',
    batchId: '#452',
    strain: 'Gorilla Glue #4',
    analysis: {
      overallHealth: 'Healthy',
      issues: [],
      recommendations: 'Plant is thriving. Maintain current light cycles and nutrient feed.',
    }
  },
  {
    id: '2',
    url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=600&auto=format&fit=crop', // Generic leaf for processing
    timestamp: '12:37 AM',
    status: 'Processing',
    batchId: '#452',
    strain: 'Gorilla Glue #4',
  },
  {
    id: '3',
    url: 'https://images.unsplash.com/photo-1587924308406-061f366c8a23?q=80&w=600&auto=format&fit=crop',
    timestamp: '12:33 AM',
    status: 'Warning',
    batchId: '#452',
    strain: 'Gorilla Glue #4',
    analysis: {
      overallHealth: 'Issues Detected',
      issues: [{ name: 'Nutrient Deficiency', confidence: 82 }],
      recommendations: 'Signs of Nitrogen deficiency detected. Increase nitrogen content in the next feeding cycle.',
    }
  },
  {
    id: '4',
    url: 'https://images.unsplash.com/photo-1536652137234-b56d066dfa09?q=80&w=600&auto=format&fit=crop',
    timestamp: '12:32 AM',
    status: 'Critical',
    batchId: '#452',
    strain: 'Gorilla Glue #4',
    analysis: {
      overallHealth: 'Critical',
      issues: [{ name: 'Spider Mites', confidence: 88 }, { name: 'Leaf Septoria', confidence: 65 }],
      recommendations: 'Increase airflow immediately. Apply neem oil spray during dark cycle. Monitor humidity levels closely.',
    }
  },
];

export default function App() {
  const [images, setImages] = useState<PlantImage[]>(MOCK_IMAGES);
  const [selectedId, setSelectedId] = useState<string>('4');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedImage = images.find(img => img.id === selectedId) || images[0];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const base64Content = base64String.split(',')[1];

      const newImage: PlantImage = {
        id: Date.now().toString(),
        url: base64String,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Processing',
        batchId: '#452', // Assuming current batch context
        strain: 'Gorilla Glue #4',
      };

      // Add to beginning of list
      setImages(prev => [newImage, ...prev]);
      setSelectedId(newImage.id);
      setIsAnalyzing(true);

      // Trigger Gemini Analysis
      try {
        const analysis = await analyzePlantImage(base64Content);
        
        setImages(prev => prev.map(img => {
          if (img.id === newImage.id) {
            let status: PlantImage['status'] = 'Healthy';
            if (analysis.overallHealth === 'Critical') status = 'Critical';
            else if (analysis.overallHealth === 'Issues Detected') status = 'Warning';

            return { ...img, status, analysis };
          }
          return img;
        }));
      } catch (error) {
        console.error("Analysis failed", error);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0B0D10] text-gray-300 selection:bg-emerald-500/30">
      
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-gray-800 bg-[#11141A] flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xl">
            <Leaf className="w-6 h-6" />
            <span className="text-white">CannaAI</span> <span className="text-emerald-500 font-light">Pro</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          <SidebarItem icon={<LayoutDashboard />} label="Dashboard" />
          <SidebarItem icon={<Sprout />} label="Plants" />
          <SidebarItem icon={<Thermometer />} label="Sensors" />
          <SidebarItem icon={<Scan />} label="Scanner" active />
          <SidebarItem icon={<FileText />} label="Reports" />
          <SidebarItem icon={<Settings />} label="Settings" />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header */}
        <header className="h-16 border-b border-gray-800 bg-[#11141A] px-8 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Plant Health Scanner</h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20"
            >
              <span className="text-lg">+</span> New Analysis
            </button>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search" 
                className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-64 pl-10 p-2"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleFileUpload}
          />
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          
          {/* Recent Scans Row */}
          <div className="mb-8">
            <h2 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Current Analysis: Batch {selectedImage?.batchId} - {selectedImage?.strain}</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {images.map((img) => (
                <div 
                  key={img.id}
                  onClick={() => setSelectedId(img.id)}
                  className={`
                    relative flex-shrink-0 w-48 h-48 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 border-2
                    ${selectedId === img.id ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-gray-800 hover:border-gray-600'}
                  `}
                >
                  <img src={img.url} alt="Plant" className="w-full h-full object-cover" />
                  
                  {/* Status Badge Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-between p-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono text-gray-300 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm">{img.timestamp}</span>
                      {selectedId === img.id && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>}
                    </div>
                    
                    <div className="flex justify-center">
                      <StatusPill status={img.status} />
                    </div>
                  </div>

                  {/* Processing Spinner */}
                  {img.status === 'Processing' && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                      <span className="text-xs font-medium text-white">Processing</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Add Photo Dropzone Placeholder */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 w-48 h-48 rounded-xl border-2 border-dashed border-gray-700 bg-gray-800/30 flex flex-col items-center justify-center text-gray-500 hover:border-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-all cursor-pointer"
              >
                <Upload className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-sm font-medium">Add Photo</span>
                <span className="text-xs opacity-50 mt-1">Drag & Drop</span>
              </div>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 w-48 h-48 rounded-xl border-2 border-dashed border-gray-700 bg-gray-800/30 flex flex-col items-center justify-center text-gray-500 hover:border-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-all cursor-pointer"
              >
                <Upload className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-sm font-medium">Add Photo</span>
                <span className="text-xs opacity-50 mt-1">Drag & Drop</span>
              </div>
            </div>
          </div>

          {/* Selected Analysis View */}
          <div className="bg-[#181b21] rounded-2xl border border-gray-800 overflow-hidden flex flex-col lg:flex-row min-h-[500px]">
            
            {/* Left: Large Image */}
            <div className="lg:w-2/3 bg-black relative group">
               <img 
                src={selectedImage.url} 
                alt="Selected Plant Analysis" 
                className="w-full h-full object-contain bg-[#0f1115]"
              />
              {/* Image Controls Overlay */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <div className="bg-black/70 backdrop-blur text-white px-3 py-1 rounded-full text-xs">Zoom: 100%</div>
              </div>
            </div>

            {/* Right: Details Panel */}
            <div className="lg:w-1/3 p-6 flex flex-col bg-[#181b21] border-l border-gray-800">
              <div className="mb-6">
                <div className="flex justify-between items-baseline mb-2">
                   <h3 className="text-lg font-semibold text-white">Image Analysis</h3>
                   <span className="text-xs text-gray-500">ID: {selectedImage.id}</span>
                </div>
                <div className="text-sm text-gray-400">Analyzed at {selectedImage.timestamp}</div>
              </div>

              {/* Detection Box */}
              <div className={`rounded-lg p-4 mb-6 ${
                selectedImage.status === 'Healthy' ? 'bg-emerald-900/20 border border-emerald-900/50' :
                selectedImage.status === 'Processing' ? 'bg-gray-800 border border-gray-700' :
                'bg-red-900/20 border border-red-900/50'
              }`}>
                <h4 className={`text-sm font-bold mb-2 ${
                   selectedImage.status === 'Healthy' ? 'text-emerald-400' : 
                   selectedImage.status === 'Processing' ? 'text-gray-300' : 'text-red-400'
                }`}>
                  {selectedImage.status === 'Healthy' ? 'System Healthy' : 
                   selectedImage.status === 'Processing' ? 'Analyzing...' : 'Detected Issues:'}
                </h4>
                
                {selectedImage.status === 'Processing' ? (
                   <div className="space-y-2 animate-pulse">
                      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                   </div>
                ) : selectedImage.analysis?.issues.length ? (
                  <ul className="space-y-1">
                    {selectedImage.analysis.issues.map((issue, idx) => (
                      <li key={idx} className="flex justify-between text-sm text-gray-200">
                        <span>{issue.name}</span>
                        <span className="font-mono opacity-75">{issue.confidence}%</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-emerald-200/70">No pests or nutrient deficiencies detected. Plant biomass is within optimal range.</p>
                )}
              </div>

              {/* Recommendations */}
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Recommendations:</h4>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {selectedImage.status === 'Processing' ? 'Waiting for analysis results...' : 
                   selectedImage.analysis?.recommendations || "No specific actions required at this time."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm font-medium transition-colors">Previous Photo</button>
                  <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm font-medium transition-colors">Next Photo</button>
                </div>
                <button className="w-full bg-emerald-900/50 hover:bg-emerald-900/70 text-emerald-400 border border-emerald-900 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" /> Download Report
                </button>
                <button className="w-full bg-gray-800 hover:bg-gray-700 text-gray-400 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <Scan className="w-4 h-4" /> Recalibrate AI
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* Footer Status Bar */}
        <footer className="h-8 bg-[#0f1115] border-t border-gray-800 flex items-center justify-center px-4 text-xs text-gray-500">
           <span>CannaAI Pro v2.3 - System Status: <span className="text-emerald-500">Stable</span> - Last Analysis: 0 min ago</span>
        </footer>
      </main>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <a href="#" className={`
      group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1
      ${active 
        ? 'bg-[#252A33] text-white shadow-sm border-l-2 border-emerald-500' 
        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
      }
    `}>
      <span className={`${active ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
        {icon}
      </span>
      {label}
    </a>
  );
}

function StatusPill({ status }: { status: string }) {
  let classes = "";
  switch (status) {
    case 'Healthy':
      classes = "bg-emerald-900/80 text-emerald-300 border-emerald-700/50";
      break;
    case 'Warning':
    case 'Issues Detected':
      classes = "bg-orange-900/80 text-orange-300 border-orange-700/50";
      break;
    case 'Critical':
      classes = "bg-red-900/80 text-red-300 border-red-700/50";
      break;
    case 'Processing':
      classes = "bg-gray-700/80 text-gray-300 border-gray-600/50";
      break;
    default:
      classes = "bg-gray-700 text-gray-300";
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md border ${classes}`}>
      {status === 'Issues Detected' ? 'Warning' : status}
    </span>
  );
}
