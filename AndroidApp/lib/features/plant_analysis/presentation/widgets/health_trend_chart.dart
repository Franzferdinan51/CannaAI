import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../pages/live_vision_page.dart';

class HealthTrendChart extends StatelessWidget {
  final List<HealthTrendDataPoint> data;
  final double height;
  final bool showLabels;
  final Color? primaryColor;
  final Color? secondaryColor;
  final Duration? timeRange;

  const HealthTrendChart({
    super.key,
    required this.data,
    this.height = 200,
    this.showLabels = true,
    this.primaryColor,
    this.secondaryColor,
    this.timeRange,
  });

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return Container(
        height: height,
        alignment: Alignment.center,
        child: const Text(
          'No data available',
          style: TextStyle(
            color: Colors.grey,
            fontSize: 14,
          ),
        ),
      );
    }

    return Container(
      height: height,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.3),
        borderRadius: BorderRadius.circular(12),
      ),
      child: CustomPaint(
        size: Size(double.infinity, height - 32),
        painter: HealthTrendChartPainter(
          data: data,
          primaryColor: primaryColor ?? Colors.green,
          secondaryColor: secondaryColor ?? Colors.blue,
          showLabels: showLabels,
          timeRange: timeRange,
        ),
      ),
    );
  }
}

class HealthTrendChartPainter extends CustomPainter {
  final List<HealthTrendDataPoint> data;
  final Color primaryColor;
  final Color secondaryColor;
  final bool showLabels;
  final Duration? timeRange;

  HealthTrendChartPainter({
    required this.data,
    required this.primaryColor,
    required this.secondaryColor,
    required this.showLabels,
    this.timeRange,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final padding = showLabels ? 40.0 : 20.0;
    final chartWidth = size.width - (padding * 2);
    final chartHeight = size.height - (padding * 2);

    if (data.length < 2) return;

    // Filter data by time range if specified
    final filteredData = _filterDataByTimeRange();

    // Calculate scales
    final minScore = 0.0;
    final maxScore = 1.0;
    final scoreRange = maxScore - minScore;

    final timeSpan = filteredData.last.timestamp.difference(filteredData.first.timestamp).inMilliseconds;
    final startTime = filteredData.first.timestamp.millisecondsSinceEpoch;

    // Draw grid
    _drawGrid(canvas, size, padding);

    // Draw axes
    _drawAxes(canvas, size, padding);

    // Draw health score line
    _drawHealthScoreLine(canvas, chartWidth, chartHeight, padding, scoreRange, timeSpan, startTime, filteredData);

    // Draw confidence area
    _drawConfidenceArea(canvas, chartWidth, chartHeight, padding, scoreRange, timeSpan, startTime, filteredData);

    // Draw data points
    _drawDataPoints(canvas, chartWidth, chartHeight, padding, scoreRange, timeSpan, startTime, filteredData);

    // Draw labels
    if (showLabels) {
      _drawLabels(canvas, size, padding, minScore, maxScore);
    }

    // Draw average line
    _drawAverageLine(canvas, chartWidth, chartHeight, padding, filteredData);
  }

  List<HealthTrendDataPoint> _filterDataByTimeRange() {
    if (timeRange == null) return data;

    final cutoff = DateTime.now().subtract(timeRange!);
    return data.where((point) => point.timestamp.isAfter(cutoff)).toList();
  }

  void _drawGrid(Canvas canvas, Size size, double padding) {
    final gridPaint = Paint()
      ..color = Colors.white.withOpacity(0.1)
      ..strokeWidth = 1;

    // Horizontal grid lines
    const horizontalLines = 5;
    for (int i = 0; i <= horizontalLines; i++) {
      final y = padding + (i / horizontalLines) * (size.height - padding * 2);
      canvas.drawLine(
        Offset(padding, y),
        Offset(size.width - padding, y),
        gridPaint,
      );
    }

    // Vertical grid lines
    const verticalLines = 6;
    for (int i = 0; i <= verticalLines; i++) {
      final x = padding + (i / verticalLines) * (size.width - padding * 2);
      canvas.drawLine(
        Offset(x, padding),
        Offset(x, size.height - padding),
        gridPaint,
      );
    }
  }

  void _drawAxes(Canvas canvas, Size size, double padding) {
    final axisPaint = Paint()
      ..color = Colors.white.withOpacity(0.5)
      ..strokeWidth = 2;

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
  }

  void _drawHealthScoreLine(
    Canvas canvas,
    double chartWidth,
    double chartHeight,
    double padding,
    double scoreRange,
    int timeSpan,
    int startTime,
    List<HealthTrendDataPoint> filteredData,
  ) {
    final path = Path();
    final linePaint = Paint()
      ..color = primaryColor
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    for (int i = 0; i < filteredData.length; i++) {
      final point = filteredData[i];
      final x = padding + ((point.timestamp.millisecondsSinceEpoch - startTime) / timeSpan) * chartWidth;
      final y = size.height - padding - ((point.healthScore - 0) / scoreRange) * chartHeight;

      if (i == 0) {
        path.moveTo(x, y);
      } else {
        // Use quadratic bezier for smoother curves
        final prevPoint = filteredData[i - 1];
        final prevX = padding + ((prevPoint.timestamp.millisecondsSinceEpoch - startTime) / timeSpan) * chartWidth;
        final prevY = size.height - padding - ((prevPoint.healthScore - 0) / scoreRange) * chartHeight;

        final controlX = (prevX + x) / 2;
        final controlY = (prevY + y) / 2;

        path.quadraticBezierTo(controlX, controlY, x, y);
      }
    }

    canvas.drawPath(path, linePaint);
  }

  void _drawConfidenceArea(
    Canvas canvas,
    double chartWidth,
    double chartHeight,
    double padding,
    double scoreRange,
    int timeSpan,
    int startTime,
    List<HealthTrendDataPoint> filteredData,
  ) {
    final path = Path();
    final fillPaint = Paint()
      ..color = secondaryColor.withOpacity(0.2)
      ..style = PaintingStyle.fill;

    // Create upper bound path
    for (int i = 0; i < filteredData.length; i++) {
      final point = filteredData[i];
      final confidenceModifier = (1.0 - point.confidence) * 0.1; // Max 10% variance
      final adjustedScore = math.min(1.0, point.healthScore + confidenceModifier);

      final x = padding + ((point.timestamp.millisecondsSinceEpoch - startTime) / timeSpan) * chartWidth;
      final y = size.height - padding - ((adjustedScore - 0) / scoreRange) * chartHeight;

      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    // Complete the path by going back along the lower bound
    for (int i = filteredData.length - 1; i >= 0; i--) {
      final point = filteredData[i];
      final confidenceModifier = (1.0 - point.confidence) * 0.1;
      final adjustedScore = math.max(0.0, point.healthScore - confidenceModifier);

      final x = padding + ((point.timestamp.millisecondsSinceEpoch - startTime) / timeSpan) * chartWidth;
      final y = size.height - padding - ((adjustedScore - 0) / scoreRange) * chartHeight;

      path.lineTo(x, y);
    }

    path.close();
    canvas.drawPath(path, fillPaint);
  }

  void _drawDataPoints(
    Canvas canvas,
    double chartWidth,
    double chartHeight,
    double padding,
    double scoreRange,
    int timeSpan,
    int startTime,
    List<HealthTrendDataPoint> filteredData,
  ) {
    for (final point in filteredData) {
      final x = padding + ((point.timestamp.millisecondsSinceEpoch - startTime) / timeSpan) * chartWidth;
      final y = size.height - padding - ((point.healthScore - 0) / scoreRange) * chartHeight;

      // Outer circle
      canvas.drawCircle(
        Offset(x, y),
        6,
        Paint()
          ..color = primaryColor
          ..style = PaintingStyle.fill,
      );

      // Inner circle
      canvas.drawCircle(
        Offset(x, y),
        4,
        Paint()
          ..color = Colors.white
          ..style = PaintingStyle.fill,
      );
    }
  }

  void _drawLabels(Canvas canvas, Size size, double padding, double minScore, double maxScore) {
    final textPainter = TextPainter(
      textDirection: TextDirection.ltr,
    );

    // Y-axis labels (Health scores)
    const labelCount = 5;
    for (int i = 0; i <= labelCount; i++) {
      final value = minScore + (maxScore - minScore) * (i / labelCount);
      final percentage = (value * 100).round();
      final y = size.height - padding - (i / labelCount) * (size.height - padding * 2);

      textPainter.text = TextSpan(
        text: '$percentage%',
        style: TextStyle(
          color: Colors.white.withOpacity(0.7),
          fontSize: 10,
        ),
      );
      textPainter.layout();
      textPainter.paint(
        canvas,
        Offset(padding - textPainter.width - 8, y - textPainter.height / 2),
      );
    }

    // X-axis labels (Time)
    if (filteredData.isNotEmpty) {
      final startTime = filteredData.first.timestamp;
      final endTime = filteredData.last.timestamp;
      const timeLabelCount = 4;

      for (int i = 0; i <= timeLabelCount; i++) {
        final time = startTime.add(Duration(
          milliseconds: (endTime.difference(startTime).inMilliseconds * i / timeLabelCount).round(),
        ));
        final x = padding + (i / timeLabelCount) * (size.width - padding * 2);

        final timeStr = _formatTimeLabel(time);
        textPainter.text = TextSpan(
          text: timeStr,
          style: TextStyle(
            color: Colors.white.withOpacity(0.7),
            fontSize: 10,
          ),
        );
        textPainter.layout();
        textPainter.paint(
          canvas,
          Offset(x - textPainter.width / 2, size.height - padding + 8),
        );
      }
    }
  }

  void _drawAverageLine(
    Canvas canvas,
    double chartWidth,
    double chartHeight,
    double padding,
    List<HealthTrendDataPoint> filteredData,
  ) {
    if (filteredData.isEmpty) return;

    final averageScore = filteredData
        .map((p) => p.healthScore)
        .reduce((a, b) => a + b) / filteredData.length;

    final y = size.height - padding - (averageScore * chartHeight);

    final averagePaint = Paint()
      ..color = Colors.white.withOpacity(0.5)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    // Draw dashed line
    const dashWidth = 8.0;
    const dashSpace = 4.0;
    double currentX = padding;

    while (currentX < size.width - padding) {
      final endX = math.min(currentX + dashWidth, size.width - padding);
      canvas.drawLine(
        Offset(currentX, y),
        Offset(endX, y),
        averagePaint,
      );
      currentX = endX + dashSpace;
    }

    // Draw average label
    final textPainter = TextPainter(
      text: TextSpan(
        text: 'Avg: ${(averageScore * 100).toInt()}%',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.bold,
          backgroundColor: Colors.black54,
        ),
      ),
      textDirection: TextDirection.ltr,
    );

    textPainter.layout();
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(
          size.width - padding - textPainter.width - 8,
          y - textPainter.height / 2 - 2,
          textPainter.width + 4,
          textPainter.height + 4,
        ),
        const Radius.circular(2),
      ),
      Paint()..color = Colors.black.withOpacity(0.7),
    );
    textPainter.paint(
      canvas,
      Offset(size.width - padding - textPainter.width - 6, y - textPainter.height / 2),
    );
  }

  String _formatTimeLabel(DateTime time) {
    final now = DateTime.now();
    final difference = now.difference(time);

    if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h';
    } else {
      return '${difference.inDays}d';
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    return oldDelegate is! HealthTrendChartPainter ||
           oldDelegate.data.length != data.length ||
           !listEquals(oldDelegate.data, data);
  }

  bool listEquals<T>(List<T> a, List<T> b) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}