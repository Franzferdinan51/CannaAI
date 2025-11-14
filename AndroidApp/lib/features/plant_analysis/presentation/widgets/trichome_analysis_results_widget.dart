import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../../../../core/models/enhanced_plant_analysis.dart';
import '../pages/trichome_analysis_page.dart';

class TrichomeAnalysisResultsWidget extends StatelessWidget {
  final TrichomeAnalysisResult analysis;
  final VoidCallback? onExport;
  final VoidCallback? onSaveToHistory;

  const TrichomeAnalysisResultsWidget({
    super.key,
    required this.analysis,
    this.onExport,
    this.onSaveToHistory,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header with main results
        _buildHeader(context),

        const SizedBox(height: 24),

        // Harvest readiness section
        _buildHarvestReadinessSection(context),

        const SizedBox(height: 24),

        // Trichome distribution
        _buildTrichomeDistribution(context),

        const SizedBox(height: 24),

        // Metrics section
        _buildMetricsSection(context),

        const SizedBox(height: 24),

        // Recommendations
        _buildRecommendationsSection(context),

        const SizedBox(height: 24),

        // Technical details
        _buildTechnicalDetailsSection(context),

        const SizedBox(height: 24),

        // Action buttons
        _buildActionButtons(context),
      ],
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _getTrichomeStageColor(analysis.trichomeStage).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.bubble_chart,
                    color: _getTrichomeStageColor(analysis.trichomeStage),
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Trichome Analysis',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        DateFormat('MMM dd, yyyy • HH:mm').format(analysis.timestamp),
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _getTrichomeStageColor(analysis.trichomeStage).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: _getTrichomeStageColor(analysis.trichomeStage).withOpacity(0.3),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _getTrichomeStageIcon(analysis.trichomeStage),
                        color: _getTrichomeStageColor(analysis.trichomeStage),
                        size: 16,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        analysis.trichomeStage.toUpperCase(),
                        style: TextStyle(
                          color: _getTrichomeStageColor(analysis.trichomeStage),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildHeaderMetric('Confidence', '${(analysis.confidence * 100).toInt()}%'),
                _buildHeaderMetric('Magnification', '${analysis.magnification.value}x'),
                _buildHeaderMetric('Trichomes', '${analysis.trichomeDensity.toInt()}/mm²'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderMetric(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildHarvestReadinessSection(BuildContext context) {
    final readinessScore = analysis.harvestReadinessScore;
    final readinessLevel = _getHarvestReadinessLevel(readinessScore);
    final readinessColor = _getHarvestReadinessColor(readinessScore);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.agriculture,
                  color: readinessColor,
                  size: 24,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Harvest Readiness',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Main readiness indicator
            Container(
              width: double.infinity,
              child: Column(
                children: [
                  // Progress bar
                  LinearProgressIndicator(
                    value: readinessScore,
                    backgroundColor: Colors.grey[200],
                    valueColor: AlwaysStoppedAnimation<Color>(readinessColor),
                    minHeight: 12,
                  ),
                  const SizedBox(height: 12),

                  // Score and level
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${(readinessScore * 100).toInt()}%',
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: readinessColor,
                        ),
                      ),
                      Text(
                        readinessLevel,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: readinessColor,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Timeline indicator
            Container(
              height: 60,
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Stack(
                children: [
                  // Timeline line
                  Positioned(
                    top: 28,
                    left: 20,
                    right: 20,
                    child: Container(
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  // Progress line
                  Positioned(
                    top: 28,
                    left: 20,
                    width: (MediaQuery.of(context).size.width - 80) * readinessScore,
                    child: Container(
                      height: 4,
                      decoration: BoxDecoration(
                        color: readinessColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  // Stage markers
                  Positioned(
                    top: 20,
                    left: 20,
                    child: _buildTimelineMarker('Early', 0.0, readinessScore),
                  ),
                  Positioned(
                    top: 20,
                    left: MediaQuery.of(context).size.width * 0.33,
                    child: _buildTimelineMarker('Mid', 0.5, readinessScore),
                  ),
                  Positioned(
                    top: 20,
                    right: 20,
                    child: _buildTimelineMarker('Peak', 1.0, readinessScore),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineMarker(String label, double position, double currentProgress) {
    final isActive = currentProgress >= position;
    final markerColor = isActive ? Colors.green : Colors.grey[400];

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: markerColor,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
            color: markerColor,
          ),
        ),
      ],
    );
  }

  Widget _buildTrichomeDistribution(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Trichome Distribution',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),

            // Donut chart visualization
            SizedBox(
              height: 200,
              child: _buildDonutChart(),
            ),

            const SizedBox(height: 16),

            // Distribution bars
            Column(
              children: [
                _buildDistributionBar(
                  'Clear',
                  analysis.clarityPercentage,
                  Colors.blue,
                  Icons.circle,
                ),
                const SizedBox(height: 12),
                _buildDistributionBar(
                  'Cloudy',
                  analysis.cloudinessPercentage,
                  Colors.grey,
                  Icons.cloud,
                ),
                const SizedBox(height: 12),
                _buildDistributionBar(
                  'Amber',
                  analysis.amberPercentage,
                  Colors.orange,
                  Icons.brightness_7,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDonutChart() {
    final total = analysis.clarityPercentage + analysis.cloudinessPercentage + analysis.amberPercentage;
    final sections = [
      {'color': Colors.blue, 'value': analysis.clarityPercentage / total},
      {'color': Colors.grey, 'value': analysis.cloudinessPercentage / total},
      {'color': Colors.orange, 'value': analysis.amberPercentage / total},
    ];

    return CustomPaint(
      size: const Size.infinite,
      painter: DonutChartPainter(sections: sections),
    );
  }

  Widget _buildDistributionBar(String label, double percentage, Color color, IconData icon) {
    return Column(
      children: [
        Row(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 12),
            Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const Spacer(),
            Text(
              '${percentage.toInt()}%',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Container(
          height: 8,
          decoration: BoxDecoration(
            color: Colors.grey[200],
            borderRadius: BorderRadius.circular(4),
          ),
          child: FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: percentage / 100,
            child: Container(
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMetricsSection(BuildContext context) {
    return Card(
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

            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              childAspectRatio: 2.5,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              children: [
                _buildMetricCard(
                  'Density',
                  '${analysis.trichomeDensity.toInt()}/mm²',
                  Icons.grain,
                  Colors.purple,
                ),
                _buildMetricCard(
                  'Stage',
                  analysis.trichomeStage,
                  Icons.bubble_chart,
                  Colors.green,
                ),
                _buildMetricCard(
                  'Magnification',
                  '${analysis.magnification.value}x',
                  Icons.search,
                  Colors.blue,
                ),
                _buildMetricCard(
                  'Confidence',
                  '${(analysis.confidence * 100).toInt()}%',
                  Icons.verified,
                  Colors.orange,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: color,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildRecommendationsSection(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.lightbulb,
                  color: Theme.of(context).primaryColor,
                  size: 24,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Harvest Recommendations',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            ...analysis.harvestRecommendations.asMap().entries.map((entry) {
              final index = entry.key + 1;
              final recommendation = entry.value;
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        color: Theme.of(context).primaryColor,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          '$index',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        recommendation,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildTechnicalDetailsSection(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.settings,
                  color: Colors.grey[600],
                  size: 24,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Technical Details',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: _copyTechnicalDetails,
                  icon: const Icon(Icons.copy),
                  tooltip: 'Copy Details',
                ),
              ],
            ),
            const SizedBox(height: 16),

            ...analysis.technicalDetails.entries.map((entry) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${_formatTechnicalKey(entry.key)}:',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey[600],
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        entry.value.toString(),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            onPressed: onExport,
            icon: const Icon(Icons.share),
            label: const Text('Export'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: onSaveToHistory,
            icon: const Icon(Icons.bookmark),
            label: const Text('Save to History'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
          ),
        ),
      ],
    );
  }

  // Helper methods
  Color _getTrichomeStageColor(String stage) {
    switch (stage.toLowerCase()) {
      case 'clear':
        return Colors.blue;
      case 'cloudy':
        return Colors.grey;
      case 'mixed':
        return Colors.purple;
      case 'amber':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  IconData _getTrichomeStageIcon(String stage) {
    switch (stage.toLowerCase()) {
      case 'clear':
        return Icons.circle;
      case 'cloudy':
        return Icons.cloud;
      case 'mixed':
        return Icons.opacity;
      case 'amber':
        return Icons.brightness_7;
      default:
        return Icons.help;
    }
  }

  String _getHarvestReadinessLevel(double score) {
    if (score < 0.3) return 'Early';
    if (score < 0.7) return 'Mid-Range';
    if (score < 0.9) return 'Ready';
    return 'Peak';
  }

  Color _getHarvestReadinessColor(double score) {
    if (score < 0.3) return Colors.blue;    // Early
    if (score < 0.7) return Colors.orange; // Mid
    return Colors.green;                     // Ready/Peak
  }

  String _formatTechnicalKey(String key) {
    return key
        .replaceAll('_', ' ')
        .split(' ')
        .map((word) => word[0].toUpperCase() + word.substring(1))
        .join(' ');
  }

  void _copyTechnicalDetails() {
    final details = analysis.technicalDetails.entries
        .map((entry) => '${_formatTechnicalKey(entry.key)}: ${entry.value}')
        .join('\n');

    Clipboard.setData(ClipboardData(text: details));
    // In a real implementation, you would show a snackbar here
  }
}

class DonutChartPainter extends CustomPainter {
  final List<Map<String, dynamic>> sections;

  DonutChartPainter({required this.sections});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final outerRadius = math.min(size.width, size.height) / 2 - 20;
    final innerRadius = outerRadius * 0.6;
    double startAngle = -math.pi / 2;

    for (final section in sections) {
      final color = section['color'] as Color;
      final value = section['value'] as double;
      final sweepAngle = value * 2 * math.pi;

      final paint = Paint()
        ..color = color
        ..style = PaintingStyle.fill;

      // Draw outer arc
      final path = Path();
      path.addArc(
        Rect.fromCircle(center: center, radius: outerRadius),
        startAngle,
        sweepAngle,
      );
      path.lineTo(center);
      path.close();
      canvas.drawPath(path, paint);

      // Draw inner circle (hole)
      final innerPaint = Paint()
        ..color = Theme.of(context).scaffoldBackgroundColor
        ..style = PaintingStyle.fill;

      canvas.drawCircle(center, innerRadius, innerPaint);

      startAngle += sweepAngle;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}