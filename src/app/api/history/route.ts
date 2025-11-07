import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for analysis history (in production, use database)
let analysisHistory: any[] = [];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      history: analysisHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      count: analysisHistory.length
    });
  } catch (error) {
    console.error('Get history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis history' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { strain, diagnosis, confidence, healthScore, notes, isPurpleStrain, analysisData } = body;

    // Validate required fields
    if (!strain || !diagnosis) {
      return NextResponse.json(
        { error: 'Missing required fields: strain and diagnosis' },
        { status: 400 }
      );
    }

    // Create new history entry
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      strain,
      diagnosis,
      confidence: confidence || 85,
      healthScore: healthScore || 75,
      notes: notes || '',
      isPurpleStrain: isPurpleStrain || false,
      analysisData: analysisData || null,
      createdAt: new Date().toISOString()
    };

    // Add to history
    analysisHistory.unshift(newEntry);

    return NextResponse.json({
      success: true,
      entry: newEntry,
      message: 'Analysis saved to history successfully'
    });

  } catch (error) {
    console.error('Save history error:', error);
    return NextResponse.json(
      { error: 'Failed to save analysis to history' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    // Find and delete entry
    const entryIndex = analysisHistory.findIndex(entry => entry.id === id);
    if (entryIndex === -1) {
      return NextResponse.json(
        { error: 'History entry not found' },
        { status: 404 }
      );
    }

    const deletedEntry = analysisHistory.splice(entryIndex, 1)[0];

    return NextResponse.json({
      success: true,
      entry: deletedEntry,
      message: 'History entry deleted successfully'
    });

  } catch (error) {
    console.error('Delete history error:', error);
    return NextResponse.json(
      { error: 'Failed to delete history entry' },
      { status: 500 }
    );
  }
}