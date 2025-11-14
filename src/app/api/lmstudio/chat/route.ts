import { NextRequest, NextResponse } from 'next/server';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

export async function POST(request: NextRequest) {
  // For static export, provide client-side compatibility response
  const isStaticExport = process.env.BUILD_MODE === 'static';
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'This API is handled client-side in static export mode.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  try {
    const body = await request.json();
    const {
      prompt,
      image,
      systemPrompt,
      temperature = 0.7,
      maxTokens = 512,
      modelId,
      stream = false
    } = body;

    // Check if LM Studio is running
    const healthResponse = await fetch('http://localhost:1234/v1/models', {
      signal: AbortSignal.timeout(3000)
    });

    if (!healthResponse.ok) {
      return NextResponse.json(
        {
          error: 'LM Studio is not running. Please start LM Studio first.',
          code: 'LM_STUDIO_NOT_RUNNING'
        },
        { status: 503 }
      );
    }

    // Get available models from LM Studio to find the requested model
    const modelsData = await healthResponse.json();
    const availableModels = modelsData.data || [];

    // Find the model or use the first available one
    let selectedModel = modelId;
    if (!selectedModel && availableModels.length > 0) {
      selectedModel = availableModels[0].id;
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

    // Add image if provided (for vision models)
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

    // Prepare LM Studio request payload
    const lmStudioPayload = {
      model: selectedModel || 'auto',
      messages,
      temperature,
      max_tokens: maxTokens,
      stream,
      // Add some default parameters for better responses
      top_p: 0.9,
      frequency_penalty: 0.0,
      presence_penalty: 0.0
    };

    console.log('Sending request to LM Studio:', {
      model: selectedModel,
      messagesCount: messages.length,
      hasImage: !!image,
      temperature,
      maxTokens
    });

    // Call LM Studio API
    const lmStudioResponse = await fetch('http://localhost:1234/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lmStudioPayload)
    });

    if (!lmStudioResponse.ok) {
      const errorText = await lmStudioResponse.text();
      console.error('LM Studio API error:', {
        status: lmStudioResponse.status,
        statusText: lmStudioResponse.statusText,
        errorText
      });

      return NextResponse.json(
        {
          error: `LM Studio API error: ${lmStudioResponse.status} - ${errorText}`,
          code: 'LM_STUDIO_API_ERROR'
        },
        { status: 500 }
      );
    }

    const result = await lmStudioResponse.json();

    // Extract and return the response
    const response = {
      content: result.choices[0].message.content,
      model: result.model || selectedModel,
      usage: result.usage,
      timestamp: new Date().toISOString(),
      provider: 'lmstudio-local',
      finishReason: result.choices[0].finish_reason
    };

    console.log('LM Studio response received:', {
      model: response.model,
      contentLength: response.content.length,
      usage: response.usage
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('LM Studio chat API error:', error);

    // Handle timeout specifically
    if (error.name === 'AbortError') {
      return NextResponse.json(
        {
          error: 'LM Studio request timed out. Please try again.',
          code: 'TIMEOUT'
        },
        { status: 504 }
      );
    }

    // Handle connection refused specifically
    if (error.message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        {
          error: 'Could not connect to LM Studio. Make sure LM Studio is running on localhost:1234.',
          code: 'CONNECTION_REFUSED'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: `Failed to process request: ${error.message}`,
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // For static export, provide client-side compatibility response
  const isStaticExport = process.env.BUILD_MODE === 'static';
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'This API is handled client-side in static export mode.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  // Health check endpoint
  try {
    const response = await fetch('http://localhost:1234/v1/models', {
      signal: AbortSignal.timeout(2000)
    });

    if (!response.ok) {
      return NextResponse.json({
        status: 'unhealthy',
        error: 'LM Studio is not running',
        code: 'LM_STUDIO_NOT_RUNNING',
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }

    const models = await response.json();

    return NextResponse.json({
      status: 'healthy',
      models: models.data || [],
      count: (models.data || []).length,
      timestamp: new Date().toISOString(),
      provider: 'lmstudio-local'
    });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message,
      code: 'CONNECTION_ERROR',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}