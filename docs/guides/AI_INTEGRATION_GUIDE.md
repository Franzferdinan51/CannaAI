# Enhanced AI Integration Guide v2.0

## Overview

The CannaAI Pro system now features a comprehensive, enterprise-grade AI integration architecture with support for **8 different AI providers**, intelligent routing, caching, cost tracking, and advanced features.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Unified AI Interface                     │
│              (Single API for all operations)                │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
┌────────▼──────────┐   ┌────────▼──────────┐
│ Provider Manager  │   │  Cache Manager    │
│ • Health checks   │   │  • TTL caching    │
│ • Load balancing  │   │  • Compression    │
│ • Circuit breaker │   │  • Smart invalidation│
└──────┬────────────┘   └────────┬──────────┘
       │                        │
       │               ┌────────▼──────────┐
       │               │  Cost Tracker     │
       │               │  • Budget alerts  │
       │               │  • Usage analytics│
       │               └───────────────────┘
       │
┌──────▼──────────────────────────────────────┐
│           AI Providers (8 Total)             │
├──────────────────────────────────────────────┤
│ 1. OpenRouter     5. Together AI            │
│ 2. LM Studio      6. Anthropic Claude       │
│ 3. Google Gemini  7. Perplexity AI          │
│ 4. Groq           8. Custom Endpoints       │
└──────────────────────────────────────────────┘
```

## Supported AI Providers

### 1. **OpenRouter** ⭐ Recommended for Production
- **Capabilities**: Text, Vision, Streaming, Function Calling
- **Pricing**: ~$0.10-0.30 per 1K tokens
- **Best For**: Production deployments, multiple model access
- **Setup**:
  ```bash
  export OPENROUTER_API_KEY="sk-or-v1-..."
  export OPENROUTER_MODEL="meta-llama/llama-3.1-8b-instruct:free"
  ```

### 2. **LM Studio** 💰 Free for Local Development
- **Capabilities**: Text, Streaming (no vision)
- **Pricing**: FREE (local inference)
- **Best For**: Development, testing, zero-cost inference
- **Setup**:
  ```bash
  export LM_STUDIO_URL="http://localhost:1234"
  export LM_STUDIO_MODEL="granite-4.0-micro"
  ```

### 3. **Google Gemini** 🚀 Fast Vision Tasks
- **Capabilities**: Text, Vision, Streaming, Function Calling
- **Pricing**: ~$0.075-0.30 per 1M tokens
- **Best For**: Vision analysis, high-speed inference
- **Setup**:
  ```bash
  export GEMINI_API_KEY="AIza..."
  export GEMINI_MODEL="gemini-1.5-pro"
  ```

### 4. **Groq** ⚡ Ultra-Fast Inference
- **Capabilities**: Text, Vision, Streaming
- **Pricing**: ~$0.05-0.15 per 1K tokens
- **Best For**: Real-time chat, low latency
- **Setup**:
  ```bash
  export GROQ_API_KEY="gsk_..."
  export GROQ_MODEL="llama-3.1-70b-versatile"
  ```

### 5. **Together AI** 🔓 Open-Source Models
- **Capabilities**: Text, Vision, Streaming
- **Pricing**: ~$0.06-0.18 per 1K tokens
- **Best For**: Open-source model access
- **Setup**:
  ```bash
  export TOGETHER_API_KEY="..."
  export TOGETHER_MODEL="meta-llama/Llama-3.1-8B-Instruct-Turbo"
  ```

### 6. **Anthropic Claude** 🧠 Superior Reasoning
- **Capabilities**: Text, Vision, Streaming
- **Pricing**: ~$0.80-4.00 per 1M tokens
- **Best For**: Complex analysis, high-quality responses
- **Setup**:
  ```bash
  export ANTHROPIC_API_KEY="sk-ant-..."
  export CLAUDE_MODEL="claude-3-5-sonnet-20241022"
  ```

### 7. **Perplexity AI** 🔍 Research Focus
- **Capabilities**: Text, Web Browsing, Citations
- **Pricing**: ~$0.20-0.60 per 1K tokens
- **Best For**: Research queries, citation support
- **Setup**:
  ```bash
  export PERPLEXITY_API_KEY="pplx-..."
  export PERPLEXITY_MODEL="llama-3.1-sonar-small-128k-online"
  ```

## Key Features

### 1. Intelligent Provider Selection
The system automatically selects the best provider based on:
- **Latency**: Fastest available provider
- **Cost**: Most cost-effective option
- **Capabilities**: Vision, streaming, etc.
- **Health**: Provider availability
- **Success Rate**: Historical performance

### 2. Response Caching
- **TTL**: 1 hour default
- **Compression**: Automatically compresses large responses
- **Smart Invalidation**: Clears cache when prompts change
- **Cost Savings**: Reduces repeated API calls

### 3. Cost Tracking & Budget Management
- **Real-time Tracking**: Monitor costs per provider
- **Budget Alerts**: 80% and 95% thresholds
- **Usage Analytics**: Track tokens, requests, costs
- **Optimization**: Get cost-saving recommendations

### 4. Circuit Breaker Pattern
- **Failure Threshold**: 5 consecutive failures
- **Auto Recovery**: Half-open state testing
- **Health Monitoring**: Continuous provider checks
- **Graceful Degradation**: Falls back to healthy providers

### 5. Conversation Memory
- **Session Management**: Track conversation context
- **History Limit**: Last 50 messages
- **Multi-session**: Support multiple conversations
- **Smart Context**: Automatic prompt integration

### 6. Prompt Versioning
- **Version Control**: Track prompt changes
- **A/B Testing**: Compare prompt effectiveness
- **Performance Metrics**: Score each version
- **Rollback**: Revert to previous versions

### 7. Quality Scoring
- **Multi-dimensional**: Relevance, accuracy, completeness
- **Automatic**: Heuristic-based scoring
- **Customizable**: Add your own metrics
- **Trending**: Track quality over time

## API Endpoints

### 1. AI Health Check
```bash
GET /api/ai/health
```
Returns status of all AI providers with metrics.

**Response**:
```json
{
  "success": true,
  "summary": {
    "total": 7,
    "healthy": 5,
    "degraded": 1,
    "unhealthy": 1
  },
  "providers": [...],
  "cache": {
    "entries": 234,
    "hitRate": "67.5%",
    "savings": "$1.23"
  }
}
```

### 2. Cost Tracking
```bash
GET /api/ai/cost
```
Returns cost summary and budget status.

**Response**:
```json
{
  "success": true,
  "summary": {
    "totalCost": "$2.3456",
    "totalRequests": 1234,
    "cacheSavings": "$0.45"
  },
  "byProvider": [...],
  "budget": {
    "daily": { "current": "$0.50", "budget": "$10.00" },
    "monthly": { "current": "$5.00", "budget": "$200.00" }
  }
}
```

### 3. Usage Analytics
```bash
GET /api/ai/analytics
```
Returns detailed usage statistics and trends.

### 4. Provider Configuration
```bash
GET /api/ai/providers
```
Returns available providers and configuration guide.

### 5. Plant Analysis (Enhanced)
```bash
POST /api/analyze/route-enhanced-v2.ts
```
Enhanced analysis with multi-provider support.

**Features**:
- Intelligent provider selection
- Response caching
- Cost tracking
- Prompt versioning
- Conversation memory

### 6. AI Chat (Enhanced)
```bash
POST /api/chat/route-enhanced-v2.ts
```
Enhanced chat with multi-provider support.

**Features**:
- Real-time provider selection
- Conversation memory
- Mode support (chat, thinking, research)
- Streaming ready

## Usage Examples

### Basic Analysis
```typescript
const response = await fetch('/api/analyze/route-enhanced-v2.ts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    strain: 'Granddaddy Purple',
    leafSymptoms: 'Yellowing leaves',
    temperature: 75,
    humidity: 60,
    plantImage: 'data:image/jpeg;base64,...',
    quality: 'balanced',  // speed | quality | cost
    conversationId: 'conv-123'  // optional
  })
});

const data = await response.json();
console.log(data.analysis);
console.log(data.provider.used);
console.log(data.provider.cost);
```

### Basic Chat
```typescript
const response = await fetch('/api/chat/route-enhanced-v2.ts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What nutrients does my plant need?',
    mode: 'chat',  // chat | thinking | research
    conversationId: 'conv-123',
    context: {
      title: 'Plant Dashboard',
      page: 'nutrition'
    },
    sensorData: {
      temperature: 24,
      humidity: 55
    }
  })
});

const data = await response.json();
console.log(data.response);
console.log(data.conversationId);
```

### Using Prompt Versions
```typescript
// Create a prompt version
const promptId = unifiedAI.addPromptVersion({
  version: '2.0-specialized',
  content: 'You are an expert cannabis botanist...',
  metadata: {
    created: new Date(),
    createdBy: 'user123',
    description: 'Specialized botanist prompt',
    tags: ['botany', 'specialized'],
    isActive: true
  }
});

// Use it in requests
const response = await unifiedAI.execute({
  type: 'analysis',
  messages: [...],
  promptVersion: promptId
});
```

## Configuration

### Environment Variables

Create a `.env` file with any of these providers:

```bash
# OpenRouter (Recommended)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free

# LM Studio (Free Local)
LM_STUDIO_URL=http://localhost:1234
LM_STUDIO_MODEL=granite-4.0-micro

# Google Gemini
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-1.5-pro

# Groq (Fast)
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.1-70b-versatile

# Together AI
TOGETHER_API_KEY=...
TOGETHER_MODEL=meta-llama/Llama-3.1-8B-Instruct-Turbo

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Perplexity AI
PERPLEXITY_API_KEY=pplx-...
PERPLEXITY_MODEL=llama-3.1-sonar-small-128k-online
```

### Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Providers** (choose one or more):
   - For production: Configure OpenRouter or Gemini
   - For development: Configure LM Studio (free, local)

3. **Start Server**:
   ```bash
   npm run dev
   ```

4. **Test Connection**:
   ```bash
   curl http://localhost:3000/api/ai/health
   ```

## Best Practices

### 1. Provider Selection
- **Production**: Use OpenRouter or Gemini for reliability
- **Development**: Use LM Studio for zero cost
- **Real-time**: Use Groq for lowest latency
- **Quality**: Use Claude for best responses
- **Research**: Use Perplexity for citations

### 2. Cost Optimization
- Enable response caching (enabled by default)
- Use appropriate quality settings (balanced, speed, cost)
- Monitor usage at `/api/ai/cost`
- Set budget alerts

### 3. Performance
- Use conversation memory for context
- Enable streaming for long responses
- Configure appropriate timeouts
- Monitor provider health

### 4. Error Handling
- Check provider health before requests
- Implement retry logic
- Handle provider-specific errors
- Use circuit breaker for resilience

### 5. Testing
- Test with multiple providers
- Use prompt versioning for A/B testing
- Monitor quality scores
- Track cost per feature

## Advanced Features

### Custom Providers
```typescript
import { BaseProvider } from '@/lib/ai-providers/base-provider';

class CustomProvider extends BaseProvider {
  async execute(request: AIRequest): Promise<AIResponse> {
    // Implementation
  }
}
```

### Load Balancing
```typescript
const criteria: SelectionCriteria = {
  quality: 'balanced',
  maxLatency: 3000,
  requireVision: true
};
```

### Budget Controls
```typescript
const config = {
  budgets: {
    daily: 10,
    weekly: 50,
    monthly: 200,
    annual: 2000
  },
  alerts: [
    { threshold: 80, action: 'warn' },
    { threshold: 95, action: 'stop' }
  ]
};
```

## Troubleshooting

### No Providers Available
1. Check environment variables
2. Verify API keys are valid
3. Test connection at `/api/ai/health`
4. Review provider setup guide

### High Costs
1. Enable caching
2. Use less expensive providers (LM Studio, Groq)
3. Optimize prompt lengths
4. Monitor usage

### Poor Performance
1. Check provider health
2. Switch to faster providers (Groq)
3. Increase timeouts
4. Enable caching

### Errors
1. Check provider status
2. Review error messages
3. Test individual providers
4. Check rate limits

## Monitoring

### Key Metrics
- Provider health status
- Response latency
- Success/error rates
- Cost per request
- Cache hit rate
- Token usage

### Dashboards
- `/api/ai/health` - Provider status
- `/api/ai/cost` - Cost tracking
- `/api/ai/analytics` - Usage analytics

## Support

### Documentation
- API Reference: See individual route files
- Provider Guides: `/api/ai/providers`
- Examples: This guide

### Debugging
- Enable debug logging: `DEBUG=ai:*`
- Check provider health: `/api/ai/health`
- Review cost data: `/api/ai/cost`
- Monitor analytics: `/api/ai/analytics`

## Roadmap

### Upcoming Features
- [ ] Real-time provider switching
- [ ] Advanced A/B testing framework
- [ ] Custom model fine-tuning
- [ ] Multi-modal analysis
- [ ] Voice input/output
- [ ] WebSocket streaming

### Performance Improvements
- [ ] Edge caching
- [ ] Request batching
- [ ] Predictive preloading
- [ ] Connection pooling

### New Providers
- [ ] AWS Bedrock
- [ ] Azure OpenAI
- [ ] Vertex AI
- [ ] Replicate

## License

MIT License - See LICENSE file for details.

## Changelog

### v2.0.0 (Enhanced AI Integration)
- ✅ Added 8 AI providers (OpenRouter, LM Studio, Gemini, Groq, Together, Claude, Perplexity)
- ✅ Intelligent provider selection engine
- ✅ Response caching with TTL
- ✅ Cost tracking and budget management
- ✅ Circuit breaker pattern
- ✅ Conversation memory
- ✅ Prompt versioning
- ✅ Quality scoring
- ✅ Provider health monitoring
- ✅ New API endpoints (health, cost, analytics, providers)
- ✅ Enhanced analyze and chat routes

### v1.0.0 (Original)
- Basic OpenRouter and LM Studio support
- Simple failover mechanism
- No caching or cost tracking
