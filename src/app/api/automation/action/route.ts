import { unavailableApiResponse } from '@/lib/unavailable-api';

export async function POST() {
  return unavailableApiResponse('Automation actions');
}
