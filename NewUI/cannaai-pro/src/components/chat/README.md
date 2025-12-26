# CannaAI Pro Chat System

A comprehensive, production-ready chat system with AI-powered cultivation assistance, voice capabilities, analytics, and much more.

## Features

### 🤖 AI-Powered Cultivation Assistant
- **Multiple AI Providers**: Support for LM Studio (local) and OpenRouter (cloud)
- **Provider Fallback**: Automatic fallback between providers
- **Context-Aware**: Integrates with sensor data and cultivation context
- **AgentEvolver Integration**: Advanced AI learning capabilities

### 💬 Advanced Chat Features
- **Rich Message Support**: Text, images, and file attachments
- **Conversation Management**: Multiple conversations with search and filtering
- **Message Analytics**: Track performance, usage patterns, and user satisfaction
- **Real-time Updates**: WebSocket integration for live updates

### 🎯 Smart Templates & Quick Responses
- **Customizable Templates**: Pre-built cultivation templates with variables
- **Quick Actions**: One-click responses for common questions
- **Dynamic Variables**: Template system with input validation

### 🗣️ Voice Capabilities
- **Voice Input**: Speech-to-text for hands-free chatting
- **Voice Output**: Text-to-speech for AI responses
- **Multi-language Support**: Support for multiple languages and voices
- **Voice Settings**: Customizable speech rates, pitch, and preferences

### 📊 Analytics & Insights
- **Usage Analytics**: Track message volume, response times, and error rates
- **Conversation Analytics**: Understand user engagement and satisfaction
- **Provider Performance**: Monitor AI provider effectiveness
- **Topic Analysis**: Automatic topic extraction and trending

### 🛠️ Comprehensive Settings
- **AI Provider Configuration**: Easy setup for multiple providers
- **UI Customization**: Themes, fonts, and display preferences
- **Feature Toggles**: Enable/disable specific chat features
- **Privacy Controls**: Data retention and sharing preferences

### 🔒 Privacy & Security
- **Local Storage**: Optional local encryption
- **Data Control**: Auto-delete and retention policies
- **Anonymous Analytics**: Optional anonymous usage sharing

## Quick Start

### Basic Usage

```tsx
import { ChatInterface } from '@/components/chat';
import { useChat } from '@/hooks/useChat';

function ChatPage() {
  const chat = useChat({
    sensorData: {
      temperature: 22.5,
      humidity: 55,
      ph: 6.2,
      soilMoisture: 45
    }
  });

  return (
    <ChatInterface
      messages={chat.messages}
      conversations={chat.conversations}
      currentConversation={chat.currentConversation}
      isLoading={chat.isLoading}
      isConnected={chat.isConnected}
      currentProvider={chat.currentProvider}
      analytics={chat.analytics}
      notifications={chat.notifications}
      settings={chat.settings}
      onSendMessage={chat.sendMessage}
      onSettingsChange={chat.updateSettings}
    />
  );
}
```

### Advanced Usage with All Features

```tsx
import React, { useState } from 'react';
import { ChatInterface } from '@/components/chat';
import { useChat } from '@/hooks/useChat';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

function AdvancedChatPage() {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const chat = useChat({
    sensorData: {
      temperature: 22.5,
      humidity: 55,
      ph: 6.2,
      soilMoisture: 45,
      lightIntensity: 750,
      ec: 1.4,
      co2: 1200,
      vpd: 0.85
    }
  });

  const voiceRecognition = useVoiceRecognition({
    onResult: (transcript) => {
      if (transcript.trim()) {
        chat.sendMessage(transcript);
      }
    },
    onError: (error) => console.error('Voice error:', error)
  });

  const speechSynthesis = useSpeechSynthesis({
    onError: (error) => console.error('Speech error:', error)
  });

  return (
    <div className="h-screen flex">
      <ChatInterface
        messages={chat.messages}
        conversations={chat.conversations}
        currentConversation={chat.currentConversation}
        isLoading={chat.isLoading}
        isConnected={chat.isConnected}
        currentProvider={chat.currentProvider}
        analytics={chat.analytics}
        notifications={chat.notifications}
        settings={chat.settings}
        onSendMessage={chat.sendMessage}
        onSettingsChange={chat.updateSettings}
        onAnalyticsUpdate={() => setShowAnalytics(true)}
        className="flex-1"
      />

      {/* Voice Chat Overlay */}
      {chat.settings.features.enableVoiceInput && (
        <div className="w-80 border-l">
          <VoiceChat
            isEnabled={chat.settings.features.enableVoiceInput}
            isListening={voiceRecognition.isListening}
            isSpeaking={speechSynthesis.isSpeaking}
            transcript={voiceRecognition.transcript}
            settings={chat.settings.features as any}
            onSettingsChange={() => {}}
            onStartListening={voiceRecognition.startListening}
            onStopListening={voiceRecognition.stopListening}
            onTranscript={voiceRecognition.onResult}
            onSpeak={speechSynthesis.speak}
            onStopSpeaking={speechSynthesis.stop}
          />
        </div>
      )}

      {/* Modals */}
      {showAnalytics && (
        <ChatAnalyticsModal
          analytics={chat.analytics}
          onClose={() => setShowAnalytics(false)}
        />
      )}

      {showSettings && (
        <ChatSettingsModal
          settings={chat.settings}
          onSettingsChange={chat.updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
```

## Component Structure

```
src/components/chat/
├── types/
│   └── index.ts              # TypeScript definitions
├── ChatInterface.tsx         # Main chat interface
├── ChatMessage.tsx          # Individual message component
├── ChatInput.tsx            # Message input component
├── ChatSidebar.tsx          # Conversation sidebar
├── ChatTemplates.tsx        # Template system
├── ChatAnalytics.tsx        # Analytics dashboard
├── ChatSettings.tsx         # Settings interface
├── VoiceChat.tsx           # Voice chat features
├── ConversationManager.tsx  # Conversation management
└── index.ts                 # Export file
```

## Hook Structure

```
src/hooks/
├── useChat.ts               # Main chat hook
├── useLocalStorage.ts       # Local storage management
├── useDebounce.ts           # Debounce utility
├── useKeyboardShortcuts.ts  # Keyboard shortcuts
├── useVoiceRecognition.ts   # Speech-to-text
├── useSpeechSynthesis.ts    # Text-to-speech
└── useWebSocket.ts          # WebSocket integration
```

## Configuration

### AI Provider Setup

#### LM Studio (Local)
```typescript
const lmStudioConfig = {
  url: 'http://localhost:1234',
  model: 'granite-4.0-micro',
  timeout: 120000,
  maxTokens: 2000,
  temperature: 0.3
};
```

#### OpenRouter (Cloud)
```typescript
const openRouterConfig = {
  apiKey: 'your-api-key-here',
  model: 'meta-llama/llama-3.1-8b-instruct:free',
  timeout: 30000,
  maxTokens: 2000,
  temperature: 0.3
};
```

### Environment Variables

```bash
# LM Studio (optional)
LM_STUDIO_URL=http://localhost:1234
LM_STUDIO_MODEL=granite-4.0-micro
LM_STUDIO_TIMEOUT=120000

# OpenRouter (recommended)
OPENROUTER_API_KEY=your-api-key-here
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
OPENROUTER_TIMEOUT=30000

# Build settings
BUILD_MODE=server
NODE_ENV=production
```

## API Integration

The chat system integrates with existing `/api/chat` endpoints:

### POST /api/chat
```typescript
{
  message: string,
  image?: string,
  context?: {
    page: string,
    title: string,
    data: any
  },
  sensorData?: {
    temperature: number,
    humidity: number,
    ph: number,
    // ... other sensor data
  },
  mode: 'chat' | 'thinking'
}
```

### GET /api/chat
Returns provider status and configuration.

## Migration from Old UI

### 1. Replace Old Components
```tsx
// Old
import CannaAIAssistantSidebar from '@/components/ai/cannai-assistant-sidebar';

// New
import { ChatInterface } from '@/components/chat';
```

### 2. Update State Management
```tsx
// Old - complex sidebar state
const [aiSidebarOpen, setAiSidebarOpen] = useState(true);

// New - unified hook
const chat = useChat({ sensorData });
```

### 3. Enhanced Features
- **Voice Input**: `useVoiceRecognition()` hook
- **Analytics**: Built-in usage tracking
- **Templates**: Pre-built cultivation templates
- **Multi-conversation**: Automatic conversation management

## Customization

### Adding Custom Templates
```typescript
const customTemplate: ChatTemplate = {
  id: 'custom-1',
  name: 'Nutrient Deficiency Diagnosis',
  description: 'Quick diagnosis tool for nutrient issues',
  category: 'troubleshooting',
  prompt: 'I need help diagnosing a nutrient deficiency. Symptoms: {symptoms}. Stage: {stage}. Medium: {medium}. What should I check?',
  variables: [
    { name: 'symptoms', label: 'Symptoms', type: 'text', required: true },
    { name: 'stage', label: 'Growth Stage', type: 'select', options: ['seedling', 'vegetative', 'flowering'], required: true },
    { name: 'medium', label: 'Growing Medium', type: 'select', options: ['soil', 'hydroponic', 'coco'], required: true }
  ],
  icon: '🔬',
  isQuickAction: true
};
```

### Custom Analytics Metrics
```typescript
const customAnalytics = {
  // Track strain-specific conversations
  strainUsage: Record<string, number>,
  // Track growth stage-specific questions
  stageDistribution: Record<string, number>,
  // Track seasonal patterns
  monthlyUsage: Array<{ month: string; conversations: number }>
};
```

## Performance Considerations

### Optimization Tips
1. **Message Pagination**: Load messages in chunks for long conversations
2. **Image Compression**: Compress uploaded images before sending
3. **Local Storage**: Use compression for localStorage data
4. **WebSocket**: Use WebSocket for real-time updates when needed
5. **Voice Recognition**: Cache voice models for faster startup

### Memory Management
- Automatic cleanup of old conversations (configurable)
- Lazy loading of analytics data
- Efficient state management with React hooks
- Optimized re-renders with memoization

## Troubleshooting

### Common Issues

#### Voice Recognition Not Working
- Check browser compatibility (Chrome, Edge, Safari)
- Ensure HTTPS for voice features
- Verify microphone permissions

#### AI Provider Connection Issues
- Check API keys and network connectivity
- Verify LM Studio is running (for local models)
- Test provider connection in settings

#### Performance Issues
- Clear old conversations from localStorage
- Disable unused features in settings
- Check for memory leaks in browser dev tools

### Debug Mode
```typescript
// Enable debug logging
const chat = useChat({
  debug: true,
  logLevel: 'verbose'
});
```

## Contributing

### Development Setup
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Run tests: `npm run test`
4. Build for production: `npm run build`

### Code Style
- TypeScript with strict typing
- React functional components with hooks
- Tailwind CSS for styling
- ESLint and Prettier for code formatting

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check existing GitHub issues
4. Create new issue with detailed information

## License

This chat system is part of CannaAI Pro and follows the project's licensing terms.