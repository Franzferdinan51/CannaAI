import { NextRequest } from 'next/server';

// Socket.IO is handled by the custom server (server.ts).
// This route exists only to avoid 404s when the client probes /api/socketio.
export async function GET(_req: NextRequest) {
  return new Response('Socket.IO handled by server.ts', { status: 200 });
}
