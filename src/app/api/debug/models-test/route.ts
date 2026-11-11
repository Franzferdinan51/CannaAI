import { NextResponse } from 'next/server';
import { debugEndpointsEnabled } from '@/lib/debug-endpoints';
import { getLMStudioApiKey } from '@/lib/ai-provider-lmstudio';
import { createTimeoutSignal } from '@/lib/abort-signal';
import { withRequest } from '@/lib/logger';

const lmStudioHeaders = () => {
  const apiKey = getLMStudioApiKey();
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
};

// Export configuration for dual-mode compatibility
// This diagnostic performs live localhost requests and is runtime-only.
// Prevent Next from executing it during static generation.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = false;

export async function GET(_request: Request) {
  const log = withRequest(_request);
  if (!debugEndpointsEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

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

  const appOrigin = new URL(_request.url).origin;

  try {
    log.info('debug.models_test_started');

    // Test 1: Direct LM Studio API call
    log.info('debug.models_test_direct_started');
    let lmStudioDirect = null;
    try {
      const response = await fetch('http://localhost:1234/v1/models', {
        signal: createTimeoutSignal(5000),
        headers: lmStudioHeaders()
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
        log.info('debug.models_test_direct_ok', { count: lmStudioDirect.count });
      } else {
        lmStudioDirect = {
          success: false,
          error: `${response.status} ${response.statusText}`
        };
        log.warn('debug.models_test_direct_failed', { error: lmStudioDirect.error });
      }
    } catch (error) {
      lmStudioDirect = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      log.error('debug.models_test_direct_error', { error: lmStudioDirect.error });
    }

    // Test 2: Our local scanner API
    log.info('debug.models_test_scanner_started');
    let localScanner = null;
    try {
      const response = await fetch(`${appOrigin}/api/lmstudio/models`, {
        signal: createTimeoutSignal(10000)
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
        log.info('debug.models_test_scanner_ok', { count: localScanner.count, lmStudioRunning: localScanner.lmStudioRunning });
      } else {
        localScanner = {
          success: false,
          error: `${response.status} ${response.statusText}`,
          status: response.status
        };
        log.warn('debug.models_test_scanner_failed', { error: localScanner.error });
      }
    } catch (error) {
      localScanner = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      log.error('debug.models_test_scanner_error', { error: localScanner.error });
    }

    // Test 3: Our AI providers API
    log.info('debug.models_test_providers_started');
    let aiProviders = null;
    try {
      const response = await fetch(`${appOrigin}/api/ai/providers`, {
        signal: createTimeoutSignal(10000)
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
        log.info('debug.models_test_providers_ok', { totalProviders: aiProviders.totalProviders, totalModels: aiProviders.totalModels });
      } else {
        aiProviders = {
          success: false,
          error: `${response.status} ${response.statusText}`
        };
        log.warn('debug.models_test_providers_failed', { error: aiProviders.error });
      }
    } catch (error) {
      aiProviders = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      log.error('debug.models_test_providers_error', { error: aiProviders.error });
    }

    // Test 4: Settings API
    log.info('debug.models_test_settings_started');
    let settings = null;
    try {
      const response = await fetch(`${appOrigin}/api/settings`, {
        signal: createTimeoutSignal(5000)
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
        log.info('debug.models_test_settings_ok', { aiProvider: settings.aiProvider });
      } else {
        settings = {
          success: false,
          error: `${response.status} ${response.statusText}`
        };
        log.warn('debug.models_test_settings_failed', { error: settings.error });
      }
    } catch (error) {
      settings = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      log.error('debug.models_test_settings_error', { error: settings.error });
    }

    const results = {
      timestamp: new Date().toISOString(),
      lmStudioDirect,
      localScanner,
      aiProviders,
      settings
    };

    log.info('debug.models_test_summary', {
      lmStudioDirectSuccess: !!lmStudioDirect?.success,
      lmStudioDirectCount: lmStudioDirect?.success ? lmStudioDirect.count : undefined,
      lmStudioDirectError: lmStudioDirect?.success ? undefined : lmStudioDirect?.error,
      localScannerSuccess: !!localScanner?.success,
      localScannerCount: localScanner?.success ? localScanner.count : undefined,
      localScannerError: localScanner?.success ? undefined : localScanner?.error,
      aiProvidersSuccess: !!aiProviders?.success,
      aiProvidersTotalModels: aiProviders?.success ? aiProviders.totalModels : undefined,
      aiProvidersError: aiProviders?.success ? undefined : aiProviders?.error,
      settingsSuccess: !!settings?.success,
      settingsAiProvider: settings?.success ? settings.aiProvider : undefined,
      settingsError: settings?.success ? undefined : settings?.error,
    });

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error) {
    log.error('debug.models_test_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
