import {
  buildLineage,
  pedigreeString,
  type LineageLoaders,
  type CrossRecord,
} from '@/lib/breeding';

// Purple Sunshine Auto F2 pedigree:
// (Golden Lemon Haze × Granddaddy Purple → Purple Sunshine F1)
//   × Blackstrap Auto F2 → Purple Sunshine Auto (selfed ×2) → Purple Sunshine Auto F2
const strains: Record<string, { id: string; name: string }> = {
  glh: { id: 'glh', name: 'Golden Lemon Haze' },
  gdp: { id: 'gdp', name: 'Granddaddy Purple' },
  psf1: { id: 'psf1', name: 'Purple Sunshine F1' },
  bsa: { id: 'bsa', name: 'Blackstrap Auto F2' },
  psa: { id: 'psa', name: 'Purple Sunshine Auto' },
  psaf2: { id: 'psaf2', name: 'Purple Sunshine Auto F2' },
};

function cross(
  id: string, name: string, generation: string | null,
  motherId: string | null, fatherId: string | null,
  resultId: string,
): CrossRecord {
  return {
    id, name, generation,
    crossDate: new Date('2026-01-01'),
    seedsHarvested: 50,
    notes: null,
    fatherDescription: null,
    motherStrain: motherId ? strains[motherId] : null,
    fatherStrain: fatherId ? strains[fatherId] : null,
  };
}

const crossesByResult: Record<string, CrossRecord> = {
  psf1: cross('c1', 'Purple Sunshine F1', 'F1', 'glh', 'gdp', 'psf1'),
  psa: cross('c2', 'Purple Sunshine Auto', 'F1', 'psf1', 'bsa', 'psa'),
  psaf2: cross('c3', 'Purple Sunshine Auto F2', 'F2', 'psa', 'psa', 'psaf2'), // selfed
};

const loaders: LineageLoaders = {
  getStrain: async (id) => strains[id] || null,
  getCrossByResultStrain: async (id) => crossesByResult[id] || null,
};

describe('breeding lineage', () => {
  it('builds the full tree for Purple Sunshine Auto F2', async () => {
    const tree = await buildLineage('psaf2', loaders);
    expect(tree).not.toBeNull();
    expect(tree!.strain.name).toBe('Purple Sunshine Auto F2');
    expect(tree!.cross!.generation).toBe('F2');
    // selfed: mother and father are both Purple Sunshine Auto
    expect(tree!.mother!.strain.name).toBe('Purple Sunshine Auto');
    expect(tree!.father!.strain.name).toBe('Purple Sunshine Auto');
    // grandmother generation
    const mom = tree!.mother!;
    expect(mom.mother!.strain.name).toBe('Purple Sunshine F1');
    expect(mom.father!.strain.name).toBe('Blackstrap Auto F2');
    expect(mom.mother!.mother!.strain.name).toBe('Golden Lemon Haze');
    expect(mom.mother!.father!.strain.name).toBe('Granddaddy Purple');
  });

  it('terminates self-cross cycles instead of recursing forever', async () => {
    const tree = await buildLineage('psaf2', loaders);
    // The selfed node (psa × psa) recursed into psa, whose own parents
    // include psa again — the second visit must be truncated.
    const selfedMother = tree!.mother!;
    expect(selfedMother.strain.id).toBe('psa');
    // depth is bounded; the whole call must simply return
    expect(JSON.stringify(tree).length).toBeGreaterThan(100);
  });

  it('renders a readable pedigree string', async () => {
    const tree = await buildLineage('psf1', loaders);
    expect(pedigreeString(tree)).toBe('(Golden Lemon Haze × Granddaddy Purple → Purple Sunshine F1 F1)');
  });

  it('returns null for an unknown strain', async () => {
    expect(await buildLineage('nope', loaders)).toBeNull();
  });

  it('handles a strain with no recorded cross', async () => {
    const tree = await buildLineage('glh', loaders);
    expect(tree!.strain.name).toBe('Golden Lemon Haze');
    expect(tree!.cross).toBeNull();
    expect(pedigreeString(tree)).toBe('Golden Lemon Haze');
  });

  it('uses fatherDescription when the father is not a tracked strain', async () => {
    const loaders2: LineageLoaders = {
      ...loaders,
      getCrossByResultStrain: async (id) => id === 'x'
        ? { ...cross('c9', 'Mystery', 'F1', 'glh', null, 'x'), fatherDescription: 'bagseed pollen' }
        : null,
    };
    const tree = await buildLineage('x', loaders2);
    expect(tree!.fatherDescription).toBe('bagseed pollen');
    expect(pedigreeString(tree)).toContain('bagseed pollen');
  });
});
