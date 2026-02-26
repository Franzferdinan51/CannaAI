#!/usr/bin/env node
/**
 * OpenClaw HTTP Bridge
 * 
 * Provides OpenAI-compatible API endpoint that routes to OpenClaw Gateway
 * 
 * Endpoints:
 * - POST /v1/chat/completions - Chat completions (OpenAI format)
 * - GET  /v1/models - List available models
 * - GET  /health - Health check
 * 
 * Usage:
 *   npm install
 *   npm start
 * 
 * Port: 18790 (configurable via PORT env)
 */

import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 18790;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'openclaw-http-bridge',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// List models (static for now, can query OpenClaw later)
app.get('/v1/models', (req, res) => {
  res.json({
    data: [
      {
        id: 'qwen3.5-plus',
        name: 'Qwen 3.5 Plus',
        vision: true,
        cost: 'FREE quota'
      },
      {
        id: 'kimi-k2.5',
        name: 'Kimi K2.5 (NVIDIA)',
        vision: true,
        cost: 'FREE'
      },
      {
        id: 'minimax-m2.5',
        name: 'MiniMax M2.5',
        vision: false,
        cost: 'FREE'
      },
      {
        id: 'glm-4.5',
        name: 'GLM-4.5',
        vision: false,
        cost: 'FREE quota'
      },
      {
        id: 'qwen-vl-max',
        name: 'Qwen-VL-Max',
        vision: true,
        cost: 'FREE quota'
      }
    ]
  });
});

// Chat completions (OpenAI-compatible)
app.post('/v1/chat/completions', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { model = 'qwen3.5-plus', messages, max_tokens = 2048, temperature = 0.7 } = req.body;
    
    // Validate request
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: {
          message: 'messages array is required',
          type: 'invalid_request_error'
        }
      });
    }
    
    // Extract last user message (and image if present)
    const lastMessage = messages[messages.length - 1];
    let promptText = '';
    let imageBase64 = null;
    
    if (typeof lastMessage.content === 'string') {
      promptText = lastMessage.content;
    } else if (Array.isArray(lastMessage.content)) {
      // Handle multimodal content
      for (const item of lastMessage.content) {
        if (item.type === 'text') {
          promptText += item.text + ' ';
        } else if (item.type === 'image_url' && item.image_url?.url) {
          // Extract base64 from data URL
          const match = item.image_url.url.match(/^data:image\/\w+;base64,(.+)$/);
          if (match) {
            imageBase64 = match[1];
          }
        }
      }
    }
    
    if (!promptText.trim()) {
      return res.status(400).json({
        error: {
          message: 'No text content in message',
          type: 'invalid_request_error'
        }
      });
    }
    
    console.log(`🦞 Processing request: model=${model}, text=${promptText.length} chars, image=${imageBase64 ? 'yes' : 'no'}`);
    
    // Build openclaw agent command
    // Use default agent (discord) with model override
    let cmd = `openclaw agent --json --agent discord --message ${JSON.stringify(promptText)}`;
    
    // Add thinking level based on complexity
    const thinkingLevel = promptText.length > 500 ? 'high' : 'medium';
    cmd += ` --thinking ${thinkingLevel}`;
    
    console.log(`🔧 Executing: ${cmd}`);
    
    // Execute OpenClaw agent
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: 120000, // 2 minute timeout
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    // Parse result
    let result;
    try {
      result = JSON.parse(stdout);
    } catch (parseError) {
      console.error('Failed to parse OpenClaw response:', parseError);
      result = { response: stdout };
    }
    
    const responseText = result.response || result.message || result.content || 'No response generated';
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Response in ${processingTime}ms`);
    
    // Return OpenAI-compatible format
    res.json({
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: responseText
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: Math.ceil(promptText.length / 4),
        completion_tokens: Math.ceil(responseText.length / 4),
        total_tokens: Math.ceil((promptText.length + responseText.length) / 4)
      },
      metadata: {
        provider: 'openclaw',
        processingTime,
        thinkingLevel,
        openclawResult: result
      }
    });
    
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Error:', error.message);
    
    // Handle timeout
    if (error.code === 'ETIMEDOUT' || error.killed) {
      return res.status(504).json({
        error: {
          message: 'Request timed out (OpenClaw agent took too long)',
          type: 'timeout_error',
          processingTime
        }
      });
    }
    
    // Handle other errors
    res.status(500).json({
      error: {
        message: error.message || 'Internal server error',
        type: 'internal_error',
        stderr: error.stderr,
        processingTime
      }
    });
  }
});

// Image analysis endpoint (convenience for vision models)
app.post('/v1/vision/analyze', async (req, res) => {
  try {
    const { image, prompt = 'Analyze this image in detail' } = req.body;
    
    if (!image) {
      return res.status(400).json({
        error: { message: 'image is required' }
      });
    }
    
    // Call chat completions with image
    const response = await fetch(`http://localhost:${PORT}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen-vl-max',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });
    
    const result = await response.json();
    res.json(result);
    
  } catch (error: any) {
    res.status(500).json({
      error: { message: error.message }
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🦞 OpenClaw HTTP Bridge running on port ${PORT}`);
  console.log(`📍 Endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`   GET  http://localhost:${PORT}/v1/models`);
  console.log(`   POST http://localhost:${PORT}/v1/chat/completions`);
  console.log(`   POST http://localhost:${PORT}/v1/vision/analyze`);
  console.log(`\n🔗 OpenClaw Gateway: http://localhost:18789`);
});
