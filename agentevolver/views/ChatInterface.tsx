
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Wrench, PlayCircle, Loader2, Globe, Brain, ChevronDown, ChevronRight, Paperclip, Image as ImageIcon, Sparkles, MonitorPlay, Mic, Video, Volume2, Wand2, MapPin } from 'lucide-react';
import { ChatMessage, TrainingConfig, AppSettings } from '../types';
import { gemini } from '../services/geminiService';
import AgentMRI from '../components/AgentMRI';

interface ChatInterfaceProps {
  config: TrainingConfig;
  appSettings: AppSettings;
  onLaunchTraining: (overrideEnv?: string) => void;
  onUpdateConfig: (updates: Partial<TrainingConfig>) => void;
}

type ChatMode = 'chat' | 'live' | 'image' | 'video';

const ChatInterface: React.FC<ChatInterfaceProps> = ({ config, appSettings, onLaunchTraining, onUpdateConfig }) => {
  const [mode, setMode] = useState<ChatMode>('chat');
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Attachments
  const [attachment, setAttachment] = useState<{data: string, mimeType: string} | null>(null);

  // Gemini Toggles (Local overrides or sync with global settings)
  const [webSearch, setWebSearch] = useState(appSettings.gemini?.useSearchGrounding || false);
  const [thinking, setThinking] = useState(appSettings.gemini?.useThinkingMode || false);
  const [maps, setMaps] = useState(appSettings.gemini?.useMapsGrounding || false);

  // Live API State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');

  // Generation Params
  const [genResolution, setGenResolution] = useState<'1K'|'2K'|'4K'>('1K');
  const [genAspectRatio, setGenAspectRatio] = useState('1:1');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveTranscript, isProcessing]);

  const handleSend = async () => {
    if (!input.trim() && !attachment) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString(),
      images: attachment?.mimeType.startsWith('image') ? [attachment.data] : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachment(null);
    setIsProcessing(true);

    try {
        if (mode === 'image') {
            // IMAGE GENERATION
            const imgData = await gemini.generateImage(userMsg.content, genResolution, genAspectRatio);
            if (imgData) {
                 setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'agent',
                    content: `Generated image for: "${userMsg.content}"`,
                    timestamp: new Date().toLocaleTimeString(),
                    images: [imgData],
                    thought: `Model: gemini-3-pro-image-preview | Size: ${genResolution}`
                }]);
            }
        } else if (mode === 'video') {
            // VIDEO GENERATION
             setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'agent',
                content: "Generating video with Veo... This may take a moment.",
                timestamp: new Date().toLocaleTimeString()
            }]);

            const vidUrl = await gemini.generateVideo(userMsg.content);
            if (vidUrl) {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'agent',
                    content: "Video generation complete.",
                    timestamp: new Date().toLocaleTimeString(),
                    videos: [vidUrl], // We'd need to handle blob URLs in display
                    thought: "Model: veo-3.1-fast-generate-preview"
                }]);
            }
        } else {
            // CHAT / ANALYSIS
            const result = await gemini.chat(
                userMsg.content,
                [],
                attachment || undefined,
                { search: webSearch, maps: maps },
                { enabled: thinking, budget: appSettings.gemini?.thinkingBudget }
            );

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'agent',
                content: result.text || "No response text.",
                timestamp: new Date().toLocaleTimeString(),
                thought: thinking ? "Deep Reasoning Used" : undefined,
                sources: result.grounding?.map((g: any) => ({ title: g.web?.title || 'Source', url: g.web?.uri || '#' }))
            }]);

            // Auto-TTS if enabled
            if (appSettings.soundEffects) { // Reusing soundEffects as TTS toggle for now or add specific one
                const audio = await gemini.generateSpeech(result.text, appSettings.gemini?.voiceName);
                if (audio) {
                     const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                     const audioCtx = new AudioContextClass();
                     const source = audioCtx.createBufferSource();
                     source.buffer = audio;
                     source.connect(audioCtx.destination);
                     source.start();
                }
            }
        }

    } catch (e: any) {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'agent',
            content: `Error: ${e.message}`,
            timestamp: new Date().toLocaleTimeString()
        }]);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleLiveToggle = async () => {
      if (isLiveActive) {
          // Close session logic would go here (reload page or implement session close in service)
          setIsLiveActive(false);
      } else {
          try {
              setIsLiveActive(true);
              const session = await gemini.startLiveSession(
                  (buf) => { /* Audio handled in service for simplicity, or viz here */ },
                  (text) => setLiveTranscript(prev => prev + " " + text)
              );

              // Init Mic
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const audioCtx = new AudioContext({ sampleRate: 16000 });
              const source = audioCtx.createMediaStreamSource(stream);
              const processor = audioCtx.createScriptProcessor(4096, 1, 1);

              processor.onaudioprocess = (e) => {
                  const inputData = e.inputBuffer.getChannelData(0);
                  const l = inputData.length;
                  const int16 = new Int16Array(l);
                  for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;

                  // Send pcm
                  const pcmData = btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));
                  session.sendRealtimeInput({ media: { mimeType: 'audio/pcm;rate=16000', data: pcmData }});
              };
              source.connect(processor);
              processor.connect(audioCtx.destination);

          } catch (e) {
              console.error(e);
              setIsLiveActive(false);
          }
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
              const b64 = (evt.target?.result as string).split(',')[1];
              setAttachment({ data: b64, mimeType: file.type });
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">

        {/* Toolbar */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex justify-between items-center z-10">
            <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button onClick={() => setMode('chat')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'chat' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Chat</button>
                <button onClick={() => setMode('image')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'image' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Create</button>
                <button onClick={() => setMode('video')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'video' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Veo</button>
                <button onClick={() => setMode('live')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'live' ? 'bg-red-500/20 text-red-400' : 'text-slate-500 hover:text-slate-300'}`}>Live</button>
            </div>

            <div className="flex items-center gap-2">
                 <button onClick={() => setWebSearch(!webSearch)} className={`p-2 rounded-lg transition-all ${webSearch ? 'bg-blue-500/20 text-blue-400' : 'text-slate-600 hover:bg-slate-800'}`} title="Search Grounding">
                    <Globe size={16} />
                </button>
                 <button onClick={() => setMaps(!maps)} className={`p-2 rounded-lg transition-all ${maps ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-600 hover:bg-slate-800'}`} title="Maps Grounding">
                    <MapPin size={16} />
                </button>
                 <button onClick={() => setThinking(!thinking)} className={`p-2 rounded-lg transition-all ${thinking ? 'bg-violet-500/20 text-violet-400' : 'text-slate-600 hover:bg-slate-800'}`} title="Thinking Mode">
                    <Brain size={16} />
                </button>
            </div>
        </div>

        {/* Live Mode Overlay */}
        {mode === 'live' && (
            <div className="absolute inset-0 bg-slate-950 z-20 flex flex-col items-center justify-center space-y-8 animate-in fade-in">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 transition-all ${isLiveActive ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]' : 'border-slate-800'}`}>
                    <Mic size={48} className={isLiveActive ? 'text-red-500 animate-pulse' : 'text-slate-600'} />
                </div>
                <button
                    onClick={handleLiveToggle}
                    className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-bold transition-all"
                >
                    {isLiveActive ? 'End Session' : 'Start Live Conversation'}
                </button>
                <div className="max-w-md text-center text-slate-500 text-sm px-4 min-h-[60px]">
                    {liveTranscript || "Speak naturally. Gemini is listening..."}
                </div>
            </div>
        )}

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll bg-slate-950">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.role === 'user' ? 'bg-slate-700' : 'bg-gradient-to-br from-violet-600 to-indigo-600'}`}>
                            {msg.role === 'user' ? <User size={16} className="text-slate-300" /> : <Bot size={16} className="text-white" />}
                        </div>
                        <div className="flex flex-col gap-2 w-full">
                            {msg.thought && (
                                <div className="text-xs text-slate-500 font-mono italic bg-black/20 p-2 rounded border border-slate-800/50">
                                    <Sparkles size={10} className="inline mr-1 text-violet-400"/>
                                    {msg.thought}
                                </div>
                            )}

                            {/* Attachments Display */}
                            {msg.images?.map((img, i) => (
                                <img key={i} src={img} alt="Generated or Uploaded" className="rounded-lg max-w-full border border-slate-700" />
                            ))}
                            {msg.videos?.map((vid, i) => (
                                <video key={i} src={vid} controls className="rounded-lg max-w-full border border-slate-700" />
                            ))}

                            <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-slate-800 text-slate-100' : 'bg-slate-900 text-slate-200 border border-slate-800'}`}>
                                {msg.content}
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* AGENT MRI - VISUALIZES THINKING PROCESS */}
            <AgentMRI active={isProcessing} steps={['Context', 'Search', 'Reasoning', 'Response']} />

            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {mode !== 'live' && (
            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">

                {/* Mode Specific Controls */}
                {(mode === 'image' || mode === 'video') && (
                    <div className="flex gap-4">
                        <select
                            value={genAspectRatio}
                            onChange={(e) => setGenAspectRatio(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 outline-none"
                        >
                            <option value="1:1">1:1 Square</option>
                            <option value="16:9">16:9 Landscape</option>
                            <option value="9:16">9:16 Portrait</option>
                        </select>
                         {mode === 'image' && (
                             <select
                                value={genResolution}
                                onChange={(e) => setGenResolution(e.target.value as any)}
                                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 outline-none"
                            >
                                <option value="1K">1K</option>
                                <option value="2K">2K</option>
                                <option value="4K">4K</option>
                            </select>
                         )}
                    </div>
                )}

                <div className="relative flex items-end gap-2 bg-slate-900 border border-slate-700 rounded-xl p-2">
                    <label className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                        <Paperclip size={20} />
                        <input type="file" className="hidden" onChange={handleFileSelect} accept="image/*,video/*" />
                    </label>
                    {attachment && (
                        <div className="absolute bottom-12 left-2 bg-slate-800 px-2 py-1 rounded text-xs text-white border border-slate-600">
                            Attached: {attachment.mimeType}
                            <button onClick={() => setAttachment(null)} className="ml-2 text-red-400">x</button>
                        </div>
                    )}

                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                            mode === 'image' ? "Describe the image to generate..." :
                            mode === 'video' ? "Describe the video to generate with Veo..." :
                            "Message..."
                        }
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-200 placeholder-slate-500 max-h-32 min-h-[44px] py-3 resize-none custom-scroll"
                        rows={1}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    />

                    <button onClick={handleSend} disabled={isProcessing} className="p-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg mb-0.5">
                        {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* Right Sidebar (Optional, keeping simple for now) */}
      <div className="w-64 hidden lg:flex flex-col gap-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gemini Status</h4>
              <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between"><span>Provider</span> <span className="text-slate-200">Google Gemini</span></div>
                  <div className="flex justify-between"><span>Model</span> <span className="text-slate-200">{thinking ? 'Pro (Thinking)' : 'Flash'}</span></div>
                  <div className="flex justify-between"><span>Grounding</span> <span className={webSearch ? 'text-blue-400' : 'text-slate-600'}>{webSearch ? 'ON' : 'OFF'}</span></div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default ChatInterface;
