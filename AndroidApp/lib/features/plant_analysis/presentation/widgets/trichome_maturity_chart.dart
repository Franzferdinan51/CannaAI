import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../pages/trichome_analysis_page.dart';

class TrichomeMaturityChart extends StatelessWidget {
  final dynamic analysis; // Can be TrichomeAnalysisResult or TrichomeDataPoint
  final bool showLabels;
  final double? height;

  const TrichomeMaturityChart({
    super.key,
    required this.analysis,
    this.showLabels = true,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      child: CustomPaint(
        size: Size.infinite,
        painter: TrichomeMaturityChartPainter(
          analysis: analysis,
          showLabels: showLabels,
        ),
      ),
    );
  }
}

class TrichomeMaturityChartPainter extends CustomPainter {
  final dynamic analysis; // Can be TrichomeAnalysisResult or TrichomeDataPoint
  final bool showLabels;

  TrichomeMaturityChartPainter({
    required this.analysis,
    required this.showLabels,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Extract data based on the analysis type
    final clarity = _getClarityPercentage();
    final cloudy = _getCloudinessPercentage();
    final amber = _getAmberPercentage();

    final sections = [
      {'color': Colors.blue, 'value': clarity, 'label': 'Clear'},
      {'color': Colors.grey, 'value': cloudy, 'label': 'Cloudy'},
      {'color': Colors.orange, 'value': amber, 'label': 'Amber'},
    ];

    final center = Offset(size.width / 2, size.height / 2);
    final outerRadius = math.min(size.width, size.height) / 2 - (showLabels ? 40 : 20);
    final innerRadius = outerRadius * 0.6;

    // Draw shadow
    final shadowPaint = Paint()
      ..color = Colors.black.withOpacity(0.1)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8)
      ..style = PaintingStyle.fill;

    final shadowCenter = center + const Offset(2, 2);
    final shadowPath = Path();
    double shadowStartAngle = -math.pi / 2;

    for (final section in sections) {
      final sweepAngle = section['value'] as double * 2 * math.pi;
      shadowPath.addArc(
        Rect.fromCircle(center: shadowCenter, radius: outerRadius),
        shadowStartAngle,
        sweepAngle,
      );
      shadowPath.lineTo(shadowCenter);
      shadowPath.close();
      shadowStartAngle += sweepAngle;
    }
    canvas.drawPath(shadowPath, shadowPaint);

    // Draw donut chart
    double startAngle = -math.pi / 2;

    for (final section in sections) {
      final color = section['color'] as Color;
      final value = section['value'] as double;
      final sweepAngle = value * 2 * math.pi;

      final path = Path();
      path.addArc(
        Rect.fromCircle(center: center, radius: outerRadius),
        startAngle,
        sweepAngle,
      );

      // Create arc with inner radius (donut shape)
      final arcRect = Rect.fromCircle(center: center, radius: outerRadius);
      final innerRect = Rect.fromCircle(center: center, radius: innerRadius);

      path.addArc(arcRect, startAngle, sweepAngle);
      path.arcTo(innerRect, startAngle + sweepAngle, -sweepAngle, false);
      path.close();

      final paint = Paint()
        ..color = color
        ..style = PaintingStyle.fill;

      canvas.drawPath(path, paint);

      // Draw border
      final borderPaint = Paint()
        ..color = color.withOpacity(0.8)
        ..strokeWidth = 2
        ..style = PaintingStyle.stroke;

      final borderPath = Path();
      borderPath.addArc(
        Rect.fromCircle(center: center, radius: outerRadius),
        startAngle,
        sweepAngle,
      );
      canvas.drawPath(borderPath, borderPaint);

      startAngle += sweepAngle;
    }

    // Draw center text
    if (showLabels) {
      _drawCenterText(canvas, center, innerRadius);
    }

    // Draw legend
    if (showLabels) {
      _drawLegend(canvas, size, sections);
    }
  }

  void _drawCenterText(Canvas canvas, Offset center, double innerRadius) {
    final harvestReadiness = _getHarvestReadinessScore();
    final stage = _getTrichomeStage();
    final color = _getHarvestReadinessColor(harvestReadiness);

    // Draw percentage in center
    final percentagePainter = TextPainter(
      text: TextSpan(
        text: '${(harvestReadiness * 100).toInt()}%',
        style: TextStyle(
          color: color,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
      textDirection: TextDirection.ltr,
    );

    percentagePainter.layout();
    percentagePainter.paint(
      canvas,
      center - Offset(percentagePainter.width / 2, percentagePainter.height / 2 - 8),
    );

    // Draw stage below percentage
    final stagePainter = TextPainter(
      text: TextSpan(
        text: stage.toUpperCase(),
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
      textDirection: TextDirection.ltr,
    );

    stagePainter.layout();
    stagePainter.paint(
      canvas,
      center - Offset(stagePainter.width / 2, stagePainter.height / 2 + 8),
    );
  }

  void _drawLegend(Canvas canvas, Size size, List<Map<String, dynamic>> sections) {
    const legendY = 20.0;
    const legendItemHeight = 25.0;
    const legendItemSpacing = 8.0;
    const boxSize = 12.0;
    const spacing = 8.0;

    // Calculate total legend width
    double totalWidth = 0;
    for (final section in sections) {
      final textPainter = TextPainter(
        text: TextSpan(
          text: '${section['label']}: ${_formatPercentage(section['value'])}',
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
        textDirection: TextDirection.ltr,
      );
      textPainter.layout();
      totalWidth = math.max(totalWidth, boxSize + spacing + textPainter.width);
    }

    // Starting position (centered)
    final startX = (size.width - totalWidth) / 2;

    double currentY = legendY;

    for (final section in sections) {
      final color = section['color'] as Color;
      final label = section['label'] as String;
      final value = section['value'] as double;

      // Draw color box
      final boxPaint = Paint()
        ..color = color
        ..style = PaintingStyle.fill;

      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(startX, currentY, boxSize, boxSize),
          const Radius.circular(2),
        ),
        boxPaint,
      );

      // Draw label
      final textPainter = TextPainter(
        text: TextSpan(
          text: '$label: ${_formatPercentage(value)}',
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
        textDirection: TextDirection.ltr,
      );

      textPainter.layout();
      textPainter.paint(
        canvas,
        Offset(startX + boxSize + spacing, currentY + (boxSize - textPainter.height) / 2),
      );

      currentY += legendItemHeight + legendItemSpacing;
    }
  }

  String _formatPercentage(double value) {
    return '${value.toInt()}%';
  }

  // Data extraction methods
  double _getClarityPercentage() {
    if (analysis is TrichomeAnalysisResult) {
      return analysis.clarityPercentage;
    } else if (analysis is TrichomeDataPoint) {
      return analysis.clarityPercentage;
    }
    return 0.0;
  }

  double _getCloudinessPercentage() {
    if (analysis is TrichomeAnalysisResult) {
      return analysis.cloudinessPercentage;
    } else if (analysis is TrichomeDataPoint) {
      return analysis.cloudinessPercentage;
    }
    return 0.0;
  }

  double _getAmberPercentage() {
    if (analysis is TrichomeAnalysisResult) {
      return analysis.amberPercentage;
    } else if (analysis is TrichomeDataPoint) {
      return analysis.amberPercentage;
    }
    return 0.0;
  }

  double _getHarvestReadinessScore() {
    if (analysis is TrichomeAnalysisResult) {
      return analysis.harvestReadinessScore;
    } else if (analysis is TrichomeDataPoint) {
      return analysis.harvestReadinessScore;
    }
    return 0.0;
  }

  String _getTrichomeStage() {
    if (analysis is TrichomeAnalysisResult) {
      return analysis.trichomeStage;
    } else if (analysis is TrichomeDataPoint) {
      return analysis.trichomeStage;
    }
    return 'unknown';
  }

  Color _getHarvestReadinessColor(double score) {
    if (score < 0.3) return Colors.blue;    // Early
    if (score < 0.7) return Colors.orange; // Mid
    return Colors.green;                     // Ready/Peak
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}