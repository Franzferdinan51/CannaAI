/**
 * Breeding lineage helpers.
 *
 * Builds a family tree for a strain by walking BreedingCross records
 * backwards: strain -> the cross that produced it -> mother/father strains
 * -> their crosses, and so on. Cycle-safe (self-crosses and accidental
 * loops terminate with a `cycle: true` marker instead of recursing forever).
 */

export interface LineageStrain {
  id: string;
  name: string;
}

export interface LineageCross {
  id: string;
  name: string;
  generation: string | null;
  crossDate: string | null;
  seedsHarvested: number | null;
  notes: string | null;
}

export interface LineageNode {
  strain: LineageStrain;
  /** The cross that produced this strain, if recorded. */
  cross: LineageCross | null;
  mother: LineageNode | null;
  father: LineageNode | null;
  /** Free-text pollen source when the father isn't a tracked strain. */
  fatherDescription: string | null;
  /** True when this node was cut off to break a cycle or depth limit. */
  truncated?: boolean;
}

export interface CrossRecord {
  id: string;
  name: string;
  generation: string | null;
  crossDate: Date | null;
  seedsHarvested: number | null;
  notes: string | null;
  fatherDescription: string | null;
  motherStrain: LineageStrain | null;
  fatherStrain: LineageStrain | null;
}

export interface LineageLoaders {
  getStrain(id: string): Promise<LineageStrain | null>;
  /** The cross whose resultingStrainId matches, if any. */
  getCrossByResultStrain(strainId: string): Promise<CrossRecord | null>;
}

function toLineageCross(c: CrossRecord): LineageCross {
  return {
    id: c.id,
    name: c.name,
    generation: c.generation,
    crossDate: c.crossDate ? c.crossDate.toISOString() : null,
    seedsHarvested: c.seedsHarvested,
    notes: c.notes,
  };
}

/**
 * Build the lineage tree for a strain. Pure logic — all DB access goes
 * through the injected loaders, so this is trivially unit-testable.
 */
export async function buildLineage(
  strainId: string,
  loaders: LineageLoaders,
  maxDepth = 6,
  seen: Set<string> = new Set(),
): Promise<LineageNode | null> {
  const strain = await loaders.getStrain(strainId);
  if (!strain) return null;
  if (seen.has(strainId) || maxDepth <= 0) {
    return { strain, cross: null, mother: null, father: null, fatherDescription: null, truncated: true };
  }
  const nextSeen = new Set(seen);
  nextSeen.add(strainId);

  const cross = await loaders.getCrossByResultStrain(strainId);
  if (!cross) {
    return { strain, cross: null, mother: null, father: null, fatherDescription: null };
  }

  const [mother, father] = await Promise.all([
    cross.motherStrain ? buildLineage(cross.motherStrain.id, loaders, maxDepth - 1, nextSeen) : Promise.resolve(null),
    cross.fatherStrain ? buildLineage(cross.fatherStrain.id, loaders, maxDepth - 1, nextSeen) : Promise.resolve(null),
  ]);

  return {
    strain,
    cross: toLineageCross(cross),
    mother,
    father,
    fatherDescription: cross.fatherDescription,
  };
}

/** Flatten a lineage tree into a readable "A × B → C" pedigree string. */
export function pedigreeString(node: LineageNode | null): string {
  if (!node) return 'unknown';
  if (!node.cross) return node.strain.name;
  const mother = node.mother ? pedigreeString(node.mother) : 'unknown mother';
  const father = node.father
    ? pedigreeString(node.father)
    : node.fatherDescription || 'unknown father';
  const gen = node.cross.generation ? ` ${node.cross.generation}` : '';
  return `(${mother} × ${father} → ${node.strain.name}${gen})`;
}
