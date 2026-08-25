import { unavailableFeature } from '@/lib/unavailable-feature';

export async function POST() {
  return unavailableFeature('Automation actions');
}
