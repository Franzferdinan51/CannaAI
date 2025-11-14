import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/models/enhanced_plant_analysis.dart';
import 'package:intl/intl.dart';

class EnhancedAnalysisCard extends StatelessWidget {
  final EnhancedPlantAnalysis analysis;
  final bool isSelected;
  final bool isSelectionMode;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final ValueChanged<bool>? onSelectionChanged;
  final VoidCallback? onBookmarkToggle;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final VoidCallback? onCompare;
  final VoidCallback? onExport;

  const EnhancedAnalysisCard({
    super.key,
    required this.analysis,
    this.isSelected = false,
    this.isSelectionMode = false,
    this.onTap,
    this.onLongPress,
    this.onSelectionChanged,
    this.onBookmarkToggle,
    this.onEdit,
    this.onDelete,
    this.onCompare,
    this.onExport,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      margin: EdgeInsets.zero,
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: isSelected
            ? BorderSide(color: colorScheme.primary, width: 2)
            : BorderSide.none,
      ),
      child: InkWell(
        onTap: onTap,
        onLongPress: onLongPress,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: isSelected
                ? LinearGradient(
                    colors: [
                      colorScheme.primary.withOpacity(0.05),
                      colorScheme.primary.withOpacity(0.02),
                    ],
                  )
                : null,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row with image and basic info
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Selection checkbox
                  if (isSelectionMode) ...[
                    Padding(
                      padding: const EdgeInsets.only(top: 8, right: 12),
                      child: Checkbox(
                        value: isSelected,
                        onChanged: (value) {
                          onSelectionChanged?.call(value ?? false);
                        },
                        activeColor: colorScheme.primary,
                      ),
                    ),
                  ],

                  // Plant image
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      color: Colors.grey[100],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: _buildPlantImage(),
                    ),
                  ),

                  const SizedBox(width: 16),

                  // Main content
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Status row
                        Row(
                          children: [
                            // Health status badge
                            _buildHealthStatusBadge(),
                            const SizedBox(width: 8),

                            // Analysis type badge
                            _buildAnalysisTypeBadge(),

                            const Spacer(),

                            // Confidence score
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.grey[100],
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '${(analysis.result.confidence * 100).toInt()}%',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: Colors.grey[700],
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 8),

                        // Timestamp and strain info
                        Text(
                          DateFormat('MMM dd, yyyy • HH:mm').format(analysis.timestamp),
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey[600],
                          ),
                        ),

                        if (analysis.strainId != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            'Strain: ${_formatStrainName(analysis.strainId!)}',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: colorScheme.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],

                        const SizedBox(height: 8),

                        // Issues summary
                        _buildIssuesSummary(),
                      ],
                    ),
                  ),

                  // Bookmark button
                  if (!isSelectionMode && onBookmarkToggle != null)
                    IconButton(
                      onPressed: onBookmarkToggle,
                      icon: Icon(
                        analysis.isBookmarked
                            ? Icons.bookmark
                            : Icons.bookmark_border,
                        color: analysis.isBookmarked
                            ? Colors.amber
                            : Colors.grey[400],
                      ),
                    ),
                ],
              ),

              const SizedBox(height: 16),

              // Health metrics row
              _buildHealthMetricsRow(),

              // Tags
              if (analysis.tags.isNotEmpty) ...[
                const SizedBox(height: 12),
                _buildTagsRow(),
              ],

              const SizedBox(height: 12),

              // Action buttons
              if (!isSelectionMode)
                _buildActionButtons(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlantImage() {
    if (analysis.imageUrl.startsWith('assets')) {
      // Mock image placeholder
      return Container(
        color: Colors.grey[200],
        child: Icon(
          Icons.eco,
          color: Colors.grey[400],
          size: 40,
        ),
      );
    }

    return Image.file(
      File(analysis.imageUrl),
      fit: BoxFit.cover,
      errorBuilder: (context, error, stackTrace) {
        return Container(
          color: Colors.grey[200],
          child: Icon(
            Icons.broken_image,
            color: Colors.grey[400],
            size: 40,
          ),
        );
      },
    );
  }

  Widget _buildHealthStatusBadge() {
    final healthStatus = analysis.result.healthStatus;
    final color = _getHealthColor(healthStatus);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _getHealthIcon(healthStatus),
            color: color,
            size: 14,
          ),
          const SizedBox(width: 4),
          Text(
            healthStatus.name,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnalysisTypeBadge() {
    final analysisType = analysis.result.analysisType;
    final color = _getAnalysisTypeColor(analysisType);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        _formatAnalysisType(analysisType),
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildIssuesSummary() {
    final totalIssues = analysis.result.totalIssuesDetected;

    if (totalIssues == 0) {
      return Text(
        'No issues detected',
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
          color: Colors.green,
          fontWeight: FontWeight.w500,
        ),
      );
    }

    final symptoms = analysis.result.detectedSymptoms.length;
    final deficiencies = analysis.result.nutrientDeficiencies.length;
    final pests = analysis.result.detectedPests.length;
    final diseases = analysis.result.detectedDiseases.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$totalIssues issues detected',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Colors.orange,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        Wrap(
          spacing: 4,
          runSpacing: 2,
          children: [
            if (symptoms > 0) _buildIssueChip('Symptoms', symptoms, Colors.red),
            if (deficiencies > 0) _buildIssueChip('Deficiencies', deficiencies, Colors.orange),
            if (pests > 0) _buildIssueChip('Pests', pests, Colors.purple),
            if (diseases > 0) _buildIssueChip('Diseases', diseases, Colors.brown),
          ],
        ),
      ],
    );
  }

  Widget _buildIssueChip(String label, int count, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        '$count $label',
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildHealthMetricsRow() {
    final metrics = analysis.result.metrics;
    final overallScore = metrics.getOverallHealthScore();

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildMetricItem(
            'Overall',
            overallScore,
            Colors.blue,
          ),
          _buildMetricItem(
            'Leaves',
            metrics.leafHealthScore,
            Colors.green,
          ),
          _buildMetricItem(
            'Growth',
            metrics.growthRateScore,
            Colors.purple,
          ),
          _buildMetricItem(
            'Vigor',
            metrics.overallVigorScore,
            Colors.orange,
          ),
        ],
      ),
    );
  }

  Widget _buildMetricItem(String label, double? value, Color color) {
    final score = (value ?? 0.0).clamp(0.0, 1.0);
    final percentage = (score * 100).toInt();

    return Column(
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.grey[600],
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        Container(
          width: 40,
          height: 6,
          decoration: BoxDecoration(
            color: Colors.grey[200],
            borderRadius: BorderRadius.circular(3),
          ),
          child: FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: score,
            child: Container(
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          '$percentage%',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: color,
            fontWeight: FontWeight.w600,
            fontSize: 10,
          ),
        ),
      ],
    );
  }

  Widget _buildTagsRow() {
    return Wrap(
      spacing: 6,
      runSpacing: 4,
      children: analysis.tags.take(5).map((tag) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: Theme.of(context).primaryColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            '#$tag',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).primaryColor,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildActionButtons(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        if (onCompare != null)
          IconButton(
            onPressed: onCompare,
            icon: const Icon(Icons.compare_arrows),
            iconSize: 20,
            color: Colors.blue,
            tooltip: 'Compare',
          ),
        if (onExport != null)
          IconButton(
            onPressed: onExport,
            icon: const Icon(Icons.share),
            iconSize: 20,
            color: Colors.green,
            tooltip: 'Export',
          ),
        if (onEdit != null)
          IconButton(
            onPressed: onEdit,
            icon: const Icon(Icons.edit),
            iconSize: 20,
            color: Colors.orange,
            tooltip: 'Edit Notes',
          ),
        if (onDelete != null)
          IconButton(
            onPressed: onDelete,
            icon: const Icon(Icons.delete),
            iconSize: 20,
            color: Colors.red,
            tooltip: 'Delete',
          ),
      ],
    );
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

  Color _getAnalysisTypeColor(AnalysisType type) {
    switch (type) {
      case AnalysisType.quick:
        return Colors.blue;
      case AnalysisType.detailed:
        return Colors.purple;
      case AnalysisType.trichome:
        return Colors.amber;
      case AnalysisType.liveVision:
        return Colors.teal;
    }
  }

  String _formatAnalysisType(AnalysisType type) {
    switch (type) {
      case AnalysisType.quick:
        return 'Quick';
      case AnalysisType.detailed:
        return 'Detailed';
      case AnalysisType.trichome:
        return 'Trichome';
      case AnalysisType.liveVision:
        return 'Live';
    }
  }

  String _formatStrainName(String strainId) {
    // Simple formatting - in a real app, you'd look up the strain name
    return strainId
        .replaceAll('_', ' ')
        .split(' ')
        .map((word) => word[0].toUpperCase() + word.substring(1))
        .join(' ');
  }
}