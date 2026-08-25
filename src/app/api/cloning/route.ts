import { unavailableFeature } from '@/lib/unavailable-feature';

export const dynamic = 'auto';
export const revalidate = false;

export async function GET() {
  return unavailableFeature('Cloning records');
}

export async function POST() {
  return unavailableFeature('Cloning records');
}
