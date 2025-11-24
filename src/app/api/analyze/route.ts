// Backup of the original route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processImageForVisionModel, base64ToBuffer, ImageProcessingError } from '@/lib/image';
import { executeAIWithFallback, detectAvailableProviders, getProviderConfig } from '@/lib/ai-provider-detection';
import sharp from 'sharp';

// Environment detection
const isStaticExport = process.env.BUILD_MODE === 'static';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;
export const runtime = 'nodejs';

// File size formatting helper
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function GET(request: NextRequest) {
  // For static export, provide client-side compatibility response
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'AI analysis is handled client-side in static export mode. Please configure your AI provider using the AI Config button.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  // Full server-side functionality for local development
  try {
    return NextResponse.json({
      success: true,
      message: 'Plant analysis service is running (server mode)',
      buildMode: 'server',
      supportedFeatures: {
        aiAnalysis: true,
        purpleDetection: true,
        imageProcessing: true,
        fallbackAnalysis: true,
        multiProviderSupport: true,
        realTimeProcessing: true
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize analysis service',
        buildMode: 'server',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // For static export, provide client-side compatibility response
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'AI analysis is handled client-side in static export mode. Please configure your AI provider using the AI Config button.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  try {
    console.log('🚀 POST /api/analyze - Starting analysis request');

    // Parse request body directly - no complex validation middleware
    const body = await request.json();
    console.log('✅ Request body parsed successfully');

    const {
      strain,
      leafSymptoms,
      phLevel,
      temperature,
      humidity,
      medium,
      growthStage,
      temperatureUnit,
      plantImage,
      pestDiseaseFocus,
      urgency,
      additionalNotes
    } = body;

    // Temperature conversion logic
    let temperatureCelsius: number | undefined;
    if (temperature !== undefined) {
      const tempNum = typeof temperature === 'string' ? parseFloat(temperature) : temperature;
      if (!isNaN(tempNum)) {
        if (temperatureUnit === 'F') {
          temperatureCelsius = parseFloat(((tempNum - 32) * 5/9).toFixed(1));
        } else {
          temperatureCelsius = tempNum;
        }
      }
    }

    // Process plant image if provided
    let processedImageInfo = null;
    let imageBase64ForAI = null;

    if (plantImage) {
      try {
        const { buffer } = base64ToBuffer(plantImage.startsWith('data:') ? plantImage : `data:image/jpeg;base64,${plantImage}`);

        // Check initial image size and validate
        const originalSize = buffer.length;
        if (originalSize > 500 * 1024 * 1024) { // 500MB limit
          throw new Error('Image too large. Please use an image under 500MB.');
        }

        // Get image metadata for adaptive processing
        const metadata = await sharp(buffer).metadata();
        const originalMegapixels = (metadata.width || 0) * (metadata.height || 0) / 1000000;

        // Adaptive compression based on image size and quality requirements
        let processingOptions: any = {
          format: 'JPEG',
          withoutEnlargement: true,
          fastShrinkOnLoad: false
        };

        // Smart processing based on original image characteristics
        if (originalMegapixels > 20) {
          // Ultra-high resolution images (8K+) - Maintain 90% quality
          processingOptions = {
            ...processingOptions,
            width: 1600,
            height: 1600,
            quality: 90
          };
        } else if (originalMegapixels > 8) {
          // High resolution images (4K-8K) - Maintain 90% quality
          processingOptions = {
            ...processingOptions,
            width: 1200,
            height: 1200,
            quality: 90
          };
        } else if (originalMegapixels > 2) {
          // Medium resolution images - Maintain 90% quality
          processingOptions = {
            ...processingOptions,
            width: 1000,
            height: 1000,
            quality: 90
          };
        } else {
          // Standard resolution images - Maintain 90% quality
          processingOptions = {
            ...processingOptions,
            width: 800,
            height: 800,
            quality: 90
          };
        }

        // Process image with adaptive settings
        const processedImage = await processImageForVisionModel(buffer, processingOptions);

        // Calculate compression efficiency
        const compressionEfficiency = ((originalSize - processedImage.compressedSize) / originalSize) * 100;

        console.log(`🖼️ Ultra-high resolution image processed:`);
        console.log('   Original: ' + formatFileSize(originalSize) + ' (' + metadata.width + 'x' + metadata.height + ', ' + originalMegapixels.toFixed(1) + 'MP)');
        console.log('   Processed: ' + formatFileSize(processedImage.compressedSize) + ' (' + processedImage.metadata.width + 'x' + processedImage.metadata.height + ')');
        console.log(`   Compression: ${compressionEfficiency.toFixed(1)}% reduction, Quality preserved: ${processingOptions.quality}%`);

        processedImageInfo = {
          originalSize: processedImage.originalSize,
          compressedSize: processedImage.compressedSize,
          dimensions: `${processedImage.metadata.width}x${processedImage.metadata.height}`,
          format: processedImage.metadata.format,
          originalDimensions: `${metadata.width}x${metadata.height}`,
          megapixels: originalMegapixels.toFixed(1),
          qualityLevel: processingOptions.quality,
          compressionEfficiency: compressionEfficiency.toFixed(1),
          isHighResolution: originalMegapixels > 8,
          isUltraHighResolution: originalMegapixels > 20
        };

        imageBase64ForAI = processedImage.base64;
      } catch (imageError) {
        console.warn('Image processing failed, continuing with text analysis:', imageError);
        // Continue without image - don't fail the entire analysis
      }
    }

    // Create a comprehensive diagnostic prompt for plant analysis
    const prompt = `🌿 **EXPERT CANNABIS/HEMP PLANT DIAGNOSTIC SYSTEM** 🌿

📊 **COMPLETE ANALYSIS PARAMETERS**:
🔬 Strain: ${strain}
⚠️ Symptoms: ${leafSymptoms}
🧪 pH Level: ${phLevel || 'Not measured'}
🌡️ Temperature: ${temperatureCelsius || 'Not measured'}°C (${temperature || 'Not measured'}°F)
💧 Humidity: ${humidity || 'Not measured'}%
🪴 Growing Medium: ${medium || 'Not specified'}
🌱 Growth Stage: ${growthStage || 'Not specified'}
🎯 Diagnostic Focus: ${pestDiseaseFocus}
⚡ Urgency: ${urgency}
📝 Additional Notes: ${additionalNotes || 'None'}
${imageBase64ForAI ? '📸 HIGH-RESOLUTION IMAGE ANALYSIS: Visual examination of plant provided' : '📸 TEXT-BASED ANALYSIS ONLY'}

🎯 **CRITICAL REQUIREMENTS FOR HIGH-QUALITY ANALYSIS**:

1. **NEVER provide generic responses like "monitor closely"**
2. **ALWAYS provide specific, actionable advice**
3. **INCLUDE exact dosages and application methods**
4. **PROVIDE step-by-step treatment protocols**
5. **GIVE confidence scores and reasoning**

🔍 **ENHANCED DIAGNOSTIC MATRIX**:

**A. COMPREHENSIVE NUTRIENT ANALYSIS**:
   - **Boron (B)**: STUNTED TWISTED new growth, necrotic spots between veins, thick brittle leaves
   - **Calcium (Ca)**: CONTORTED leaves with yellowish-brown spots, slowed flower development
   - **Nitrogen (N)**: Bottom-up yellowing (mobile), growth stage-specific needs
   - **Phosphorus (P)**: Purple petioles, bluish-green leaves, copper/dark purple blotches
   - **Potassium (K)**: Rusty-brown dehydrated margins on YOUNG leaves, weak stems
   - **Magnesium (Mg)**: Interveinal chlorosis on OLDER leaves, rust-brown margin spots
   - **Iron (Fe)**: Interveinal chlorosis on NEW growth, common in high pH soils
   - **Manganese (Mn)**: Interveinal chlorosis with DARK GREEN margins on young leaves

**B. ADVANCED PEST DETECTION**:
   - **Spider Mites**: Yellow/white specks, fine webbing, silver/bronze stippling
   - **Aphids**: Sticky honeydew, clustered insects, black sooty mold
   - **Thrips**: Silver patches with black dots (frass), fast-moving insects
   - **Whiteflies**: Small white flying insects, leaf yellowing

**C. CRITICAL DISEASE MANAGEMENT**:
   - **Powdery Mildew**: White flour-like coating
   - **Botrytis (Bud Rot/Gray Mold)**: CRITICAL during flowering
   - **Root Rot**: Wilting despite wet soil

**D. ENVIRONMENTAL STRESS DIAGNOSIS**:
   - **Heat Stress**: >85°F, leaf curling upward ("taco-ing")
   - **Light Burn**: Bleached upper leaves, crispy tips
   - **pH Nutrient Lockout**: Multiple deficiencies simultaneously

CRITICAL PURPLE DETECTION RULES:
1. **SICKNESS-RELATED PURPLING** (deficiency):
   - Purple in LEAVES (not just stems)
   - PATCHY or SPOTTY patterns
   - Accompanied by YELLOWING, CURLING, or WILTING
2. **GENETIC PURPLE STRAINS** (healthy):
   - Purple on STEMS, leaf undersides
   - UNIFORM, CONSISTENT coloration
   - NO other symptoms present

${imageBase64ForAI ? `
VISION ANALYSIS INSTRUCTIONS:
Analyze the provided plant image for:
- **POWDERY MILDEW**: White flour-like coating
- **PESTS**: Visible insects, webbing, insect damage patterns
- **NUTRIENT DEFICIENCIES**: Yellowing patterns, purple discoloration
- **ENVIRONMENTAL STRESS**: Leaf curling, wilting, burning` : ''}

Format your response as JSON with this structure:
{
  "diagnosis": "Primary diagnosis",
  "confidence": number (0-100),
  "symptomsMatched": ["List of observed symptoms"],
  "causes": ["Root causes"],
  "treatment": ["Immediate actions and solutions"],
  "healthScore": number (0-100),
  "strainSpecificAdvice": "Tailored advice",
  "reasoning": [{
    "step": "Analysis step",
    "explanation": "Detailed explanation",
    "weight": number
  }],
  "isPurpleStrain": boolean,
  "pestsDetected": ["List of pests"],
  "diseasesDetected": ["List of diseases"],
  "environmentalFactors": ["Environmental stressors"],
  "urgency": "URGENCY_LEVEL",
  "preventativeMeasures": ["Prevention strategies"],
  "imageAnalysis": {
    "hasImage": boolean,
    "visualFindings": ["Key observations"],
    "confidence": number
  },
  "recommendations": {
    "immediate": ["Immediate actions"],
    "shortTerm": ["Actions within 1-2 weeks"],
    "longTerm": ["Ongoing maintenance"]
  },
  "followUpSchedule": "Recommended monitoring schedule"
}`;

    console.log('🤖 Starting simplified analysis...');

    let analysisResult;
    let fallbackUsed = false;
    let fallbackReason = '';
    let usedProvider = 'unknown';
    let providerDetection;

    try {
      console.log('🔍 Detecting AI providers...');
      // Use the simplified AI provider detection
      providerDetection = await detectAvailableProviders();
      console.log(`📡 AI provider: ${providerDetection.primary.provider} (${providerDetection.primary.reason})`);

      // Execute AI analysis with fallback
      const aiResult = await executeAIWithFallback(prompt, imageBase64ForAI, {
        primaryProvider: providerDetection.primary.provider === 'fallback' ? undefined : providerDetection.primary.provider,
        timeout: 60000,
        maxRetries: 1
      });

      analysisResult = aiResult.result;
      usedProvider = aiResult.provider;
      fallbackUsed = aiResult.provider === 'fallback';
      fallbackReason = aiResult.fallbackReason || '';
      console.log(`✅ Analysis completed using ${aiResult.provider} in ${aiResult.processingTime}ms`);

    } catch (error) {
      console.error('❌ AI analysis failed, using rule-based fallback:', error instanceof Error ? error.message : 'Unknown error');

      // Final fallback to rule-based analysis
      analysisResult = generateFallbackAnalysis(strain, leafSymptoms, phLevel, temperature, humidity, medium, growthStage);
      fallbackUsed = true;
      fallbackReason = 'All AI providers failed - using expert rule-based analysis';
      usedProvider = 'fallback';
    }

    // Return the simplified analysis result
    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      imageInfo: processedImageInfo,
      diagnosticCapabilities: {
        imageAnalysis: !!imageBase64ForAI,
        pestDetection: true,
        diseaseIdentification: true,
        nutrientAnalysis: true,
        environmentalStressDetection: true
      },
      fallbackUsed,
      fallbackReason,
      provider: {
        used: usedProvider,
        primary: providerDetection?.primary?.provider || 'unknown',
        available: providerDetection ? [
          providerDetection.primary.isAvailable ? providerDetection.primary.provider : null,
          ...providerDetection.fallback.filter(f => f.isAvailable).map(f => f.provider)
        ].filter(Boolean) : [],
        recommendations: providerDetection?.recommendations || []
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analysis error:', error);

    // Determine appropriate error response
    let statusCode = 500;
    let errorMessage = 'Failed to analyze plant data';

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        statusCode = 504;
        errorMessage = 'Analysis service timed out';
      } else if (error.message.includes('Open Router')) {
        statusCode = 503;
        errorMessage = 'AI analysis services are currently unavailable';
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}

// Fallback analysis function (simplified version)
function generateFallbackAnalysis(
  strain: string,
  leafSymptoms: string,
  phLevel?: string,
  temperature?: number | string,
  humidity?: number | string,
  medium?: string,
  growthStage?: string
): any {
  const symptoms = leafSymptoms.toLowerCase();
  const strainName = strain.toLowerCase();

  let diagnosis = 'General Plant Assessment';
  let confidence = 75;
  let healthScore = 75;
  let causes: string[] = [];
  let treatment: string[] = [];
  let symptomsMatched: string[] = [];
  let isPurpleStrain = strainName.includes('purple');
  let urgencyLevel = 'medium';

  // Enhanced symptom detection
  if (symptoms.includes('yellow') || symptoms.includes('yellowing')) {
    if (symptoms.includes('bottom') || symptoms.includes('lower')) {
      diagnosis = 'Nitrogen Deficiency';
      confidence = 85;
      healthScore = 65;
      causes = ['Nitrogen deficiency - mobile nutrient relocating to new growth'];
      treatment = ['Apply nitrogen-rich nutrients during vegetative growth', 'Check pH levels (6.0-7.0)'];
      symptomsMatched = ['Yellowing of older leaves starting at tips'];
    }
  } else if (symptoms.includes('purple')) {
    if (symptoms.includes('leaf') || (symptoms.includes('yellow') && symptoms.includes('curl'))) {
      diagnosis = 'Phosphorus Deficiency';
      confidence = 90;
      healthScore = 45;
      causes = ['Severe phosphorus deficiency', 'Possible cold stress'];
      treatment = ['Immediately add phosphorus-rich nutrients', 'Check and adjust pH to 6.0-7.0'];
      symptomsMatched = ['Purple discoloration with additional sickness symptoms'];
      urgencyLevel = 'high';
    } else if (!isPurpleStrain) {
      diagnosis = 'Phosphorus Deficiency';
      confidence = 85;
      healthScore = 55;
      causes = ['Phosphorus deficiency', 'Temperature stress'];
      treatment = ['Add phosphorus-rich nutrients', 'Maintain optimal temperature (68-78°F)'];
      symptomsMatched = ['Purple stems/leaves on non-purple strain'];
    } else {
      diagnosis = 'Genetic Purple Strain Characteristics';
      confidence = 80;
      healthScore = 85;
      causes = ['Natural anthocyanin expression', 'Genetic purple coloration'];
      treatment = ['Monitor for additional symptoms', 'No action needed if plant appears healthy'];
      symptomsMatched = ['Normal purple coloration in genetic purple strain'];
      urgencyLevel = 'low';
    }
  } else if (symptoms.includes('powdery') || symptoms.includes('mildew') || symptoms.includes('white powder')) {
    diagnosis = 'Powdery Mildew';
    confidence = 90;
    healthScore = 40;
    causes = ['Fungal infection', 'High humidity (>60%)', 'Poor air circulation'];
    treatment = [
      'Remove affected leaves immediately',
      'Apply potassium bicarbonate spray',
      'Reduce humidity below 50% and improve air circulation'
    ];
    symptomsMatched = ['White flour-like coating on leaf surfaces'];
    urgencyLevel = 'high';
  } else if (symptoms.includes('spider mite') || symptoms.includes('webbing')) {
    diagnosis = 'Spider Mite Infestation';
    confidence = 90;
    healthScore = 50;
    causes = ['Two-spotted spider mite infestation', 'Hot dry conditions'];
    treatment = [
      'Isolate affected plants immediately',
      'Spray with neem oil every 3 days',
      'Use predatory mites for biological control'
    ];
    symptomsMatched = ['Tiny yellow/white specks on leaves', 'Fine webbing'];
    urgencyLevel = 'high';
  }

  // Environmental factor analysis
  if (phLevel) {
    const ph = parseFloat(phLevel);
    if (ph < 5.8 || ph > 7.0) {
      causes.push('pH imbalance causing nutrient lockout');
      treatment.push('Adjust pH to 6.0-7.0 for optimal nutrient uptake');
      healthScore -= 10;
    }
  }

  if (temperature) {
    const temp = typeof temperature === 'string' ? parseFloat(temperature) : temperature;
    if (temp > 85) {
      causes.push('Heat stress');
      treatment.push('Reduce temperature to 68-78°F');
      healthScore -= 15;
    } else if (temp < 65) {
      causes.push('Cold stress');
      treatment.push('Increase temperature to 68-78°F');
      healthScore -= 10;
    }
  }

  // Ensure we have minimum required fields
  if (causes.length === 0) causes = ['General environmental factors'];
  if (treatment.length === 0) treatment = ['Monitor plant health closely'];
  if (symptomsMatched.length === 0) symptomsMatched = ['General symptoms observed'];

  return {
    diagnosis,
    confidence,
    symptomsMatched,
    causes,
    treatment,
    healthScore: Math.max(20, Math.min(100, healthScore)),
    strainSpecificAdvice: isPurpleStrain
      ? 'Purple strain: Monitor for actual deficiencies vs natural coloration.'
      : `${strain}: Monitor closely and provide optimal growing conditions.`,
    reasoning: [{
      step: 'Rule-Based Analysis',
      explanation: 'Analysis based on established cannabis cultivation patterns and symptom recognition',
      weight: 100
    }],
    isPurpleStrain,
    pestsDetected: symptoms.includes('spider mite') ? ['Spider Mites'] : [],
    diseasesDetected: symptoms.includes('powdery') ? ['Powdery Mildew'] : [],
    environmentalFactors: causes.filter(c => c.includes('stress') || c.includes('temperature') || c.includes('humidity')),
    urgency: urgencyLevel,
    preventativeMeasures: [
      'Regular monitoring for early detection',
      'Maintain optimal environmental conditions',
      'Ensure proper air circulation'
    ],
    imageAnalysis: {
      hasImage: false,
      visualFindings: ['Text-based analysis only - no image provided'],
      confidence: confidence
    },
    recommendations: {
      immediate: treatment.slice(0, 2),
      shortTerm: treatment.slice(2),
      longTerm: ['Continue regular monitoring', 'Maintain optimal growing conditions']
    },
    followUpSchedule: urgencyLevel === 'high' ? 'Monitor daily' : 'Monitor every 2-3 days'
  };
}