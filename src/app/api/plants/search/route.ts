import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function POST(request: NextRequest) {
  await ensureSeedData();
  const filter = await request.json().catch(() => ({}));
  const where: any = {};

  if (typeof filter.isActive === 'boolean') where.isActive = filter.isActive;
  else if (filter.includeArchived !== true) where.isActive = true;
  if (typeof filter.search === 'string' && filter.search.trim()) {
    const search = filter.search.trim();
    where.OR = [
      { name: { contains: search } },
      { notes: { contains: search } },
    ];
  }
  if (Array.isArray(filter.strainIds) && filter.strainIds.length) where.strainId = { in: filter.strainIds };
  if (Array.isArray(filter.stages) && filter.stages.length) where.stage = { in: filter.stages };
  if (Array.isArray(filter.locations) && filter.locations.length) where.locationId = { in: filter.locations };
  if (typeof filter.search === 'string' && filter.search.trim()) {
    where.OR.push({ strain: { name: { contains: filter.search.trim() } } });
  }

  const sortField = ['name', 'age', 'createdAt', 'updatedAt'].includes(filter.sortBy) ? filter.sortBy : 'createdAt';
  const sortOrder = filter.sortOrder === 'asc' ? 'asc' : 'desc';
  const take = Math.min(Math.max(Number(filter.limit) || 100, 1), 500);
  const skip = Math.max(Number(filter.offset) || 0, 0);
  const candidates = await prisma.plant.findMany({
    where,
    include: { strain: { select: { id: true, name: true, type: true } } },
  });
  const filtered = candidates.filter((plant: any) => {
    const health = plant.health && typeof plant.health === 'object' ? plant.health : {};
    const tags = Array.isArray(plant.tags) ? plant.tags : [];
    if (Array.isArray(filter.healthStatuses) && filter.healthStatuses.length && !filter.healthStatuses.includes(health.status)) return false;
    if (filter.hasIssues === true && !(Array.isArray(health.issues) && health.issues.length > 0)) return false;
    if (filter.hasImages === true && !(Array.isArray(plant.images) && plant.images.length > 0)) return false;
    if (Array.isArray(filter.tags) && filter.tags.length && !filter.tags.every((tag: string) => tags.includes(tag))) return false;
    if (filter.ageRange && (plant.age == null || plant.age < filter.ageRange.min || plant.age > filter.ageRange.max)) return false;
    if (filter.healthRange && (typeof health.score !== 'number' || health.score < filter.healthRange.min || health.score > filter.healthRange.max)) return false;
    return true;
  }).sort((left: any, right: any) => {
    const a = left[sortField];
    const b = right[sortField];
    const comparison = a instanceof Date && b instanceof Date ? a.getTime() - b.getTime() : String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true });
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  const total = filtered.length;
  const plants = filtered.slice(skip, skip + take);
  return NextResponse.json({
    success: true,
    data: { plants, facets: {}, inventory: { totalPlants: total } },
    pagination: { total, page: Math.floor(skip / take) + 1, limit: take, pages: Math.ceil(total / take) }
  });
}
