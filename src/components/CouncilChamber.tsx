import React, { useState, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  Vote,
  Brain,
  TrendingUp,
  Code,
  GitBranch,
  Search,
  Settings,
  Play,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  FileText,
  BarChart3,
  Memory,
  Sparkles,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import {
  CouncilPersona,
  CouncilSession,
  SessionMode,
  CouncilVote,
  PredictionMarketItem,
  SwarmCodingPipeline
} from '../types/council';

interface CouncilChamberProps {
  apiKey: string;
}

export function CouncilChamber({ apiKey }: CouncilChamberProps) {
  const [activeTab, setActiveTab] = useState<
    'session' | 'prediction' | 'swarm' | 'arguments' | 'memory' | 'search'
  >('session');
  const [personas, setPersonas] = useState<CouncilPersona[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [sessionMode, setSessionMode] = useState<SessionMode>('deliberation');
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<CouncilSession | null>(null);
  const [suggestedMode, setSuggestedMode] = useState<SessionMode | null>(null);

  // Fetch personas on mount
  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    try {
      const res = await fetch('/api/council?action=get-personas');
      const json = await res.json();
      if (json.success) {
        setPersonas(json.data);
      }
    } catch (error) {
      console.error('Error fetching personas:', error);
    }
  };

  const suggestMode = async () => {
    if (!topic) return;
    try {
      const res = await fetch('/api/council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest-mode',
          topic
        })
      });
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setSuggestedMode(json.data[0].mode);
      }
    } catch (error) {
      console.error('Error suggesting mode:', error);
    }
  };

  const runSession = async () => {
    if (!topic || selectedPersonas.length === 0) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run-session',
          topic,
          mode: sessionMode,
          personaIds: selectedPersonas,
          apiKey
        })
      });
      const json = await res.json();
      if (json.success) {
        setCurrentSession(json.data);
      }
    } catch (error) {
      console.error('Error running session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePersona = (id: string) => {
    setSelectedPersonas(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const PersonaCard = ({ persona }: { persona: CouncilPersona }) => {
    const isSelected = selectedPersonas.includes(persona.id);
    return (
      <div
        onClick={() => togglePersona(persona.id)}
        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
          isSelected
            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
        }`}
      >
        <div className="font-bold text-gray-800 dark:text-white">{persona.name}</div>
        <div className="text-sm text-gray-500 mb-2">{persona.role}</div>
        <div className="flex flex-wrap gap-1">
          {persona.expertise.slice(0, 3).map(exp => (
            <span key={exp} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              {exp}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white dark:bg-gray-800 rounded-full text-indigo-600 shadow-sm">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">AI Council Chamber</h1>
            <p className="text-gray-500">Multi-agent deliberation & decision making</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-gray-900 p-1 rounded-xl border shadow-sm mb-6 overflow-x-auto">
        {[
          { id: 'session' as const, icon: MessageSquare, label: 'Session' },
          { id: 'prediction' as const, icon: TrendingUp, label: 'Prediction Market' },
          { id: 'swarm' as const, icon: Code, label: 'Swarm Coding' },
          { id: 'arguments' as const, icon: GitBranch, label: 'Arguments' },
          { id: 'memory' as const, icon: Memory, label: 'Memory' },
          { id: 'search' as const, icon: Search, label: 'Search' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Session Tab */}
      {activeTab === 'session' && (
        <div className="space-y-6">
          {/* Topic Input */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Topic or Question
            </label>
            <textarea
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                if (e.target.value.length > 10) suggestMode();
              }}
              placeholder="Describe your cultivation question or decision..."
              className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              rows={3}
            />
            {suggestedMode && suggestedMode !== sessionMode && (
              <div className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                <Sparkles size={14} />
                Suggested mode: {suggestedMode}
                <button
                  onClick={() => setSessionMode(suggestedMode!)}
                  className="ml-2 text-xs bg-indigo-100 px-2 py-1 rounded"
                >
                  Use
                </button>
              </div>
            )}
          </div>

          {/* Mode Selection */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
              Session Mode
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {[
                'deliberation',
                'advisory',
                'proposal',
                'prediction',
                'research',
                'brainstorming',
                'peer-review',
                'risk-assessment',
                'arbitration',
                'swarm'
              ].map(mode => (
                <button
                  key={mode}
                  onClick={() => setSessionMode(mode as SessionMode)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                    sessionMode === mode
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Persona Selection */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                Select Participants ({selectedPersonas.length} selected)
              </label>
              <button
                onClick={() => setSelectedPersonas(personas.map(p => p.id))}
                className="text-xs bg-gray-100 px-3 py-1 rounded"
              >
                Select All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {personas.map(persona => (
                <PersonaCard key={persona.id} persona={persona} />
              ))}
            </div>
          </div>

          {/* Run Button */}
          <div className="flex justify-center">
            <button
              onClick={runSession}
              disabled={isLoading || !topic || selectedPersonas.length === 0}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
              Run Council Session
            </button>
          </div>

          {/* Results */}
          {currentSession && (
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <MessageSquare size={18} className="text-indigo-500" />
                Session Results
              </h3>

              {/* Messages */}
              <div className="space-y-4 mb-6">
                {currentSession.messages.map(msg => (
                  <div key={msg.id} className="border-l-4 border-indigo-500 pl-4">
                    <div className="font-bold text-sm text-gray-800 dark:text-white">
                      {msg.personaName}
                    </div>
                    <div className="text-gray-600 dark:text-gray-300 mt-1">{msg.content}</div>
                  </div>
                ))}
              </div>

              {/* Voting Results */}
              {currentSession.votes && (
                <div className="border-t pt-4">
                  <h4 className="font-bold mb-3">Voting Results</h4>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {currentSession.votes.agree.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">Agree</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {currentSession.votes.disagree.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">Disagree</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">
                        {currentSession.votes.abstain.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">Abstain</div>
                    </div>
                  </div>
                  <div className="text-center p-3 bg-indigo-50 rounded-lg">
                    <div className="text-sm font-bold text-indigo-700">
                      Consensus: {currentSession.votes.consensus}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Placeholder for other tabs */}
      {activeTab !== 'session' && (
        <div className="bg-white dark:bg-gray-900 p-12 rounded-xl shadow-sm text-center">
          <div className="inline-block p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
            <Zap size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Coming Soon
          </h3>
          <p className="text-gray-500">
            This feature is fully implemented in the backend. UI components will be added in the next update.
          </p>
        </div>
      )}
    </div>
  );
}
