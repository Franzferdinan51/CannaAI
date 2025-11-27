import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/analyze-simple - Starting simple analysis');

  try {
    const body = await request.json();
    console.log('✅ Request body parsed:', body);

    const { strain, leafSymptoms } = body;

    // Simple rule-based analysis without external dependencies
    const analysis = {
      diagnosis: 'Test Analysis Complete',
      confidence: 85,
      symptomsMatched: [leafSymptoms || 'No symptoms provided'],
      causes: ['Test analysis - rule based'],
      treatment: ['Monitor plant health', 'Check environmental conditions'],
      healthScore: 80,
      strainSpecificAdvice: `${strain || 'Unknown'}: Continue monitoring`,
      reasoning: [{
        step: 'Simple Rule-Based Analysis',
        explanation: 'Basic symptom pattern matching',
        weight: 100
      }],
      isPurpleStrain: (strain || '').toLowerCase().includes('purple'),
      pestsDetected: [],
      diseasesDetected: [],
      environmentalFactors: [],
      urgency: 'medium',
      imageAnalysis: {
        hasImage: false,
        visualFindings: ['Text-based analysis only'],
        confidence: 75
      },
      recommendations: {
        immediate: ['Monitor plant health'],
        shortTerm: ['Check growing conditions'],
        longTerm: ['Maintain optimal environment']
      },
      followUpSchedule: 'Monitor every 2-3 days'
    };

    return NextResponse.json({
      success: true,
      analysis: analysis,
      provider: {
        used: 'simple-rule-based',
        available: ['simple-rule-based'],
        recommendations: ['Configure AI providers for better analysis']
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in simple analysis:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}