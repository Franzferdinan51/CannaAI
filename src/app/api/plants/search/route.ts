import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';
import { publicPlantImage } from '@/lib/plant-images';
import { withRequest } from '@/lib/logger';

const PlantSearchSchema = z.object({
  search: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
  includeArchived: z.boolean().optional(),
  strainIds: z.array(z.string().max(100)).max(100).optional(),
  stages: z.array(z.string().max(50)).max(50).optional(),
  locations: z.array(z.string().max(100)).max(100).optional(),
  healthStatuses: z.array(z.string().max(50)).max(50).optional(),
  hasIssues: z.boolean().optional(),
  hasImages: z.boolean().optional(),
  tags: z.array(z.string().max(100)).max(100).optional(),
  ageRange: z.object({
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
  }).optional(),
  healthRange: z.object({
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
  }).optional(),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.string().max(10).optional(),
  limit: z.number().finite().optional(),
  offset: z.number().finite().optional(),
});

export async function POST(request: NextRequest) {
  const log = withRequest(request);
  try {
    await ensureSeedData();
    const body = await request.json().catch(() => null);
    const parsed = PlantSearchSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid search payload', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const filter = parsed.data;
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

    const sortField = ['name', 'age', 'createdAt', 'updatedAt'].includes(filter.sortBy || '') ? filter.sortBy : 'createdAt';
    const sortOrder = filter.sortOrder === 'asc' ? 'asc' : 'desc';
    const take = Math.min(Math.max(Number(filter.limit) || 100, 1), 500);
    const skip = Math.max(Number(filter.offset) || 0, 0);
    const candidates = await prisma.plant.findMany({
      where,
      include: {
        strain: {
          select: {
            id: true,
            name: true,
            type: true,
            lineage: true,
            description: true,
            isPurpleStrain: true,
          },
        },
        room: { select: { id: true, name: true, active: true } },
      },
    });
    const filtered = candidates.filter((plant: any) => {
      const health = plant.health && typeof plant.health === 'object' ? plant.health : {};
      const tags = Array.isArray(plant.tags) ? plant.tags : [];
      if (Array.isArray(filter.healthStatuses) && filter.healthStatuses.length && !filter.healthStatuses.includes(health.status)) return false;
      if (filter.hasIssues === true && !(Array.isArray(health.issues) && health.issues.length > 0)) return false;
      if (filter.hasImages === true && !(Array.isArray(plant.images) && plant.images.length > 0)) return false;
      if (Array.isArray(filter.tags) && filter.tags.length && !filter.tags.every((tag: string) => tags.includes(tag))) return false;
      if (filter.ageRange && (plant.age == null
        || (filter.ageRange.min !== undefined && plant.age < filter.ageRange.min)
        || (filter.ageRange.max !== undefined && plant.age > filter.ageRange.max))) return false;
      if (filter.healthRange && (typeof health.score !== 'number'
        || (filter.healthRange.min !== undefined && health.score < filter.healthRange.min)
        || (filter.healthRange.max !== undefined && health.score > filter.healthRange.max))) return false;
      return true;
    }).sort((left: any, right: any) => {
      const a = left[sortField];
      const b = right[sortField];
      const comparison = a instanceof Date && b instanceof Date ? a.getTime() - b.getTime() : String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true });
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    const total = filtered.length;
    const plants = filtered.slice(skip, skip + take).map((plant: any) => ({
      ...plant,
      images: Array.isArray(plant.images)
        ? plant.images.map((image: unknown) =>
            image && typeof image === 'object' ? publicPlantImage(image as Record<string, unknown>) : image,
          )
        : plant.images,
      location: plant.room ? { id: plant.room.id, name: plant.room.name, type: null, environment: {} } : null,
    }));
    return NextResponse.json({
      success: true,
      data: { plants, facets: {}, inventory: { totalPlants: total } },
      pagination: { total, page: Math.floor(skip / take) + 1, limit: take, pages: Math.ceil(total / take) },
    });
  } catch (error) {
    log.error('plants.search_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to search plants' }, { status: 500 });
  }
}
