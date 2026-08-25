import { unavailableFeature } from '@/lib/unavailable-feature';

export const dynamic = 'auto';
export const revalidate = false;

export async function GET() {
  return unavailableFeature('Harvest records');
}

export async function POST() {
  return unavailableFeature('Harvest records');
}
