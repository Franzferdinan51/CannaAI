import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../../core/models/enhanced_plant_analysis.dart';
import '../pages/live_vision_page.dart';

class LiveVisionOverlay extends StatelessWidget {
  final EnhancedAnalysisResult? analysisResult;
  final LiveVisionSettings settings;
  final bool isVisible;

  const LiveVisionOverlay({
    super.key,
    this.analysisResult,
    required this.settings,
    required this.isVisible,
  });

  @override
  Widget build(BuildContext context) {
    if (!isVisible || analysisResult == null) {
      return const SizedBox.shrink();
    }

    return Stack(
      children: [
        // Detection zones overlay
        if (settings.enableDetectionZones)
          _buildDetectionZones(),

        // Symptom indicators
        _buildSymptomIndicators(),

        // Focus areas
        _buildFocusAreas(),

        // Real-time metrics
        _buildRealTimeMetrics(),
      ],
    );
  }

  Widget _buildDetectionZones() {
    return CustomPaint(
      size: Size.infinite,
      painter: DetectionZonesPainter(),
    );
  }

  Widget _buildSymptomIndicators() {
    final symptoms = analysisResult!.detectedSymptoms;
    if (symptoms.isEmpty) {
      return const SizedBox.shrink();
    }

    return Positioned.fill(
      child: Stack(
        children: symptoms.asMap().entries.map((entry) {
          final index = entry.key;
          final symptom = entry.value;
          final severity = symptom.severity;

          // Calculate random but consistent positions for symptoms
          final random = math.Random(symptom.symptom.hashCode);
          final x = 0.2 + (random.nextDouble() * 0.6);
          final y = 0.2 + (random.nextDouble() * 0.6);

          return Positioned(
            left: x * MediaQuery.of(context).size.width,
            top: y * MediaQuery.of(context).size.height,
            child: _buildSymptomIndicator(symptom, severity),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildSymptomIndicator(SymptomDetection symptom, double severity) {
    final color = _getSymptomColor(symptom.category);
    final size = 40.0 + (severity * 40); // 40-80px based on severity

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        border: Border.all(color: color, width: 2),
        borderRadius: BorderRadius.circular(size / 2),
      ),
      child: Center(
        child: Icon(
          _getSymptomIcon(symptom.category),
          color: color,
          size: size * 0.4,
        ),
      ),
    );
  }

  Widget _buildFocusAreas() {
    return Positioned.fill(
      child: CustomPaint(
        size: Size.infinite,
        painter: FocusAreasPainter(
          focusAreas: _calculateFocusAreas(),
        ),
      ),
    );
  }

  Widget _buildRealTimeMetrics() {
    final metrics = analysisResult!.metrics;
    final overallScore = metrics.getOverallHealthScore() ?? 0.0;

    return Positioned(
      top: 20,
      left: 20,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.7),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildMetricDisplay('Health', overallScore, Colors.green),
            _buildMetricDisplay('Leaves', metrics.leafHealthScore ?? 0.0, Colors.blue),
            _buildMetricDisplay('Growth', metrics.growthRateScore ?? 0.0, Colors.purple),
            _buildMetricDisplay('Vigor', metrics.overallVigorScore ?? 0.0, Colors.orange),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricDisplay(String label, double value, Color color) {
    final percentage = (value * 100).toInt();

    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 60,
            child: Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.3),
              borderRadius: BorderRadius.circular(2),
            ),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: value,
              child: Container(
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '$percentage%',
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  List<FocusArea> _calculateFocusAreas() {
    final areas = <FocusArea>[];
    final screenSize = MediaQuery.of(context).size;

    // Main focus area (center)
    areas.add(FocusArea(
      rect: Rect.fromCenter(
        center: screenSize.center(Offset.zero),
        width: screenSize.width * 0.3,
        height: screenSize.height * 0.3,
      ),
      label: 'Main',
      confidence: 0.95,
    ));

    // Secondary focus areas based on detected symptoms
    if (analysisResult!.detectedSymptoms.isNotEmpty) {
      final symptom = analysisResult!.detectedSymptoms.first;
      final random = math.Random(symptom.symptom.hashCode);

      // Top area
      areas.add(FocusArea(
        rect: Rect.fromCenter(
          center: Offset(screenSize.width * 0.5, screenSize.height * 0.2),
          width: screenSize.width * 0.2,
          height: screenSize.height * 0.15,
        ),
        label: symptom.category,
        confidence: symptom.confidence,
      ));
    }

    return areas;
  }

  Color _getSymptomColor(String category) {
    switch (category.toLowerCase()) {
      case 'color':
        return Colors.amber;
      case 'spots':
        return Colors.red;
      case 'curling':
        return Colors.orange;
      case 'wilting':
        return Colors.blue;
      case 'growth':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  IconData _getSymptomIcon(String category) {
    switch (category.toLowerCase()) {
      case 'color':
        return Icons.palette;
      case 'spots':
        return Icons.blur_circular;
      case 'curling':
        return Icons.crop_free;
      case 'wilting':
        return Icons.water_drop;
      case 'growth':
        return Icons.trending_up;
      default:
        return Icons.warning;
    }
  }
}

class DetectionZonesPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.cyan.withOpacity(0.3)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    // Draw 3x3 grid of detection zones
    const rows = 3;
    const cols = 3;

    final zoneWidth = size.width / cols;
    final zoneHeight = size.height / rows;

    for (int row = 0; row < rows; row++) {
      for (int col = 0; col < cols; col++) {
        final left = col * zoneWidth;
        final top = row * zoneHeight;

        final rect = Rect.fromLTWH(left, top, zoneWidth, zoneHeight);
        canvas.drawRect(rect, paint);

        // Draw zone label
        final zoneNumber = row * cols + col + 1;
        _drawZoneLabel(canvas, rect, '$zoneNumber');
      }
    }

    // Draw center crosshair
    final centerRect = Rect.fromCenter(
      center: size.center(Offset.zero),
      width: zoneWidth,
      height: zoneHeight,
    );

    final crosshairPaint = Paint()
      ..color = Colors.cyan
      ..strokeWidth = 3;

    // Horizontal line
    canvas.drawLine(
      Offset(centerRect.left, centerRect.center.dy),
      Offset(centerRect.right, centerRect.center.dy),
      crosshairPaint,
    );

    // Vertical line
    canvas.drawLine(
      Offset(centerRect.center.dx, centerRect.top),
      Offset(centerRect.center.dx, centerRect.bottom),
      crosshairPaint,
    );
  }

  void _drawZoneLabel(Canvas canvas, Rect rect, String label) {
    final textPainter = TextPainter(
      text: TextSpan(
        text: label,
        style: const TextStyle(
          color: Colors.cyan,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
      textDirection: TextDirection.ltr,
    );

    textPainter.layout();
    textPainter.paint(
      canvas,
      rect.topLeft + const Offset(8, 8),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class FocusAreasPainter extends CustomPainter {
  final List<FocusArea> focusAreas;

  FocusAreasPainter({required this.focusAreas});

  @override
  void paint(Canvas canvas, Size size) {
    for (final area in focusAreas) {
      _drawFocusArea(canvas, area);
    }
  }

  void _drawFocusArea(Canvas canvas, FocusArea area) {
    final opacity = area.confidence;

    // Draw focus rectangle
    final borderPaint = Paint()
      ..color = Colors.green.withOpacity(opacity)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke;

    final fillPaint = Paint()
      ..color = Colors.green.withOpacity(opacity * 0.1)
      ..style = PaintingStyle.fill;

    canvas.drawRect(area.rect, fillPaint);
    canvas.drawRect(area.rect, borderPaint);

    // Draw corners
    final cornerPaint = Paint()
      ..color = Colors.green.withOpacity(opacity)
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;

    final cornerLength = 20.0;
    final rect = area.rect;

    // Top-left corner
    canvas.drawLine(
      rect.topLeft,
      rect.topLeft + Offset(cornerLength, 0),
      cornerPaint,
    );
    canvas.drawLine(
      rect.topLeft,
      rect.topLeft + Offset(0, cornerLength),
      cornerPaint,
    );

    // Top-right corner
    canvas.drawLine(
      rect.topRight,
      rect.topRight + Offset(-cornerLength, 0),
      cornerPaint,
    );
    canvas.drawLine(
      rect.topRight,
      rect.topRight + Offset(0, cornerLength),
      cornerPaint,
    );

    // Bottom-left corner
    canvas.drawLine(
      rect.bottomLeft,
      rect.bottomLeft + Offset(cornerLength, 0),
      cornerPaint,
    );
    canvas.drawLine(
      rect.bottomLeft,
      rect.bottomLeft + Offset(0, -cornerLength),
      cornerPaint,
    );

    // Bottom-right corner
    canvas.drawLine(
      rect.bottomRight,
      rect.bottomRight + Offset(-cornerLength, 0),
      cornerPaint,
    );
    canvas.drawLine(
      rect.bottomRight,
      rect.bottomRight + Offset(0, -cornerLength),
      cornerPaint,
    );

    // Draw label
    _drawFocusAreaLabel(canvas, area);
  }

  void _drawFocusAreaLabel(Canvas canvas, FocusArea area) {
    final textPainter = TextPainter(
      text: TextSpan(
        text: '${area.label} (${(area.confidence * 100).toInt()}%)',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.bold,
          backgroundColor: Colors.black54,
        ),
      ),
      textDirection: TextDirection.ltr,
    );

    textPainter.layout();

    final labelPosition = Offset(
      area.rect.left + 8,
      area.rect.top - textPainter.height - 8,
    );

    // Draw background
    final bgPaint = Paint()
      ..color = Colors.black.withOpacity(0.7);

    final bgRect = Rect.fromLTWH(
      labelPosition.dx - 4,
      labelPosition.dy - 2,
      textPainter.width + 8,
      textPainter.height + 4,
    );

    final bgRRect = RRect.fromRectAndRadius(bgRect, const Radius.circular(4));
    canvas.drawRRect(bgRRect, bgPaint);

    // Draw text
    textPainter.paint(canvas, labelPosition);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    return oldDelegate is! FocusAreasPainter ||
           oldDelegate.focusAreas.length != focusAreas.length ||
           !listEquals(oldDelegate.focusAreas, focusAreas);
  }

  bool listEquals<T>(List<T> a, List<T> b) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}

class FocusArea {
  final Rect rect;
  final String label;
  final double confidence;

  FocusArea({
    required this.rect,
    required this.label,
    required this.confidence,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FocusArea &&
          runtimeType == other.runtimeType &&
          rect == other.rect &&
          label == other.label &&
          confidence == other.confidence;

  @override
  int get hashCode => rect.hashCode ^ label.hashCode ^ confidence.hashCode;
}