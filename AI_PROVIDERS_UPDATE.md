# AI Providers Update - Added Gemini, Groq, and Anthropic

## Summary

Successfully added three new AI provider integrations to the CultivAI Pro AI system:

1. **Google Gemini** (OpenAI-compatible API)
2. **Groq** (Fast inference, OpenAI-compatible API)
3. **Anthropic Claude** (Custom API format)

## Files Modified

### 1. `src/app/api/settings/route.ts`

#### Default Settings (Lines 8-39)
Added configuration structures for new providers:

```typescript
gemini: {
  apiKey: '',
  model: 'gemini-2.0-flash-exp',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/'
},
groq: {
  apiKey: '',
  model: 'llama-3.3-70b-versatile',
  baseUrl: 'https://api.groq.com/openai/v1'
},
anthropic: {
  apiKey: '',
  model: 'claude-3-5-sonnet-20241022',
  baseUrl: 'https://api.anthropic.com/v1'
}
```

#### Provider Update Switch (Lines 136-167)
Added cases for updating each new provider's settings:
- `gemini` - Updates Gemini API key and model selection
- `groq` - Updates Groq API key and model selection
- `anthropic` - Updates Anthropic API key and model selection

#### Provider Switch Validation (Lines 177)
Updated valid provider list to include: `'gemini'`, `'groq'`, `'anthropic'`

#### Model Fetching (Lines 597-816)
Added comprehensive model fetching for each provider:

**Gemini Models:**
- Fetches from OpenAI-compatible API endpoint
- Falls back to known models: gemini-2.0-flash-exp, gemini-1.5-pro, gemini-1.5-flash
- Context lengths: 1M-2M tokens

**Groq Models:**
- Fetches from OpenAI-compatible API endpoint
- Falls back to known models: llama-3.3-70b-versatile, mixtral-8x7b-32768, llama-3.1-70b-versatile
- Context lengths: 32k-131k tokens

**Anthropic Models:**
- No API endpoint for model listing
- Returns known models: claude-3-5-sonnet, claude-3-5-haiku, claude-3-opus, claude-3-sonnet
- Context lengths: 200k tokens
- Capabilities include vision and long-context

#### Connection Testing (Lines 957-1073)
Added connection testing for each provider:

**Gemini:**
- Tests OpenAI-compatible models endpoint
- Returns available model count

**Groq:**
- Tests OpenAI-compatible models endpoint
- Returns available model count with fast inference note

**Anthropic:**
- Tests with minimal message request to validate API key
- Uses custom headers: `x-api-key` and `anthropic-version: 2023-06-01`
- Note: Different API format than OpenAI

### 2. `src/app/api/ai/providers/route.ts`

#### New Model Fetching Functions (Lines 287-466)

**`getGeminiModels()` (Lines 287-350):**
- Fetches models from Gemini OpenAI-compatible API
- Returns default models if API fails
- All models support vision and long-context

**`getGroqModels()` (Lines 352-419):**
- Fetches models from Groq OpenAI-compatible API
- Filters for llama, mixtral, and gemma models
- Returns default models if API fails

**`getAnthropicModels()` (Lines 421-466):**
- Returns static list of Claude models
- No API endpoint available for listing
- Includes latest Claude 3.5 models

#### Provider Detection (Lines 599-669)
Added provider detection blocks for each new provider:
- Gemini: Cloud provider with OpenAI-compatible config
- Groq: Cloud provider with fast inference label
- Anthropic: Cloud provider with custom API config

## Provider Details

### Google Gemini
- **Type:** Cloud (OpenAI-compatible)
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/openai/`
- **Models:**
  - gemini-2.0-flash-exp (1M context)
  - gemini-1.5-pro (2M context)
  - gemini-1.5-flash (1M context)
- **Features:** Text generation, vision, long context
- **API Key:** Get from Google AI Studio

### Groq
- **Type:** Cloud (OpenAI-compatible, Fast Inference)
- **Endpoint:** `https://api.groq.com/openai/v1`
- **Models:**
  - llama-3.3-70b-versatile (32k context)
  - mixtral-8x7b-32768 (32k context)
  - llama-3.1-70b-versatile (131k context)
- **Features:** Ultra-fast inference, long context
- **API Key:** Get from Groq Console

### Anthropic Claude
- **Type:** Cloud (Custom API format)
- **Endpoint:** `https://api.anthropic.com/v1`
- **Models:**
  - claude-3-5-sonnet-20241022 (200k context)
  - claude-3-5-haiku-20241022 (200k context)
  - claude-3-opus-20240229 (200k context)
  - claude-3-sonnet-20240229 (200k context)
- **Features:** Advanced reasoning, vision, long context
- **API Key:** Get from Anthropic Console
- **Note:** Uses custom message format, not OpenAI-compatible

## API Compatibility

### OpenAI-Compatible Providers
These providers use the standard OpenAI API format and can be used with the Z-AI SDK:
- ✅ Gemini
- ✅ Groq
- ✅ LM Studio
- ✅ OpenRouter
- ✅ OpenAI (generic)

### Custom API Format
- ⚠️ Anthropic Claude - Uses custom message format
  - Header: `x-api-key` instead of `Authorization: Bearer`
  - Requires `anthropic-version` header
  - Different message structure

## Error Handling

All providers include:
- API key validation
- Connection timeout handling (10 second timeout)
- Graceful fallback to known models when API fails
- Detailed error messages for debugging
- Status tracking (available, unavailable, error)

## Testing

Each provider includes connection testing via:
```
POST /api/settings
{
  "action": "test_connection",
  "provider": "gemini" | "groq" | "anthropic"
}
```

Returns:
- Success status
- Available model count
- Provider-specific notes
- Error details if failed

## Usage

### Configure Provider
```typescript
POST /api/settings
{
  "action": "update_provider",
  "provider": "gemini",
  "config": {
    "apiKey": "your-api-key",
    "model": "gemini-2.0-flash-exp"
  }
}
```

### Switch Active Provider
```typescript
POST /api/settings
{
  "action": "switch_provider",
  "provider": "gemini"
}
```

### Get Models
```typescript
POST /api/settings
{
  "action": "get_models",
  "provider": "groq"
}
```

## Next Steps

1. **UI Updates** - Update `src/components/ai/AIProviderSettings.tsx` to display new providers
2. **AI Call Integration** - Update `src/lib/ai-provider-detection.ts` to handle Anthropic's custom format
3. **Testing** - Test each provider with actual API keys
4. **Documentation** - Add setup guides for each provider

## Preserved Functionality

✅ All existing providers (LM Studio, OpenRouter, OpenAI) remain unchanged
✅ Existing error handling preserved
✅ Model listing for existing providers unchanged
✅ Connection testing for existing providers unchanged
✅ Settings structure backward compatible

## Benefits

1. **More Options** - Users can choose from 7 AI providers instead of 3
2. **Better Performance** - Groq offers ultra-fast inference
3. **Advanced Models** - Gemini 2.0 and Claude 3.5 provide cutting-edge capabilities
4. **Cost Flexibility** - Multiple providers allow cost optimization
5. **Reliability** - More fallback options if one provider is down

## Implementation Notes

- Gemini and Groq can be used immediately with existing OpenAI-compatible code
- Anthropic requires custom API handling for message format conversion
- All providers support vision capabilities for plant analysis
- Long context windows beneficial for complex cultivation analysis
- Fast inference (Groq) improves real-time chat response times
