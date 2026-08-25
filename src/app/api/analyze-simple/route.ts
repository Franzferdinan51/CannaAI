import { unavailableApiResponse } from '@/lib/unavailable-api';

export async function POST() {
  return unavailableApiResponse('Simple rule-based analysis');
}
