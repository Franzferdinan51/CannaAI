// Main Chat Interface
export { default as ChatInterface } from './ChatInterface';

// Core Chat Components
export { default as ChatMessage } from './ChatMessage';
export { default as ChatInput } from './ChatInput';
export { default as ChatSidebar } from './ChatSidebar';
export { default as ChatTemplates } from './ChatTemplates';
export { default as ChatAnalytics } from './ChatAnalytics';
export { default as ChatSettings } from './ChatSettings';
export { default as VoiceChat } from './VoiceChat';
export { default as ConversationManager } from './ConversationManager';

// Types and Interfaces
export * from './types';

// Legacy Export for backward compatibility
export { default as Chat } from './ChatInterface';