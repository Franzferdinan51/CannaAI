import { NextRequest, NextResponse } from 'next/server';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

// Mock harvest data
let harvestData = [
  { 
    id: 1, 
    strain: 'Blue Dream', 
    harvestDate: '2024-04-15', 
    wetWeight: 500, 
    dryWeight: 125, 
    quality: 'A', 
    thc: 22, 
    cbd: 0.5,
    floweringTime: 63,
    yieldPerPlant: 31.25,
    notes: 'Great terpene profile, dense buds'
  },
  { 
    id: 2, 
    strain: 'OG Kush', 
    harvestDate: '2024-03-20', 
    wetWeight: 450, 
    dryWeight: 110, 
    quality: 'A+', 
    thc: 25, 
    cbd: 0.3,
    floweringTime: 56,
    yieldPerPlant: 27.5,
    notes: 'Potent, excellent resin production'
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
    const totalHarvested = harvestData.reduce((sum, harvest) => sum + harvest.dryWeight, 0);
    const averageYield = harvestData.length > 0 ? totalHarvested / harvestData.length : 0;
    const averageTHC = harvestData.length > 0 ? harvestData.reduce((sum, h) => sum + h.thc, 0) / harvestData.length : 0;

    return NextResponse.json({
      success: true,
      harvests: harvestData.sort((a, b) => new Date(b.harvestDate).getTime() - new Date(a.harvestDate).getTime()),
      statistics: {
        totalHarvested,
        averageYield,
        averageTHC,
        totalHarvests: harvestData.length
      }
    });
  } catch (error) {
    console.error('Get harvest data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch harvest data' },
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
    const { strain, harvestDate, wetWeight, dryWeight, quality, thc, cbd } = body;

    if (!strain || !harvestDate || !wetWeight || !dryWeight) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const newHarvest = {
      id: Date.now(),
      strain,
      harvestDate,
      wetWeight,
      dryWeight,
      quality: quality || 'B',
      thc: thc || 0,
      cbd: cbd || 0,
      floweringTime: 60,
      yieldPerPlant: dryWeight / 4,
      notes: ''
    };

    harvestData.push(newHarvest);

    return NextResponse.json({
      success: true,
      harvest: newHarvest,
      message: 'Harvest recorded successfully'
    });

  } catch (error) {
    console.error('Add harvest error:', error);
    return NextResponse.json(
      { error: 'Failed to record harvest' },
      { status: 500 }
    );
  }
}