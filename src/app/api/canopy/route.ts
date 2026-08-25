import { unavailableFeature } from '@/lib/unavailable-feature';

export async function GET() {
  return unavailableFeature('Canopy measurements');
}
