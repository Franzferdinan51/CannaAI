import { normalizePlantAnalysisResult } from '@/lib/plant-analysis-report-v2';
import { getExplainabilityFailures } from '../utils/explainability-contract';

describe('analysis explainability contract', () => {
  test('fills explainability fields for a realistic structured JSON nutrient payload', () => {
    const rawPayload = `\`\`\`json
{
  "diagnosis": "Nitrogen Deficiency",
  "confidence": 91,
  "severity": "moderate",
  "healthScore": 64,
  "urgency": "high",
  "symptomsMatched": [
    "Lower fan leaves yellowing from the petiole outward",
    "Overall pale canopy tone"
  ],
  "causes": [
    "Insufficient nitrogen in feed schedule",
    "Late-veg demand outpacing available nitrogen"
  ],
  "treatment": [
    "Increase vegetative nitrogen feed to 180 ppm over the next two irrigations",
    "Check runoff EC before the next feeding"
  ],
  "imageAnalysis": {
    "hasImage": false,
    "visualFindings": [
      "Text-only assessment requested by the grower"
    ]
  }
}
\`\`\``;

    const normalized = normalizePlantAnalysisResult(rawPayload, {
      provider: 'openrouter',
      imageAnalysis: false,
      processingTime: 1840,
      inputParameters: {
        strain: 'Blue Dream',
        leafSymptoms: 'Bottom leaves are yellowing and slowing growth',
        growthStage: 'vegetative',
        phLevel: 6.1
      }
    });

    expect(getExplainabilityFailures(normalized)).toEqual([]);
    expect(normalized.reportVersion).toBe('report-v2');
    expect(normalized.rawResponseText).toContain('"diagnosis": "Nitrogen Deficiency"');
    expect(normalized.urgencyReasons.length).toBeGreaterThan(0);
    expect(normalized.prioritizedActionPlan.immediate.length).toBeGreaterThan(0);
  });

  test('derives explainability fields for a sparse realistic image-backed mildew payload object', () => {
    const normalized = normalizePlantAnalysisResult(
      {
        diagnosis: 'Powdery Mildew',
        confidence: 93,
        severity: 'high',
        urgency: 'high',
        symptomsMatched: [
          'White powdery residue on upper fan leaves',
          'Localized leaf distortion near infected patches'
        ],
        diseasesDetected: [
          {
            name: 'Powdery Mildew',
            severity: 'high',
            confidence: 93,
            symptoms: ['White powdery coating', 'Leaf surface spread']
          }
        ],
        imageAnalysis: {
          hasImage: true,
          visualFindings: [
            'White powder-like colonies on leaf surfaces',
            'Spread concentrated in dense interior canopy'
          ]
        },
        recommendations: {
          immediate: ['Isolate the affected plant and remove heavily infected leaves'],
          shortTerm: [],
          longTerm: []
        }
      },
      {
        provider: 'openclaw',
        imageAnalysis: true,
        processingTime: 2680,
        inputParameters: {
          strain: 'Wedding Cake',
          leafSymptoms: 'White patches spreading across fan leaves',
          humidity: 68,
          growthStage: 'flowering'
        }
      }
    );

    expect(getExplainabilityFailures(normalized)).toEqual([]);
    expect(normalized.imageAnalysis.hasImage).toBe(true);
    expect(normalized.detectedIssues[0].name).toBe('Powdery Mildew');
    expect(normalized.environmentRiskAssessment.contributingFactors.length).toBeGreaterThan(0);
    expect(normalized.recommendations.shortTerm.length).toBeGreaterThan(0);
    expect(normalized.recommendations.longTerm.length).toBeGreaterThan(0);
  });

  test('preserves fallback text and still emits explainability fields for unstructured provider output', () => {
    const rawPayload = [
      'Observed lower-canopy chlorosis with interveinal fading and mild edge curl.',
      'Most likely issue is magnesium deficiency with possible pH-mediated lockout.',
      'Recommend cal-mag supplementation and confirming root-zone pH before the next irrigation.'
    ].join(' ');

    const normalized = normalizePlantAnalysisResult(rawPayload, {
      provider: 'lm-studio',
      imageAnalysis: false,
      processingTime: 3120,
      inputParameters: {
        strain: 'Sour Diesel',
        leafSymptoms: 'Interveinal chlorosis on older leaves with edge curl',
        temperature: 79
      }
    });

    expect(getExplainabilityFailures(normalized)).toEqual([]);
    expect(normalized.rawFallbackText).toContain('Most likely issue is magnesium deficiency');
    expect(normalized.likelyCauses[0].cause).toContain('unstructured response');
    expect(normalized.detectedIssues[0].type).toBe('analysis_response');
    expect(normalized.uncertainties.length).toBeGreaterThan(0);
  });
});
