import 'package:flutter/material.dart';
import '../providers/sensor_provider.dart';

class SensorCard extends StatelessWidget {
  final String name;
  final String value;
  final String unit;
  final IconData icon;
  final SensorType type;
  final SensorStatus status;

  const SensorCard({
    super.key,
    required this.name,
    required this.value,
    required this.unit,
    required this.icon,
    required this.type,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final statusColor = _getStatusColor(status);
    final statusIcon = _getStatusIcon(status);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
        border: Border.all(
          color: statusColor.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: colorScheme.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: colorScheme.primary,
                  size: 20,
                ),
              ),
              Icon(
                statusIcon,
                color: statusColor,
                size: 16,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            name,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Colors.grey[600],
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Flexible(
                child: Text(
                  value,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: colorScheme.onSurface,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (unit.isNotEmpty) ...[
                const SizedBox(width: 2),
                Text(
                  unit,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              _getStatusText(status),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: statusColor,
                fontWeight: FontWeight.w600,
                fontSize: 10,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(SensorStatus status) {
    switch (status) {
      case SensorStatus.optimal:
        return Colors.green;
      case SensorStatus.warning:
        return Colors.orange;
      case SensorStatus.critical:
        return Colors.red;
      case SensorStatus.unknown:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon(SensorStatus status) {
    switch (status) {
      case SensorStatus.optimal:
        return Icons.check_circle;
      case SensorStatus.warning:
        return Icons.warning;
      case SensorStatus.critical:
        return Icons.error;
      case SensorStatus.unknown:
        return Icons.help;
    }
  }

  String _getStatusText(SensorStatus status) {
    switch (status) {
      case SensorStatus.optimal:
        return 'Optimal';
      case SensorStatus.warning:
        return 'Warning';
      case SensorStatus.critical:
        return 'Critical';
      case SensorStatus.unknown:
        return 'Unknown';
    }
  }
}