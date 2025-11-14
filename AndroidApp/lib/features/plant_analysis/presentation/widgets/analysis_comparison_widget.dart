import 'package:flutter/material.dart';
import '../../../../core/models/enhanced_plant_analysis.dart';
import 'package:intl/intl.dart';
import 'dart:math' as math;

class AnalysisComparisonPage extends StatefulWidget {
  final List<EnhancedPlantAnalysis> analyses;

  const AnalysisComparisonPage({
    super.key,
    required this.analyses,
  });

  @override
  State<AnalysisComparisonPage> createState() => _AnalysisComparisonPageState();
}

class _AnalysisComparisonPageState extends State<AnalysisComparisonPage>
    with TickerProviderStateMixin {
  late TabController _tabController;
  late AnimationController _slideController;
  late Animation<double> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _slideAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeInOut,
    ));

    _slideController.forward();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Compare ${widget.analyses.length} Analyses'),
        backgroundColor: Theme.of(context).primaryColor,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Health'),
            Tab(text: 'Changes'),
          ],
        ),
        actions: [
          IconButton(
            onPressed: _exportComparison,
            icon: const Icon(Icons.share),
            tooltip: 'Export Comparison',
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildOverviewTab(),
          _buildHealthComparisonTab(),
          _buildChangesTab(),
        ],
      ),
    );
  }

  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Summary cards
          _buildComparisonSummary(),
          const SizedBox(height: 24),

          // Timeline view
          _buildTimelineView(),
          const SizedBox(height: 24),

          // Side-by-side comparison
          _buildSideBySideComparison(),
        ],
      ),
    );
  }

  Widget _buildComparisonSummary() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Summary',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),

            // Time range
            _buildSummaryRow(
              'Time Range',
              _formatTimeRange(),
              Icons.schedule,
            ),

            // Average health score
            _buildSummaryRow(
              'Average Health Score',
              '${_calculateAverageHealthScore().toStringAsFixed(1)}%',
              Icons.heart,
            ),

            // Most common issues
            _buildSummaryRow(
              'Common Issues',
              _getMostCommonIssues(),
              Icons.warning,
            ),

            // Trend
            _buildSummaryRow(
              'Health Trend',
              _getHealthTrend(),
              Icons.trending_up,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Theme.of(context).primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              color: Theme.of(context).primaryColor,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
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
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineView() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Timeline',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),

            SizedBox(
              height: 200,
              child: _buildHealthScoreChart(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHealthScoreChart() {
    final sortedAnalyses = List<EnhancedPlantAnalysis>.from(widget.analyses)
      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));

    return Container(
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
      ),
      padding: const EdgeInsets.all(16),
      child: CustomPaint(
        size: const Size(double.infinity, double.infinity),
        painter: HealthScoreChartPainter(sortedAnalyses),
      ),
    );
  }

  Widget _buildSideBySideComparison() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Side by Side',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),

        // Analysis cards
        ...widget.analyses.map((analysis) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: _buildComparisonCard(analysis),
          );
        }),
      ],
    );
  }

  Widget _buildComparisonCard(EnhancedPlantAnalysis analysis) {
    final healthColor = _getHealthColor(analysis.result.healthStatus);
    final overallScore = (analysis.result.metrics.getOverallHealthScore() ?? 0.0) * 100;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  DateFormat('MMM dd, yyyy • HH:mm').format(analysis.timestamp),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: healthColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: healthColor.withOpacity(0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _getHealthIcon(analysis.result.healthStatus),
                        color: healthColor,
                        size: 14,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        analysis.result.healthStatus.name,
                        style: TextStyle(
                          color: healthColor,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Health score bar
            Row(
              children: [
                Text(
                  'Health Score:',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: LinearProgressIndicator(
                    value: overallScore / 100,
                    backgroundColor: Colors.grey[200],
                    valueColor: AlwaysStoppedAnimation<Color>(healthColor),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '${overallScore.toInt()}%',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Issues list
            _buildIssuesList(analysis),

            const SizedBox(height: 12),

            // Metrics
            _buildMetricsRow(analysis),
          ],
        ),
      ),
    );
  }

  Widget _buildIssuesList(EnhancedPlantAnalysis analysis) {
    final issues = <String>[];

    issues.addAll(analysis.result.detectedSymptoms.map((s) => s.symptom));
    issues.addAll(analysis.result.nutrientDeficiencies.map((n) => '${n.nutrient} ${n.type}'));
    issues.addAll(analysis.result.detectedPests.map((p) => p.pestName));
    issues.addAll(analysis.result.detectedDiseases.map((d) => d.diseaseName));

    if (issues.isEmpty) {
      return Text(
        'No issues detected',
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
          color: Colors.green,
          fontWeight: FontWeight.w500,
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Issues (${issues.length}):',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        ...issues.take(3).map((issue) {
          return Padding(
            padding: const EdgeInsets.only(left: 8, bottom: 2),
            child: Row(
              children: [
                const Icon(Icons.circle, size: 6, color: Colors.orange),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    issue,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              ],
            ),
          );
        }),
        if (issues.length > 3)
          Padding(
            padding: const EdgeInsets.only(left: 16),
            child: Text(
              '... and ${issues.length - 3} more',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Colors.grey[600],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildMetricsRow(EnhancedPlantAnalysis analysis) {
    final metrics = analysis.result.metrics;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _buildMetricItem('Leaves', metrics.leafHealthScore),
        _buildMetricItem('Growth', metrics.growthRateScore),
        _buildMetricItem('Vigor', metrics.overallVigorScore),
      ],
    );
  }

  Widget _buildMetricItem(String label, double? value) {
    final score = (value ?? 0.0) * 100;
    final color = score > 70 ? Colors.green : score > 40 ? Colors.orange : Colors.red;

    return Column(
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.grey[600],
          ),
        ),
        const SizedBox(height: 4),
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            shape: BoxShape.circle,
            border: Border.all(color: color.withOpacity(0.3)),
          ),
          child: Center(
            child: Text(
              '${score.toInt()}',
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildHealthComparisonTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Health status distribution
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Health Status Distribution',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildHealthStatusDistribution(),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Detailed metrics comparison
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Detailed Metrics',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildDetailedMetricsComparison(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHealthStatusDistribution() {
    final statusCounts = <HealthStatus, int>{};
    for (final analysis in widget.analyses) {
      statusCounts[analysis.result.healthStatus] =
          (statusCounts[analysis.result.healthStatus] ?? 0) + 1;
    }

    return Column(
      children: statusCounts.entries.map((entry) {
        final status = entry.key;
        final count = entry.value;
        final percentage = (count / widget.analyses.length * 100).round();
        final color = _getHealthColor(status);

        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    status.name,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    '$count ($percentage%)',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: color,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              LinearProgressIndicator(
                value: percentage / 100.0,
                backgroundColor: Colors.grey[200],
                valueColor: AlwaysStoppedAnimation<Color>(color),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildDetailedMetricsComparison() {
    return Column(
      children: [
        _buildMetricComparison('Leaf Color Score', (a) => a.result.metrics.leafColorScore),
        _buildMetricComparison('Leaf Health Score', (a) => a.result.metrics.leafHealthScore),
        _buildMetricComparison('Growth Rate Score', (a) => a.result.metrics.growthRateScore),
        _buildMetricComparison('Structural Integrity', (a) => a.result.metrics.structuralIntegrityScore),
        _buildMetricComparison('Overall Vigor', (a) => a.result.metrics.overallVigorScore),
      ],
    );
  }

  Widget _buildMetricComparison(String label, double? Function(EnhancedPlantAnalysis) getValue) {
    final values = widget.analyses.map((analysis) => getValue(analysis) ?? 0.0).toList();
    final average = values.reduce((a, b) => a + b) / values.length;
    final min = values.reduce(math.min);
    final max = values.reduce(math.max);

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: Row(
              children: [
                // Min value
                Container(
                  width: 60,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${(min * 100).toInt()}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),

                // Range bar
                Expanded(
                  child: Container(
                    height: 20,
                    margin: const EdgeInsets.symmetric(horizontal: 8),
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: FractionallySizedBox(
                      alignment: Alignment.center,
                      widthFactor: average,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Theme.of(context).primaryColor,
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                  ),
                ),

                // Max value
                Container(
                  width: 60,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${(max * 100).toInt()}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChangesTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Issue progression
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Issue Progression',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildIssueProgression(),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Purple strain analysis changes
          if (_hasPurpleStrainAnalysis())
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Purple Strain Analysis',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _buildPurpleStrainComparison(),
                  ],
                ),
              ),
            ),

          // Growth stage changes
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Growth Stage Progression',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildGrowthStageProgression(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIssueProgression() {
    final sortedAnalyses = List<EnhancedPlantAnalysis>.from(widget.analyses)
      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));

    return Column(
      children: sortedAnalyses.asMap().entries.map((entry) {
        final index = entry.key;
        final analysis = entry.value;
        final totalIssues = analysis.result.totalIssuesDetected;

        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Row(
            children: [
              // Date
              SizedBox(
                width: 80,
                child: Text(
                  DateFormat('MM/dd').format(analysis.timestamp),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),

              // Issues count
              Container(
                width: 60,
                height: 24,
                decoration: BoxDecoration(
                  color: _getIssuesColor(totalIssues),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Text(
                    '$totalIssues',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),

              // Change indicator
              if (index > 0) ...[
                const SizedBox(width: 12),
                Icon(
                  _getChangeIcon(sortedAnalyses[index - 1].result.totalIssuesDetected, totalIssues),
                  color: _getChangeColor(sortedAnalyses[index - 1].result.totalIssuesDetected, totalIssues),
                  size: 16,
                ),
              ] else ...[
                const SizedBox(width: 28),
              ],

              const Spacer(),

              // Status badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _getHealthColor(analysis.result.healthStatus).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  analysis.result.healthStatus.name,
                  style: TextStyle(
                    color: _getHealthColor(analysis.result.healthStatus),
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildPurpleStrainComparison() {
    final purpleAnalyses = widget.analyses.where((a) => a.result.purpleStrainAnalysis.isPurpleStrain).toList();

    if (purpleAnalyses.isEmpty) {
      return Text(
        'No purple strain analyses detected',
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
          color: Colors.grey[600],
        ),
      );
    }

    return Column(
      children: purpleAnalyses.map((analysis) {
        final purpleAnalysis = analysis.result.purpleStrainAnalysis;
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.purple.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.purple.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.grain,
                  color: Colors.purple,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        DateFormat('MMM dd').format(analysis.timestamp),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        'Confidence: ${(purpleAnalysis.confidence * 100).toInt()}%',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.purple,
                        ),
                      ),
                    ],
                  ),
                ),
                if (purpleAnalysis.strainType != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.purple.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      purpleAnalysis.strainType!,
                      style: const TextStyle(
                        color: Colors.purple,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildGrowthStageProgression() {
    final sortedAnalyses = List<EnhancedPlantAnalysis>.from(widget.analyses)
      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));

    return Column(
      children: sortedAnalyses.map((analysis) {
        final growthStage = analysis.result.growthStage;

        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(
            children: [
              // Date
              SizedBox(
                width: 80,
                child: Text(
                  DateFormat('MM/dd').format(analysis.timestamp),
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),

              // Growth stage
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _getGrowthStageColor(growthStage).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _getGrowthStageColor(growthStage).withOpacity(0.3)),
                ),
                child: Text(
                  growthStage?.name ?? 'Unknown',
                  style: TextStyle(
                    color: _getGrowthStageColor(growthStage),
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  // Helper methods
  String _formatTimeRange() {
    if (widget.analyses.isEmpty) return 'No data';

    final sorted = List<EnhancedPlantAnalysis>.from(widget.analyses)
      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));

    final start = sorted.first.timestamp;
    final end = sorted.last.timestamp;

    return '${DateFormat('MMM dd').format(start)} - ${DateFormat('MMM dd').format(end)}';
  }

  double _calculateAverageHealthScore() {
    if (widget.analyses.isEmpty) return 0.0;

    final totalScore = widget.analyses
        .map((a) => a.result.metrics.getOverallHealthScore() ?? 0.0)
        .reduce((a, b) => a + b);

    return (totalScore / widget.analyses.length) * 100;
  }

  String _getMostCommonIssues() {
    final issueCounts = <String, int>{};

    for (final analysis in widget.analyses) {
      for (final symptom in analysis.result.detectedSymptoms) {
        issueCounts[symptom.symptom] = (issueCounts[symptom.symptom] ?? 0) + 1;
      }
    }

    if (issueCounts.isEmpty) return 'None';

    final sortedIssues = issueCounts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return sortedIssues.take(2).map((e) => '${e.key} (${e.value})').join(', ');
  }

  String _getHealthTrend() {
    if (widget.analyses.length < 2) return 'Insufficient data';

    final sorted = List<EnhancedPlantAnalysis>.from(widget.analyses)
      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));

    final firstScore = sorted.first.result.metrics.getOverallHealthScore() ?? 0.0;
    final lastScore = sorted.last.result.metrics.getOverallHealthScore() ?? 0.0;

    final difference = lastScore - firstScore;

    if (difference > 0.1) return 'Improving';
    if (difference < -0.1) return 'Declining';
    return 'Stable';
  }

  Color _getHealthColor(HealthStatus status) {
    switch (status) {
      case HealthStatus.healthy:
        return Colors.green;
      case HealthStatus.stressed:
        return Colors.orange;
      case HealthStatus.critical:
        return Colors.red;
      case HealthStatus.unknown:
        return Colors.grey;
    }
  }

  IconData _getHealthIcon(HealthStatus status) {
    switch (status) {
      case HealthStatus.healthy:
        return Icons.check_circle;
      case HealthStatus.stressed:
        return Icons.warning;
      case HealthStatus.critical:
        return Icons.error;
      case HealthStatus.unknown:
        return Icons.help;
    }
  }

  Color _getIssuesColor(int count) {
    if (count == 0) return Colors.green;
    if (count <= 2) return Colors.orange;
    return Colors.red;
  }

  Color _getChangeColor(int previous, int current) {
    if (current < previous) return Colors.green;
    if (current > previous) return Colors.red;
    return Colors.grey;
  }

  IconData _getChangeIcon(int previous, int current) {
    if (current < previous) return Icons.trending_down;
    if (current > previous) return Icons.trending_up;
    return Icons.trending_flat;
  }

  Color _getGrowthStageColor(GrowthStage? stage) {
    switch (stage) {
      case GrowthStage.seedling:
        return Colors.lightGreen;
      case GrowthStage.vegetative:
        return Colors.green;
      case GrowthStage.flowering:
        return Colors.purple;
      case GrowthStage.harvesting:
        return Colors.orange;
      case GrowthStage.drying:
        return Colors.brown;
      default:
        return Colors.grey;
    }
  }

  bool _hasPurpleStrainAnalysis() {
    return widget.analyses.any((a) => a.result.purpleStrainAnalysis.isPurpleStrain);
  }

  void _exportComparison() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Export functionality would be implemented here')),
    );
  }
}

class HealthScoreChartPainter extends CustomPainter {
  final List<EnhancedPlantAnalysis> analyses;

  HealthScoreChartPainter(this.analyses);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.blue
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    if (analyses.isEmpty) return;

    final padding = 20.0;
    final chartWidth = size.width - (padding * 2);
    final chartHeight = size.height - (padding * 2);

    // Find max and min values
    final scores = analyses.map((a) => a.result.metrics.getOverallHealthScore() ?? 0.0).toList();
    final maxScore = scores.reduce(math.max);
    final minScore = scores.reduce(math.min);
    final scoreRange = maxScore - minScore;

    if (scoreRange == 0) return;

    // Draw axes
    final axisPaint = Paint()
      ..color = Colors.grey[300]!
      ..strokeWidth = 1;

    // Y-axis
    canvas.drawLine(
      Offset(padding, padding),
      Offset(padding, size.height - padding),
      axisPaint,
    );

    // X-axis
    canvas.drawLine(
      Offset(padding, size.height - padding),
      Offset(size.width - padding, size.height - padding),
      axisPaint,
    );

    // Draw data points and lines
    final path = Path();

    for (int i = 0; i < analyses.length; i++) {
      final analysis = analyses[i];
      final score = analysis.result.metrics.getOverallHealthScore() ?? 0.0;

      final x = padding + (i / (analyses.length - 1)) * chartWidth;
      final y = size.height - padding - ((score - minScore) / scoreRange) * chartHeight;

      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }

      // Draw data point
      canvas.drawCircle(
        Offset(x, y),
        6,
        Paint()
          ..color = Colors.blue
          ..style = PaintingStyle.fill,
      );

      canvas.drawCircle(
        Offset(x, y),
        6,
        Paint()
          ..color = Colors.white
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2,
      );
    }

    // Draw the line
    canvas.drawPath(
      path,
      paint,
    );

    // Draw value labels
    final textPainter = TextPainter(
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.center,
    );

    // Draw max and min values
    textPainter.text = TextSpan(
      text: '${(maxScore * 100).toInt()}',
      style: const TextStyle(
        color: Colors.grey,
        fontSize: 12,
      ),
    );
    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset(padding - textPainter.width - 8, padding - textPainter.height / 2),
    );

    textPainter.text = TextSpan(
      text: '${(minScore * 100).toInt()}',
      style: const TextStyle(
        color: Colors.grey,
        fontSize: 12,
      ),
    );
    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset(padding - textPainter.width - 8, size.height - padding - textPainter.height / 2),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}