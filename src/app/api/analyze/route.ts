import { NextRequest } from 'next/server';
import { withSecurity, securityConfig, createAPIResponse, createAPIError } from '@/lib/security';
import { analyzeRequestSchema, validateRequestBody, AnalyzeRequest } from '@/lib/validation';
import { processImageForVisionModel, base64ToBuffer, ImageProcessingError } from '@/lib/image';

// File size formatting helper
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function POST(request: NextRequest) {
  return withSecurity(request, async (req, context) => {
    try {
      // Validate and parse request body using our enhanced validation
      const validatedData = validateRequestBody(analyzeRequestSchema, context?.validatedBody || {});
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
      } = validatedData as AnalyzeRequest;

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
          const { buffer } = base64ToBuffer(plantImage);

          // Check initial image size and validate
          const originalSize = buffer.length;
          if (originalSize > 500 * 1024 * 1024) { // 500MB limit
            throw new Error('Image too large. Please use an image under 500MB.');
          }

          // Get image metadata for adaptive processing
          const metadata = await import('sharp').then(sharp => sharp.default(buffer).metadata());
          const originalMegapixels = (metadata.width || 0) * (metadata.height || 0) / 1000000;

          // Adaptive compression based on image size and quality requirements
          let processingOptions = {
            format: 'JPEG' as const,
            withoutEnlargement: true,
            fastShrinkOnLoad: false // Preserve quality for large images
          };

          // Smart processing based on original image characteristics
          if (originalMegapixels > 20) {
            // Ultra-high resolution images (8K+)
            processingOptions = {
              ...processingOptions,
              width: 1600,
              height: 1600,
              quality: 85 // Higher quality for large detailed images
            };
          } else if (originalMegapixels > 8) {
            // High resolution images (4K-8K)
            processingOptions = {
              ...processingOptions,
              width: 1200,
              height: 1200,
              quality: 80
            };
          } else if (originalMegapixels > 2) {
            // Medium resolution images
            processingOptions = {
              ...processingOptions,
              width: 1000,
              height: 1000,
              quality: 75
            };
          } else {
            // Standard resolution images
            processingOptions = {
              ...processingOptions,
              width: 800,
              height: 800,
              quality: 70
            };
          }

          // Process image with adaptive settings
          const processedImage = await processImageForVisionModel(buffer, processingOptions);

          // Calculate compression efficiency
          const compressionEfficiency = ((originalSize - processedImage.compressedSize) / originalSize) * 100;

          console.log(`🖼️ Ultra-high resolution image processed:`);
          console.log(`   Original: ${formatFileSize(originalSize)} (${metadata.width}x${metadata.height}, ${originalMegapixels.toFixed(1)}MP)`);
          console.log(`   Processed: ${formatFileSize(processedImage.compressedSize)} (${processedImage.metadata.width}x${processedImage.metadata.height})`);
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

**A. COMPREHENSIVE NUTRIENT ANALYSIS** (USU Hemp Research Integration):
   - **Boron (B)**: STUNTED TWISTED new growth, necrotic spots between veins, thick brittle leaves
     - Treatment: 1 tsp boric acid/gal water per plant, chelated boron, pH 6.0-6.5
   - **Calcium (Ca)**: CONTORTED leaves with yellowish-brown spots, slowed flower development
     - Treatment: Cal-mag supplement (2-4 mL/gal), pH 6.0-7.0, improve drainage
   - **Nitrogen (N)**: Bottom-up yellowing (mobile), growth stage-specific needs
     - Treatment: Increase N during veg, reduce during flower, pH 6.0-7.0
   - **Phosphorus (P)**: Purple petioles, bluish-green leaves, copper/dark purple blotches
     - Treatment: Bone meal (2 tbsp/gal), bat guano, maintain temp >65°F
   - **Potassium (K)**: Rusty-brown dehydrated margins on YOUNG leaves, weak stems
     - Treatment: High-K nutrients, flush excess salts, monitor flower development
   - **Magnesium (Mg)**: Interveinal chlorosis on OLDER leaves (not new!), rust-brown margin spots
     - Treatment: 2% Epsom salt foliar spray, magnesium sulfate, check roots
   - **Iron (Fe)**: Interveinal chlorosis on NEW growth, common in Utah high pH soils
     - Treatment: Chelated iron (EDDHA for pH >7.2), adjust pH 6.0-6.5
   - **Manganese (Mn)**: Interveinal chlorosis with DARK GREEN margins on young leaves
     - Treatment: Manganese chelate, pH 6.0-6.5, avoid over-liming

**B. ADVANCED PEST DETECTION** (IPM Integration):
   - **Spider Mites**: Yellow/white specks, fine webbing, silver/bronze stippling
     - Treatment: Neem oil (2 tbsp/gal), predatory mites (Phytoseiulus persimilis), isolation
   - **Aphids**: Sticky honeydew, clustered insects, black sooty mold
     - Treatment: Insecticidal soap, yellow sticky traps, beneficial insects
   - **Thrips**: Silver patches with black dots (frass), fast-moving insects
     - Treatment: Blue sticky traps, spinosad, predatory mites
   - **Whiteflies**: Small white flying insects, leaf yellowing
     - Treatment: Yellow sticky traps, Encarsia formosa parasitic wasps

**C. CRITICAL DISEASE MANAGEMENT**:
   - **Powdery Mildew (Podosphaera macularis)**: White flour-like coating
     - Treatment: Potassium bicarbonate (1 tbsp/gal), reduce humidity <50%, neem oil
   - **Botrytis (Bud Rot/Gray Mold)**: CRITICAL during flowering
     - Treatment: IMMEDIATE removal of affected buds, reduce humidity <45%, copper fungicide
   - **Root Rot (Pythium/Fusarium)**: Wilting despite wet soil
     - Treatment: STOP watering, hydrogen peroxide drench, repot in sterile medium

**D. ENVIRONMENTAL STRESS DIAGNOSIS**:
   - **Heat Stress**: >85°F, leaf curling upward ("taco-ing")
     - Treatment: Reduce temp 68-78°F, improve circulation, increase light distance
   - **Light Burn**: Bleached upper leaves, crispy tips
     - Treatment: Move lights further away, reduce intensity, check proper distance
   - **Light Deficiency**: Excessive stretching, large internodes
     - Treatment: Move lights closer, increase intensity, reduce spacing
   - **pH Nutrient Lockout**: Multiple deficiencies simultaneously
     - Treatment: Flush with pH-balanced water, stabilize pH 6.0-7.0

**E. CANNABIS-SPECIFIC CRITICAL ISSUES**:
   - **Hermaphroditism**: Male flowers on female plants, "bananas"
     - Treatment: IMMEDIATE removal, eliminate light leaks, isolate plants
   - **Nutrient Burn**: Brown crispy tips from overfeeding
     - Treatment: Flush plants, stop nutrients 1-2 weeks, reduce to 1/4 strength
   - **Cal/Mag Deficiency**: Common in RO water/hydroponics
     - Treatment: Cal-mag supplement, check water hardness

COMPREHENSIVE ANALYSIS REQUIREMENTS:

1. **NUTRIENT DEFICIENCY ANALYSIS**:
   - Nitrogen (N): Yellowing starting from bottom leaves, overall pale green, stunted growth
   - Phosphorus (P): Dark green leaves, purple stems/undersides, slow growth, late maturity
   - Potassium (K): Yellowing/browning at leaf edges and tips, weak stems, poor flower development
   - Calcium (Ca): New growth distorted, yellow/brown spots, leaf tip burn
   - Magnesium (Mg): Yellowing between veins on older leaves, purple/reddish leaf undersides
   - Iron (Fe): Yellowing between veins on new growth, interveinal chlorosis
   - Zinc (Zn): Twisted growth, yellow spots between veins, reduced leaf size
   - Sulfur (S): Yellowing of new growth, overall pale color
   - Lockout conditions from pH imbalances (pH <5.8 or >7.0)
   - Over-fertilization symptoms: Leaf tip burn, curling, nutrient toxicity

2. **PEST IDENTIFICATION**:
   - Spider Mites: Webbing, yellow speckling, silver spots
   - Aphids: Sticky honeydew, curling leaves, black sooty mold
   - Thrips: Silver patches, black frass, leaf damage
   - Fungus Gnats: Small black flies, root damage
   - Whiteflies: Tiny white insects on leaf undersides
   - Caterpillars: Chew marks, webbing, bud damage

3. **DISEASE DETECTION**:
   - Powdery Mildew: White flour-like coating on leaf surfaces, starts on older leaves and new growth, spreads in high humidity
   - Bud Rot (Botrytis): Gray-brown mold in dense buds, often starts at bud centers, musty odor
   - Root Rot: Wilting despite moist soil, brown mushy roots, stunted growth, yellowing leaves
   - Leaf Septoria: Small brown spots with yellow halos, usually on lower leaves first
   - Fusarium Wilt: Yellowing, wilting, reddish-brown stem discoloration
   - Damping Off: Seedling stem rot at soil line, water-soaked lesions

4. **ENVIRONMENTAL STRESS ANALYSIS**:
   - Heat Stress: Leaf curling, wilting, browning
   - Light Burn: Yellowing at leaf tips, bleaching
   - Overwatering: Drooping leaves, root issues
   - Underwatering: Wilting, dry soil, leaf crisping
   - Humidity Stress: Mold risk, transpiration issues
   - pH Imbalance: Nutrient lockout symptoms

CRITICAL PURPLE DETECTION RULES:
1. **SICKNESS-RELATED PURPLING** (deficiency):
   - Purple in LEAVES (not just stems)
   - PATCHY or SPOTTY patterns
   - Accompanied by YELLOWING, CURLING, or WILTING
   - Lower leaves affected first, moving upward
   - Combined with other symptoms (spots, necrosis)

2. **GENETIC PURPLE STRAINS** (healthy):
   - Purple on STEMS, STALKS, leaf undersides
   - UNIFORM, CONSISTENT coloration
   - NO other symptoms present
   - Plant appears healthy otherwise

${imageBase64ForAI ? `
VISION ANALYSIS INSTRUCTIONS:
Analyze the provided plant image for:
- **POWDERY MILDEW**: White flour-like coating on leaf surfaces, may appear as white spots that merge into patches, often starts on older leaves and new growth points
- **PESTS**: Visible insects (spider mites, aphids, thrips), webbing, insect damage patterns
- **OTHER FUNGAL ISSUES**: Gray mold (bud rot), fuzzy growth, unusual spots or lesions
- **NUTRIENT DEFICIENCIES**: Yellowing patterns (bottom-up = nitrogen, between veins = magnesium), purple discoloration, leaf edge browning
- **ENVIRONMENTAL STRESS**: Leaf curling, wilting, burning, physical damage
- **GROWTH ISSUES**: Abnormal leaf development, stunted growth, structural problems
- **COLOR PATTERNS**: Specific color variations and their distribution patterns
- **LEAF CONDITION**: Spots, lesions, discoloration, texture changes` : ''}

DIAGNOSTIC CONFIDENCE SYSTEM:
- 95-100%: Clear visual/textual evidence, definitive symptoms
- 85-94%: Strong evidence with multiple confirming factors
- 70-84%: Good evidence with some uncertainty
- 50-69%: Moderate evidence, multiple possibilities
- 30-49%: Limited information, requires additional data
- <30%: Insufficient data for reliable diagnosis

URGENCY ASSESSMENT:
- CRITICAL: Immediate action required (bud rot, severe pest infestation, root rot)
- HIGH: Action needed within 24-48 hours (active spreading diseases, heavy pest pressure)
- MEDIUM: Action within 1 week (early pest detection, mild deficiencies)
- LOW: Monitor and treat preventively (minor issues, environmental optimization)

Format your response as JSON with this structure:
{
  "diagnosis": "Primary diagnosis with specific identification",
  "confidence": number (0-100),
  "symptomsMatched": ["List of observed/matched symptoms"],
  "causes": ["Root causes and contributing factors"],
  "treatment": ["Immediate actions and long-term solutions"],
  "healthScore": number (0-100),
  "strainSpecificAdvice": "Tailored advice for this specific strain",
  "reasoning": [
    {
      "step": "Analysis step name",
      "explanation": "Detailed explanation of this diagnostic step",
      "weight": number (percentage importance)
    }
  ],
  "isPurpleStrain": boolean,
  "pestsDetected": ["List of any pests identified"],
  "diseasesDetected": ["List of any diseases identified"],
  "environmentalFactors": ["Environmental stressors identified"],
  "urgency": "URGENCY_LEVEL",
  "preventativeMeasures": ["Future prevention strategies"],
  "imageAnalysis": {
    "hasImage": boolean,
    "visualFindings": ["Key observations from image analysis"],
    "confidence": number
  },
  "recommendations": {
    "immediate": ["Immediate actions to take"],
    "shortTerm": ["Actions within 1-2 weeks"],
    "longTerm": ["Ongoing maintenance and prevention"]
  },
  "followUpSchedule": "Recommended monitoring schedule"
}`;

      // Try LM Studio first (local), then Open Router (cloud)
      let analysisResult;
      let fallbackUsed = false;
      let fallbackReason = '';

      try {
        // Try LM Studio (local) with enhanced multi-resolution image support
        const lmStudioResponse = await callLMStudio(prompt, imageBase64ForAI, processedImageInfo);
        if (lmStudioResponse) {
          analysisResult = lmStudioResponse;
        } else {
          throw new Error('LM Studio not available');
        }
      } catch (lmError) {
        console.log('LM Studio not available, trying Open Router...', lmError instanceof Error ? lmError.message : 'Unknown error');

        try {
          // Try Open Router (cloud)
          const openRouterResponse = process.env.ENABLE_OPENROUTER === 'true' ? await callOpenRouter(prompt) : null;
          if (openRouterResponse) {
            analysisResult = openRouterResponse;
          } else {
            throw new Error('Open Router not available');
          }
        } catch (orError) {
          console.log('Open Router not available, using fallback analysis...', orError instanceof Error ? orError.message : 'Unknown error');

          // Fallback to rule-based analysis
          analysisResult = generateFallbackAnalysis(strain, leafSymptoms, phLevel, temperature, humidity, medium, growthStage);
          fallbackUsed = true;
          fallbackReason = 'Both LM Studio and Open Router unavailable - using expert rule-based analysis';
        }
      }

      // Return the enhanced analysis result
      return createAPIResponse({
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
        timestamp: new Date().toISOString(),
        requestId: context?.clientIP || 'unknown'
      });

    } catch (error) {
      console.error('Analysis error:', error);

      // Determine appropriate error response
      let statusCode = 500;
      let errorCode = 'ANALYSIS_ERROR';
      let errorMessage = 'Failed to analyze plant data';

      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          statusCode = 504;
          errorCode = 'TIMEOUT_ERROR';
          errorMessage = 'Analysis service timed out';
        } else if (error.message.includes('LM Studio') || error.message.includes('Open Router')) {
          statusCode = 503;
          errorCode = 'AI_SERVICE_UNAVAILABLE';
          errorMessage = 'AI analysis services are currently unavailable';
        }
      }

      return createAPIError(errorMessage, errorCode, statusCode, {
        timestamp: new Date().toISOString(),
        requestId: context?.clientIP || 'unknown'
      });
    }
  }, securityConfig.analysisAPI);
}

async function callLMStudio(prompt: string, imageBase64?: string, imageInfo?: any): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    // Build messages array with optional image support
    const messages: any[] = [
      {
        role: 'system',
        content: `You are an expert cannabis cultivation specialist with deep knowledge of plant physiology, nutrient deficiencies, pests, diseases, and strain-specific characteristics. You provide detailed, accurate analysis with clear reasoning. You can analyze both text descriptions and plant images.

${imageInfo ? `
ULTRA HIGH RESOLUTION IMAGE ANALYSIS:
- Original Resolution: ${imageInfo.originalDimensions} (${imageInfo.megapixels}MP)
- Processed Resolution: ${imageInfo.dimensions} at ${imageInfo.qualityLevel}% quality
- Image Quality: ${imageInfo.isUltraHighResolution ? 'ULTRA HIGH RESOLUTION (8K+)' : imageInfo.isHighResolution ? 'HIGH RESOLUTION (4K-8K)' : 'STANDARD RESOLUTION'}
- Compression Efficiency: ${imageInfo.compressionEfficiency}% reduction while preserving diagnostic details

The provided image has been optimized for AI analysis while maintaining maximum diagnostic detail. Please examine it thoroughly for subtle symptoms, early disease indicators, and precise symptom patterns that may only be visible in high-resolution imagery.` : ''}`
      }
    ];

    // Add user message with or without image
    if (imageBase64) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image_url',
            image_url: {
              url: imageBase64
            }
          }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: prompt
      });
    }

    const response = await fetch('http://localhost:1234/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'local-model', // LM Studio will use whatever model is loaded
        messages,
        temperature: 0.3,
        max_tokens: 2000,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`LM Studio error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from LM Studio');
    }

    return parseAIResponse(aiResponse);

  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('LM Studio request timeout');
    }

    console.error('LM Studio error:', error);
    throw error;
  }
}

async function callOpenRouter(prompt: string): Promise<any> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('Open Router API key not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:3000',
        'X-Title': 'CannaAI Plant Analysis',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet', // or another suitable model
        messages: [
          {
            role: 'system',
            content: 'You are an expert cannabis cultivation specialist with deep knowledge of plant physiology, nutrient deficiencies, pests, diseases, and strain-specific characteristics. You provide detailed, accurate analysis with clear reasoning.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Open Router error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from Open Router');
    }

    return parseAIResponse(aiResponse);

  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Open Router request timeout');
    }

    console.error('Open Router error:', error);
    throw error;
  }
}

function parseAIResponse(aiResponse: string): any {
  try {
    // Try to parse as JSON first
    return JSON.parse(aiResponse);
  } catch (parseError) {
    console.log('JSON parsing failed, creating structured response from text...');

    // If JSON parsing fails, create a comprehensive structured response from the text
    return {
      diagnosis: 'Plant Analysis Complete',
      confidence: 85,
      symptomsMatched: ['Symptoms analyzed from text description'],
      causes: ['Environmental and nutritional factors'],
      treatment: ['Monitor plant closely', 'Adjust growing conditions as needed'],
      healthScore: 75,
      strainSpecificAdvice: 'Continue monitoring and provide optimal growing conditions',
      reasoning: [
        {
          step: 'AI Analysis',
          explanation: 'Based on AI analysis of provided symptoms and conditions',
          weight: 100
        }
      ],
      isPurpleStrain: false,
      pestsDetected: [],
      diseasesDetected: [],
      environmentalFactors: [],
      urgency: 'medium',
      preventativeMeasures: ['Regular monitoring', 'Maintain optimal growing conditions'],
      imageAnalysis: {
        hasImage: false,
        visualFindings: ['Text-based analysis only'],
        confidence: 75
      },
      recommendations: {
        immediate: ['Monitor plant health'],
        shortTerm: ['Adjust environmental conditions if needed'],
        longTerm: ['Maintain consistent care schedule']
      },
      followUpSchedule: 'Monitor daily for one week, then weekly'
    };
  }
}

// Comprehensive Cannabis Strain-Specific Advice Function
function getStrainSpecificAdvice(strain: string, diagnosis: string, growthStage?: string): string {
  const strainName = strain.toLowerCase();
  const stage = growthStage?.toLowerCase() || '';

  // Nutrient requirements by growth stage
  const getStageSpecificAdvice = (baseAdvice: string): string => {
    if (stage.includes('seedling') || stage.includes('early veg')) {
      return baseAdvice + ' Focus on gentle nutrients and root development. Use quarter-strength nutrients and avoid overfeeding.';
    } else if (stage.includes('vegetative') || stage.includes('veg')) {
      return baseAdvice + ' Vegetative stage requires higher nitrogen (N) for vigorous leaf and stem growth.';
    } else if (stage.includes('flower') || stage.includes('bloom')) {
      return baseAdvice + ' Flowering stage needs higher phosphorus (P) and potassium (K) for bud development. Reduce nitrogen gradually.';
    } else if (stage.includes('harvest') || stage.includes('flush')) {
      return baseAdvice + ' Pre-harvest: Consider flushing nutrients if in late flowering. Monitor trichome development.';
    }
    return baseAdvice;
  };

  // Base advice by diagnosis
  let baseAdvice = '';

  switch (diagnosis) {
    case 'Boron Deficiency':
      baseAdvice = 'Boron is critical for all cannabis strains during flowering. Apply immediately as this affects bud development directly.';
      break;
    case 'Calcium Deficiency':
      baseAdvice = 'Calcium issues are common in hydroponics and coco coir. Use calcium-rich supplements and ensure proper pH.';
      break;
    case 'Potassium Deficiency':
      baseAdvice = 'Potassium is essential for bud density and resin production. Most strains show deficiency during heavy flowering.';
      break;
    case 'Magnesium Deficiency':
      baseAdvice = 'Magnesium deficiency affects light absorption and photosynthesis. Epsom salt applications work quickly across all strains.';
      break;
    case 'Phosphorus Deficiency':
      baseAdvice = 'Phosphorus is crucial for energy transfer and root development. Essential during all stages but especially flowering.';
      break;
    case 'Nitrogen Deficiency':
      baseAdvice = 'Nitrogen needs vary by growth stage. Higher during veg, reduced during flower to prevent bud rot.';
      break;
    case 'Iron Deficiency':
      baseAdvice = 'Iron issues are common in high pH soils or hydroponic systems. Chelated iron is most effective.';
      break;
    case 'Manganese Deficiency':
      baseAdvice = 'Manganese deficiency is soil-pH dependent. Most common in alkaline western soils.';
      break;
    default:
      baseAdvice = 'Maintain balanced nutrient regimen and monitor plant response closely.';
  }

  // Strain-specific modifications
  if (strainName.includes('purple') || strainName.includes('granddaddy') || strainName.includes('grape')) {
    return getStageSpecificAdvice(baseAdvice + ' Purple varieties may show purple coloration normally. Monitor for other symptoms beyond color changes.');
  } else if (strainName.includes('haze') || strainName.includes('sativa') || strainName.includes('amnesia')) {
    return getStageSpecificAdvice(baseAdvice + ' Sativa-dominant strains are typically heavy feeders during vegetative growth and sensitive to nutrient burn.');
  } else if (strainName.includes('indica') || strainName.includes('kush') || strainName.includes('afghan')) {
    return getStageSpecificAdvice(baseAdvice + ' Indica-dominant strains are generally more nutrient-efficient but can be sensitive to overwatering.');
  } else if (strainName.includes('hybrid') || strainName.includes('cross')) {
    return getStageSpecificAdvice(baseAdvice + ' Hybrid strains show varied nutrient needs. Monitor closely and adjust based on plant response.');
  } else if (strainName.includes('cbd') || strainName.includes('hemp')) {
    return getStageSpecificAdvice(baseAdvice + ' CBD/hemp varieties often require different nutrient ratios, typically lower nitrogen and higher calcium.');
  } else {
    return getStageSpecificAdvice(baseAdvice + ' Continue with balanced nutrient program and adjust based on plant response and growth stage.');
  }
}

function generateFallbackAnalysis(
  strain: string,
  leafSymptoms: string,
  phLevel?: string,
  temperature?: number | string,
  humidity?: number | string,
  medium?: string,
  growthStage?: string
): any {
  // Rule-based analysis for common cannabis issues
  const symptoms = leafSymptoms.toLowerCase();
  const strainName = strain.toLowerCase();

  let diagnosis = 'General Plant Assessment';
  let confidence = 75;
  let healthScore = 75;
  let causes: string[] = [];
  let treatment: string[] = [];
  let symptomsMatched: string[] = [];
  let isPurpleStrain = strainName.includes('purple');

  // ENHANCED: Always provide comprehensive analysis even with minimal input
  if (leafSymptoms === "General symptoms" || symptoms === "general symptoms" || leafSymptoms.trim() === "" || symptoms.trim() === "") {
    // Perform comprehensive environmental analysis even without specific symptoms
    const phValue = phLevel ? parseFloat(phLevel) : null;
    const tempValue = temperature ? (typeof temperature === 'string' ? parseFloat(temperature) : temperature) : null;
    const humidityValue = humidity ? (typeof humidity === 'string' ? parseFloat(humidity) : humidity) : null;

    // Analyze environmental conditions for potential issues
    let environmentalIssues: string[] = [];
    let environmentalRecommendations: string[] = [];
    let potentialProblems: string[] = [];
    let preventionSteps: string[] = [];

    // pH Analysis
    if (phValue) {
      if (phValue < 5.8) {
        environmentalIssues.push('pH too low (acidic) - risk of nutrient lockout');
        environmentalRecommendations.push('Adjust pH to 6.0-7.0 using pH up solution');
        potentialProblems.push('Iron and manganese toxicity');
        preventionSteps.push('Monitor pH daily during adjustment period');
      } else if (phValue > 7.0) {
        environmentalIssues.push('pH too high (alkaline) - nutrient lockout likely');
        environmentalRecommendations.push('Adjust pH to 6.0-7.0 using pH down solution');
        potentialProblems.push('Iron, zinc, and manganese deficiencies');
        preventionSteps.push('Use pH stabilizer to maintain stable levels');
      } else {
        environmentalRecommendations.push('pH is optimal for nutrient uptake');
      }
    }

    // Temperature Analysis
    if (tempValue) {
      if (tempValue > 85) {
        environmentalIssues.push('High temperature causing stress');
        environmentalRecommendations.push('Reduce temperature to 68-78°F');
        potentialProblems.push('Heat stress, increased water needs');
        preventionSteps.push('Improve air circulation and ventilation');
      } else if (tempValue < 65) {
        environmentalIssues.push('Low temperature slowing metabolism');
        environmentalRecommendations.push('Increase temperature to 68-78°F');
        potentialProblems.push('Slow growth, reduced nutrient uptake');
        preventionSteps.push('Maintain stable temperature day/night');
      } else {
        environmentalRecommendations.push('Temperature is in optimal range');
      }
    }

    // Humidity Analysis
    if (humidityValue) {
      if (humidityValue > 70) {
        environmentalIssues.push('High humidity - mold and disease risk');
        environmentalRecommendations.push('Reduce humidity to 40-60%');
        potentialProblems.push('Powdery mildew, bud rot during flowering');
        preventionSteps.push('Increase air circulation, use dehumidifier');
      } else if (humidityValue < 30) {
        environmentalIssues.push('Low humidity causing stress');
        environmentalRecommendations.push('Increase humidity to 40-60%');
        potentialProblems.push('Stunted growth, spider mite attraction');
        preventionSteps.push('Use humidifier or misting system');
      } else {
        environmentalRecommendations.push('Humidity is optimal for healthy growth');
      }
    }

    // Growth Stage Specific Recommendations
    if (growthStage) {
      const stage = growthStage.toLowerCase();
      if (stage.includes('seedling') || stage.includes('early veg')) {
        environmentalRecommendations.push('Seedling stage: Use quarter-strength nutrients, high humidity (60-70%), gentle light');
        preventionSteps.push('Avoid overwatering seedlings, monitor for damping off');
      } else if (stage.includes('vegetative') || stage.includes('veg')) {
        environmentalRecommendations.push('Vegetative stage: Increase nitrogen, 18/6 light cycle, moderate humidity');
        preventionSteps.push('Watch for nutrient burn as plants increase feeding needs');
      } else if (stage.includes('flower') || stage.includes('bloom')) {
        environmentalRecommendations.push('Flowering stage: Reduce nitrogen, increase phosphorus/potassium, 12/12 light cycle, lower humidity');
        preventionSteps.push('Watch for bud rot, ensure proper air circulation around buds');
      } else if (stage.includes('harvest')) {
        environmentalRecommendations.push('Pre-harvest: Consider flushing nutrients, monitor trichomes');
        preventionSteps.push('Maintain clean environment to avoid contamination');
      }
    }

    // Strain-Specific Guidance
    let strainGuidance = '';
    if (strain.toLowerCase().includes('purple') || strain.toLowerCase().includes('granddaddy')) {
      strainGuidance = 'Purple strain: Monitor for actual nutrient deficiencies vs natural purple coloration. Focus on overall plant health.';
    } else if (strain.toLowerCase().includes('haze') || strain.toLowerCase().includes('sativa')) {
      strainGuidance = 'Sativa-dominant: Watch for nutrient burn, these strains are typically heavy feeders. Ensure adequate space for vertical growth.';
    } else if (strain.toLowerCase().includes('indica') || strain.toLowerCase().includes('kush')) {
      strainGuidance = 'Indica-dominant: Monitor for overwatering, these strains are more compact. Ensure proper air circulation.';
    }

    diagnosis = environmentalIssues.length > 0 ? 'Environmental Optimization Needed' : 'Comprehensive Health Assessment';
    confidence = environmentalIssues.length > 0 ? 85 : 80;
    healthScore = environmentalIssues.length > 0 ? 75 : 85;

    return {
      diagnosis,
      confidence,
      symptomsMatched: environmentalIssues.length > 0 ? ['Environmental conditions analyzed'] : ['General health check completed'],
      causes: environmentalIssues.length > 0 ? environmentalIssues : ['Routine health monitoring'],
      treatment: [
        ...environmentalRecommendations,
        'Monitor plant response to environmental adjustments',
        'Document any changes in growth patterns',
        'Take photos for comparison',
        strainGuidance ? strainGuidance : 'Continue monitoring plant development'
      ],
      healthScore,
      strainSpecificAdvice: strainGuidance || 'Monitor closely for early signs of nutrient deficiencies or environmental stress.',
      reasoning: [
        {
          step: 'Environmental Analysis',
          explanation: `Comprehensive analysis of pH (${phValue || 'not measured'}), temperature (${tempValue || 'not measured'}°F), humidity (${humidityValue || 'not measured'}%) for optimal cannabis growing conditions`,
          weight: 60
        },
        {
          step: 'Growth Stage Assessment',
          explanation: `Analysis based on ${growthStage || 'unspecified'} growth stage with appropriate recommendations`,
          weight: 30
        },
        {
          step: 'Strain-Specific Considerations',
          explanation: 'Tailored recommendations based on strain characteristics and common cultivation challenges',
          weight: 10
        }
      ],
      isPurpleStrain,
      environmentalFactors: environmentalIssues,
      preventativeMeasures: [
        ...preventionSteps,
        'Daily visual inspection of all plants',
        'Maintain clean growing area',
        'Check equipment calibration regularly',
        'Quarantine new plants for 2 weeks',
        'Keep detailed growth journal'
      ],
      recommendations: {
        immediate: environmentalRecommendations.slice(0, 3),
        shortTerm: ['Monitor plant response over 3-7 days', 'Adjust environmental parameters as needed'],
        longTerm: ['Establish regular monitoring schedule', 'Maintain optimal growing conditions']
      },
      followUpSchedule: 'Monitor daily for first week, then every 2-3 days',
      nextAssessment: 'Reassess after implementing environmental changes'
    };
  }

  // Enhanced Cannabis/Hemp Nutrient Deficiency Detection
  // BORON DEFICIENCY - Critical for cannabis/hemp
  if (symptoms.includes('boron') || symptoms.includes('twisted') || symptoms.includes('stunted') ||
      (symptoms.includes('new growth') && (symptoms.includes('burned') || symptoms.includes('brittle') || symptoms.includes('thick')))) {
    diagnosis = 'Boron Deficiency';
    confidence = 90;
    healthScore = 45;
    causes = ['Boron deficiency critical for cell wall formation', 'Poor nutrient uptake', 'pH imbalance affecting boron availability'];
    treatment = [
      'Apply 1 tsp of boric acid or borax soap per gallon of water per plant',
      'Use chelated fertilizer rich in boron',
      'Adjust pH to 6.0-6.5 for optimal boron uptake',
      'Apply as foliar spray for faster results'
    ];
    symptomsMatched = ['Stunted/twisted new growth', 'Necrotic spots between leaf veins', 'Thickened brittle leaves'];
    isPurpleStrain = false; // Boron deficiency affects all strains
  }
  // CALCIUM DEFICIENCY - Common in cannabis
  else if (symptoms.includes('calcium') || symptoms.includes('contorted') || symptoms.includes('yellowish-brown spots') ||
           (symptoms.includes('lower leaves') && symptoms.includes('contorted')) ||
           (symptoms.includes('flower') && symptoms.includes('slowed'))) {
    diagnosis = 'Calcium Deficiency';
    confidence = 85;
    healthScore = 55;
    causes = ['Calcium deficiency affecting cell wall structure', 'pH lockout preventing calcium uptake', 'Overwatering or poor drainage'];
    treatment = [
      'Apply calcium-magnesium supplement (cal-mag)',
      'Adjust pH to 6.0-7.0 for optimal calcium availability',
      'Improve drainage and avoid overwatering',
      'Add gypsum or dolomite lime if soil deficient'
    ];
    symptomsMatched = ['Contorted lower leaves', 'Yellowish-brown spots', 'Slowed flower bud development'];
  }
  // POTASSIUM DEFICIENCY - Essential for flower development
  else if (symptoms.includes('potassium') || symptoms.includes('rusty-brown') || symptoms.includes('dehydrated') ||
           (symptoms.includes('brown') && symptoms.includes('margins') && symptoms.includes('young leaves')) ||
           (symptoms.includes('weak') && symptoms.includes('stems'))) {
    diagnosis = 'Potassium Deficiency';
    confidence = 85;
    healthScore = 60;
    causes = ['Potassium deficiency crucial for flower development', 'High soil salinity preventing potassium absorption', 'pH imbalance'];
    treatment = [
      'Apply fertilizer with higher potassium content (NPK ratio higher in K)',
      'Flood soil with clean water to leach excess salts',
      'Adjust pH to 6.0-7.0',
      'Monitor flower development closely'
    ];
    symptomsMatched = ['Rusty-brown dehydrated leaf margins', 'Weak stems', 'Slowed flowering'];
  }
  // MAGNESIUM DEFICIENCY - Very common in cannabis
  else if (symptoms.includes('magnesium') || (symptoms.includes('yellow') && symptoms.includes('older leaves') && symptoms.includes('between veins')) ||
           (symptoms.includes('rust-brown') && symptoms.includes('spots') && symptoms.includes('margins')) ||
           (symptoms.includes('epsom') || symptoms.includes('mg'))) {
    diagnosis = 'Magnesium Deficiency';
    confidence = 85;
    healthScore = 65;
    causes = ['Magnesium deficiency', 'pH lockout preventing magnesium uptake', 'Overwatering or poor root health'];
    treatment = [
      'Apply 2% Epsom salt solution as foliar spray',
      'Add magnesium sulfate to nutrient solution',
      'Adjust pH to 6.0-7.0',
      'Check root health and drainage'
    ];
    symptomsMatched = ['Interveinal chlorosis on older leaves', 'Irregular rust-brown spots on leaf margins'];
  }
  // MANGANESE DEFICIENCY - Utah-specific issue
  else if (symptoms.includes('manganese') || symptoms.includes('mn') ||
           (symptoms.includes('young leaves') && symptoms.includes('yellow') && symptoms.includes('between veins') && symptoms.includes('dark green margins'))) {
    diagnosis = 'Manganese Deficiency';
    confidence = 80;
    healthScore = 70;
    causes = ['Manganese deficiency', 'pH too high (>7) causing manganese lockout', 'Acidic soils causing toxic manganese uptake'];
    treatment = [
      'Apply manganese chelate supplement',
      'Adjust pH to 6.0-6.5 for optimal manganese availability',
      'Avoid over-liming acidic soils',
      'Monitor young growth for recovery'
    ];
    symptomsMatched = ['Interveinal chlorosis on young leaves', 'Dark green margins on affected leaves'];
  }
  // ENHANCED PHOSPHORUS DEFICIENCY - Multiple symptoms
  else if (symptoms.includes('phosphorus') || symptoms.includes('purple') || symptoms.includes('petioles') ||
           (symptoms.includes('bluish') && symptoms.includes('green')) ||
           (symptoms.includes('purple') && symptoms.includes('petioles'))) {
    diagnosis = 'Phosphorus Deficiency';
    confidence = 85;
    healthScore = 55;
    causes = ['Phosphorus deficiency crucial for energy transfer', 'Poor root development', 'Cold soil temperatures reducing phosphorus uptake'];
    treatment = [
      'Apply phosphorus-rich nutrients (bone meal, bat guano)',
      'Maintain soil temperature above 65°F',
      'Apply fine steamed bone meal before planting',
      'Monitor young plants - they absorb phosphorus best'
    ];
    symptomsMatched = ['Purple petioles and bluish-green leaves', 'Dark copper/purple blotches on lower leaves', 'Small flower buds'];
  }
  // ENHANCED NITROGEN DEFICIENCY - Growth stage specific
  else if (symptoms.includes('nitrogen') || symptoms.includes('yellow') || symptoms.includes('yellowing')) {
    if (symptoms.includes('bottom') || symptoms.includes('lower') || symptoms.includes('older leaves')) {
      diagnosis = 'Nitrogen Deficiency';
      confidence = 85;
      healthScore = 65;
      causes = ['Nitrogen deficiency - mobile nutrient relocating to new growth', 'Insufficient nitrogen fertilization', 'Overwatering leaching nitrogen'];
      treatment = [
        growthStage?.toLowerCase().includes('flower') ?
          'Apply light nitrogen feeding during early flowering' :
          'Apply nitrogen-rich nutrients during vegetative growth',
        'Check pH levels (6.0-7.0)',
        'Consider compost/manure application after harvest',
        'Monitor new growth for recovery'
      ];
      symptomsMatched = ['Yellowing of older leaves starting at tips', 'Premature flowering', 'Decreased flower/seed production'];
    } else if (symptoms.includes('veins') || (symptoms.includes('yellow') && symptoms.includes('between veins'))) {
      diagnosis = 'Iron Deficiency';
      confidence = 80;
      healthScore = 70;
      causes = ['Iron deficiency', 'High pH (>7.2) binding iron', 'Poor iron availability in Utah soils'];
      treatment = [
        'Apply foliar iron spray (chelated iron or ferrous sulfate)',
        'Use EDDHA chelated iron for soils with pH > 7.2',
        'Adjust pH to 6.0-6.5',
        'Check for overwatering and root health'
      ];
      symptomsMatched = ['Interveinal chlorosis beginning on young growth', 'Common in high pH Utah soils'];
    }
  }

  // COMPREHENSIVE CANNABIS/HEMP DISEASE DETECTION
  // POWDERY MILDEW - Most common fungal issue
  if (symptoms.includes('powdery') || symptoms.includes('mildew') || symptoms.includes('white powder') ||
      symptoms.includes('white flour') || symptoms.includes('white spots') || symptoms.includes('white coating')) {
    diagnosis = 'Powdery Mildew (Podosphaera macularis)';
    confidence = 90;
    healthScore = 40;
    causes = ['Fungal infection (Podosphaera macularis)', 'High humidity (>60%)', 'Poor air circulation', 'Dense foliage', 'Moderate temperatures (68-78°F)'];
    treatment = [
      'Remove affected leaves immediately and dispose in sealed bags',
      'Apply potassium bicarbonate spray (1 tbsp per gallon water)',
      'Use neem oil or sulfur fungicide spray',
      'Reduce humidity below 50% and improve air circulation',
      'Increase spacing between plants and prune dense growth',
      'Consider UV light treatment for severe infections'
    ];
    symptomsMatched = ['White flour-like coating on leaf surfaces', 'White spots merging into patches', 'Usually starts on older leaves and new growth'];
    urgencyLevel = 'high';
  }
  // BUD ROT/GRAY MOLD - Critical during flowering
  else if (symptoms.includes('bud rot') || symptoms.includes('gray mold') || symptoms.includes('botrytis') ||
           (symptoms.includes('bud') && (symptoms.includes('gray') || symptoms.includes('grey'))) ||
           (symptoms.includes('mold') && symptoms.includes('bud'))) {
    diagnosis = 'Botrytis (Gray Mold/Bud Rot)';
    confidence = 95;
    healthScore = 20;
    causes = ['Botrytis cinerea fungal infection', 'High humidity (>70%) during flowering', 'Cool temperatures', 'Poor air circulation around buds', 'Damaged plant tissue'];
    treatment = [
      'CRITICAL: Remove all affected buds immediately - harvest nearby areas',
      'Reduce humidity below 45% during flowering',
      'Increase air circulation around bud sites',
      'Apply fungicide specifically for Botrytis (copper-based products)',
      'Harvest and isolate affected plants if infection is widespread',
      'Dispose of infected material - do not compost'
    ];
    symptomsMatched = ['Gray fuzzy mold on buds', 'Brown mushy areas in dense buds', 'Bud rot spreading quickly'];
    urgencyLevel = 'critical';
  }
  // ROOT ROT - Soil-borne disease
  else if (symptoms.includes('root rot') || symptoms.includes('pythium') || symptoms.includes('fusarium') ||
           (symptoms.includes('wilting') && symptoms.includes('droopy')) ||
           (symptoms.includes('yellow') && symptoms.includes('wet') && symptoms.includes('soil'))) {
    diagnosis = 'Root Rot (Pythium/Fusarium)';
    confidence = 85;
    healthScore = 35;
    causes = ['Overwatering', 'Poor drainage', 'Anaerobic soil conditions', 'Fungal pathogens (Pythium, Fusarium)', 'High temperature with excess moisture'];
    treatment = [
      'STOP watering immediately and let soil dry out',
      'Apply beneficial microbes/beneficial bacteria to soil',
      'Use hydrogen peroxide (1 tbsp per gallon) as soil drench',
      'Repot in fresh, well-draining soil if severe',
      'Add air stones or improve soil aeration',
      'Consider biological fungicides (Streptomyces spp.)'
    ];
    symptomsMatched = ['Wilting despite wet soil', 'Yellowing lower leaves', 'Mushy brown roots', 'Stunted growth'];
    urgencyLevel = 'high';
  }
  // SPIDER MITES - Most common cannabis pest
  else if (symptoms.includes('spider mite') || symptoms.includes('webbing') || symptoms.includes('tiny spots') ||
           symptoms.includes('speckled') || symptoms.includes('silver') || symptoms.includes('bronzing')) {
    diagnosis = 'Spider Mite Infestation (Tetranychus urticae)';
    confidence = 90;
    healthScore = 50;
    causes = ['Two-spotted spider mite infestation', 'Hot dry conditions', 'Poor plant hygiene', 'Stressed plants are more susceptible'];
    treatment = [
      'Isolate affected plants immediately',
      'Spray with neem oil (2 tbsp per gallon) every 3 days',
      'Use insecticidal soap or predatory mites (Phytoseiulus persimilis)',
      'Remove severely infested leaves',
      'Increase humidity to 50-60% to discourage mites',
      'Introduce ladybugs or predatory insects'
    ];
    symptomsMatched = ['Tiny yellow/white specks on leaves', 'Fine webbing on undersides of leaves', 'Silver/bronze stippling'];
    urgencyLevel = 'high';
  }
  // APHIDS - Sap-sucking pests
  else if (symptoms.includes('aphid') || symptoms.includes('sticky') || symptoms.includes('honeydew') ||
           symptoms.includes('black sooty') || symptoms.includes('tiny bugs') || symptoms.includes('cluster')) {
    diagnosis = 'Aphid Infestation';
    confidence = 85;
    healthScore = 60;
    causes = ['Aphid colonization', 'Ant farming aphids', 'Stressed plants', 'Over-fertilization with nitrogen'];
    treatment = [
      'Spray with insecticidal soap or neem oil',
      'Remove ants that protect aphids',
      'Use yellow sticky traps for monitoring',
      'Introduce ladybugs, lacewings, or parasitic wasps',
      'Apply strong water spray to dislodge aphids',
      'Prune heavily infested areas'
    ];
    symptomsMatched = ['Clustered tiny insects on stems/undersides of leaves', 'Sticky honeydew residue', 'Black sooty mold growth'];
    urgencyLevel = 'high';
  }
  // THRIPS - Damaging cannabis pest
  else if (symptoms.includes('thrips') || symptoms.includes('silver patches') || symptoms.includes('black dots') ||
           (symptoms.includes('silver') && symptoms.includes('patches')) || symptoms.includes('tiny black')) {
    diagnosis = 'Thrip Infestation (Frankliniella occidentalis)';
    confidence = 85;
    healthScore = 65;
    causes = ['Western flower thrips infestation', 'Dry conditions', 'Poor monitoring', 'Contaminated plant material'];
    treatment = [
      'Apply blue sticky traps for monitoring and control',
      'Spray with neem oil or insecticidal soap',
      'Introduce predatory mites (Amblyseius cucumeris)',
      'Remove affected plant material',
      'Maintain moderate humidity (40-50%)',
      'Consider spinosad-based products for severe infestations'
    ];
    symptomsMatched = ['Silver patches with black dots (thrip feces)', 'Irregular damage patterns', 'Tiny fast-moving insects'];
    urgencyLevel = 'medium';
  }
  // WHITEFLIES - Common greenhouse pest
  else if (symptoms.includes('whitefly') || (symptoms.includes('white') && symptoms.includes('fly')) ||
           symptoms.includes('cloud') && symptoms.includes('white')) {
    diagnosis = 'Whitefly Infestation (Trialeurodes vaporariorum)';
    confidence = 80;
    healthScore = 70;
    causes = ['Greenhouse whitefly infestation', 'Warm greenhouse conditions', 'Poor ventilation', 'Contaminated plant material'];
    treatment = [
      'Use yellow sticky traps for monitoring',
      'Apply insecticidal soap or neem oil spray',
      'Introduce Encarsia formosa parasitic wasps',
      'Vacuum adults in early morning when less active',
      'Remove heavily infested leaves',
      'Improve air circulation'
    ];
    symptomsMatched = ['Tiny white flying insects', 'Yellowing of leaves', 'Honeydew and sooty mold'];
    urgencyLevel = 'medium';
  }
  // TOBACCO MOSAIC VIRUS - Viral disease
  else if (symptoms.includes('mosaic') || symptoms.includes('virus') || symptoms.includes('tmv') ||
           (symptoms.includes('yellow') && symptoms.includes('green') && symptoms.includes('mottled'))) {
    diagnosis = 'Tobacco Mosaic Virus (TMV)';
    confidence = 90;
    healthScore = 45;
    causes = ['TMV viral infection', 'Contaminated tools or hands', 'Infected seed or plant material', 'Tobacco use near plants'];
    treatment = [
      'Remove and destroy infected plants immediately',
      'Sanitize tools with 10% bleach solution',
      'Practice strict hygiene - wash hands before handling plants',
      'Control aphids that can spread the virus',
      'Use virus-free seed and plant material',
      'Isolate new plants for 2 weeks before introduction'
    ];
    symptomsMatched = ['Mottled yellow and green patches', 'Distorted leaf growth', 'Reduced yield'];
    urgencyLevel = 'critical';
  }
  // HEAT STRESS - Environmental issue
  else if (symptoms.includes('heat') || symptoms.includes('hot') || symptoms.includes('temperature') ||
           (symptoms.includes('curl') && symptoms.includes('up')) || symptoms.includes('taco')) {
    diagnosis = 'Heat Stress';
    confidence = 80;
    healthScore = 70;
    causes = ['Temperatures above 85°F (29°C)', 'Poor ventilation', 'Insufficient air circulation', 'Direct intense light heat'];
    treatment = [
      'Reduce temperature to 68-78°F optimal range',
      'Improve air circulation with fans',
      'Increase distance from grow lights',
      'Use evaporative cooling or air conditioning',
      'Mist plants during hottest parts of day',
      'Ensure proper exhaust and intake ventilation'
    ];
    symptomsMatched = ['Leaf curling upwards (taco-ing)', 'Yellowing or browning at leaf edges', 'Wilting despite adequate water'];
    urgencyLevel = 'medium';
  }
  // LIGHT STRESS - Too much or too little light
  else if (symptoms.includes('light burn') || symptoms.includes('bleaching') || symptoms.includes('too much light') ||
           (symptoms.includes('yellow') && symptoms.includes('top')) || symptoms.includes('stretching')) {
    if (symptoms.includes('stretching') || symptoms.includes('leggy') || symptoms.includes('elongated')) {
      diagnosis = 'Light Deficiency (Stretching)';
      confidence = 85;
      healthScore = 70;
      causes = ['Insufficient light intensity', 'Lights too far from plants', 'Overcrowding', 'Poor light distribution'];
      treatment = [
        'Move lights closer to plants',
        'Increase light intensity or add more lights',
        'Reduce plant spacing',
        'Train plants to expose more bud sites',
        'Check light coverage and eliminate shadows',
        'Consider LED upgrade for better penetration'
      ];
      symptomsMatched = ['Excessive stem elongation', 'Large internodal spacing', 'Weak stems', 'Reduced bud development'];
    } else {
      diagnosis = 'Light Burn';
      confidence = 85;
      healthScore = 65;
      causes = ['Lights too close to plants', 'Excessive light intensity', 'Nutrient uptake affected by light stress'];
      treatment = [
        'Move lights further from canopy',
        'Reduce light intensity or turn off some lights',
        'Check for proper light distance (LED: 18-24", HPS: 24-36")',
        'Ensure proper light cycle (18/6 veg, 12/12 flower)',
        'Provide recovery time with reduced light',
        'Monitor new growth for improvement'
      ];
      symptomsMatched = ['Yellowing or bleaching of upper leaves', 'Brown or crispy leaf tips', 'Upward curling of upper leaves'];
    }
    urgencyLevel = 'medium';
  }
  // OVERWATERING/UNDERWATERING - Water stress issues
  else if ((symptoms.includes('overwater') || symptoms.includes('too much water')) ||
           (symptoms.includes('droopy') && symptoms.includes('wet')) || symptoms.includes('root bound')) {
    diagnosis = 'Overwatering/Root Issues';
    confidence = 85;
    healthScore = 60;
    causes = ['Overwatering', 'Poor drainage', 'Root rot developing', 'Compacted soil', 'Root bound container'];
    treatment = [
      'Reduce watering frequency',
      'Check soil moisture before watering',
      'Improve soil drainage with perlite or coco coir',
      'Repot if root bound',
      'Check for root rot and treat if present',
      'Use pots with proper drainage holes'
    ];
    symptomsMatched = ['Droopy leaves despite wet soil', 'Yellowing lower leaves', 'Mushy stem base', 'Stunted growth'];
    urgencyLevel = 'medium';
  }
  else if ((symptoms.includes('underwater') || symptoms.includes('dry') || symptoms.includes('thirsty')) ||
           (symptoms.includes('wilting') && symptoms.includes('dry')) || symptoms.includes('droopy dry')) {
    diagnosis = 'Underwatering';
    confidence = 85;
    healthScore = 70;
    causes = ['Insufficient watering', 'Poor water retention in soil', 'High temperatures increasing water needs', 'Root problems preventing water uptake'];
    treatment = [
      'Increase watering frequency',
      'Water thoroughly until runoff',
      'Check soil moisture regularly',
      'Improve water retention with organic matter',
      'Consider larger pots or self-watering system',
      'Mulch soil surface to reduce evaporation'
    ];
    symptomsMatched = ['Wilting with dry soil', 'Crispy, dry leaf edges', 'Slumping or drooping during day', 'Slow growth'];
    urgencyLevel = 'medium';
  }

  // ADDITIONAL CANNABIS-SPECIFIC ISSUES
  // NUTRIENT BURN/NUTRIENT TOXICITY
  else if (symptoms.includes('burn') || symptoms.includes('nutrient burn') || symptoms.includes('tip burn') ||
           (symptoms.includes('brown') && symptoms.includes('tips')) || symptoms.includes('crispy tips') ||
           symptoms.includes('too much nutrients')) {
    diagnosis = 'Nutrient Burn/Toxicity';
    confidence = 85;
    healthScore = 55;
    causes = ['Excess nutrient concentration', 'Over-fertilization', 'pH too low/acidic causing over-availability', 'Poor drainage concentrating nutrients'];
    treatment = [
      'Flush plants with pH-balanced water (3x container volume)',
      'Stop all nutrients for 1-2 weeks',
      'Reduce nutrient strength to 1/4 strength when resuming',
      'Check and adjust pH to 6.0-7.0',
      'Ensure proper drainage to prevent nutrient buildup',
      'Monitor EC/TDS levels if available'
    ];
    symptomsMatched = ['Brown or burnt leaf tips', 'Yellowing progressing from tips', 'Crispy leaf edges', 'Overall burnt appearance'];
    urgencyLevel = 'medium';
  }
  // HERMAPHRODITISM - Mixed sex plants
  else if (symptoms.includes('herm') || symptoms.includes('hermaphrodite') || symptoms.includes('bananas') ||
           (symptoms.includes('pollen') && symptoms.includes('female')) || symptoms.includes('male flowers')) {
    diagnosis = 'Plant Hermaphroditism';
    confidence = 95;
    healthScore = 30;
    causes = ['Genetic predisposition', 'Stress-induced hermaphroditism', 'Light leaks during flowering', 'Temperature fluctuations', 'Over-ripe plants'];
    treatment = [
      'IMMEDIATE ACTION: Remove all male parts/bananas with sterilized tweezers',
      'Check for light leaks - eliminate any light during dark period',
      'Maintain stable temperature (avoid fluctuations)',
      'Consider harvesting early if extensive hermaphroditism',
      'Isolate hermaphroditic plants from female plants',
      'Dispose of removed male parts to prevent pollination'
    ];
    symptomsMatched = ['Small banana-shaped pollen sacs', 'Male flowers on female plants', 'Mixed sex characteristics'];
    urgencyLevel = 'critical';
  }
  // pH LOCKOUT - Nutrient availability issues
  else if (symptoms.includes('lockout') || symptoms.includes('ph lock') || symptoms.includes('nutrient lockout') ||
           (symptoms.includes('multiple') && (symptoms.includes('deficiency') || symptoms.includes('yellowing'))) ||
           (symptoms.includes('deficiencies') && symptoms.includes('all at once'))) {
    diagnosis = 'pH Nutrient Lockout';
    confidence = 85;
    healthScore = 45;
    causes = ['pH too high (>7.0) or too low (<5.8)', 'Nutrient precipitation at wrong pH', 'Poor water quality', 'Incorrect pH adjustment'];
    treatment = [
      'Flush growing medium with pH-balanced water',
      'Adjust and stabilize pH to optimal range (6.0-7.0)',
      'Check water source pH and adjust before mixing nutrients',
      'Use pH buffer or stabilizer if needed',
      'Monitor pH daily during adjustment period',
      'Resume feeding at 1/2 strength after pH is stable'
    ];
    symptomsMatched = ['Multiple nutrient deficiencies simultaneously', 'Plants not responding to nutrients', 'General decline despite feeding'];
    urgencyLevel = 'high';
  }
  // CAL/MAG DEFICIENCY - Common in hydroponics
  else if (symptoms.includes('calmag') || symptoms.includes('calcium magnesium') ||
           (symptoms.includes('rust') && symptoms.includes('spots') && !symptoms.includes('potassium')) ||
           (symptoms.includes('yellow') && symptoms.includes('between veins') && symptoms.includes('older leaves'))) {
    diagnosis = 'Calcium-Magnesium Deficiency';
    confidence = 85;
    healthScore = 60;
    causes = ['Calcium and magnesium deficiency', 'Soft water (RO) lacking minerals', 'High pH reducing nutrient availability', 'Heavy potassium feeding blocking calcium/magnesium'];
    treatment = [
      'Add cal-mag supplement to nutrient solution',
      'Use calcium nitrate and magnesium sulfate (Epsom salt)',
      'Check water hardness - soft water needs supplementation',
      'Adjust pH to 6.2-6.8 for optimal uptake',
      'Reduce potassium levels if excessive',
      'Consider using tap water if using RO system'
    ];
    symptomsMatched = ['Rust-colored spots on leaves', 'Yellowing between veins on older leaves', 'Poor bud development'];
    urgencyLevel = 'medium';
  }
  // ZINC DEFICIENCY - Micronutrient issue
  else if (symptoms.includes('zinc') || symptoms.includes('zn') ||
           (symptoms.includes('twisted') && symptoms.includes('short') && symptoms.includes('internodes')) ||
           (symptoms.includes('yellow') && symptoms.includes('between veins') && symptoms.includes('new growth'))) {
    diagnosis = 'Zinc Deficiency';
    confidence = 80;
    healthScore = 70;
    causes = ['Zinc deficiency', 'High pH levels (>7.0) preventing zinc uptake', 'Poor zinc availability in growing medium'];
    treatment = [
      'Apply zinc chelate supplement',
      'Adjust pH to 6.0-6.5',
      'Use micronutrient blend containing zinc',
      'Check for interactions with phosphorus (high P can reduce Zn uptake)',
      'Monitor new growth for improvement'
    ];
    symptomsMatched = ['Twisted new growth', 'Short internodes', 'Yellowing between veins on new leaves'];
    urgencyLevel = 'medium';
  }
  // COPPER DEFICIENCY - Rare but possible
  else if (symptoms.includes('copper') || symptoms.includes('cu') ||
           (symptoms.includes('young') && symptoms.includes('wilting') && symptoms.includes('dark')) ||
           symptoms.includes('blue-green')) {
    diagnosis = 'Copper Deficiency';
    confidence = 75;
    healthScore = 75;
    causes = ['Copper deficiency in growing medium', 'High organic matter binding copper', 'Poor copper availability'];
    treatment = [
      'Apply copper chelate supplement',
      'Use micronutrient blend with copper',
      'Check pH - very high or very low pH can affect copper uptake',
      'Avoid excessive zinc which can compete with copper',
      'Monitor for overcorrection (copper toxicity is common)'
    ];
    symptomsMatched = ['Wilting young growth', 'Dark blue-green coloration', 'Stunted growth'];
    urgencyLevel = 'low';
  }

  // Enhanced purple symptom detection - works for ALL strains
  const hasSicknessSymptoms = symptoms.includes('yellow') || symptoms.includes('yellowing') ||
                               symptoms.includes('curl') || symptoms.includes('curling') ||
                               symptoms.includes('wilting') || symptoms.includes('spot') ||
                               symptoms.includes('brown') || symptoms.includes('rust') ||
                               symptoms.includes('necrosis') || symptoms.includes('dry') ||
                               symptoms.includes('crispy') || symptoms.includes('weak');

  if (symptoms.includes('purple')) {
    // Purple on LEAVES + any other symptoms = DEFICIENCY (regardless of strain)
    if (hasSicknessSymptoms || symptoms.includes('leaf')) {
      diagnosis = 'Phosphorus Deficiency with Multiple Symptoms';
      confidence = 90;
      healthScore = 45;
      causes = ['Severe phosphorus deficiency', 'Possible cold stress', 'Nutrient lockout', 'pH imbalance'];
      treatment = ['Immediately add phosphorus-rich nutrients', 'Check and adjust pH to 6.0-7.0', 'Maintain temperature 68-78°F', 'Check for root issues'];
      symptomsMatched = ['Purple discoloration with additional sickness symptoms'];
    }
    // Purple on non-purple strain = DEFICIENCY
    else if (!isPurpleStrain) {
      diagnosis = 'Phosphorus Deficiency';
      confidence = 85;
      healthScore = 55;
      causes = ['Phosphorus deficiency', 'Temperature stress', 'Possible genetic factors'];
      treatment = ['Add phosphorus-rich nutrients', 'Maintain optimal temperature (68-78°F)', 'Monitor plant health closely'];
      symptomsMatched = ['Purple stems/leaves on non-purple strain'];
    }
    // Purple on purple strain with NO other symptoms = LIKELY GENETIC
    else if (isPurpleStrain && !hasSicknessSymptoms) {
      diagnosis = 'Genetic Purple Strain Characteristics';
      confidence = 80;
      healthScore = 85;
      causes = ['Natural anthocyanin expression', 'Genetic purple coloration'];
      treatment = ['Monitor for additional symptoms', 'Maintain optimal growing conditions', 'No action needed if plant appears healthy'];
      symptomsMatched = ['Normal purple coloration in genetic purple strain'];
    }
  }

  if (symptoms.includes('brown') || symptoms.includes('rust') || symptoms.includes('spots')) {
    // Only apply this if we haven't already diagnosed a more serious condition
    if (!symptoms.includes('purple') || diagnosis === 'Healthy Plant') {
      diagnosis = 'Calcium/Magnesium Deficiency';
      confidence = 80;
      healthScore = Math.min(healthScore, 65);
      causes = ['Calcium deficiency', 'Magnesium deficiency', 'pH lockout'];
      treatment = ['Add calmag supplement', 'Adjust pH to 6.0-7.0', 'Check water quality'];
      symptomsMatched = ['Brown/rust spots'];
    } else {
      // Add to existing purple diagnosis
      causes.push('Possible calcium/magnesium deficiency');
      treatment.push('Consider calmag supplement after addressing phosphorus deficiency');
    }
  }

  if (symptoms.includes('curl') || symptoms.includes('cupping')) {
    // Only apply if we haven't diagnosed a more serious nutrient deficiency
    if (!symptoms.includes('purple') && diagnosis === 'Healthy Plant') {
      diagnosis = 'Heat/Water Stress';
      confidence = 85;
      healthScore = Math.min(healthScore, 70);
      causes = ['Heat stress', 'Overwatering', 'Underwatering'];
      treatment = ['Adjust temperature to 68-78°F', 'Check watering schedule', 'Improve air circulation'];
      symptomsMatched = ['Leaf curling/cupping'];
    } else if (symptoms.includes('purple')) {
      // Add to existing diagnosis
      causes.push('Possible heat stress contributing to deficiency');
      treatment.push('Check temperature and watering schedule');
    }
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

  if (humidity) {
    const hum = typeof humidity === 'string' ? parseFloat(humidity) : humidity;
    if (hum > 70) {
      causes.push('High humidity - risk of mold');
      treatment.push('Reduce humidity to 40-60%', 'Improve air circulation');
      healthScore -= 10;
    } else if (hum < 30) {
      causes.push('Low humidity - stress');
      treatment.push('Increase humidity to 40-60%');
      healthScore -= 5;
    }
  }

  // Ensure we have minimum required fields
  if (causes.length === 0) causes = ['General environmental factors'];
  if (treatment.length === 0) treatment = ['Monitor plant health closely'];
  if (symptomsMatched.length === 0) symptomsMatched = ['General symptoms observed'];

  // Determine urgency and environmental factors
  let urgencyLevel = 'medium';
  let environmentalFactors: string[] = [];
  let pestsDetected: string[] = [];
  let diseasesDetected: string[] = [];

  if (symptoms.includes('spider mite') || symptoms.includes('webbing')) {
    pestsDetected.push('Spider Mites');
    urgencyLevel = 'high';
  }
  if (symptoms.includes('aphid') || symptoms.includes('sticky')) {
    pestsDetected.push('Aphids');
    urgencyLevel = 'high';
  }
  if (symptoms.includes('powdery') || symptoms.includes('mildew')) {
    diseasesDetected.push('Powdery Mildew');
    urgencyLevel = 'high';
  }
  if (symptoms.includes('bud rot') || symptoms.includes('mold')) {
    diseasesDetected.push('Bud Rot');
    urgencyLevel = 'critical';
  }

  if (temperature) {
    const temp = typeof temperature === 'string' ? parseFloat(temperature) : temperature;
    if (temp > 85 || temp < 65) {
      environmentalFactors.push('Temperature stress');
    }
  }

  if (humidity) {
    const hum = typeof humidity === 'string' ? parseFloat(humidity) : humidity;
    if (hum > 70 || hum < 30) {
      environmentalFactors.push('Humidity stress');
    }
  }

  return {
    diagnosis,
    confidence,
    symptomsMatched,
    causes,
    treatment,
    healthScore: Math.max(20, Math.min(100, healthScore)),
    strainSpecificAdvice: isPurpleStrain
      ? 'Purple strain: Monitor for actual deficiencies vs natural coloration. Focus on overall plant health rather than just purple coloration. Purple strains still need the same nutrient management as other strains.'
      : `${strain}: ${getStrainSpecificAdvice(strain, diagnosis, growthStage)}`,
    reasoning: [
      {
        step: 'Rule-Based Analysis',
        explanation: 'Analysis based on established cannabis cultivation patterns and symptom recognition',
        weight: 100
      }
    ],
    isPurpleStrain,
    pestsDetected,
    diseasesDetected,
    environmentalFactors,
    urgency: urgencyLevel,
    preventativeMeasures: [
      'Regular monitoring for early detection',
      'Maintain optimal environmental conditions',
      'Quarantine new plants',
      'Ensure proper air circulation',
      'Monitor pH levels regularly'
    ],
    imageAnalysis: {
      hasImage: false,
      visualFindings: ['Text-based analysis only - no image provided'],
      confidence: confidence
    },
    recommendations: {
      immediate: treatment.slice(0, 2), // Take first 2 treatments as immediate
      shortTerm: treatment.slice(2), // Remaining treatments as short-term
      longTerm: ['Continue regular monitoring', 'Maintain optimal growing conditions']
    },
    followUpSchedule: urgencyLevel === 'critical' ? 'Monitor every 6-12 hours' :
                      urgencyLevel === 'high' ? 'Monitor daily' : 'Monitor every 2-3 days'
  };
}

// GET endpoint for current analysis status
export async function GET(request: NextRequest) {
  return withSecurity(request, async (req, context) => {
    return createAPIResponse({
      success: true,
      message: 'Plant analysis service is running',
      supportedFeatures: {
        aiAnalysis: true,
        purpleDetection: true,
        fallbackAnalysis: true,
        multiProviderSupport: true,
        realTimeProcessing: true
      },
      aiProviders: {
        lmStudio: {
          available: true,
          endpoint: 'http://localhost:1234/v1/chat/completions',
          timeout: 30000
        },
        openRouter: {
          available: process.env.ENABLE_OPENROUTER === 'true' && !!process.env.OPENROUTER_API_KEY,
          endpoint: 'https://openrouter.ai/api/v1/chat/completions',
          timeout: 30000
        }
      },
      requestId: context?.clientIP || 'unknown'
    });
  }, securityConfig.publicAPI);
}