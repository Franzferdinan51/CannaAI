'use client';

import React, { useState } from 'react';
import CannaAISidebar from '@/components/cannai-sidebar';
import CultivationAssistantSidebar from '@/components/cultivation-assistant-sidebar';

type ViewMode = 'chat' | 'live-vision' | 'plant-health' | 'nutrients' | 'genetics' | 'pest-disease' | 'tools' | 'settings';
type ChatMode = 'chat' | 'analysis' | 'diagnosis' | 'recommendation' | 'trichome' | 'harvest';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp?: string;
  type?: 'analysis' | 'recommendation' | 'alert' | 'diagnosis';
  confidence?: number;
  urgency?: 'low' | 'medium' | 'high';
}

export default function AIAssistantPage() {
  const [isMainSidebarOpen, setIsMainSidebarOpen] = useState(false);
  const [isAssistantSidebarOpen, setIsAssistantSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewMode>('chat');
  const [chatMode, setChatMode] = useState<ChatMode>('chat');
  const [isLoading, setIsLoading] = useState(false);

  // Mock chat history
  const [chatHistory, setChatHistory] = useState<Record<string, Message[]>>({
    'chat-1': [
      { id: '1', text: 'Hello! I need help with my cannabis plants.', sender: 'user', timestamp: new Date().toISOString() },
      { id: '2', text: 'Hello! I\'d be happy to help you with your cannabis cultivation. What specific questions or concerns do you have about your plants?', sender: 'bot', timestamp: new Date().toISOString() }
    ]
  });
  const [activeChatId, setActiveChatId] = useState('chat-1');
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>([]);

  // Mock plant context
  const [plantContext] = useState({
    plantId: 'plant-001',
    strain: 'Blue Dream',
    growthStage: 'flowering' as const,
    age: 45,
    environment: {
      temperature: 24.5,
      humidity: 55,
      ph: 6.2,
      ec: 1.4,
      lightHours: 12
    },
    lastAnalysis: {
      healthScore: 0.87,
      issues: ['Slight nutrient burn on leaf tips'],
      recommendations: ['Reduce nutrient concentration by 15%', 'Monitor pH levels closely']
    }
  });

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    const newMessageId = `chat-${Date.now()}`;
    setChatHistory(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), userMessage]
    }));

    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: generateAIResponse(text, chatMode),
        sender: 'bot',
        timestamp: new Date().toISOString(),
        type: getResponseType(chatMode),
        confidence: 0.85 + Math.random() * 0.1,
        urgency: Math.random() > 0.7 ? 'medium' : 'low'
      };

      setChatHistory(prev => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), botResponse]
      }));
      setIsLoading(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string, mode: ChatMode): string => {
    const input = userInput.toLowerCase();

    switch (mode) {
      case 'analysis':
        if (input.includes('yellow')) {
          return "Yellowing leaves can indicate several issues: nitrogen deficiency (lower leaves first), overwatering, or pH imbalance. Given your Blue Dream is in flowering at 45 days, check your pH levels first. Your current pH of 6.2 is good, so consider reducing watering frequency and checking nitrogen levels in your nutrients.";
        }
        return "I'd be happy to analyze your plant health! Could you provide more details about any symptoms you're noticing? Look for changes in leaf color, spots, drooping, or unusual growth patterns.";

      case 'diagnosis':
        if (input.includes('spot') || input.includes('brown')) {
          return "Brown spots could indicate several issues: 1) Calcium/magnesium deficiency, 2) Fungal infection like leaf septoria, or 3) Nutrient burn. Given your environment shows 55% humidity and 24.5°C temperature, the conditions are good for preventing fungal issues. Check your nutrient concentration - slight nutrient burn was noted in your last analysis.";
        }
        return "To help diagnose your plant issues, I need more specific information. What symptoms are you observing? Please describe any changes in appearance, growth patterns, or environmental conditions.";

      case 'recommendation':
        if (input.includes('flowering') || input.includes('bud')) {
          return "For your Blue Dream at 45 days flowering: 1) Continue with bloom nutrients, 2) Maintain 12/12 light cycle, 3) Keep temperature 22-26°C during lights on, 4) Reduce humidity to 45-50% to prevent bud rot, 5) Monitor trichome development - you're probably 2-3 weeks from harvest based on typical flowering time.";
        }
        return "For your Blue Dream in flowering, I recommend: 1) Maintain consistent environmental conditions, 2) Monitor pH between 6.0-6.5, 3) Watch for signs of nutrient deficiencies common in mid-flowering, 4) Start checking trichomes in 1-2 weeks.";

      case 'trichome':
        if (input.includes('when') || input.includes('harvest')) {
          return "For optimal trichome development on Blue Dream: Look for 50-70% milky white trichomes with some turning amber. At 45 days, you're probably 2-3 weeks from harvest. Use a magnifier to check daily - the window for peak potency is about 5-7 days when most trichomes are cloudy with 10-20% amber.";
        }
        return "Trichome analysis is crucial for harvest timing! Milky white trichomes indicate peak THC, while amber ones suggest THC converting to CBN (more sedative). For your Blue Dream, expect harvest around 60-70 days total.";

      case 'harvest':
        if (input.includes('ready')) {
          return "Your Blue Dream is likely ready when: 1) 50-70% of trichomes are cloudy/milky, 2) Some amber trichomes appear (10-20%), 3) Pistils have darkened and curled in, 4) Foliage starts yellowing naturally. Given you're at 45 days, monitor trichomes closely for the next 2-3 weeks.";
        }
        return "For harvest planning: Start flushing 1-2 weeks before harvest, prepare drying space with 60-70% humidity and 18-22°C, plan for 7-14 days drying then 2-4 weeks curing. Your Blue Dream should be ready around day 60-70.";

      default:
        return "I'm here to help with your cannabis cultivation! I can assist with plant analysis, problem diagnosis, growing advice, trichome analysis, and harvest planning. What would you like to know?";
    }
  };

  const getResponseType = (mode: ChatMode): Message['type'] => {
    switch (mode) {
      case 'analysis': return 'analysis';
      case 'diagnosis': return 'diagnosis';
      case 'recommendation': return 'recommendation';
      case 'trichome': return 'analysis';
      case 'harvest': return 'recommendation';
      default: return 'recommendation';
    }
  };

  const handleQuickAction = (action: string) => {
    const actionMessages = {
      analyze: "Can you analyze the current health of my plant?",
      diagnose: "I'm seeing some issues with my plant, can you help diagnose?",
      nutrients: "What's the best nutrient regimen for my flowering stage?",
      tips: "Do you have any tips for maximizing yields during flowering?",
      harvest: "When should I harvest my Blue Dream plants?"
    };

    if (actionMessages[action as keyof typeof actionMessages]) {
      handleSendMessage(actionMessages[action as keyof typeof actionMessages]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex">
      {/* Main Sidebar */}
      <CannaAISidebar
        isOpen={isMainSidebarOpen}
        activeView={activeView}
        setActiveView={setActiveView}
        onClose={() => setIsMainSidebarOpen(false)}
        chatMode={chatMode}
        setChatMode={setChatMode}
        isLoading={isLoading}
        chatHistory={chatHistory}
        activeChatId={activeChatId}
        onNewChat={() => {
          const newChatId = `chat-${Date.now()}`;
          setChatHistory(prev => ({
            ...prev,
            [newChatId]: []
          }));
          setActiveChatId(newChatId);
        }}
        onSelectChat={(chatId) => setActiveChatId(chatId)}
        pinnedChatIds={pinnedChatIds}
        onTogglePin={(chatId) => {
          setPinnedChatIds(prev =>
            prev.includes(chatId)
              ? prev.filter(id => id !== chatId)
              : [...prev, chatId]
          );
        }}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsMainSidebarOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Cultivation Assistant</h1>
              <p className="text-slate-400">Get expert guidance for your cannabis cultivation</p>
            </div>
          </div>

          <button
            onClick={() => setIsAssistantSidebarOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
            </svg>
            <span>Chat Assistant</span>
          </button>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            {activeView === 'chat' && (
              <div className="text-center py-12">
                <div className="mb-8">
                  <div className="w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">Welcome to CannaAI Assistant</h2>
                  <p className="text-xl text-slate-300 mb-8">
                    Your personal cultivation expert is ready to help you grow better cannabis
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Plant Analysis</h3>
                    <p className="text-slate-400">Get detailed health analysis and identify issues early</p>
                  </div>

                  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Growing Advice</h3>
                    <p className="text-slate-400">Expert recommendations for optimal growing conditions</p>
                  </div>

                  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Harvest Planning</h3>
                    <p className="text-slate-400">Perfect timing for maximum potency and quality</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsAssistantSidebarOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
                >
                  Start Chat with Assistant
                </button>
              </div>
            )}

            {activeView !== 'chat' && (
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-white mb-4">
                  {activeView === 'live-vision' && 'Live Vision Analysis'}
                  {activeView === 'plant-health' && 'Plant Health Monitoring'}
                  {activeView === 'tools' && 'All Tools'}
                </h2>
                <p className="text-slate-400">
                  This feature is coming soon! For now, use the chat assistant for immediate help.
                </p>
                <button
                  onClick={() => setIsAssistantSidebarOpen(true)}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Open Chat Assistant
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cultivation Assistant Sidebar */}
      <CultivationAssistantSidebar
        isOpen={isAssistantSidebarOpen}
        onClose={() => setIsAssistantSidebarOpen(false)}
        context={plantContext}
        messages={chatHistory[activeChatId] || []}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
        onQuickAction={handleQuickAction}
      />
    </div>
  );
}