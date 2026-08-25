import { unavailableApiResponse } from '@/lib/unavailable-api';

export async function GET() {
  return unavailableApiResponse('Canopy measurements');
}
