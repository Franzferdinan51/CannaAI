# Quick Start Guide: New AI Providers

## Getting Started with Google Gemini

### 1. Get Your API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy your API key

### 2. Configure in CultivAI Pro
```bash
# Settings UI
1. Open Settings → AI Providers
2. Select "Google Gemini"
3. Paste API Key
4. Select Model: gemini-2.0-flash-exp (recommended)
5. Click "Test Connection"
6. Click "Save"
```

### 3. Available Models
- **gemini-2.0-flash-exp** - Latest experimental model (1M context) ⭐ Recommended
- **gemini-1.5-pro** - Most capable model (2M context)
- **gemini-1.5-flash** - Fast and efficient (1M context)

### 4. Features
✅ Text generation
✅ Vision (image analysis for plants)
✅ Massive context windows (1M-2M tokens)
✅ OpenAI-compatible API (easy integration)

---

## Getting Started with Groq

### 1. Get Your API Key
1. Go to [Groq Console](https://console.groq.com/)
2. Create account or sign in
3. Go to API Keys section
4. Create new API key

### 2. Configure in CultivAI Pro
```bash
# Settings UI
1. Open Settings → AI Providers
2. Select "Groq (Fast Inference)"
3. Paste API Key
4. Select Model: llama-3.3-70b-versatile (recommended)
5. Click "Test Connection"
6. Click "Save"
```

### 3. Available Models
- **llama-3.3-70b-versatile** - Best for general use (32k context) ⭐ Recommended
- **llama-3.1-70b-versatile** - Longest context (131k tokens)
- **mixtral-8x7b-32768** - Fast mixture of experts (32k context)

### 4. Features
✅ Ultra-fast inference (10-100x faster than standard)
✅ Long context support
✅ Great for real-time chat
✅ OpenAI-compatible API

### 5. Best For
- Real-time AI chat assistant
- Quick plant analysis responses
- High-frequency API calls
- Development and testing

---

## Getting Started with Anthropic Claude

### 1. Get Your API Key
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create account or sign in
3. Go to API Keys
4. Create new API key

### 2. Configure in CultivAI Pro
```bash
# Settings UI
1. Open Settings → AI Providers
2. Select "Anthropic Claude"
3. Paste API Key
4. Select Model: claude-3-5-sonnet-20241022 (recommended)
5. Click "Test Connection"
6. Click "Save"
```

### 3. Available Models
- **claude-3-5-sonnet-20241022** - Most capable (200k context) ⭐ Recommended
- **claude-3-5-haiku-20241022** - Fast and efficient (200k context)
- **claude-3-opus-20240229** - Previous flagship model
- **claude-3-sonnet-20240229** - Balanced performance

### 4. Features
✅ Advanced reasoning and analysis
✅ Vision capabilities
✅ Large context windows (200k tokens)
✅ Excellent for complex cultivation advice
⚠️ Custom API format (not OpenAI-compatible)

### 5. Best For
- Complex plant diagnosis
- Detailed cultivation planning
- Multi-step reasoning
- Advanced analysis tasks

---

## Comparison Chart

| Feature | Gemini | Groq | Claude |
|---------|--------|------|--------|
| **Speed** | Fast | ⚡ Ultra-Fast | Medium |
| **Context** | 1M-2M | 32k-131k | 200k |
| **Vision** | ✅ | ❌ | ✅ |
| **API Format** | OpenAI | OpenAI | Custom |
| **Best For** | General use | Real-time | Complex tasks |
| **Cost** | Low | Very Low | Medium |

---

## Pricing Comparison (Approximate)

### Google Gemini
- **gemini-2.0-flash-exp**: FREE during preview
- **gemini-1.5-pro**: $3.50 / 1M input tokens
- **gemini-1.5-flash**: $0.075 / 1M input tokens

### Groq
- **All models**: FREE tier available
- Very generous rate limits
- Great for testing and development

### Anthropic Claude
- **claude-3-5-sonnet**: $3.00 / 1M input tokens
- **claude-3-5-haiku**: $0.80 / 1M input tokens
- Premium pricing for premium quality

---

## Configuration Examples

### Via API
```typescript
// Update Gemini
POST /api/settings
{
  "action": "update_provider",
  "provider": "gemini",
  "config": {
    "apiKey": "AIza...",
    "model": "gemini-2.0-flash-exp"
  }
}

// Update Groq
POST /api/settings
{
  "action": "update_provider",
  "provider": "groq",
  "config": {
    "apiKey": "gsk_...",
    "model": "llama-3.3-70b-versatile"
  }
}

// Update Anthropic
POST /api/settings
{
  "action": "update_provider",
  "provider": "anthropic",
  "config": {
    "apiKey": "sk-ant-...",
    "model": "claude-3-5-sonnet-20241022"
  }
}
```

### Switch Active Provider
```typescript
POST /api/settings
{
  "action": "switch_provider",
  "provider": "gemini"  // or "groq" or "anthropic"
}
```

---

## Troubleshooting

### Gemini Issues
**Error: Invalid API key**
- Check key format starts with `AIza`
- Verify key is from Google AI Studio
- Check API is enabled in Google Cloud Console

**Error: Model not found**
- Use default models listed above
- Check spelling of model name

### Groq Issues
**Error: Rate limit exceeded**
- Free tier has rate limits
- Wait a few minutes
- Consider upgrading to paid tier

**Error: Model not available**
- Groq models can have availability issues
- Try different model
- Check Groq status page

### Anthropic Issues
**Error: Authentication failed**
- Check key format starts with `sk-ant-`
- Verify key is active in Anthropic Console
- Check organization access

**Error: Custom API format**
- Anthropic uses different message format
- May require code updates for full compatibility
- Test with simple messages first

---

## Testing Your Setup

### 1. Test Connection
```bash
POST /api/settings
{
  "action": "test_connection",
  "provider": "gemini"
}
```

Expected response:
```json
{
  "success": true,
  "message": "Gemini connection successful",
  "details": {
    "availableModels": 3,
    "note": "Gemini uses OpenAI-compatible API format"
  }
}
```

### 2. Get Available Models
```bash
POST /api/settings
{
  "action": "get_models",
  "provider": "groq"
}
```

### 3. Test Plant Analysis
Use the main plant analysis feature with your new provider to verify it works end-to-end.

---

## Recommendations by Use Case

### For Development/Testing
**Use Groq** - Free, fast, great for testing
- Model: llama-3.3-70b-versatile

### For Production (General)
**Use Gemini** - Free during preview, excellent performance
- Model: gemini-2.0-flash-exp

### For Complex Analysis
**Use Claude** - Best reasoning, worth the cost
- Model: claude-3-5-sonnet-20241022

### For Real-time Chat
**Use Groq** - Ultra-fast responses
- Model: llama-3.3-70b-versatile

### For Vision Tasks
**Use Gemini or Claude** - Both support vision
- Gemini: gemini-2.0-flash-exp
- Claude: claude-3-5-sonnet-20241022

---

## Migration Guide

### From LM Studio to Cloud Providers
1. Keep LM Studio for local development
2. Add Groq for fast cloud inference
3. Use Gemini as primary production provider
4. Keep Claude for premium analysis tasks

### From OpenRouter
1. Gemini and Groq may be cheaper/faster
2. Test performance with your workload
3. Keep OpenRouter as fallback
4. Consider using multiple providers for redundancy

---

## Support & Resources

### Documentation
- [Gemini API Docs](https://ai.google.dev/docs)
- [Groq Documentation](https://console.groq.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com/)

### Community
- Check CultivAI Pro GitHub for issues
- Join Discord for provider tips
- Share your configurations

### Getting Help
If you encounter issues:
1. Check API key is valid
2. Test connection in Settings
3. Check console logs for errors
4. Verify model name spelling
5. Try different provider as fallback
