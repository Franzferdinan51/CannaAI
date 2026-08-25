import { NextRequest } from 'next/server';
import { unavailableFeature } from '@/lib/unavailable-feature';

/**
 * IndexedDB is a browser-only store. This legacy server route used to import
 * it into the Node runtime and return a misleading 500 error. Keep the route
 * explicit until a server-backed document model is added.
 */

// GET /api/storage - Get all documents or stats
export async function GET(req: NextRequest) {
  void req;
  return unavailableFeature('Server document storage');
}

// POST /api/storage - Save document or import data
export async function POST(req: NextRequest) {
  void req;
  return unavailableFeature('Server document storage');
}

// DELETE /api/storage - Delete document or clear all
export async function DELETE(req: NextRequest) {
  void req;
  return unavailableFeature('Server document storage');
}
