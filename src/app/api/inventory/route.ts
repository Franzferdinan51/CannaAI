import { unavailableFeature } from '@/lib/unavailable-feature';

export const dynamic = 'auto';
export const revalidate = false;

export async function GET() {
  return unavailableFeature('Inventory');
}

export async function POST() {
  return unavailableFeature('Inventory');
}

export async function PUT() {
  return unavailableFeature('Inventory');
}

export async function DELETE() {
  return unavailableFeature('Inventory');
}
