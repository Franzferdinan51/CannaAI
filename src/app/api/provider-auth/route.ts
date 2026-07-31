import { NextRequest, NextResponse } from 'next/server';
import { authCommand, providerAuthLog, providerAuthStatus, startProviderAuth, AuthProvider } from '@/lib/provider-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const providers = new Set<AuthProvider>(['openai', 'grok', 'xai', 'openclaw', 'hermes', 'nous']);
function parseProvider(value: string | null): AuthProvider | null {
  return value && providers.has(value as AuthProvider) ? value as AuthProvider : null;
}

export async function GET(request: NextRequest) {
  const provider = parseProvider(request.nextUrl.searchParams.get('provider'));
  if (!provider) return NextResponse.json({ success: false, error: 'Unsupported OAuth provider' }, { status: 400 });
  return NextResponse.json({ success: true, ...(await providerAuthStatus(provider)), command: authCommand(provider).args.join(' ') });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const provider = parseProvider(body.provider);
    if (!provider) return NextResponse.json({ success: false, error: 'Unsupported OAuth provider' }, { status: 400 });
    if (body.action === 'status') return NextResponse.json({ success: true, ...(await providerAuthStatus(provider)) });
    if (body.action === 'log') return NextResponse.json({ success: true, ...(await providerAuthLog(provider)) });
    const result = await startProviderAuth(provider);
    return NextResponse.json({ success: true, ...result, instruction: 'Complete authentication in the browser window, then press Check status.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to start OAuth' }, { status: 500 });
  }
}
