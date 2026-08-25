import { unavailableFeature } from '@/lib/unavailable-feature';

export const dynamic = 'auto';
export const revalidate = false;

export async function GET() {
  return unavailableFeature('Cost and revenue');
}

export async function POST() {
  return unavailableFeature('Cost and revenue');
}
