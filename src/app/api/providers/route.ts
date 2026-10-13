export async function GET() {
  // Relative redirect: a path-only Location keeps clients on whatever
  // origin they already reached this backend through. Building an
  // absolute URL from request.url leaks the backend's internal origin
  // (an absolute localhost redirect breaks Vite-proxied, LAN, and phone
  // clients by sending them to a different backend origin).
  return new Response(null, {
    status: 307,
    headers: { location: '/api/ai/providers' },
  });
}
