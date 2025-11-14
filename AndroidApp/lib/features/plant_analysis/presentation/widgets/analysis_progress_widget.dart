import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../../core/models/enhanced_plant_analysis.dart';

typedef OnAnalysisStepChanged = void Function(AnalysisProgress progress);
typedef OnAnalysisCompleted = void Function(EnhancedAnalysisResult result);
typedef OnAnalysisCancelled = void Function();

class AnalysisProgressWidget extends StatefulWidget {
  final AnalysisType analysisType;
  final String imagePath;
  final String? strainName;
  final Map<String, dynamic>? analysisParameters;
  final OnAnalysisStepChanged? onStepChanged;
  final OnAnalysisCompleted? onCompleted;
  final OnAnalysisCancelled? onCancelled;
  final Duration estimatedDuration;

  const AnalysisProgressWidget({
    super.key,
    required this.analysisType,
    required this.imagePath,
    this.strainName,
    this.analysisParameters,
    this.onStepChanged,
    this.onCompleted,
    this.onCancelled,
    this.estimatedDuration = const Duration(seconds: 15),
  });

  @override
  State<AnalysisProgressWidget> createState() => _AnalysisProgressWidgetState();
}

class _AnalysisProgressWidgetState extends State<AnalysisProgressWidget>
    with TickerProviderStateMixin {
  late AnimationController _progressController;
  late AnimationController _pulseController;
  late Animation<double> _progressAnimation;
  late Animation<double> _pulseAnimation;

  List<AnalysisStep> _steps = [];
  int _currentStepIndex = 0;
  bool _isCompleted = false;
  bool _isCancelled = false;
  String? _errorMessage;

  late Timer _analysisTimer;

  @override
  void initState() {
    super.initState();

    _progressController = AnimationController(
      duration: widget.estimatedDuration,
      vsync: this,
    );

    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _progressAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _progressController,
      curve: Curves.easeInOut,
    ));

    _pulseAnimation = Tween<double>(
      begin: 1.0,
      end: 1.1,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));

    _initializeSteps();
    _startAnalysis();
  }

  @override
  void dispose() {
    _analysisTimer.cancel();
    _progressController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  void _initializeSteps() {
    switch (widget.analysisType) {
      case AnalysisType.quick:
        _steps = [
          AnalysisStep('Image Preprocessing', 'Resizing and optimizing image', Icons.image),
          AnalysisStep('Initial Analysis', 'Basic health assessment', Icons.search),
          AnalysisStep('Health Scoring', 'Calculating overall health score', Icons.analytics),
          AnalysisStep('Generating Report', 'Creating recommendations', Icons.description),
        ];
        break;

      case AnalysisType.detailed:
        _steps = [
          AnalysisStep('Image Validation', 'Checking image quality and focus', Icons.check_circle),
          AnalysisStep('Color Analysis', 'Analyzing color distribution and patterns', Icons.palette),
          AnalysisStep('Symptom Detection', 'Identifying visual symptoms and issues', Icons.warning),
          AnalysisStep('Nutrient Analysis', 'Checking for nutrient deficiencies', Icons.eco),
          AnalysisStep('Pest Detection', 'Scanning for pest indicators', Icons.bug_report),
          AnalysisStep('Disease Screening', 'Looking for disease patterns', Icons.coronavirus),
          AnalysisStep('Purple Strain Check', 'Differentiating from deficiencies', Icons.grain),
          AnalysisStep('Comprehensive Scoring', 'Calculating detailed metrics', Icons.analytics),
          AnalysisStep('Recommendation Engine', 'Generating personalized advice', Icons.lightbulb),
          AnalysisStep('Final Report', 'Creating detailed analysis report', Icons.description),
        ];
        break;

      case AnalysisType.trichome:
        _steps = [
          AnalysisStep('Microscope Calibration', 'Setting magnification levels', Icons.settings),
          AnalysisStep('Focus Adjustment', 'Optimizing focus for trichomes', Icons.center_focus_strong),
          AnalysisStep('Trichome Detection', 'Identifying individual trichomes', Icons.grain),
          AnalysisStep('Maturity Analysis', 'Assessing trichome development', Icons.bubble_chart),
          AnalysisStep('Density Calculation', 'Measuring trichome coverage', Icons.grid_on),
          AnalysisStep('Harvest Readiness', 'Evaluating optimal harvest time', Icons.schedule),
          AnalysisStep('Technical Report', 'Generating detailed findings', Icons.biotech),
        ];
        break;

      case AnalysisType.liveVision:
        _steps = [
          AnalysisStep('Camera Setup', 'Initializing live vision mode', Icons.camera),
          AnalysisStep('Frame Analysis', 'Processing current frame', Icons.speed),
          AnalysisStep('Change Detection', 'Comparing with previous frames', Icons.compare),
          AnalysisStep('Health Monitoring', 'Continuous health assessment', Icons.favorite),
          AnalysisStep('Alert Processing', 'Checking for alert conditions', Icons.notifications),
          AnalysisStep('Real-time Updates', 'Updating health status', Icons.update),
        ];
        break;
    }
  }

  void _startAnalysis() {
    _progressController.forward();
    _pulseController.repeat(reverse: true);

    _analysisTimer = Timer.periodic(
      Duration(milliseconds: widget.estimatedDuration.inMilliseconds ~/ _steps.length),
      (timer) {
        if (_currentStepIndex < _steps.length - 1) {
          _nextStep();
        } else {
          _completeAnalysis();
          timer.cancel();
        }
      },
    );

    // Simulate random errors for demonstration
    if (math.Random().nextDouble() < 0.1) {
      Timer(Duration(milliseconds: widget.estimatedDuration.inMilliseconds ~/ 3), () {
        _simulateError();
      });
    }
  }

  void _nextStep() {
    if (_currentStepIndex < _steps.length - 1) {
      setState(() {
        _currentStepIndex++;
      });

      final progress = AnalysisProgress(
        currentStep: _steps[_currentStepIndex].title,
        currentStepIndex: _currentStepIndex,
        totalSteps: _steps.length,
        progressPercentage: (_currentStepIndex + 1) / _steps.length,
        stepDescription: _steps[_currentStepIndex].description,
        stepDetails: _generateStepDetails(),
      );

      widget.onStepChanged?.call(progress);
    }
  }

  void _completeAnalysis() {
    if (_isCancelled) return;

    final mockResult = _generateMockAnalysisResult();

    setState(() {
      _isCompleted = true;
    });

    _pulseController.stop();

    widget.onCompleted?.call(mockResult);

    // Auto-close after showing completion for 2 seconds
    Timer(const Duration(seconds: 2), () {
      if (mounted && _isCompleted) {
        Navigator.of(context).pop();
      }
    });
  }

  void _simulateError() {
    if (_isCompleted || _isCancelled) return;

    setState(() {
      _errorMessage = 'Network connection lost. Retrying...';
    });

    _analysisTimer.cancel();

    // Simulate retry after 2 seconds
    Timer(const Duration(seconds: 2), () {
      if (mounted && !_isCancelled) {
        setState(() {
          _errorMessage = null;
        });
        _startAnalysis();
      }
    });
  }

  Map<String, dynamic> _generateStepDetails() {
    switch (_steps[_currentStepIndex].title) {
      case 'Color Analysis':
        return {
          'brightness': 0.7,
          'contrast': 0.6,
          'saturation': 0.8,
          'color_balance': 'good',
        };
      case 'Nutrient Analysis':
        return {
          'nitrogen': 0.6,
          'phosphorus': 0.8,
          'potassium': 0.7,
          'deficiencies_detected': 1,
        };
      case 'Trichome Detection':
        return {
          'trichomes_found': 1247,
          'average_size': '0.3mm',
          'distribution': 'uniform',
        };
      case 'Pest Detection':
        return {
          'scanning_regions': 12,
          'suspicious_areas': 2,
          'confidence': 0.73,
        };
      default:
        return {
          'processing_time': '${DateTime.now().millisecondsSinceEpoch % 100}ms',
          'confidence': 0.8 + (math.Random().nextDouble() * 0.2),
        };
    }
  }

  EnhancedAnalysisResult _generateMockAnalysisResult() {
    final now = DateTime.now();
    final random = math.Random();

    return EnhancedAnalysisResult(
      overallHealth: ['healthy', 'stressed', 'critical'][random.nextInt(3)],
      healthStatus: HealthStatus.values[random.nextInt(3)],
      confidence: 0.7 + random.nextDouble() * 0.3,
      growthStage: GrowthStage.values[random.nextInt(GrowthStage.values.length)],
      analysisType: widget.analysisType,
      analysisTimestamp: now,
      detectedSymptoms: [
        SymptomDetection(
          symptom: 'Yellowing leaves',
          category: 'color',
          severity: random.nextDouble(),
          confidence: random.nextDouble(),
        ),
      ],
      nutrientDeficiencies: [
        NutrientDeficiency(
          nutrient: 'Nitrogen',
          type: 'deficiency',
          severity: random.nextDouble(),
          confidence: random.nextDouble(),
          visualSymptoms: ['Yellowing', 'Stunted growth'],
          recommendations: ['Increase nitrogen levels', 'Check pH balance'],
        ),
      ],
      detectedPests: [],
      detectedDiseases: [],
      purpleStrainAnalysis: PurpleStrainAnalysis(
        isPurpleStrain: random.nextBool(),
        confidence: random.nextDouble(),
        purpleIndicators: ['Purple stems', 'Dark leaf edges'],
        deficiencyDifferentiators: ['Uniform coloring', 'Normal growth patterns'],
      ),
      metrics: EnhancedPlantMetrics(
        leafColorScore: random.nextDouble(),
        leafHealthScore: random.nextDouble(),
        growthRateScore: random.nextDouble(),
        overallVigorScore: random.nextDouble(),
      ),
      immediateActions: ['Increase nitrogen in next feeding', 'Monitor leaf color changes'],
      longTermRecommendations: ['Consider supplemental lighting', 'Adjust nutrient schedule'],
      environmentalAdjustments: ['Maintain pH 6.0-6.5', 'Increase air circulation'],
      requiresFollowUp: true,
      recommendedFollowUpDate: now.add(const Duration(days: 3)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.8,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${widget.analysisType.toString().split('.').last} Analysis',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (widget.strainName != null)
                        Text(
                          widget.strainName!,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.grey[600],
                          ),
                        ),
                    ],
                  ),
                ),
                if (!_isCompleted)
                  IconButton(
                    onPressed: _cancelAnalysis,
                    icon: const Icon(Icons.close),
                  ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Main content
          Expanded(
            child: _buildMainContent(),
          ),

          // Bottom actions
          if (_isCompleted)
            Container(
              padding: const EdgeInsets.all(20),
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'View Results',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMainContent() {
    if (_isCompleted) {
      return _buildCompletionView();
    }

    if (_errorMessage != null) {
      return _buildErrorView();
    }

    return _buildProgressView();
  }

  Widget _buildProgressView() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        children: [
          // Overall progress
          _buildOverallProgress(),

          const SizedBox(height: 30),

          // Current step
          _buildCurrentStep(),

          const SizedBox(height: 30),

          // Steps list
          Expanded(
            child: _buildStepsList(),
          ),

          // Live metrics (for some analysis types)
          if (_shouldShowLiveMetrics())
            _buildLiveMetrics(),
        ],
      ),
    );
  }

  Widget _buildOverallProgress() {
    return Column(
      children: [
        AnimatedBuilder(
          animation: _progressAnimation,
          builder: (context, child) {
            return LinearProgressIndicator(
              value: _progressAnimation.value,
              backgroundColor: Colors.grey[200],
              valueColor: AlwaysStoppedAnimation<Color>(
                Theme.of(context).primaryColor,
              ),
              minHeight: 8,
            );
          },
        ),
        const SizedBox(height: 8),
        Text(
          '${((_currentStepIndex + 1) / _steps.length * 100).toInt()}% Complete',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Colors.grey[600],
            fontWeight: FontWeight.w600,
          ),
        ),
        Text(
          'Step ${_currentStepIndex + 1} of ${_steps.length}',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.grey[500],
          ),
        ),
      ],
    );
  }

  Widget _buildCurrentStep() {
    if (_currentStepIndex >= _steps.length) return const SizedBox.shrink();

    final currentStep = _steps[_currentStepIndex];

    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: _pulseAnimation.value,
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Theme.of(context).primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: Theme.of(context).primaryColor.withOpacity(0.3),
              ),
            ),
            child: Row(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: Theme.of(context).primaryColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    currentStep.icon,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        currentStep.title,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        currentStep.description,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildStepsList() {
    return ListView.builder(
      padding: const EdgeInsets.zero,
      itemCount: _steps.length,
      itemBuilder: (context, index) {
        final step = _steps[index];
        final isCompleted = index < _currentStepIndex;
        final isCurrent = index == _currentStepIndex;
        final isPending = index > _currentStepIndex;

        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isCompleted
                  ? Colors.green.withOpacity(0.1)
                  : isCurrent
                      ? Theme.of(context).primaryColor.withOpacity(0.1)
                      : Colors.grey[100],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isCompleted
                    ? Colors.green.withOpacity(0.3)
                    : isCurrent
                        ? Theme.of(context).primaryColor.withOpacity(0.3)
                        : Colors.grey[200]!,
              ),
            ),
            child: Row(
              children: [
                // Step indicator
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: isCompleted
                        ? Colors.green
                        : isCurrent
                            ? Theme.of(context).primaryColor
                            : Colors.grey[300],
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: isCompleted
                      ? const Icon(Icons.check, color: Colors.white, size: 20)
                      : isCurrent
                          ? Container(
                              width: 12,
                              height: 12,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                              ),
                            )
                          : Text(
                              '${index + 1}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                ),
                const SizedBox(width: 12),

                // Step content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        step.title,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: isCompleted
                              ? Colors.green
                              : isCurrent
                                  ? Theme.of(context).primaryColor
                                  : Colors.grey[600],
                        ),
                      ),
                      Text(
                        step.description,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                ),

                // Loading indicator for current step
                if (isCurrent)
                  SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        Theme.of(context).primaryColor,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildLiveMetrics() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Live Metrics',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          ..._generateLiveMetricWidgets(),
        ],
      ),
    );
  }

  List<Widget> _generateLiveMetricWidgets() {
    final metrics = _generateStepDetails();
    final widgets = <Widget>[];

    metrics.forEach((key, value) {
      widgets.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                _formatMetricKey(key),
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              Text(
                _formatMetricValue(value),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      );
    });

    return widgets;
  }

  String _formatMetricKey(String key) {
    return key.split('_').map((word) {
      return word[0].toUpperCase() + word.substring(1);
    }).join(' ');
  }

  String _formatMetricValue(dynamic value) {
    if (value is double) {
      return '${(value * 100).toInt()}%';
    } else if (value is int) {
      return value.toString();
    } else {
      return value.toString();
    }
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.error_outline,
                color: Colors.red,
                size: 40,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Analysis Error',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: Colors.red,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              _errorMessage!,
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                TextButton(
                  onPressed: _cancelAnalysis,
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () {
                    setState(() {
                      _errorMessage = null;
                    });
                    _startAnalysis();
                  },
                  child: const Text('Retry'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCompletionView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle,
                color: Colors.green,
                size: 60,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Analysis Complete!',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: Colors.green,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Your plant analysis has been completed successfully. View detailed results and recommendations.',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  _buildResultSummary('Analysis Type', widget.analysisType.toString().split('.').last),
                  _buildResultSummary('Processing Time', '${widget.estimatedDuration.inSeconds}s'),
                  _buildResultSummary('Steps Completed', '${_steps.length}/${_steps.length}'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultSummary(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Colors.grey[600],
            ),
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  bool _shouldShowLiveMetrics() {
    return widget.analysisType == AnalysisType.detailed ||
           widget.analysisType == AnalysisType.trichome ||
           _currentStepIndex < _steps.length && _currentStepIndex >= 0;
  }

  void _cancelAnalysis() {
    setState(() {
      _isCancelled = true;
    });

    _analysisTimer.cancel();
    _progressController.stop();
    _pulseController.stop();

    widget.onCancelled?.call();
    Navigator.of(context).pop();
  }
}

class AnalysisStep {
  final String title;
  final String description;
  final IconData icon;

  AnalysisStep(this.title, this.description, this.icon);
}