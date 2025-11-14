import { NextRequest, NextResponse } from 'next/server';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

export async function GET(request: NextRequest) {
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
    console.log('=== Testing LM Studio Models API ===');

    // Test 1: Direct LM Studio API call
    console.log('1. Testing direct LM Studio API...');
    let lmStudioDirect = null;
    try {
      const response = await fetch('http://localhost:1234/v1/models', {
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        lmStudioDirect = {
          success: true,
          count: data.data?.length || 0,
          models: data.data?.slice(0, 3).map((m: any) => ({
            id: m.id,
            object: m.object,
            created: m.created,
            owned_by: m.owned_by,
            permission: m.permission,
            root: m.root,
            parent: m.parent,
            mapping: m.mapping
          })) || []
        };
        console.log(`✓ LM Studio API works: ${lmStudioDirect.count} models found`);
      } else {
        lmStudioDirect = {
          success: false,
          error: `${response.status} ${response.statusText}`
        };
        console.log(`✗ LM Studio API failed: ${lmStudioDirect.error}`);
      }
    } catch (error) {
      lmStudioDirect = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.log(`✗ LM Studio API error: ${lmStudioDirect.error}`);
    }

    // Test 2: Our local scanner API
    console.log('\n2. Testing our local scanner...');
    let localScanner = null;
    try {
      const response = await fetch('http://localhost:3000/api/lmstudio/models', {
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        localScanner = {
          success: true,
          status: data.status,
          count: data.models?.length || 0,
          lmStudioRunning: data.lmStudioRunning,
          summary: data.summary,
          firstFewModels: data.models?.slice(0, 3).map((m: any) => ({
            id: m.id,
            name: m.name,
            author: m.author,
            sizeFormatted: m.sizeFormatted,
            capabilities: m.capabilities
          })) || []
        };
        console.log(`✓ Local scanner works: ${localScanner.count} models found`);
        console.log(`  LM Studio running: ${localScanner.lmStudioRunning}`);
      } else {
        localScanner = {
          success: false,
          error: `${response.status} ${response.statusText}`,
          status: response.status
        };
        console.log(`✗ Local scanner failed: ${localScanner.error}`);
      }
    } catch (error) {
      localScanner = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.log(`✗ Local scanner error: ${localScanner.error}`);
    }

    // Test 3: Our AI providers API
    console.log('\n3. Testing AI providers API...');
    let aiProviders = null;
    try {
      const response = await fetch('http://localhost:3000/api/ai/providers', {
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        aiProviders = {
          success: true,
          totalProviders: data.providers?.length || 0,
          availableProviders: data.summary?.availableProviders || 0,
          totalModels: data.summary?.totalModels || 0,
          providers: data.providers?.map((p: any) => ({
            id: p.id,
            name: p.name,
            type: p.type,
            status: p.status,
            modelCount: p.models?.length || 0,
            firstModel: p.models?.[0]?.name || 'N/A'
          })) || []
        };
        console.log(`✓ AI providers API works: ${aiProviders.totalProviders} providers, ${aiProviders.totalModels} models`);
      } else {
        aiProviders = {
          success: false,
          error: `${response.status} ${response.statusText}`
        };
        console.log(`✗ AI providers API failed: ${aiProviders.error}`);
      }
    } catch (error) {
      aiProviders = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.log(`✗ AI providers API error: ${aiProviders.error}`);
    }

    // Test 4: Settings API
    console.log('\n4. Testing settings API...');
    let settings = null;
    try {
      const response = await fetch('http://localhost:3000/api/settings', {
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        settings = {
          success: true,
          aiProvider: data.settings?.aiProvider,
          lmStudioModel: data.settings?.lmStudio?.model,
          openRouterModel: data.settings?.openRouter?.model,
          hasOpenRouterKey: !!data.settings?.openRouter?.apiKey
        };
        console.log(`✓ Settings API works: current provider = ${settings.aiProvider}`);
      } else {
        settings = {
          success: false,
          error: `${response.status} ${response.statusText}`
        };
        console.log(`✗ Settings API failed: ${settings.error}`);
      }
    } catch (error) {
      settings = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.log(`✗ Settings API error: ${settings.error}`);
    }

    const results = {
      timestamp: new Date().toISOString(),
      lmStudioDirect,
      localScanner,
      aiProviders,
      settings
    };

    console.log('\n=== Test Summary ===');
    console.log(`LM Studio Direct: ${lmStudioDirect?.success ? '✓' : '✗'} (${lmStudioDirect?.success ? lmStudioDirect.count + ' models' : lmStudioDirect?.error})`);
    console.log(`Local Scanner: ${localScanner?.success ? '✓' : '✗'} (${localScanner?.success ? localScanner.count + ' models' : localScanner?.error})`);
    console.log(`AI Providers: ${aiProviders?.success ? '✓' : '✗'} (${aiProviders?.success ? aiProviders.totalModels + ' models' : aiProviders?.error})`);
    console.log(`Settings: ${settings?.success ? '✓' : '✗'} (${settings?.success ? 'provider: ' + settings.aiProvider : settings?.error})`);

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}