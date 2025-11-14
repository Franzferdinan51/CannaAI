import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/enhanced_plant_analysis.dart';
import '../models/plant_analysis.dart';

final enhancedPlantAnalysisProvider = StateNotifierProvider<EnhancedPlantAnalysisNotifier, EnhancedPlantAnalysisState>((ref) {
  return EnhancedPlantAnalysisNotifier();
});

class EnhancedPlantAnalysisNotifier extends StateNotifier<EnhancedPlantAnalysisState> {
  EnhancedPlantAnalysisNotifier() : super(const EnhancedPlantAnalysisState()) {
    _loadMockAnalyses();
  }

  void _loadMockAnalyses() {
    final mockAnalyses = [
      // Mock detailed analysis
      EnhancedPlantAnalysis(
        id: 'enhanced_1',
        userId: 'user_001',
        strainId: 'gdp',
        imageUrl: 'assets/mock_images/plant1.jpg',
        timestamp: DateTime.now().subtract(const Duration(hours: 2)),
        result: EnhancedAnalysisResult(
          overallHealth: 'stressed',
          healthStatus: HealthStatus.stressed,
          confidence: 0.87,
          growthStage: GrowthStage.vegetative,
          analysisType: AnalysisType.detailed,
          analysisTimestamp: DateTime.now().subtract(const Duration(hours: 2)),
          detectedSymptoms: [
            SymptomDetection(
              symptom: 'Yellowing lower leaves',
              category: 'color',
              severity: 0.6,
              confidence: 0.85,
              description: 'Yellowing observed in older fan leaves',
              affectedAreas: ['Lower canopy', 'Fan leaves'],
            ),
            SymptomDetection(
              symptom: 'Slight leaf curling',
              category: 'curling',
              severity: 0.3,
              confidence: 0.72,
              description: 'Upward curling of leaf edges',
              affectedAreas: ['New growth'],
            ),
          ],
          nutrientDeficiencies: [
            NutrientDeficiency(
              nutrient: 'Nitrogen',
              type: 'deficiency',
              severity: 0.7,
              confidence: 0.88,
              visualSymptoms: ['Yellowing of lower leaves', 'Stunted growth'],
              recommendations: [
                'Increase nitrogen in next feeding',
                'Check pH levels (target: 6.0-6.5)',
                'Consider adding cal-mag supplement',
              ],
              urgency: 'Moderate',
            ),
          ],
          detectedPests: [],
          detectedDiseases: [],
          purpleStrainAnalysis: PurpleStrainAnalysis(
            isPurpleStrain: false,
            confidence: 0.95,
            deficiencyDifferentiators: ['No purple stems', 'Normal green coloring'],
          ),
          metrics: EnhancedPlantMetrics(
            leafColorScore: 0.6,
            leafHealthScore: 0.7,
            growthRateScore: 0.5,
            nutrientDeficiencyScore: 0.7,
            overallVigorScore: 0.6,
            structuralIntegrityScore: 0.8,
          ),
          immediateActions: [
            'Increase nitrogen by 25% in next feeding',
            'Check pH and adjust if necessary',
            'Monitor for further yellowing',
          ],
          longTermRecommendations: [
            'Consider adding organic nitrogen sources',
            'Implement regular pH monitoring schedule',
            'Monitor for early flowering signs',
          ],
          environmentalAdjustments: [
            'Maintain temperature 68-78°F',
            'Keep humidity 40-60%',
            'Ensure proper air circulation',
          ],
          requiresFollowUp: true,
          recommendedFollowUpDate: DateTime.now().add(const Duration(days: 3)),
        ),
        tags: ['vegetative', 'nitrogen_deficiency', 'lower_leaves'],
      ),

      // Mock trichome analysis
      EnhancedPlantAnalysis(
        id: 'enhanced_2',
        userId: 'user_001',
        strainId: 'gsc',
        imageUrl: 'assets/mock_images/plant2.jpg',
        timestamp: DateTime.now().subtract(const Duration(days: 1)),
        result: EnhancedAnalysisResult(
          overallHealth: 'healthy',
          healthStatus: HealthStatus.healthy,
          confidence: 0.95,
          growthStage: GrowthStage.flowering,
          analysisType: AnalysisType.trichome,
          analysisTimestamp: DateTime.now().subtract(const Duration(days: 1)),
          detectedSymptoms: [],
          nutrientDeficiencies: [],
          detectedPests: [],
          detectedDiseases: [],
          purpleStrainAnalysis: PurpleStrainAnalysis(
            isPurpleStrain: false,
            confidence: 0.92,
          ),
          metrics: EnhancedPlantMetrics(
            leafColorScore: 0.9,
            leafHealthScore: 0.95,
            growthRateScore: 0.8,
            overallVigorScore: 0.9,
          ),
          trichomeAnalysis: TrichomeAnalysis(
            trichomeStage: 'cloudy',
            clarityPercentage: 15.0,
            cloudinessPercentage: 70.0,
            amberPercentage: 15.0,
            harvestReadinessScore: 0.75,
            trichomeDensity: 245.0,
            magnificationLevel: '400x',
            maturityIndicators: [
              'Mostly cloudy trichomes',
              'Some amber development',
              'Good density coverage',
            ],
            optimalHarvestDate: DateTime.now().add(const Duration(days: 7)),
            harvestRecommendations: [
              'Monitor trichome development daily',
              'Consider harvest in 7-10 days',
              'Reduce nitrogen in final week',
              'Monitor for amber trichome increase',
            ],
          ),
          immediateActions: [
            'Monitor trichome maturity daily',
            'Begin flush if not already started',
          ],
          longTermRecommendations: [
            'Prepare for harvest window',
            'Have curing supplies ready',
            'Plan harvesting schedule',
          ],
          environmentalAdjustments: [
            'Maintain stable humidity',
            'Avoid temperature fluctuations',
          ],
          requiresFollowUp: true,
          recommendedFollowUpDate: DateTime.now().add(const Duration(days: 2)),
        ),
        tags: ['flowering', 'trichome_analysis', 'harvest_window'],
      ),

      // Mock critical analysis with disease
      EnhancedPlantAnalysis(
        id: 'enhanced_3',
        userId: 'user_001',
        strainId: 'blue_dream',
        imageUrl: 'assets/mock_images/plant3.jpg',
        timestamp: DateTime.now().subtract(const Duration(days: 3)),
        result: EnhancedAnalysisResult(
          overallHealth: 'critical',
          healthStatus: HealthStatus.critical,
          confidence: 0.92,
          growthStage: GrowthStage.flowering,
          analysisType: AnalysisType.detailed,
          analysisTimestamp: DateTime.now().subtract(const Duration(days: 3)),
          detectedSymptoms: [
            SymptomDetection(
              symptom: 'White powdery spots',
              category: 'spots',
              severity: 0.8,
              confidence: 0.90,
              description: 'White powdery growth on leaf surface',
              affectedAreas: ['Upper leaf surfaces', 'Fan leaves'],
            ),
            SymptomDetection(
              symptom: 'Leaf yellowing and browning',
              category: 'color',
              severity: 0.6,
              confidence: 0.85,
              description: 'Yellowing progressing to brown spots',
              affectedAreas: ['Lower canopy', 'Affected leaves'],
            ),
          ],
          nutrientDeficiencies: [],
          detectedPests: [],
          detectedDiseases: [
            DiseaseDetection(
              diseaseName: 'Powdery Mildew',
              pathogenType: 'fungal',
              severity: 0.8,
              confidence: 0.92,
              symptoms: [
                'White powdery coating on leaves',
                'Yellowing and browning of affected areas',
                'Leaf curling and distortion',
              ],
              treatmentSteps: [
                'Remove affected leaves immediately',
                'Increase air circulation',
                'Apply organic fungicide (neem oil)',
                'Reduce humidity to below 50%',
                'Space plants better for airflow',
              ],
              preventionMeasures: [
                'Maintain good air circulation',
                'Control humidity levels',
                'Regular plant inspections',
                'Proper plant spacing',
                'Sanitize tools between uses',
              ],
              environmentalFactors: 'High humidity (>60%) and poor air circulation',
              isTreatable: true,
            ),
          ],
          purpleStrainAnalysis: PurpleStrainAnalysis(
            isPurpleStrain: false,
            confidence: 0.88,
          ),
          metrics: EnhancedPlantMetrics(
            leafColorScore: 0.4,
            leafHealthScore: 0.3,
            growthRateScore: 0.2,
            diseaseScore: 0.8,
            overallVigorScore: 0.3,
          ),
          immediateActions: [
            'Remove all affected leaves immediately',
            'Increase air circulation with fans',
            'Apply neem oil treatment',
            'Reduce humidity to 45-50%',
            'Isolate affected plant if possible',
          ],
          longTermRecommendations: [
            'Implement better ventilation system',
            'Regular fungicide preventive treatment',
            'Monitor all plants for spread',
            'Consider dehumidifier for grow space',
          ],
          environmentalAdjustments: [
            'Reduce humidity to 45-50%',
            'Increase air circulation significantly',
            'Maintain temperature 68-78°F',
            'Ensure proper plant spacing',
          ],
          requiresFollowUp: true,
          recommendedFollowUpDate: DateTime.now().add(const Duration(days: 1)),
        ),
        tags: ['powdery_mildew', 'fungal_disease', 'critical', 'humidity_issues'],
      ),

      // Mock purple strain analysis
      EnhancedPlantAnalysis(
        id: 'enhanced_4',
        userId: 'user_001',
        strainId: 'granddaddy_purple',
        imageUrl: 'assets/mock_images/plant4.jpg',
        timestamp: DateTime.now().subtract(const Duration(days: 5)),
        result: EnhancedAnalysisResult(
          overallHealth: 'healthy',
          healthStatus: HealthStatus.healthy,
          confidence: 0.89,
          growthStage: GrowthStage.flowering,
          analysisType: AnalysisType.detailed,
          analysisTimestamp: DateTime.now().subtract(const Duration(days: 5)),
          detectedSymptoms: [
            SymptomDetection(
              symptom: 'Purple coloration in stems',
              category: 'color',
              severity: 0.1,
              confidence: 0.85,
              description: 'Natural purple coloration in stems and leaf veins',
              affectedAreas: ['Stems', 'Leaf veins'],
            ),
          ],
          nutrientDeficiencies: [],
          detectedPests: [],
          detectedDiseases: [],
          purpleStrainAnalysis: PurpleStrainAnalysis(
            isPurpleStrain: true,
            confidence: 0.94,
            purpleIndicators: [
              'Deep purple stems',
              'Purple leaf veins',
              'Purple-tinged bud development',
              'Genetic purple coloring pattern',
            ],
            deficiencyDifferentiators: [
              'Uniform purple distribution',
              'No yellowing or necrosis',
              'Normal growth patterns',
              'Purple appears in new growth',
            ],
            strainType: 'Indica-dominant',
            geneticBackground: 'Purple Urkle x Big Bud',
          ),
          metrics: EnhancedPlantMetrics(
            leafColorScore: 0.8, // Purple affects this score
            leafHealthScore: 0.95,
            growthRateScore: 0.85,
            overallVigorScore: 0.9,
          ),
          immediateActions: [],
          longTermRecommendations: [
            'Monitor for purple coloration development',
            'Document color changes over time',
            'Prepare for unique harvest characteristics',
          ],
          environmentalAdjustments: [
            'Maintain slightly cooler temperatures (65-75°F)',
            'Consider color-enhancing nutrients',
          ],
          requiresFollowUp: false,
        ),
        tags: ['purple_strain', 'granddaddy_purple', 'indica', 'genetic_coloration'],
      ),
    ];

    state = state.copyWith(
      analyses: mockAnalyses,
      filteredAnalyses: mockAnalyses,
      isLoading: false,
    );
  }

  Future<void> analyzePlant({
    required String imagePath,
    required AnalysisType analysisType,
    String? strainId,
    String? strainName,
    Map<String, dynamic>? analysisParameters,
    Map<String, dynamic>? environmentalContext,
    String? locationIdentifier,
    List<String>? tags,
  }) async {
    state = state.copyWith(
      isAnalyzing: true,
      currentAnalysisType: analysisType,
      error: null,
    );

    try {
      // Simulate API call delay based on analysis type
      final delay = _getAnalysisDelay(analysisType);
      await Future.delayed(delay);

      final newAnalysis = await _generateMockAnalysis(
        imagePath: imagePath,
        analysisType: analysisType,
        strainId: strainId,
        strainName: strainName,
        analysisParameters: analysisParameters,
        environmentalContext: environmentalContext,
        locationIdentifier: locationIdentifier,
        tags: tags,
      );

      final updatedAnalyses = [newAnalysis, ...state.analyses];

      state = state.copyWith(
        analyses: updatedAnalyses,
        filteredAnalyses: updatedAnalyses,
        isAnalyzing: false,
        currentAnalysisType: null,
      );
    } catch (e) {
      state = state.copyWith(
        isAnalyzing: false,
        currentAnalysisType: null,
        error: 'Analysis failed: ${e.toString()}',
      );
    }
  }

  Duration _getAnalysisDelay(AnalysisType type) {
    switch (type) {
      case AnalysisType.quick:
        return const Duration(seconds: 5);
      case AnalysisType.detailed:
        return const Duration(seconds: 15);
      case AnalysisType.trichome:
        return const Duration(seconds: 10);
      case AnalysisType.liveVision:
        return const Duration(seconds: 3);
    }
  }

  Future<EnhancedPlantAnalysis> _generateMockAnalysis({
    required String imagePath,
    required AnalysisType analysisType,
    String? strainId,
    String? strainName,
    Map<String, dynamic>? analysisParameters,
    Map<String, dynamic>? environmentalContext,
    String? locationIdentifier,
    List<String>? tags,
  }) async {
    final now = DateTime.now();
    final random = DateTime.now().millisecond;

    // Generate base health status
    final healthStatuses = [HealthStatus.healthy, HealthStatus.stressed, HealthStatus.critical];
    final healthStatus = healthStatuses[random % healthStatuses.length];

    // Generate growth stage
    final growthStages = GrowthStage.values;
    final growthStage = growthStages[random % growthStages.length];

    // Create analysis result based on type
    EnhancedAnalysisResult result;

    switch (analysisType) {
      case AnalysisType.trichome:
        result = _generateTrichomeAnalysis(now, healthStatus, growthStage);
        break;
      case AnalysisType.detailed:
        result = _generateDetailedAnalysis(now, healthStatus, growthStage, strainName);
        break;
      case AnalysisType.quick:
        result = _generateQuickAnalysis(now, healthStatus, growthStage);
        break;
      case AnalysisType.liveVision:
        result = _generateLiveVisionAnalysis(now, healthStatus, growthStage);
        break;
    }

    return EnhancedPlantAnalysis(
      id: 'enhanced_${now.millisecondsSinceEpoch}',
      userId: 'user_001',
      strainId: strainId,
      imageUrl: imagePath,
      imageMetadata: ImageMetadata(
        originalPath: imagePath,
        compressedPath: imagePath,
        fileSize: 1024 * 1024 * (2 + (random % 3)), // 2-4 MB
        width: 1920 + (random % 400),
        height: 1080 + (random % 300),
        format: 'JPEG',
        exifFocalLength: 4.0 + (random % 20) / 10.0,
        exifAperture: 2.0 + (random % 40) / 10.0,
        exifExposureTime: (random % 1000) / 1000.0,
        exifISO: 100 + (random % 800),
        capturedAt: now.subtract(const Duration(minutes: 5)),
      ),
      timestamp: now,
      result: result,
      tags: tags ?? _generateDefaultTags(healthStatus, analysisType, growthStage),
      locationIdentifier: locationIdentifier,
      environmentalContext: environmentalContext,
    );
  }

  EnhancedAnalysisResult _generateTrichomeAnalysis(DateTime now, HealthStatus healthStatus, GrowthStage growthStage) {
    final random = now.millisecond;
    final cloudinessPercent = 60.0 + (random % 30);
    final amberPercent = (random % 20).toDouble();
    final clearPercent = 100.0 - cloudinessPercent - amberPercent;

    return EnhancedAnalysisResult(
      overallHealth: healthStatus.name,
      healthStatus: healthStatus,
      confidence: 0.85 + (random % 15) / 100.0,
      growthStage: growthStage,
      analysisType: AnalysisType.trichome,
      analysisTimestamp: now,
      detectedSymptoms: [],
      nutrientDeficiencies: [],
      detectedPests: [],
      detectedDiseases: [],
      purpleStrainAnalysis: PurpleStrainAnalysis(
        isPurpleStrain: random % 5 == 0,
        confidence: 0.8 + (random % 20) / 100.0,
      ),
      metrics: EnhancedPlantMetrics(
        leafColorScore: 0.7 + (random % 30) / 100.0,
        leafHealthScore: 0.8 + (random % 20) / 100.0,
        overallVigorScore: 0.7 + (random % 30) / 100.0,
      ),
      trichomeAnalysis: TrichomeAnalysis(
        trichomeStage: amberPercent > 15 ? 'mixed' : (cloudinessPercent > 70 ? 'cloudy' : 'clear'),
        clarityPercentage: clearPercent,
        cloudinessPercentage: cloudinessPercent,
        amberPercentage: amberPercent,
        harvestReadinessScore: amberPercent / 100.0,
        trichomeDensity: 200.0 + (random % 100),
        magnificationLevel: '400x',
        maturityIndicators: [
          if (cloudinessPercent > 70) 'Mostly cloudy trichomes',
          if (amberPercent > 0) 'Some amber development present',
          if (clearPercent > 20) 'Some clear trichomes remaining',
          'Good density coverage',
        ],
        optimalHarvestDate: amberPercent > 20
            ? now
            : now.add(Duration(days: (20 - amberPercent).toInt())),
        harvestRecommendations: [
          if (amberPercent < 10) 'Continue monitoring trichome development',
          if (amberPercent > 20) 'Consider harvesting soon',
          'Monitor daily for color changes',
          'Check overall bud maturity',
        ],
      ),
      requiresFollowUp: amberPercent < 25,
      recommendedFollowUpDate: now.add(const Duration(days: 2)),
    );
  }

  EnhancedAnalysisResult _generateDetailedAnalysis(DateTime now, HealthStatus healthStatus, GrowthStage growthStage, String? strainName) {
    final random = now.millisecond;

    List<SymptomDetection> symptoms = [];
    List<NutrientDeficiency> deficiencies = [];
    List<DiseaseDetection> diseases = [];
    List<PestDetection> pests = [];

    // Generate symptoms based on health status
    if (healthStatus != HealthStatus.healthy) {
      symptoms.add(SymptomDetection(
        symptom: _getRandomSymptom(random),
        category: _getSymptomCategory(random),
        severity: 0.3 + (random % 70) / 100.0,
        confidence: 0.7 + (random % 30) / 100.0,
        description: 'Detected during detailed image analysis',
        affectedAreas: ['Upper canopy', 'Fan leaves'],
      ));
    }

    // Generate deficiencies
    if (random % 3 == 0) {
      deficiencies.add(NutrientDeficiency(
        nutrient: _getRandomNutrient(random),
        type: 'deficiency',
        severity: 0.4 + (random % 60) / 100.0,
        confidence: 0.75 + (random % 25) / 100.0,
        visualSymptoms: [_getRandomSymptom(random + 1), 'Growth issues'],
        recommendations: [
          'Adjust nutrient levels',
          'Check pH balance',
          'Monitor plant response',
        ],
        urgency: random % 2 == 0 ? 'High' : 'Moderate',
      ));
    }

    // Generate diseases occasionally
    if (random % 10 == 0) {
      diseases.add(DiseaseDetection(
        diseaseName: 'Powdery Mildew',
        pathogenType: 'fungal',
        severity: 0.5 + (random % 50) / 100.0,
        confidence: 0.8 + (random % 20) / 100.0,
        symptoms: ['White powdery coating', 'Leaf yellowing'],
        treatmentSteps: [
          'Remove affected leaves',
          'Improve air circulation',
          'Apply fungicide',
        ],
        preventionMeasures: [
          'Maintain proper humidity',
          'Ensure good air flow',
          'Regular inspections',
        ],
      ));
    }

    return EnhancedAnalysisResult(
      overallHealth: healthStatus.name,
      healthStatus: healthStatus,
      confidence: 0.85 + (random % 15) / 100.0,
      growthStage: growthStage,
      analysisType: AnalysisType.detailed,
      analysisTimestamp: now,
      detectedSymptoms: symptoms,
      nutrientDeficiencies: deficiencies,
      detectedPests: pests,
      detectedDiseases: diseases,
      purpleStrainAnalysis: _generatePurpleStrainAnalysis(random, strainName),
      metrics: _generateEnhancedMetrics(random, healthStatus),
      immediateActions: _generateImmediateActions(random, healthStatus),
      longTermRecommendations: _generateLongTermRecommendations(random),
      environmentalAdjustments: _generateEnvironmentalAdjustments(random),
      requiresFollowUp: healthStatus != HealthStatus.healthy,
      recommendedFollowUpDate: now.add(const Duration(days: 3)),
    );
  }

  EnhancedAnalysisResult _generateQuickAnalysis(DateTime now, HealthStatus healthStatus, GrowthStage growthStage) {
    final random = now.millisecond;

    return EnhancedAnalysisResult(
      overallHealth: healthStatus.name,
      healthStatus: healthStatus,
      confidence: 0.75 + (random % 20) / 100.0,
      growthStage: growthStage,
      analysisType: AnalysisType.quick,
      analysisTimestamp: now,
      detectedSymptoms: healthStatus != HealthStatus.healthy ? [
        SymptomDetection(
          symptom: _getRandomSymptom(random),
          category: 'general',
          severity: 0.5,
          confidence: 0.7,
          description: 'Quick analysis detected issues',
        ),
      ] : [],
      nutrientDeficiencies: [],
      detectedPests: [],
      detectedDiseases: [],
      purpleStrainAnalysis: PurpleStrainAnalysis(
        isPurpleStrain: random % 8 == 0,
        confidence: 0.7 + (random % 20) / 100.0,
      ),
      metrics: EnhancedPlantMetrics(
        leafColorScore: 0.6 + (random % 40) / 100.0,
        leafHealthScore: 0.6 + (random % 40) / 100.0,
        overallVigorScore: 0.6 + (random % 40) / 100.0,
      ),
      immediateActions: healthStatus != HealthStatus.healthy
          ? ['Monitor closely', 'Consider detailed analysis']
          : [],
      requiresFollowUp: healthStatus == HealthStatus.stressed,
      recommendedFollowUpDate: now.add(const Duration(days: 7)),
    );
  }

  EnhancedAnalysisResult _generateLiveVisionAnalysis(DateTime now, HealthStatus healthStatus, GrowthStage growthStage) {
    final random = now.millisecond;

    return EnhancedAnalysisResult(
      overallHealth: healthStatus.name,
      healthStatus: healthStatus,
      confidence: 0.80 + (random % 15) / 100.0,
      growthStage: growthStage,
      analysisType: AnalysisType.liveVision,
      analysisTimestamp: now,
      detectedSymptoms: [],
      nutrientDeficiencies: [],
      detectedPests: [],
      detectedDiseases: [],
      purpleStrainAnalysis: PurpleStrainAnalysis(
        isPurpleStrain: false,
        confidence: 0.8,
      ),
      metrics: EnhancedPlantMetrics(
        leafColorScore: 0.7 + (random % 30) / 100.0,
        leafHealthScore: 0.7 + (random % 30) / 100.0,
        overallVigorScore: 0.7 + (random % 30) / 100.0,
      ),
      technicalDetails: {
        'analysis_type': 'real_time',
        'frame_rate': '30fps',
        'detection_confidence': 0.85,
        'processing_time': '<1s',
      },
      immediateActions: [],
      requiresFollowUp: false,
    );
  }

  PurpleStrainAnalysis _generatePurpleStrainAnalysis(int random, String? strainName) {
    final isGeneticallyPurple = strainName?.toLowerCase().contains('purple') == true ||
                             strainName?.toLowerCase().contains('gdp') == true ||
                             random % 10 == 0;

    return PurpleStrainAnalysis(
      isPurpleStrain: isGeneticallyPurple,
      confidence: 0.8 + (random % 20) / 100.0,
      purpleIndicators: isGeneticallyPurple
          ? ['Purple stems', 'Purple leaf veins', 'Genetic coloring']
          : [],
      deficiencyDifferentiators: isGeneticallyPurple
          ? ['No yellowing', 'Normal growth', 'Uniform coloring']
          : [],
      strainType: isGeneticallyPurple ? 'Indica-dominant' : null,
    );
  }

  EnhancedPlantMetrics _generateEnhancedMetrics(int random, HealthStatus healthStatus) {
    final baseScore = healthStatus == HealthStatus.healthy ? 0.8 :
                     healthStatus == HealthStatus.stressed ? 0.5 : 0.3;

    return EnhancedPlantMetrics(
      leafColorScore: baseScore + (random % 30) / 100.0,
      leafHealthScore: baseScore + (random % 30) / 100.0,
      growthRateScore: baseScore + (random % 40) / 100.0,
      pestDamageScore: healthStatus == HealthStatus.healthy ? 0.1 : (random % 40) / 100.0,
      nutrientDeficiencyScore: healthStatus == HealthStatus.critical ? 0.7 : (random % 30) / 100.0,
      diseaseScore: random % 10 == 0 ? 0.6 : 0.1,
      overallVigorScore: baseScore + (random % 30) / 100.0,
      structuralIntegrityScore: 0.7 + (random % 30) / 100.0,
      colorUniformityScore: 0.6 + (random % 40) / 100.0,
    );
  }

  List<String> _generateImmediateActions(int random, HealthStatus healthStatus) {
    if (healthStatus == HealthStatus.healthy) {
      return ['Continue current care regimen'];
    }

    final actions = [
      'Increase monitoring frequency',
      'Check environmental conditions',
      'Review nutrient schedule',
      'Inspect for pest activity',
    ];

    actions.shuffle();
    return actions.take(2 + (random % 2)).toList();
  }

  List<String> _generateLongTermRecommendations(int random) {
    final recommendations = [
      'Consider upgrading lighting system',
      'Implement regular monitoring schedule',
      'Add beneficial microbes to soil',
      'Consider training techniques',
      'Plan for future growth cycles',
      'Document all changes and results',
    ];

    recommendations.shuffle();
    return recommendations.take(2 + (random % 2)).toList();
  }

  List<String> _generateEnvironmentalAdjustments(int random) {
    final adjustments = [
      'Maintain temperature 68-78°F',
      'Keep humidity 40-60%',
      'Ensure proper air circulation',
      'Maintain pH 6.0-6.5',
      'Optimize light intensity',
      'Improve ventilation',
    ];

    adjustments.shuffle();
    return adjustments.take(2 + (random % 2)).toList();
  }

  List<String> _generateDefaultTags(HealthStatus healthStatus, AnalysisType analysisType, GrowthStage growthStage) {
    final tags = <String>[
      analysisType.name,
      growthStage.name,
    ];

    if (healthStatus != HealthStatus.healthy) {
      tags.add('needs_attention');
    }

    return tags;
  }

  String _getRandomSymptom(int seed) {
    final symptoms = [
      'Yellowing leaves',
      'Leaf spots',
      'Curling leaves',
      'Wilting',
      'Brown tips',
      'Stunted growth',
      'Discoloration',
      'Leaf drop',
    ];
    return symptoms[seed % symptoms.length];
  }

  String _getSymptomCategory(int seed) {
    final categories = ['color', 'spots', 'curling', 'wilting', 'growth'];
    return categories[seed % categories.length];
  }

  String _getRandomNutrient(int seed) {
    final nutrients = ['Nitrogen', 'Phosphorus', 'Potassium', 'Magnesium', 'Calcium', 'Iron'];
    return nutrients[seed % nutrients.length];
  }

  // Search and filter functionality
  void searchAnalyses(String query) {
    if (query.isEmpty) {
      state = state.copyWith(filteredAnalyses: state.analyses);
      return;
    }

    final filtered = state.analyses.where((analysis) {
      final searchLower = query.toLowerCase();
      return analysis.result.overallHealth.toLowerCase().contains(searchLower) ||
             (analysis.strainId?.toLowerCase().contains(searchLower) ?? false) ||
             analysis.tags.any((tag) => tag.toLowerCase().contains(searchLower)) ||
             analysis.result.detectedSymptoms.any((symptom) =>
                 symptom.symptom.toLowerCase().contains(searchLower));
    }).toList();

    state = state.copyWith(filteredAnalyses: filtered);
  }

  void filterByHealthStatus(List<HealthStatus> statuses) {
    if (statuses.isEmpty) {
      state = state.copyWith(filteredAnalyses: state.analyses);
      return;
    }

    final filtered = state.analyses.where((analysis) =>
        statuses.contains(analysis.result.healthStatus)).toList();

    state = state.copyWith(filteredAnalyses: filtered);
  }

  void filterByAnalysisType(List<AnalysisType> types) {
    if (types.isEmpty) {
      state = state.copyWith(filteredAnalyses: state.analyses);
      return;
    }

    final filtered = state.analyses.where((analysis) =>
        types.contains(analysis.result.analysisType)).toList();

    state = state.copyWith(filteredAnalyses: filtered);
  }

  void filterByTags(List<String> tags) {
    if (tags.isEmpty) {
      state = state.copyWith(filteredAnalyses: state.analyses);
      return;
    }

    final filtered = state.analyses.where((analysis) =>
        analysis.tags.any((tag) => tags.contains(tag))).toList();

    state = state.copyWith(filteredAnalyses: filtered);
  }

  void sortByDate({required bool ascending}) {
    final sorted = List<EnhancedPlantAnalysis>.from(state.filteredAnalyses);
    sorted.sort((a, b) => ascending
        ? a.timestamp.compareTo(b.timestamp)
        : b.timestamp.compareTo(a.timestamp));

    state = state.copyWith(filteredAnalyses: sorted);
  }

  void sortByHealthScore({required bool ascending}) {
    final sorted = List<EnhancedPlantAnalysis>.from(state.filteredAnalyses);
    sorted.sort((a, b) {
      final scoreA = a.result.metrics.getOverallHealthScore() ?? 0.0;
      final scoreB = b.result.metrics.getOverallHealthScore() ?? 0.0;
      return ascending ? scoreA.compareTo(scoreB) : scoreB.compareTo(scoreA);
    });

    state = state.copyWith(filteredAnalyses: sorted);
  }

  void deleteAnalysis(String id) {
    final updatedAnalyses = state.analyses.where((analysis) => analysis.id != id).toList();
    final updatedFiltered = state.filteredAnalyses.where((analysis) => analysis.id != id).toList();

    state = state.copyWith(
      analyses: updatedAnalyses,
      filteredAnalyses: updatedFiltered,
    );
  }

  void toggleBookmark(String id) {
    final updatedAnalyses = state.analyses.map((analysis) {
      if (analysis.id == id) {
        return analysis.copyWith(isBookmarked: !analysis.isBookmarked);
      }
      return analysis;
    }).toList();

    final updatedFiltered = state.filteredAnalyses.map((analysis) {
      if (analysis.id == id) {
        return analysis.copyWith(isBookmarked: !analysis.isBookmarked);
      }
      return analysis;
    }).toList();

    state = state.copyWith(
      analyses: updatedAnalyses,
      filteredAnalyses: updatedFiltered,
    );
  }

  void updateAnalysisNotes(String id, String notes) {
    final updatedAnalyses = state.analyses.map((analysis) {
      if (analysis.id == id) {
        return analysis.copyWith(notes: notes);
      }
      return analysis;
    }).toList();

    final updatedFiltered = state.filteredAnalyses.map((analysis) {
      if (analysis.id == id) {
        return analysis.copyWith(notes: notes);
      }
      return analysis;
    }).toList();

    state = state.copyWith(
      analyses: updatedAnalyses,
      filteredAnalyses: updatedFiltered,
    );
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

class EnhancedPlantAnalysisState {
  final List<EnhancedPlantAnalysis> analyses;
  final List<EnhancedPlantAnalysis> filteredAnalyses;
  final bool isLoading;
  final bool isAnalyzing;
  final String? error;
  final AnalysisType? currentAnalysisType;

  const EnhancedPlantAnalysisState({
    this.analyses = const [],
    this.filteredAnalyses = const [],
    this.isLoading = false,
    this.isAnalyzing = false,
    this.error,
    this.currentAnalysisType,
  });

  EnhancedPlantAnalysisState copyWith({
    List<EnhancedPlantAnalysis>? analyses,
    List<EnhancedPlantAnalysis>? filteredAnalyses,
    bool? isLoading,
    bool? isAnalyzing,
    String? error,
    AnalysisType? currentAnalysisType,
  }) {
    return EnhancedPlantAnalysisState(
      analyses: analyses ?? this.analyses,
      filteredAnalyses: filteredAnalyses ?? this.filteredAnalyses,
      isLoading: isLoading ?? this.isLoading,
      isAnalyzing: isAnalyzing ?? this.isAnalyzing,
      error: error,
      currentAnalysisType: currentAnalysisType ?? this.currentAnalysisType,
    );
  }

  int get bookmarkedCount => analyses.where((analysis) => analysis.isBookmarked).length;

  List<EnhancedPlantAnalysis> get recentAnalyses {
    final sorted = List<EnhancedPlantAnalysis>.from(analyses);
    sorted.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return sorted.take(5).toList();
  }

  Map<HealthStatus, int> get healthStatusCounts {
    final counts = <HealthStatus, int>{};
    for (final analysis in analyses) {
      counts[analysis.result.healthStatus] = (counts[analysis.result.healthStatus] ?? 0) + 1;
    }
    return counts;
  }
}