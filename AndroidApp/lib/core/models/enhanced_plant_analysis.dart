import 'package:json_annotation/json_annotation.dart';

part 'enhanced_plant_analysis.g.dart';

enum HealthStatus { healthy, stressed, critical, unknown }
enum GrowthStage { seedling, vegetative, flowering, harvesting, drying }
enum AnalysisType { quick, detailed, trichome, liveVision }

@JsonSerializable()
class SymptomDetection {
  final String symptom;
  final String category; // 'color', 'spots', 'curling', 'wilting', 'growth'
  final double severity; // 0.0 to 1.0
  final double confidence; // 0.0 to 1.0
  final String? description;
  final List<String>? affectedAreas;
  final Map<String, dynamic>? metadata;

  SymptomDetection({
    required this.symptom,
    required this.category,
    required this.severity,
    required this.confidence,
    this.description,
    this.affectedAreas,
    this.metadata,
  });

  factory SymptomDetection.fromJson(Map<String, dynamic> json) =>
      _$SymptomDetectionFromJson(json);

  Map<String, dynamic> toJson() => _$SymptomDetectionToJson(this);
}

@JsonSerializable()
class NutrientDeficiency {
  final String nutrient;
  final String type; // 'deficiency', 'toxicity'
  final double severity; // 0.0 to 1.0
  final double confidence; // 0.0 to 1.0
  final List<String> visualSymptoms;
  final List<String> recommendations;
  final String? urgency;

  NutrientDeficiency({
    required this.nutrient,
    required this.type,
    required this.severity,
    required this.confidence,
    required this.visualSymptoms,
    required this.recommendations,
    this.urgency,
  });

  factory NutrientDeficiency.fromJson(Map<String, dynamic> json) =>
      _$NutrientDeficiencyFromJson(json);

  Map<String, dynamic> toJson() => _$NutrientDeficiencyToJson(this);
}

@JsonSerializable()
class PestDetection {
  final String pestName;
  final String pestType; // 'insect', 'mite', 'fungus', 'bacteria'
  final double severity; // 0.0 to 1.0
  final double confidence; // 0.0 to 1.0
  final List<String> visibleSigns;
  final List<String> treatmentOptions;
  final String? lifeStage;
  final bool isContagious;

  PestDetection({
    required this.pestName,
    required this.pestType,
    required this.severity,
    required this.confidence,
    required this.visibleSigns,
    required this.treatmentOptions,
    this.lifeStage,
    this.isContagious = false,
  });

  factory PestDetection.fromJson(Map<String, dynamic> json) =>
      _$PestDetectionFromJson(json);

  Map<String, dynamic> toJson() => _$PestDetectionToJson(this);
}

@JsonSerializable()
class DiseaseDetection {
  final String diseaseName;
  final String pathogenType; // 'fungal', 'bacterial', 'viral'
  final double severity; // 0.0 to 1.0
  final double confidence; // 0.0 to 1.0
  final List<String> symptoms;
  final List<String> treatmentSteps;
  final List<String> preventionMeasures;
  final String? environmentalFactors;
  final bool isTreatable;

  DiseaseDetection({
    required this.diseaseName,
    required this.pathogenType,
    required this.severity,
    required this.confidence,
    required this.symptoms,
    required this.treatmentSteps,
    required this.preventionMeasures,
    this.environmentalFactors,
    this.isTreatable = true,
  });

  factory DiseaseDetection.fromJson(Map<String, dynamic> json) =>
      _$DiseaseDetectionFromJson(json);

  Map<String, dynamic> toJson() => _$DiseaseDetectionToJson(this);
}

@JsonSerializable()
class PurpleStrainAnalysis {
  final bool isPurpleStrain;
  final double confidence; // 0.0 to 1.0
  final List<String> purpleIndicators;
  final List<String> deficiencyDifferentiators;
  final String? strainType;
  final String? geneticBackground;

  PurpleStrainAnalysis({
    required this.isPurpleStrain,
    required this.confidence,
    this.purpleIndicators = const [],
    this.deficiencyDifferentiators = const [],
    this.strainType,
    this.geneticBackground,
  });

  factory PurpleStrainAnalysis.fromJson(Map<String, dynamic> json) =>
      _$PurpleStrainAnalysisFromJson(json);

  Map<String, dynamic> toJson() => _$PurpleStrainAnalysisToJson(this);
}

@JsonSerializable()
class EnhancedPlantMetrics {
  final double? leafColorScore;
  final double? leafHealthScore;
  final double? growthRateScore;
  final double? pestDamageScore;
  final double? nutrientDeficiencyScore;
  final double? diseaseScore;
  final double? overallVigorScore;
  final double? structuralIntegrityScore;
  final double? colorUniformityScore;
  final double? leafSizeScore;
  final double? branchingScore;
  final Map<String, double>? customMetrics;

  EnhancedPlantMetrics({
    this.leafColorScore,
    this.leafHealthScore,
    this.growthRateScore,
    this.pestDamageScore,
    this.nutrientDeficiencyScore,
    this.diseaseScore,
    this.overallVigorScore,
    this.structuralIntegrityScore,
    this.colorUniformityScore,
    this.leafSizeScore,
    this.branchingScore,
    this.customMetrics,
  });

  factory EnhancedPlantMetrics.fromJson(Map<String, dynamic> json) =>
      _$EnhancedPlantMetricsFromJson(json);

  Map<String, dynamic> toJson() => _$EnhancedPlantMetricsToJson(this);

  double? getOverallHealthScore() {
    final scores = [
      leafColorScore,
      leafHealthScore,
      growthRateScore,
      structuralIntegrityScore,
      colorUniformityScore,
    ].where((score) => score != null);

    if (scores.isEmpty) return null;
    return scores.reduce((a, b) => a! + b!) / scores.length;
  }
}

@JsonSerializable()
class TrichomeAnalysis {
  final String trichomeStage; // 'clear', 'cloudy', 'amber', 'mixed'
  final double clarityPercentage; // 0.0 to 100.0
  final double cloudinessPercentage; // 0.0 to 100.0
  final double amberPercentage; // 0.0 to 100.0
  final double harvestReadinessScore; // 0.0 to 1.0
  final double trichomeDensity; // trichomes per mm²
  final String magnificationLevel;
  final List<String> maturityIndicators;
  final DateTime? optimalHarvestDate;
  final List<String> harvestRecommendations;

  TrichomeAnalysis({
    required this.trichomeStage,
    required this.clarityPercentage,
    required this.cloudinessPercentage,
    required this.amberPercentage,
    required this.harvestReadinessScore,
    required this.trichomeDensity,
    required this.magnificationLevel,
    this.maturityIndicators = const [],
    this.optimalHarvestDate,
    this.harvestRecommendations = const [],
  });

  factory TrichomeAnalysis.fromJson(Map<String, dynamic> json) =>
      _$TrichomeAnalysisFromJson(json);

  Map<String, dynamic> toJson() => _$TrichomeAnalysisToJson(this);
}

@JsonSerializable()
class AnalysisProgress {
  final String currentStep;
  final int currentStepIndex;
  final int totalSteps;
  final double progressPercentage;
  final String? stepDescription;
  final Map<String, dynamic>? stepDetails;

  AnalysisProgress({
    required this.currentStep,
    required this.currentStepIndex,
    required this.totalSteps,
    required this.progressPercentage,
    this.stepDescription,
    this.stepDetails,
  });

  factory AnalysisProgress.fromJson(Map<String, dynamic> json) =>
      _$AnalysisProgressFromJson(json);

  Map<String, dynamic> toJson() => _$AnalysisProgressToJson(this);
}

@JsonSerializable()
class EnhancedAnalysisResult {
  final String overallHealth;
  final HealthStatus healthStatus;
  final double confidence;
  final GrowthStage? growthStage;
  final AnalysisType analysisType;
  final DateTime analysisTimestamp;
  final List<SymptomDetection> detectedSymptoms;
  final List<NutrientDeficiency> nutrientDeficiencies;
  final List<PestDetection> detectedPests;
  final List<DiseaseDetection> detectedDiseases;
  final PurpleStrainAnalysis purpleStrainAnalysis;
  final EnhancedPlantMetrics metrics;
  final TrichomeAnalysis? trichomeAnalysis;
  final String? recommendedAction;
  final List<String> immediateActions;
  final List<String> longTermRecommendations;
  final List<String> environmentalAdjustments;
  final bool requiresFollowUp;
  final DateTime? recommendedFollowUpDate;
  final Map<String, dynamic>? technicalDetails;

  EnhancedAnalysisResult({
    required this.overallHealth,
    required this.healthStatus,
    required this.confidence,
    this.growthStage,
    required this.analysisType,
    required this.analysisTimestamp,
    this.detectedSymptoms = const [],
    this.nutrientDeficiencies = const [],
    this.detectedPests = const [],
    this.detectedDiseases = const [],
    required this.purpleStrainAnalysis,
    required this.metrics,
    this.trichomeAnalysis,
    this.recommendedAction,
    this.immediateActions = const [],
    this.longTermRecommendations = const [],
    this.environmentalAdjustments = const [],
    this.requiresFollowUp = false,
    this.recommendedFollowUpDate,
    this.technicalDetails,
  });

  factory EnhancedAnalysisResult.fromJson(Map<String, dynamic> json) =>
      _$EnhancedAnalysisResultFromJson(json);

  Map<String, dynamic> toJson() => _$EnhancedAnalysisResultToJson(this);

  bool get hasIssues =>
      detectedSymptoms.isNotEmpty ||
      nutrientDeficiencies.isNotEmpty ||
      detectedPests.isNotEmpty ||
      detectedDiseases.isNotEmpty;

  int get totalIssuesDetected =>
      detectedSymptoms.length +
      nutrientDeficiencies.length +
      detectedPests.length +
      detectedDiseases.length;

  double get severityScore {
    double totalSeverity = 0;
    int count = 0;

    for (final symptom in detectedSymptoms) {
      totalSeverity += symptom.severity;
      count++;
    }

    for (final deficiency in nutrientDeficiencies) {
      totalSeverity += deficiency.severity;
      count++;
    }

    for (final pest in detectedPests) {
      totalSeverity += pest.severity;
      count++;
    }

    for (final disease in detectedDiseases) {
      totalSeverity += disease.severity;
      count++;
    }

    return count > 0 ? totalSeverity / count : 0.0;
  }
}

@JsonSerializable()
class ImageMetadata {
  final String originalPath;
  final String compressedPath;
  final int fileSize;
  final int width;
  final int height;
  final String format;
  final double? exifFocalLength;
  final double? exifAperture;
  final double? exifExposureTime;
  final int? exifISO;
  final DateTime? capturedAt;
  final Map<String, dynamic>? customMetadata;

  ImageMetadata({
    required this.originalPath,
    required this.compressedPath,
    required this.fileSize,
    required this.width,
    required this.height,
    required this.format,
    this.exifFocalLength,
    this.exifAperture,
    this.exifExposureTime,
    this.exifISO,
    this.capturedAt,
    this.customMetadata,
  });

  factory ImageMetadata.fromJson(Map<String, dynamic> json) =>
      _$ImageMetadataFromJson(json);

  Map<String, dynamic> toJson() => _$ImageMetadataToJson(this);
}

@JsonSerializable()
class EnhancedPlantAnalysis {
  final String id;
  final String userId;
  final String? strainId;
  final String imageUrl;
  final ImageMetadata? imageMetadata;
  final DateTime timestamp;
  final EnhancedAnalysisResult result;
  final String? notes;
  final bool isBookmarked;
  final Map<String, dynamic>? metadata;
  final List<String> tags;
  final String? locationIdentifier;
  final Map<String, dynamic>? environmentalContext;

  EnhancedPlantAnalysis({
    required this.id,
    required this.userId,
    this.strainId,
    required this.imageUrl,
    this.imageMetadata,
    required this.timestamp,
    required this.result,
    this.notes,
    this.isBookmarked = false,
    this.metadata,
    this.tags = const [],
    this.locationIdentifier,
    this.environmentalContext,
  });

  factory EnhancedPlantAnalysis.fromJson(Map<String, dynamic> json) =>
      _$EnhancedPlantAnalysisFromJson(json);

  Map<String, dynamic> toJson() => _$EnhancedPlantAnalysisToJson(this);

  EnhancedPlantAnalysis copyWith({
    String? id,
    String? userId,
    String? strainId,
    String? imageUrl,
    ImageMetadata? imageMetadata,
    DateTime? timestamp,
    EnhancedAnalysisResult? result,
    String? notes,
    bool? isBookmarked,
    Map<String, dynamic>? metadata,
    List<String>? tags,
    String? locationIdentifier,
    Map<String, dynamic>? environmentalContext,
  }) {
    return EnhancedPlantAnalysis(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      strainId: strainId ?? this.strainId,
      imageUrl: imageUrl ?? this.imageUrl,
      imageMetadata: imageMetadata ?? this.imageMetadata,
      timestamp: timestamp ?? this.timestamp,
      result: result ?? this.result,
      notes: notes ?? this.notes,
      isBookmarked: isBookmarked ?? this.isBookmarked,
      metadata: metadata ?? this.metadata,
      tags: tags ?? this.tags,
      locationIdentifier: locationIdentifier ?? this.locationIdentifier,
      environmentalContext: environmentalContext ?? this.environmentalContext,
    );
  }

  @override
  String toString() {
    return 'EnhancedPlantAnalysis(id: $id, userId: $userId, strainId: $strainId, imageUrl: $imageUrl, timestamp: $timestamp, health: ${result.overallHealth}, confidence: ${result.confidence})';
  }
}