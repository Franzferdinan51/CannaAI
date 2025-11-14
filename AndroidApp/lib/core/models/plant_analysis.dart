import 'package:json_annotation/json_annotation.dart';

part 'plant_analysis.g.dart';

@JsonSerializable()
class PlantAnalysis {
  final String id;
  final String userId;
  final String? strainId;
  final String imageUrl;
  final DateTime timestamp;
  final AnalysisResult result;
  final String? notes;
  final bool isBookmarked;
  final Map<String, dynamic>? metadata;

  PlantAnalysis({
    required this.id,
    required this.userId,
    this.strainId,
    required this.imageUrl,
    required this.timestamp,
    required this.result,
    this.notes,
    this.isBookmarked = false,
    this.metadata,
  });

  factory PlantAnalysis.fromJson(Map<String, dynamic> json) =>
      _$PlantAnalysisFromJson(json);

  Map<String, dynamic> toJson() => _$PlantAnalysisToJson(this);

  PlantAnalysis copyWith({
    String? id,
    String? userId,
    String? strainId,
    String? imageUrl,
    DateTime? timestamp,
    AnalysisResult? result,
    String? notes,
    bool? isBookmarked,
    Map<String, dynamic>? metadata,
  }) {
    return PlantAnalysis(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      strainId: strainId ?? this.strainId,
      imageUrl: imageUrl ?? this.imageUrl,
      timestamp: timestamp ?? this.timestamp,
      result: result ?? this.result,
      notes: notes ?? this.notes,
      isBookmarked: isBookmarked ?? this.isBookmarked,
      metadata: metadata ?? this.metadata,
    );
  }

  @override
  String toString() {
    return 'PlantAnalysis(id: $id, userId: $userId, strainId: $strainId, imageUrl: $imageUrl, timestamp: $timestamp, result: $result, notes: $notes, isBookmarked: $isBookmarked)';
  }
}

@JsonSerializable()
class AnalysisResult {
  final String overallHealth; // 'healthy', 'stressed', 'critical'
  final double confidence; // 0.0 to 1.0
  final List<String> detectedIssues;
  final List<String> detectedDeficiencies;
  final List<String> detectedDiseases;
  final List<String> detectedPests;
  final String? growthStage;
  final String? recommendedAction;
  final List<String> recommendations;
  final PlantMetrics metrics;
  final bool isPurpleStrain;

  AnalysisResult({
    required this.overallHealth,
    required this.confidence,
    this.detectedIssues = const [],
    this.detectedDeficiencies = const [],
    this.detectedDiseases = const [],
    this.detectedPests = const [],
    this.growthStage,
    this.recommendedAction,
    this.recommendations = const [],
    required this.metrics,
    this.isPurpleStrain = false,
  });

  factory AnalysisResult.fromJson(Map<String, dynamic> json) =>
      _$AnalysisResultFromJson(json);

  Map<String, dynamic> toJson() => _$AnalysisResultToJson(this);

  AnalysisResult copyWith({
    String? overallHealth,
    double? confidence,
    List<String>? detectedIssues,
    List<String>? detectedDeficiencies,
    List<String>? detectedDiseases,
    List<String>? detectedPests,
    String? growthStage,
    String? recommendedAction,
    List<String>? recommendations,
    PlantMetrics? metrics,
    bool? isPurpleStrain,
  }) {
    return AnalysisResult(
      overallHealth: overallHealth ?? this.overallHealth,
      confidence: confidence ?? this.confidence,
      detectedIssues: detectedIssues ?? this.detectedIssues,
      detectedDeficiencies: detectedDeficiencies ?? this.detectedDeficiencies,
      detectedDiseases: detectedDiseases ?? this.detectedDiseases,
      detectedPests: detectedPests ?? this.detectedPests,
      growthStage: growthStage ?? this.growthStage,
      recommendedAction: recommendedAction ?? this.recommendedAction,
      recommendations: recommendations ?? this.recommendations,
      metrics: metrics ?? this.metrics,
      isPurpleStrain: isPurpleStrain ?? this.isPurpleStrain,
    );
  }

  @override
  String toString() {
    return 'AnalysisResult(overallHealth: $overallHealth, confidence: $confidence, detectedIssues: $detectedIssues, detectedDeficiencies: $detectedDeficiencies, detectedDiseases: $detectedDiseases, detectedPests: $detectedPests, growthStage: $growthStage, recommendedAction: $recommendedAction, recommendations: $recommendations, metrics: $metrics, isPurpleStrain: $isPurpleStrain)';
  }
}

@JsonSerializable()
class PlantMetrics {
  final double? leafColorScore; // 0.0 to 1.0
  final double? leafHealthScore; // 0.0 to 1.0
  final double? growthRateScore; // 0.0 to 1.0
  final double? pestDamageScore; // 0.0 to 1.0 (higher is worse)
  final double? nutrientDeficiencyScore; // 0.0 to 1.0 (higher is worse)
  final double? diseaseScore; // 0.0 to 1.0 (higher is worse)
  final double? overallVigorScore; // 0.0 to 1.0
  final Map<String, double>? customMetrics;

  PlantMetrics({
    this.leafColorScore,
    this.leafHealthScore,
    this.growthRateScore,
    this.pestDamageScore,
    this.nutrientDeficiencyScore,
    this.diseaseScore,
    this.overallVigorScore,
    this.customMetrics,
  });

  factory PlantMetrics.fromJson(Map<String, dynamic> json) =>
      _$PlantMetricsFromJson(json);

  Map<String, dynamic> toJson() => _$PlantMetricsToJson(this);

  PlantMetrics copyWith({
    double? leafColorScore,
    double? leafHealthScore,
    double? growthRateScore,
    double? pestDamageScore,
    double? nutrientDeficiencyScore,
    double? diseaseScore,
    double? overallVigorScore,
    Map<String, double>? customMetrics,
  }) {
    return PlantMetrics(
      leafColorScore: leafColorScore ?? this.leafColorScore,
      leafHealthScore: leafHealthScore ?? this.leafHealthScore,
      growthRateScore: growthRateScore ?? this.growthRateScore,
      pestDamageScore: pestDamageScore ?? this.pestDamageScore,
      nutrientDeficiencyScore: nutrientDeficiencyScore ?? this.nutrientDeficiencyScore,
      diseaseScore: diseaseScore ?? this.diseaseScore,
      overallVigorScore: overallVigorScore ?? this.overallVigorScore,
      customMetrics: customMetrics ?? this.customMetrics,
    );
  }

  @override
  String toString() {
    return 'PlantMetrics(leafColorScore: $leafColorScore, leafHealthScore: $leafHealthScore, growthRateScore: $growthRateScore, pestDamageScore: $pestDamageScore, nutrientDeficiencyScore: $nutrientDeficiencyScore, diseaseScore: $diseaseScore, overallVigorScore: $overallVigorScore, customMetrics: $customMetrics)';
  }
}

@JsonSerializable()
class StrainProfile {
  final String id;
  final String name;
  final String type; // 'Sativa', 'Indica', 'Hybrid', 'CBD-dominant'
  final List<String> characteristics;
  final Map<String, dynamic> idealConditions;
  final List<String> commonIssues;
  final List<String> recommendations;
  final String? description;
  final List<String> images;
  final DateTime createdAt;
  final DateTime updatedAt;

  StrainProfile({
    required this.id,
    required this.name,
    required this.type,
    this.characteristics = const [],
    this.idealConditions = const {},
    this.commonIssues = const [],
    this.recommendations = const [],
    this.description,
    this.images = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  factory StrainProfile.fromJson(Map<String, dynamic> json) =>
      _$StrainProfileFromJson(json);

  Map<String, dynamic> toJson() => _$StrainProfileToJson(this);

  StrainProfile copyWith({
    String? id,
    String? name,
    String? type,
    List<String>? characteristics,
    Map<String, dynamic>? idealConditions,
    List<String>? commonIssues,
    List<String>? recommendations,
    String? description,
    List<String>? images,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return StrainProfile(
      id: id ?? this.id,
      name: name ?? this.name,
      type: type ?? this.type,
      characteristics: characteristics ?? this.characteristics,
      idealConditions: idealConditions ?? this.idealConditions,
      commonIssues: commonIssues ?? this.commonIssues,
      recommendations: recommendations ?? this.recommendations,
      description: description ?? this.description,
      images: images ?? this.images,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  String toString() {
    return 'StrainProfile(id: $id, name: $name, type: $type, characteristics: $characteristics, idealConditions: $idealConditions, commonIssues: $commonIssues, recommendations: $recommendations, description: $description, images: $images, createdAt: $createdAt, updatedAt: $updatedAt)';
  }
}