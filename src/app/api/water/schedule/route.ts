import { NextRequest } from 'next/server';
import {
  createCareSchedule,
  deleteCareSchedule,
  listCareSchedules,
  updateCareSchedule,
} from '@/lib/care-schedules';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Watering schedules are Schedule rows with type 'watering'; the
// care-specific details (plantId, roomId, amount, ...) live in config.
// Replaces the former 503 stub at this path. See src/lib/care-schedules.ts.

export async function GET(request: NextRequest) {
  return listCareSchedules('watering', request);
}

export async function POST(request: NextRequest) {
  return createCareSchedule('watering', 'Watering schedule', request);
}

export async function PUT(request: NextRequest) {
  return updateCareSchedule('watering', 'Watering schedule', request);
}

export async function DELETE(request: NextRequest) {
  return deleteCareSchedule('watering', request);
}
