import { apiClient } from '@/lib/api/client';
import {
  ChatRequest,
  ChatResponse,
  ApiResponse,
  PageContext,
  SensorData
} from '@/types/api';

// =============================================================================
// Chat Service
// =============================================================================

export class ChatService {
  private readonly basePath = '/api/chat';

  /**
   * Send a message to the AI chat assistant
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await apiClient.post<ChatResponse>(
        this.basePath,
        request,
        {
          timeout: 60000, // 1 minute timeout for chat responses
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Chat request failed');
      }

      return response;
    } catch (error) {
      console.error('Chat request failed:', error);
      throw error;
    }
  }

  /**
   * Get chat service status and provider information
   */
  async getServiceStatus(): Promise<ApiResponse> {
    try {
      const response = await apiClient.get<ApiResponse>(this.basePath);
      return response;
    } catch (error) {
      console.error('Failed to get chat service status:', error);
      throw error;
    }
  }

  /**
   * Stream chat response (if supported by backend)
   */
  async *streamMessage(request: ChatRequest): AsyncGenerator<string> {
    try {
      // This would need to be implemented on the backend as a streaming endpoint
      // For now, we'll fall back to the regular API
      const response = await this.sendMessage(request);
      yield response.response;
    } catch (error) {
      console.error('Streaming chat failed:', error);
      throw error;
    }
  }

  /**
   * Get available AI providers and models
   */
  async getAvailableProviders(): Promise<ApiResponse> {
    try {
      const response = await apiClient.get<ApiResponse>(`${this.basePath}/providers`);
      return response;
    } catch (error) {
      console.error('Failed to get available providers:', error);
      throw error;
    }
  }

  /**
   * Test connection to specific AI provider
   */
  async testProvider(provider: string, config?: any): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>('/api/settings', {
        action: 'test_connection',
        provider,
        config
      });
      return response;
    } catch (error) {
      console.error(`Failed to test provider ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Get models for a specific provider
   */
  async getProviderModels(provider: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>('/api/settings', {
        action: 'get_models',
        provider
      });
      return response;
    } catch (error) {
      console.error(`Failed to get models for provider ${provider}:`, error);
      throw error;
    }
  }

  // =============================================================================
  // Context-Aware Chat Methods
  // =============================================================================

  /**
   * Send message with page context
   */
  async sendMessageWithContext(
    message: string,
    pageContext: PageContext,
    mode: 'chat' | 'thinking' = 'chat'
  ): Promise<ChatResponse> {
    const request: ChatRequest = {
      message,
      mode,
      context: pageContext
    };

    return this.sendMessage(request);
  }

  /**
   * Send message with sensor data
   */
  async sendMessageWithSensorData(
    message: string,
    sensorData: SensorData,
    mode: 'chat' | 'thinking' = 'chat'
  ): Promise<ChatResponse> {
    const request: ChatRequest = {
      message,
      mode,
      sensorData
    };

    return this.sendMessage(request);
  }

  /**
   * Send message with full context (page + sensor data)
   */
  async sendMessageWithFullContext(
    message: string,
    pageContext: PageContext,
    sensorData: SensorData,
    mode: 'chat' | 'thinking' = 'chat'
  ): Promise<ChatResponse> {
    const request: ChatRequest = {
      message,
      mode,
      context: pageContext,
      sensorData
    };

    return this.sendMessage(request);
  }

  // =============================================================================
  // Specialized Chat Methods
  // =============================================================================

  /**
   * Ask for plant diagnosis help
   */
  async askPlantDiagnosis(
    symptoms: string,
    strain: string,
    sensorData?: SensorData
  ): Promise<ChatResponse> {
    const message = `I need help diagnosing a plant issue. Strain: ${strain}. Symptoms: ${symptoms}. Please help me identify potential causes and treatments.`;

    const request: ChatRequest = {
      message,
      mode: 'thinking',
      context: {
        title: 'Plant Diagnosis',
        page: 'analysis',
        description: 'Plant health diagnosis assistance'
      },
      sensorData
    };

    return this.sendMessage(request);
  }

  /**
   * Ask for nutrient advice
   */
  async askNutrientAdvice(
    nutrient: string,
    symptoms: string,
    growthStage: string
  ): Promise<ChatResponse> {
    const message = `I need advice about ${nutrient} for my plants. They're in the ${growthStage} stage and showing these symptoms: ${symptoms}. What should I do?`;

    const request: ChatRequest = {
      message,
      mode: 'thinking',
      context: {
        title: 'Nutrient Advice',
        page: 'nutrients',
        description: 'Nutrient deficiency advice'
      }
    };

    return this.sendMessage(request);
  }

  /**
   * Ask for environmental control advice
   */
  async askEnvironmentalAdvice(
    currentTemp: number,
    targetTemp: number,
    currentHumidity: number,
    targetHumidity: number
  ): Promise<ChatResponse> {
    const message = `My grow room conditions are not optimal. Current: ${currentTemp}°F, ${currentHumidity}% humidity. Target: ${targetTemp}°F, ${targetHumidity}% humidity. What's the best way to adjust these conditions?`;

    const request: ChatRequest = {
      message,
      mode: 'thinking',
      context: {
        title: 'Environmental Control',
        page: 'automation',
        description: 'Environmental condition optimization'
      }
    };

    return this.sendMessage(request);
  }

  /**
   * Ask for pest and disease treatment
   */
  async askPestDiseaseTreatment(
    pest: string,
    severity: 'mild' | 'moderate' | 'severe',
    growthStage: string
  ): Promise<ChatResponse> {
    const message = `I have a ${severity} ${pest} problem with plants in the ${growthStage} stage. What's the most effective treatment that's safe for this stage?`;

    const request: ChatRequest = {
      message,
      mode: 'thinking',
      context: {
        title: 'Pest & Disease Treatment',
        page: 'treatment',
        description: 'Pest and disease treatment recommendations'
      }
    };

    return this.sendMessage(request);
  }

  // =============================================================================
  // Conversation Management
  // =============================================================================

  /**
   * Get conversation history (if implemented)
   */
  async getConversationHistory(conversationId?: string): Promise<ApiResponse> {
    try {
      // This would need to be implemented on the backend
      // For now, return a mock response
      return {
        success: true,
        data: [],
        message: 'Conversation history not yet implemented',
        timestamp: new Date().toISOString(),
        buildMode: 'server'
      };
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      throw error;
    }
  }

  /**
   * Clear conversation history
   */
  async clearConversationHistory(conversationId?: string): Promise<ApiResponse> {
    try {
      // This would need to be implemented on the backend
      // For now, return a mock response
      return {
        success: true,
        message: 'Conversation history cleared',
        timestamp: new Date().toISOString(),
        buildMode: 'server'
      };
    } catch (error) {
      console.error('Failed to clear conversation history:', error);
      throw error;
    }
  }

  /**
   * Export conversation
   */
  async exportConversation(conversationId: string, format: 'json' | 'txt' | 'pdf'): Promise<Blob> {
    try {
      // This would need to be implemented on the backend
      // For now, return a mock blob
      const mockData = {
        conversationId,
        exportDate: new Date().toISOString(),
        format,
        messages: []
      };

      return new Blob([JSON.stringify(mockData, null, 2)], {
        type: format === 'json' ? 'application/json' : 'text/plain'
      });
    } catch (error) {
      console.error('Failed to export conversation:', error);
      throw error;
    }
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  /**
   * Validate chat request
   */
  validateRequest(request: ChatRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.message?.trim()) {
      errors.push('Message is required');
    }

    if (request.message?.length > 10000) {
      errors.push('Message is too long (max 10,000 characters)');
    }

    if (request.mode && !['chat', 'thinking'].includes(request.mode)) {
      errors.push('Invalid chat mode');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get suggested prompts based on context
   */
  getSuggestedPrompts(context?: PageContext): string[] {
    const generalPrompts = [
      'What are the most common nutrient deficiencies in cannabis?',
      'How do I identify and treat spider mites?',
      'What\'s the ideal temperature and humidity for flowering?',
      'When should I harvest my plants?',
      'How do I prevent powdery mildew?'
    ];

    const contextSpecificPrompts: Record<string, string[]> = {
      analysis: [
        'Can you help me interpret these plant symptoms?',
        'What causes yellowing leaves?',
        'How do I tell if my plant has a nutrient deficiency?',
        'What are the signs of overwatering?'
      ],
      automation: [
        'How should I set up my lighting schedule?',
        'What\'s the best way to automate watering?',
        'How do I create an ideal climate for vegetative growth?',
        'What sensors do I need for monitoring?'
      ],
      strains: [
        'What are the differences between Indica and Sativa?',
        'How do purple strains develop their color?',
        'What strains are good for beginners?',
        'How do I choose the right strain for my climate?'
      ],
      settings: [
        'How do I set up an AI provider?',
        'What\'s the best AI model for plant analysis?',
        'How do I connect LM Studio?',
        'What are the benefits of AgentEvolver?'
      ]
    };

    if (context?.page && contextSpecificPrompts[context.page]) {
      return contextSpecificPrompts[context.page];
    }

    return generalPrompts;
  }

  /**
   * Get estimated response time based on message length and complexity
   */
  getEstimatedResponseTime(message: string, mode: 'chat' | 'thinking'): number {
    const baseTime = mode === 'thinking' ? 3000 : 2000; // milliseconds
    const complexityMultiplier = message.length > 500 ? 1.5 : 1.0;

    return Math.round(baseTime * complexityMultiplier);
  }
}

// Export singleton instance
export const chatService = new ChatService();

// Export service class for testing
export { ChatService };