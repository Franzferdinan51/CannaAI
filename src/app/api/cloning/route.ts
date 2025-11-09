import { NextRequest, NextResponse } from 'next/server';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

// Mock cloning data
let cloningData = [
  {
    id: 1,
    strain: 'Blue Dream',
    motherPlant: 'BD-M001',
    cloneDate: '2024-05-01',
    expectedRootDate: '2024-05-14',
    actualRootDate: '2024-05-12',
    status: 'rooted',
    successRate: 95,
    totalClones: 12,
    successfulClones: 11,
    method: 'aerocloner',
    rootingHormone: 'Clonex',
    notes: 'Excellent root development'
  },
  {
    id: 2,
    strain: 'OG Kush',
    motherPlant: 'OG-M002',
    cloneDate: '2024-05-05',
    expectedRootDate: '2024-05-18',
    actualRootDate: null,
    status: 'in_progress',
    successRate: 0,
    totalClones: 8,
    successfulClones: 0,
    method: 'rockwool',
    rootingHormone: 'RootTech',
    notes: 'Currently in humidity dome'
  }
];

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
    const totalClones = cloningData.reduce((sum, batch) => sum + batch.totalClones, 0);
    const successfulClones = cloningData.reduce((sum, batch) => sum + batch.successfulClones, 0);
    const overallSuccessRate = totalClones > 0 ? (successfulClones / totalClones) * 100 : 0;

    return NextResponse.json({
      success: true,
      clones: cloningData.sort((a, b) => new Date(b.cloneDate).getTime() - new Date(a.cloneDate).getTime()),
      statistics: {
        totalClones,
        successfulClones,
        overallSuccessRate,
        activeBatches: cloningData.filter(b => b.status === 'in_progress').length,
        completedBatches: cloningData.filter(b => b.status === 'rooted').length
      }
    });
  } catch (error) {
    console.error('Get cloning data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cloning data' },
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
    const { strain, motherPlant, cloneDate, totalClones, method, rootingHormone } = body;

    if (!strain || !motherPlant || !cloneDate || !totalClones || !method) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const expectedRootDate = new Date(cloneDate);
    expectedRootDate.setDate(expectedRootDate.getDate() + 14);

    const newCloneBatch = {
      id: Date.now(),
      strain,
      motherPlant,
      cloneDate,
      expectedRootDate: expectedRootDate.toISOString().split('T')[0],
      actualRootDate: null,
      status: 'in_progress',
      successRate: 0,
      totalClones,
      successfulClones: 0,
      method,
      rootingHormone: rootingHormone || 'None',
      notes: ''
    };

    cloningData.push(newCloneBatch);

    return NextResponse.json({
      success: true,
      cloneBatch: newCloneBatch,
      message: 'Cloning batch created successfully'
    });

  } catch (error) {
    console.error('Create cloning batch error:', error);
    return NextResponse.json(
      { error: 'Failed to create cloning batch' },
      { status: 500 }
    );
  }
}