/**
 * API Route for LM Studio Integration
 * Handles communication between CannaAI and local LM Studio models
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, image, systemPrompt, temperature, maxTokens, modelId } = body;

    // Check if LM Studio is running
    const healthCheck = await fetch('http://localhost:1234/v1/models');
    if (!healthCheck.ok) {
      return NextResponse.json(
        { error: 'LM Studio is not running. Please start LM Studio first.' },
        { status: 503 }
      );
    }

    // Prepare the request for LM Studio
    const messages = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    const userMessage = {
      role: 'user',
      content: prompt
    };

    // Add image if provided
    if (image) {
      userMessage.content = [
        {
          type: 'text',
          text: prompt
        },
        {
          type: 'image_url',
          image_url: {
            url: image
          }
        }
      ];
    }

    messages.push(userMessage);

    // Call LM Studio API
    const lmStudioResponse = await fetch('http://localhost:1234/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId || 'auto', // Let LM Studio choose the best model
        messages,
        temperature: temperature || 0.7,
        max_tokens: maxTokens || 512,
        stream: false
      })
    });

    if (!lmStudioResponse.ok) {
      const errorText = await lmStudioResponse.text();
      return NextResponse.json(
        { error: `LM Studio API error: ${lmStudioResponse.status} - ${errorText}` },
        { status: 500 }
      );
    }

    const result = await lmStudioResponse.json();

    // Extract and return the response
    const response = {
      content: result.choices[0].message.content,
      model: result.model || 'unknown',
      usage: result.usage,
      timestamp: new Date().toISOString(),
      provider: 'lmstudio-local'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('LM Studio API error:', error);
    return NextResponse.json(
      { error: `Failed to process request: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Health check and model listing endpoint
  try {
    const response = await fetch('http://localhost:1234/v1/models');

    if (!response.ok) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          error: 'LM Studio is not running',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      );
    }

    const models = await response.json();

    return NextResponse.json({
      status: 'healthy',
      models: models.data || [],
      timestamp: new Date().toISOString(),
      provider: 'lmstudio-local'
    });

  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}