import { unavailableApiResponse } from '@/lib/unavailable-api';

export async function GET() {
  return unavailableApiResponse('Harvest records');
}
export async function POST() {
  return unavailableApiResponse('Harvest records');
}
