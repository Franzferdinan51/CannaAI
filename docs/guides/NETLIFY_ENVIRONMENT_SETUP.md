# Netlify Environment Variable Setup for CannaAI

This guide explains how to configure environment variables for deploying CannaAI on Netlify with AI provider support.

## Overview

CannaAI supports multiple AI providers:
- **OpenRouter** (Recommended for Netlify): Cloud-based AI that works in serverless environments
- **LM Studio**: Local AI models (only works in development, not on Netlify)
- **Fallback**: Rule-based analysis (always available)

## Required Environment Variables

### OpenRouter Configuration (Recommended)

Set these in your Netlify dashboard under **Site settings > Build & deploy > Environment**:

```bash
# Primary: OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
OPENROUTER_TIMEOUT=30000
```

#### Getting OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai/)
2. Create an account or sign in
3. Navigate to [API Keys](https://openrouter.ai/keys)
4. Click "Create new key"
5. Copy the key and set it as `OPENROUTER_API_KEY`

#### Available OpenRouter Models

Free models (recommended for testing):
- `meta-llama/llama-3.1-8b-instruct:free`
- `meta-llama/llama-3.1-70b-instruct:free`
- `microsoft/wizardlm-2-8x22b:free`

Paid models (better performance):
- `anthropic/claude-3.5-sonnet`
- `openai/gpt-4o`
- `meta-llama/llama-3.1-405b-instruct`

### Optional Environment Variables

```bash
# General Configuration
NEXTAUTH_URL=https://your-site.netlify.app
NODE_ENV=production

# OpenRouter Advanced Configuration
OPENROUTER_MAX_TOKENS=2000
OPENROUTER_TEMPERATURE=0.3

# Fallback Behavior
ENABLE_FALLBACK=true
FALLBACK_CONFIDENCE=75

# Debug Logging
DEBUG_AI_PROVIDERS=false
VERBOSE_LOGGING=false
```

## Netlify Setup Steps

### 1. Configure Environment Variables

1. Go to your Netlify dashboard
2. Select your site
3. Navigate to **Site settings > Build & deploy > Environment**
4. Add the environment variables listed above

### 2. Update Build Settings

In your Netlify build settings:

```bash
# Build command
npm run build

# Publish directory
out
```

### 3. Redirects Configuration

Create a `netlify.toml` file in your project root:

```toml
[build]
  command = "npm run build"
  publish = "out"

[build.environment]
  NODE_VERSION = "18"

# Handle SPA routing
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# API routes (if using Next.js serverless functions)
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

## Testing Your Configuration

### 1. Test API Endpoint

After deployment, test your AI provider setup:

```bash
curl -X GET https://your-site.netlify.app/api/chat
```

Expected response:
```json
{
  "success": true,
  "currentProvider": "openrouter",
  "primaryProvider": {
    "provider": "openrouter",
    "isAvailable": true,
    "reason": "OpenRouter API is accessible and configured"
  },
  "availableProviders": ["openrouter"],
  "environment": {
    "isServerless": true,
    "platform": "Netlify"
  }
}
```

### 2. Test Plant Analysis

```bash
curl -X POST https://your-site.netlify.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "strain": "Blue Dream",
    "leafSymptoms": "Yellowing leaves",
    "temperature": 75,
    "humidity": 60,
    "phLevel": "6.2"
  }'
```

## Troubleshooting

### Common Issues

#### 1. "OpenRouter API key not configured"
**Solution**: Add `OPENROUTER_API_KEY` to Netlify environment variables

#### 2. "LM Studio not supported in serverless environments"
**Expected**: This is normal. LM Studio only works in local development.

#### 3. High latency or timeouts
**Solutions**:
- Increase `OPENROUTER_TIMEOUT` to 60000 (60 seconds)
- Use a faster model like `meta-llama/llama-3.1-8b-instruct:free`
- Check OpenRouter service status

#### 4. API rate limits
**Solutions**:
- Monitor usage in OpenRouter dashboard
- Consider upgrading to paid plan for higher limits
- Implement client-side caching

### Debug Mode

Enable debug logging by adding to environment variables:
```bash
DEBUG_AI_PROVIDERS=true
VERBOSE_LOGGING=true
```

Then check Netlify function logs for detailed provider detection information.

## Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | Yes | - | Your OpenRouter API key |
| `OPENROUTER_MODEL` | No | `meta-llama/llama-3.1-8b-instruct:free` | AI model to use |
| `OPENROUTER_TIMEOUT` | No | `30000` | Request timeout in milliseconds |
| `OPENROUTER_MAX_TOKENS` | No | `2000` | Maximum response tokens |
| `OPENROUTER_TEMPERATURE` | No | `0.3` | Response randomness (0-1) |
| `NEXTAUTH_URL` | No | Auto-detected | Your site URL |
| `ENABLE_FALLBACK` | No | `true` | Enable rule-based fallback |
| `DEBUG_AI_PROVIDERS` | No | `false` | Enable debug logging |

## Production Best Practices

### 1. Security
- Never commit API keys to git
- Use Netlify environment variables for sensitive data
- Rotate API keys periodically

### 2. Performance
- Monitor OpenRouter API usage and costs
- Implement client-side response caching
- Use appropriate timeouts

### 3. Reliability
- Enable fallback behavior for resilience
- Monitor function logs for errors
- Set up alerts for API failures

### 4. Cost Management
- Start with free models
- Monitor token usage
- Set usage limits in OpenRouter dashboard

## Advanced Configuration

### Custom Model Selection

You can specify different models for different tasks:

```bash
# For plant analysis (more detailed)
OPENROUTER_ANALYSIS_MODEL=anthropic/claude-3.5-sonnet

# For chat (faster, cheaper)
OPENROUTER_CHAT_MODEL=meta-llama/llama-3.1-8b-instruct:free
```

### Multiple API Keys

For high-traffic deployments, consider using multiple API keys:

```bash
OPENROUTER_API_KEY_1=your_first_key
OPENROUTER_API_KEY_2=your_second_key
OPENROUTER_API_KEY_3=your_third_key
```

### Custom Base URLs

If using a proxy or custom OpenRouter endpoint:

```bash
OPENROUTER_BASE_URL=https://your-proxy.com/v1
```

## Support

If you encounter issues with the Netlify deployment:

1. Check Netlify function logs
2. Verify environment variables are set correctly
3. Test OpenRouter API key directly
4. Check OpenRouter service status
5. Enable debug logging for detailed information

For more help, refer to the [CannaAI documentation](README.md) or create an issue in the repository.