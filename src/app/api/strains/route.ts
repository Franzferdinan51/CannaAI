import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

// Default strains data
const defaultStrains = [
  {
    id: 'strain_001',
    name: 'Blue Dream',
    type: 'Hybrid (60% Sativa)',
    lineage: 'Blueberry x Haze',
    description: 'Popular hybrid known for balanced effects and resilience',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'soil' },
      temperature: { veg: [22, 26], flower: [20, 24] },
      humidity: { veg: [60, 70], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Magnesium', 'Calcium'],
    specialNotes: ''
  },
  {
    id: 'strain_002',
    name: 'OG Kush',
    type: 'Hybrid (75% Indica)',
    lineage: 'Chemdawg x Hindu Kush',
    description: 'Classic strain with high resin production',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [5.8, 6.2], medium: 'soil' },
      temperature: { veg: [20, 24], flower: [18, 22] },
      humidity: { veg: [50, 60], flower: [30, 40] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Phosphorus', 'Potassium'],
    specialNotes: ''
  },
  {
    id: 'strain_003',
    name: 'Granddaddy Purple',
    type: 'Indica (100%)',
    lineage: 'Purple Urkle x Big Bud',
    description: 'Famous purple strain known for deep coloration and relaxing effects',
    isPurpleStrain: true,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'soil' },
      temperature: { veg: [20, 24], flower: [18, 22] },
      humidity: { veg: [50, 60], flower: [30, 40] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Calcium', 'Iron'],
    specialNotes: 'Naturally develops purple/pink pigmentation during flowering due to anthocyanins. This is not a nutrient deficiency but a genetic trait. Magnesium deficiency symptoms must be carefully distinguished from natural coloration.'
  }
];

// In-memory storage for strains (in production, use database)
let strains = [...defaultStrains];

export async function GET() {
  // For static export, provide client-side compatibility response
  const isStaticExport = process.env.BUILD_MODE === 'static';
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'This API is handled client-side in static export mode.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  try {
    return NextResponse.json({
      success: true,
      strains,
      count: strains.length
    });
  } catch (error) {
    console.error('Get strains error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch strains' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // For static export, provide client-side compatibility response
  const isStaticExport = process.env.BUILD_MODE === 'static';
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'This API is handled client-side in static export mode.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  try {
    const body = await request.json();
    const { name, type, lineage, description, isPurpleStrain, optimalConditions, commonDeficiencies, specialNotes } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    // Create new strain
    const newStrain = {
      id: `strain_${Date.now()}`,
      name,
      type: type || 'Hybrid',
      lineage: lineage || '',
      description: description || '',
      isPurpleStrain: isPurpleStrain || false,
      optimalConditions: optimalConditions || {
        ph: { range: [6.0, 6.5], medium: 'soil' },
        temperature: { veg: [22, 26], flower: [20, 24] },
        humidity: { veg: [60, 70], flower: [40, 50] },
        light: { veg: '18/6', flower: '12/12' }
      },
      commonDeficiencies: commonDeficiencies || [],
      specialNotes: specialNotes || '',
      createdAt: new Date().toISOString()
    };

    // Add to strains array
    strains.push(newStrain);

    return NextResponse.json({
      success: true,
      strain: newStrain,
      message: 'Strain created successfully'
    });

  } catch (error) {
    console.error('Create strain error:', error);
    return NextResponse.json(
      { error: 'Failed to create strain' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // For static export, provide client-side compatibility response
  const isStaticExport = process.env.BUILD_MODE === 'static';
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'This API is handled client-side in static export mode.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Find and update strain
    const strainIndex = strains.findIndex(strain => strain.id === id);
    if (strainIndex === -1) {
      return NextResponse.json(
        { error: 'Strain not found' },
        { status: 404 }
      );
    }

    strains[strainIndex] = { ...strains[strainIndex], ...updateData };

    return NextResponse.json({
      success: true,
      strain: strains[strainIndex],
      message: 'Strain updated successfully'
    });

  } catch (error) {
    console.error('Update strain error:', error);
    return NextResponse.json(
      { error: 'Failed to update strain' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // For static export, provide client-side compatibility response
  const isStaticExport = process.env.BUILD_MODE === 'static';
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'This API is handled client-side in static export mode.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    // Find and delete strain
    const strainIndex = strains.findIndex(strain => strain.id === id);
    if (strainIndex === -1) {
      return NextResponse.json(
        { error: 'Strain not found' },
        { status: 404 }
      );
    }

    const deletedStrain = strains.splice(strainIndex, 1)[0];

    return NextResponse.json({
      success: true,
      strain: deletedStrain,
      message: 'Strain deleted successfully'
    });

  } catch (error) {
    console.error('Delete strain error:', error);
    return NextResponse.json(
      { error: 'Failed to delete strain' },
      { status: 500 }
    );
  }
}