import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/plant_analysis.dart';

// Mock plant analysis provider
final plantAnalysisProvider = StateNotifierProvider<PlantAnalysisNotifier, PlantAnalysisState>((ref) {
  return PlantAnalysisNotifier();
});

class PlantAnalysisNotifier extends StateNotifier<PlantAnalysisState> {
  PlantAnalysisNotifier() : super(const PlantAnalysisState()) {
    _loadMockAnalyses();
  }

  void _loadMockAnalyses() {
    final mockAnalyses = [
      PlantAnalysis(
        id: '1',
        userId: 'user_001',
        imageUrl: 'assets/mock_images/plant1.jpg',
        timestamp: DateTime.now().subtract(const Duration(hours: 2)),
        result: AnalysisResult(
          overallHealth: 'stressed',
          confidence: 0.87,
          detectedIssues: ['Yellowing leaves', 'Nutrient deficiency'],
          detectedDeficiencies: ['Nitrogen'],
          recommendations: [
            'Increase nitrogen levels in nutrient solution',
            'Check pH levels (target: 6.0-6.5)',
            'Monitor for pest activity',
          ],
          metrics: PlantMetrics(
            leafColorScore: 0.6,
            leafHealthScore: 0.7,
            growthRateScore: 0.5,
            overallVigorScore: 0.6,
          ),
        ),
      ),
      PlantAnalysis(
        id: '2',
        userId: 'user_001',
        imageUrl: 'assets/mock_images/plant2.jpg',
        timestamp: DateTime.now().subtract(const Duration(days: 1)),
        result: AnalysisResult(
          overallHealth: 'healthy',
          confidence: 0.95,
          detectedIssues: ['Healthy growth'],
          recommendations: [
            'Continue current nutrient regimen',
            'Monitor for signs of flowering',
            'Maintain optimal humidity levels',
          ],
          metrics: PlantMetrics(
            leafColorScore: 0.9,
            leafHealthScore: 0.95,
            growthRateScore: 0.85,
            overallVigorScore: 0.9,
          ),
        ),
      ),
      PlantAnalysis(
        id: '3',
        userId: 'user_001',
        imageUrl: 'assets/mock_images/plant3.jpg',
        timestamp: DateTime.now().subtract(const Duration(days: 3)),
        result: AnalysisResult(
          overallHealth: 'critical',
          confidence: 0.92,
          detectedIssues: ['Leaf spots', 'Possible mold'],
          detectedDiseases: ['Powdery mildew'],
          recommendations: [
            'Increase air circulation',
            'Reduce humidity levels',
            'Remove affected leaves carefully',
            'Consider fungicide treatment',
          ],
          metrics: PlantMetrics(
            leafColorScore: 0.4,
            leafHealthScore: 0.3,
            growthRateScore: 0.2,
            diseaseScore: 0.8,
            overallVigorScore: 0.3,
          ),
        ),
      ),
    ];

    state = state.copyWith(analyses: mockAnalyses, isLoading: false);
  }

  Future<void> analyzePlant(String imagePath, String strain) async {
    state = state.copyWith(isAnalyzing: true, error: null);

    try {
      // Simulate API call delay
      await Future.delayed(const Duration(seconds: 3));

      // Mock analysis result
      final newAnalysis = PlantAnalysis(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        userId: 'user_001',
        imageUrl: imagePath,
        timestamp: DateTime.now(),
        result: AnalysisResult(
          overallHealth: _generateMockHealthStatus(),
          confidence: 0.8 + (DateTime.now().millisecond % 20) / 100,
          detectedIssues: _generateMockSymptoms(),
          detectedDeficiencies: _generateMockDeficiencies(),
          detectedDiseases: _generateMockDiseases(),
          growthStage: _generateMockGrowthStage(),
          recommendations: _generateMockRecommendations(),
          metrics: PlantMetrics(
            leafColorScore: 0.5 + (DateTime.now().millisecond % 50) / 100,
            leafHealthScore: 0.5 + (DateTime.now().millisecond % 50) / 100,
            growthRateScore: 0.5 + (DateTime.now().millisecond % 50) / 100,
            overallVigorScore: 0.5 + (DateTime.now().millisecond % 50) / 100,
          ),
        ),
      );

      final updatedAnalyses = [newAnalysis, ...state.analyses];
      state = state.copyWith(
        analyses: updatedAnalyses,
        isAnalyzing: false,
      );
    } catch (e) {
      state = state.copyWith(
        isAnalyzing: false,
        error: 'Analysis failed: ${e.toString()}',
      );
    }
  }

  void deleteAnalysis(String id) {
    final updatedAnalyses = state.analyses.where((analysis) => analysis.id != id).toList();
    state = state.copyWith(analyses: updatedAnalyses);
  }

  void clearError() {
    state = state.copyWith(error: null);
  }

  List<String> _generateMockSymptoms() {
    final allSymptoms = [
      'Healthy growth',
      'Vibrant green leaves',
      'Good leaf structure',
      'Yellowing leaves',
      'Nutrient deficiency',
      'Leaf spots',
      'Possible mold',
      'Pest damage',
      'Overwatering signs',
      'Underwatering signs',
      'Light burn',
      'Good bud development',
    ];

    allSymptoms.shuffle();
    return allSymptoms.take(1 + (DateTime.now().millisecond % 3)).toList();
  }

  List<String> _generateMockDeficiencies() {
    final deficiencies = ['Nitrogen', 'Phosphorus', 'Potassium', 'Magnesium', 'Calcium'];
    deficiencies.shuffle();
    return DateTime.now().millisecond % 3 == 0
        ? [deficiencies.first]
        : [];
  }

  List<String> _generateMockDiseases() {
    final diseases = ['Powdery mildew', 'Root rot', 'Leaf spot', 'Bud rot'];
    diseases.shuffle();
    return DateTime.now().millisecond % 4 == 0
        ? [diseases.first]
        : [];
  }

  List<String> _generateMockRecommendations() {
    final allRecommendations = [
      'Continue current nutrient regimen',
      'Monitor pH levels (target: 6.0-6.5)',
      'Increase air circulation',
      'Reduce humidity levels',
      'Increase nitrogen levels',
      'Check for pests regularly',
      'Maintain optimal temperature',
      'Adjust lighting schedule',
      'Water when soil is dry',
      'Monitor for signs of flowering',
    ];

    allRecommendations.shuffle();
    return allRecommendations.take(2 + (DateTime.now().millisecond % 3)).toList();
  }

  String _generateMockHealthStatus() {
    final statuses = ['healthy', 'stressed', 'critical'];
    return statuses[DateTime.now().millisecond % statuses.length];
  }

  String? _generateMockGrowthStage() {
    final stages = ['vegetative', 'flowering', 'seedling'];
    return stages[DateTime.now().millisecond % stages.length];
  }
}

class PlantAnalysisState {
  final List<PlantAnalysis> analyses;
  final bool isLoading;
  final bool isAnalyzing;
  final String? error;

  const PlantAnalysisState({
    this.analyses = const [],
    this.isLoading = false,
    this.isAnalyzing = false,
    this.error,
  });

  PlantAnalysisState copyWith({
    List<PlantAnalysis>? analyses,
    bool? isLoading,
    bool? isAnalyzing,
    String? error,
  }) {
    return PlantAnalysisState(
      analyses: analyses ?? this.analyses,
      isLoading: isLoading ?? this.isLoading,
      isAnalyzing: isAnalyzing ?? this.isAnalyzing,
      error: error ?? this.error,
    );
  }
}