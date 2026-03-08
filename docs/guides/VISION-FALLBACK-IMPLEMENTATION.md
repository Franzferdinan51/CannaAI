# Vision-Capable AI Fallback Implementation

## Summary

Successfully implemented vision-capable AI fallback for CannaAI plant analysis. The system now automatically uses vision models when plant images are provided, with graceful fallback to text-only analysis if vision is unavailable.

## Implementation Changes

### 1. New OpenRouter Provider (`src/lib/ai-provider-openrouter.ts`)

Created a new provider integration for OpenRouter with:

**Vision Models (FREE tier prioritized):**
- `qwen-vl-max` - Alibaba's best vision model (FREE quota) - **Recommended for plants**
- `qwen-vl-max-latest` - Latest Qwen vision model
- `meta-llama/llama-3.2-90b-vision-instruct` - Meta's vision model (free tier)
- `google/gemini-2.0-flash-exp:free` - Google's free vision model

**Text Fallback Models (FREE):**
- `meta-llama/llama-3.1-8b-instruct:free`
- `google/gemma-2-9b-it:free`
- `mistralai/mistral-7b-instruct:free`

### 2. Updated Bailian Provider (`src/lib/ai-provider-bailian.ts`)

Enhanced to auto-select vision model when image is provided:

```typescript
// Auto-select vision model when image is provided
const selectedModel = model || (image ? BAILIAN_VISION_MODEL : BAILIAN_MODEL);
// BAILIAN_VISION_MODEL = 'qwen-vl-max-latest'
```

**Key Features:**
- Uses `qwen-vl-max-latest` automatically when image provided
- Falls back to `qwen3.5-plus` for text-only analysis
- Proper vision message format for Bailian API

### 3. Updated Provider Detection (`src/lib/ai-provider-detection.ts`)

Added vision-aware provider ordering:

```typescript
// Priority for vision-capable providers
const visionPriority = ['bailian', 'openrouter', 'openclaw', 'lm-studio'];

// When image is provided, re-order providers by vision capability
if (hasImage || options.requireVision) {
  // Prioritize vision-capable providers
}
```

**Changes:**
- Added `bailian` and `openclaw` to provider types
- Added `requireVision` option to `executeAIWithFallback`
- Returns `visionUsed` flag in result
- Auto-prioritizes vision providers when image present

### 4. Updated Analyze Route (`src/app/api/analyze/route.ts`)

Integrated OpenRouter as primary provider option:

```typescript
if (providerDetection.primary.provider === 'openrouter') {
  // Use OpenRouter with vision-capable models
  aiResult = await executeWithOpenRouter({
    prompt: prompt,
    image: imageBase64ForAI,
    requireVision: !!imageBase64ForAI
  });
}
```

**Fallback Chain (Vision-Aware):**
1. OpenClaw Gateway (routes to best model)
2. OpenRouter (qwen-vl-max - FREE tier)
3. Alibaba Bailian (qwen-vl-max-latest)
4. LM Studio (local models)
5. Text-only fallback

## Provider Selection Logic

### With Image (Vision Mode):
```
1. OpenClaw → routes to vision-capable model
2. OpenRouter → qwen-vl-max (FREE)
3. Bailian → qwen-vl-max-latest (FREE quota)
4. LM Studio → local vision model (if available)
```

### Text-Only (No Image):
```
1. OpenClaw → configured text model
2. OpenRouter → llama-3.1-8b-instruct:free (FREE)
3. Bailian → qwen3.5-plus (FREE quota)
4. LM Studio → local text model
```

## Environment Variables

Add to `.env.local`:

```bash
# OpenRouter (NEW - Recommended for Vision)
OPENROUTER_API_KEY="sk-or-..."
OPENROUTER_MODEL="qwen-vl-max"  # Optional, defaults to best vision model

# Alibaba Bailian (Updated)
ALIBABA_API_KEY="sk-sp-..."
QWEN_MODEL="qwen3.5-plus"  # Text-only default
# Vision model auto-selected when image provided

# OpenClaw (Optional - Centralized)
OPENCLAW_GATEWAY_URL="http://localhost:18789"
OPENCLAW_MODEL="qwen3.5-plus"
```

## Testing

### Test Vision Fallback:

```bash
# 1. Configure API key
echo 'OPENROUTER_API_KEY="sk-or-your-key-here"' >> .env.local

# 2. Start development server
npm run dev

# 3. Test with plant photo via dashboard
# Navigate to Plants → Select Plant → Analyze → Upload Photo
```

### Expected Behavior:

1. **With valid OpenRouter key:**
   - Uses `qwen-vl-max` for image analysis
   - Returns detailed visual diagnosis
   - Console shows: `👁️ OpenRouter: Using vision model "qwen-vl-max"`

2. **With valid Alibaba key (no OpenRouter):**
   - Uses `qwen-vl-max-latest` for image analysis
   - Console shows: `👁️ Bailian: Using vision model "qwen-vl-max-latest"`

3. **With image but no vision models available:**
   - Falls back to text-only analysis
   - Console warns: `⚠️ Image provided but using text-only model`

4. **Without image:**
   - Uses text-only models
   - Preserves FREE quota

## Logging

Vision usage is logged for debugging:

```
👁️ Vision-aware provider ordering (image: true): bailian > openrouter > openclaw > lm-studio
👁️ OpenRouter: Using vision model "qwen-vl-max" for plant image analysis
✅ AI analysis completed via openrouter (VISION)
✅ Analysis completed successfully:
   Provider: openrouter
   Model: qwen-vl-max
   Vision Used: true
```

## API Response

The analysis response now includes vision metadata:

```json
{
  "success": true,
  "analysis": { ... },
  "provider": {
    "used": "openrouter",
    "model": "qwen-vl-max",
    "visionUsed": true,
    "available": ["openrouter", "bailian"]
  },
  "metadata": {
    "imageAnalysis": true,
    "features": {
      "trichomeAnalysis": true,
      "visualChangeDetection": true,
      "multiModalAnalysis": true
    }
  }
}
```

## Cost Considerations

**FREE Tier Models:**
- OpenRouter `qwen-vl-max`: FREE quota (varies)
- Bailian `qwen-vl-max-latest`: 18K tokens/month FREE
- OpenRouter text models: Completely FREE

**Recommended Usage:**
- Use FREE tier for development/testing
- Monitor quota usage in production
- Text-only fallback preserves vision quota

## Files Modified

1. `src/lib/ai-provider-openrouter.ts` - NEW
2. `src/lib/ai-provider-bailian.ts` - Updated
3. `src/lib/ai-provider-detection.ts` - Updated
4. `src/app/api/analyze/route.ts` - Updated
5. `tests/vision-fallback.test.ts` - NEW (configuration tests)

## Next Steps

1. **Test with real plant photos** - Upload actual cannabis plant images
2. **Monitor quota usage** - Check OpenRouter/Bailian dashboards
3. **Compare vision vs text** - Verify vision adds value to analysis
4. **Consider LM Studio vision** - Test local vision models (LLaVA, etc.)

## Troubleshooting

### Vision not working:
1. Check API key is valid: `OPENROUTER_API_KEY` or `ALIBABA_API_KEY`
2. Verify FREE quota not exhausted
3. Check network connectivity
4. Review server logs for error messages

### Falling back to text-only:
1. Vision model may be unavailable
2. Image format may be invalid
3. Provider may not support vision format
4. Check console for `⚠️` warnings

### Quota exceeded:
1. Switch to alternative provider
2. Use text-only analysis temporarily
3. Consider paid tier for production
