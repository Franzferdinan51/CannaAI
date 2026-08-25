import { unavailableApiResponse } from '@/lib/unavailable-api';

export async function GET() {
  return unavailableApiResponse('Cloning records');
}
export async function POST() {
  return unavailableApiResponse('Cloning records');
}
