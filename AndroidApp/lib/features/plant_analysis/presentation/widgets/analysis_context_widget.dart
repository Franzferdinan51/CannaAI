import 'package:flutter/material.dart';
import '../../../../core/models/enhanced_plant_analysis.dart';
import '../../../../core/models/sensor_data.dart';

class AnalysisContextWidget extends StatelessWidget {
  final EnhancedPlantAnalysis? analysis;
  final SensorData? sensorData;
  final Function(EnhancedPlantAnalysis?)? onAnalysisChanged;
  final Function(SensorData?)? onSensorDataChanged;

  const AnalysisContextWidget({
    super.key,
    this.analysis,
    this.sensorData,
    this.onAnalysisChanged,
    this.onSensorDataChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Analysis selection
        _buildSection(
          title: 'Plant Analysis',
          icon: Icons.analytics,
          child: _buildAnalysisSelector(context),
        ),

        const SizedBox(height: 16),

        // Sensor data
        _buildSection(
          title: 'Environmental Data',
          icon: Icons.sensors,
          child: _buildSensorDataSection(context),
        ),
      ],
    );
  }

  Widget _buildSection({
    required String title,
    required IconData icon,
    required Widget child,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              icon,
              size: 20,
              color: Theme.of(context).primaryColor,
            ),
            const SizedBox(width: 8),
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }

  Widget _buildAnalysisSelector(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (analysis != null) ...[
            // Analysis summary
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        analysis!.result.overallHealth.toUpperCase(),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.blue,
                        ),
                      ),
                      Text(
                        DateFormat('MMM dd, yyyy').format(analysis!.timestamp),
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () {
                  onAnalysisChanged?.call(null);
                },
                  icon: const Icon(Icons.clear, size: 20),
                  tooltip: 'Remove analysis context',
                ),
              ],
            ),

            if (analysis!.result.detectedSymptoms.isNotEmpty ||
                analysis!.result.detectedDeficiencies.isNotEmpty ||
                analysis!.result.detectedPests.isNotEmpty ||
                analysis!.result.detectedDiseases.isNotEmpty) ...[
              const SizedBox(height: 12),
              _buildIssueSummary(analysis!),
            ],
          ] else ...[
            // No analysis context
            Row(
              children: [
                Icon(
                  Icons.info_outline,
                  size: 20,
                  color: Colors.grey[400],
                ),
                const SizedBox(width: 8),
                Text(
                  'No analysis context attached',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[600],
                  ),
                ),
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: _selectAnalysis,
                  icon: const Icon(Icons.search),
                  label: 'Select Analysis',
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    minimumSize: Size(100, 36),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildIssueSummary(EnhancedPlantAnalysis analysis) {
    final totalIssues = analysis.result.totalIssuesDetected;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$totalIssues ${totalIssues == 1 ? 'issue' : 'issues'} detected',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: Colors.orange[700],
          ),
        ),
        const SizedBox(height: 4),
        Wrap(
          spacing: 4,
          runSpacing: 4,
          children: [
            if (analysis.result.detectedSymptoms.isNotEmpty)
              _buildIssueChip(
                'Symptoms',
                analysis.result.detectedSymptoms.length,
                Colors.red,
              ),
            if (analysis.result.detectedDeficiencies.isNotEmpty)
              _buildIssueChip(
                'Deficiencies',
                analysis.result.detectedDeficiencies.length,
                Colors.amber,
              ),
            if (analysis.result.detectedPests.isNotEmpty)
              _buildIssueChip(
                'Pests',
                analysis.result.detectedPests.length,
                Colors.purple,
              ),
            if (analysis.result.detectedDiseases.isNotEmpty)
              _buildIssueChip(
                'Diseases',
                analysis.result.detectedDiseases.length,
                Colors.brown,
              ),
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
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        '$label ($count)',
        style: TextStyle(
          fontSize: 10,
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildSensorDataSection(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (sensorData != null) ...[
            // Sensor data display
            _buildSensorDataRow('Temperature', '${sensorData!.temperature.toStringAsFixed(1)}°F', Icons.thermostat),
            _buildSensorDataRow('Humidity', '${sensorData!.humidity.toStringAsFixed(1)}%', Icons.water_drop),
            _buildSensorDataRow('pH', sensorData!.ph.toStringAsFixed(1), Icons.science),
            _buildSensorDataRow('EC', '${sensorData!.ec.toStringAsFixed(1)} mS/cm', Icons.electrical_services),
            _buildSensorDataRow('CO2', '${sensorData!.co2.toStringAsFixed(0)} ppm', Icons.air),
            _buildSensorDataRow('VPD', '${sensorData!.vpd.toStringAsFixed(1)} kPa', Icons.compress),
            _buildSensorDataRow('Light', '${sensorData!.lightIntensity.toStringAsFixed(0)} lux', Icons.light_mode),

            // Status indicators
            const SizedBox(height: 12),
            _buildSensorStatusIndicators(sensorData!),
          ] else ...[
            // No sensor data
            Row(
              children: [
                Icon(
                  Icons.info_outline,
                  size: 20,
                  color: Colors.grey[400],
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'No sensor data available',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[600],
                        ),
                      ),
                      Text(
                        'Connect sensors to provide environmental context',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () {
                  onSensorDataChanged?.call(null);
                },
                  icon: const Icon(Icons.refresh, size: 20),
                  tooltip: 'Refresh sensor data',
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSensorDataRow(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Icon(
            icon,
            size: 16,
            color: Theme.of(context).primaryColor,
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSensorStatusIndicators(SensorData sensorData) {
    final indicators = <Widget>[];

    // Temperature status
    indicators.add(_buildStatusIndicator(
      'Temperature',
      sensorData.temperature,
      SensorRange(65, 85),
      '°F',
    ));

    // Humidity status
    indicators.add(_buildStatusIndicator(
      'Humidity',
      sensorData.humidity,
      SensorRange(40, 60),
      '%',
    ));

    // pH status
    indicators.add(_buildStatusIndicator(
      'pH',
      sensorData.ph,
      SensorRange(6.0, 7.0),
      '',
    ));

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: indicators,
    );
  }

  Widget _buildStatusIndicator(
    String label,
    double value,
    SensorRange range,
    String unit,
  ) {
    final status = _getSensorStatus(value, range);
    final color = _getStatusColor(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                _getStatusIcon(status),
                size: 12,
                color: color,
              ),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
          Text(
            '${value.toStringAsFixed(1)}$unit',
            style: TextStyle(
              fontSize: 10,
              color: color,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  SensorStatus _getSensorStatus(double value, SensorRange range) {
    if (value < range.min) return SensorStatus.low;
    if (value > range.max) return SensorStatus.high;
    return SensorStatus.optimal;
  }

  Color _getStatusColor(SensorStatus status) {
    switch (status) {
      case SensorStatus.optimal:
        return Colors.green;
      case SensorStatus.low:
        return Colors.blue;
      case SensorStatus.high:
        return Colors.orange;
      case SensorStatus.critical:
        return Colors.red;
    }
  }

  IconData _getStatusIcon(SensorStatus status) {
    switch (status) {
      case SensorStatus.optimal:
        return Icons.check_circle;
      case SensorStatus.low:
        return Icons.arrow_downward;
      case SensorStatus.high:
        return Icons.arrow_upward;
      case SensorStatus.critical:
        return Icons.warning;
    }
  }

  void _selectAnalysis() {
    // This would open a dialog to select from available analyses
    // Implementation depends on the state management setup
    // For now, we'll show a placeholder
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Analysis selection would be implemented here')),
    );
  }
}

class SensorRange {
  final double min;
  final double max;

  const SensorRange(this.min, this.max);
}

enum SensorStatus {
  optimal,
  low,
  high,
  critical,
}