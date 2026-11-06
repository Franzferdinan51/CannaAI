import { NextRequest } from 'next/server';
import {
  createCareSchedule,
  deleteCareSchedule,
  listCareSchedules,
  updateCareSchedule,
} from '@/lib/care-schedules';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Feeding (nutrient) schedules are Schedule rows with type 'feeding';
// the care-specific details (plantId, roomId, nutrient mix, ...) live
// in config. Replaces the former 503 stub at this path.
// See src/lib/care-schedules.ts.

export async function GET(request: NextRequest) {
  return listCareSchedules('feeding', request);
}

export async function POST(request: NextRequest) {
  return createCareSchedule('feeding', 'Feeding schedule', request);
}

export async function PUT(request: NextRequest) {
  return updateCareSchedule('feeding', 'Feeding schedule', request);
}

export async function DELETE(request: NextRequest) {
  return deleteCareSchedule('feeding', request);
}
