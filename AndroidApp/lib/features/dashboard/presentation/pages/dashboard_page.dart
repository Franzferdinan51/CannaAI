import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/sensor_provider.dart';
import '../../../core/providers/automation_provider.dart';
import '../../../core/widgets/sensor_card.dart';
import '../../../core/widgets/quick_action_button.dart';

class DashboardPage extends ConsumerStatefulWidget {
  const DashboardPage({super.key});

  @override
  ConsumerState<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends ConsumerState<DashboardPage>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _slideController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat();

    _slideController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    // Start animation after a brief delay
    Future.delayed(const Duration(milliseconds: 100), () {
      _slideController.forward();
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sensorData = ref.watch(sensorDataProvider);
    final automationState = ref.watch(automationProvider);

    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      body: SafeArea(
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // App Header
            SliverToBoxAdapter(
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      colorScheme.primary.withOpacity(0.1),
                      colorScheme.secondary.withOpacity(0.05),
                    ],
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Good ${_getTimeOfDay()}',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: colorScheme.onSurface.withOpacity(0.7),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Grow Room Monitor',
                              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: colorScheme.primary,
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: automationState.isConnected ? Colors.green : Colors.orange,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                ),
                                child: AnimatedBuilder(
                                  animation: _pulseController,
                                  builder: (context, child) {
                                    return Container(
                                      width: 8,
                                      height: 8,
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        shape: BoxShape.circle,
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.white.withOpacity(0.5),
                                            blurRadius: 4 * _pulseController.value,
                                            spreadRadius: 2 * _pulseController.value,
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                automationState.isConnected ? 'Connected' : 'Offline',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Quick Status Bar
                    Container(
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
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _QuickStatusItem(
                            icon: Icons.thermostat_outlined,
                            label: 'System',
                            value: 'Online',
                            color: Colors.green,
                            animationDelay: 0,
                            slideController: _slideController,
                          ),
                          _QuickStatusItem(
                            icon: Icons.eco_outlined,
                            label: 'Plants',
                            value: '12 Active',
                            color: colorScheme.primary,
                            animationDelay: 100,
                            slideController: _slideController,
                          ),
                          _QuickStatusItem(
                            icon: Icons.alarm_on_outlined,
                            label: 'Automations',
                            value: '${automationState.activeAutomations}',
                            color: Colors.orange,
                            animationDelay: 200,
                            slideController: _slideController,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 20)),

            // Sensor Grid
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 16,
                  crossAxisSpacing: 16,
                  childAspectRatio: 1.2,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final sensors = [
                      {'type': SensorType.temperature, 'name': 'Temperature', 'icon': Icons.thermostat, 'unit': '°C'},
                      {'type': SensorType.humidity, 'name': 'Humidity', 'icon': Icons.water_drop, 'unit': '%'},
                      {'type': SensorType.ph, 'name': 'pH Level', 'icon': Icons.science, 'unit': ''},
                      {'type': SensorType.lightIntensity, 'name': 'Light Intensity', 'icon': Icons.lightbulb, 'unit': 'lux'},
                      {'type': SensorType.co2, 'name': 'CO₂ Level', 'icon': Icons.air, 'unit': 'ppm'},
                      {'type': SensorType.ec, 'name': 'EC Level', 'icon': Icons.electric_bolt, 'unit': 'mS/cm'},
                    ];

                    if (index >= sensors.length) return null;

                    final sensor = sensors[index];
                    final sensorType = sensor['type'] as SensorType;

                    return AnimatedBuilder(
                      animation: _slideController,
                      builder: (context, child) {
                        final delay = index * 100;
                        final animationProgress = (_slideController.value - (delay / 600)).clamp(0.0, 1.0);

                        return Transform.translate(
                          offset: Offset(0, 50 * (1 - animationProgress)),
                          child: Opacity(
                            opacity: animationProgress,
                            child: SensorCard(
                              name: sensor['name'] as String,
                              value: sensorData.getLatestValue(sensorType)?.toStringAsFixed(1) ?? '0.0',
                              unit: sensor['unit'] as String,
                              icon: sensor['icon'] as IconData,
                              type: sensorType,
                              status: sensorData.getSensorStatus(sensorType),
                            ),
                          ),
                        );
                      },
                    );
                  },
                  childCount: 6,
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 20)),

            // Mini Chart Section
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  height: 200,
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
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Temperature Trend',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Last 24 hours',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Expanded(
                        child: LineChart(
                          LineChartData(
                            gridData: FlGridData(
                              show: true,
                              drawVerticalLine: false,
                              horizontalInterval: 5,
                              getDrawingHorizontalLine: (value) {
                                return FlLine(
                                  color: Colors.grey.withOpacity(0.3),
                                  strokeWidth: 1,
                                );
                              },
                            ),
                            titlesData: const FlTitlesData(show: false),
                            borderData: FlBorderData(show: false),
                            lineBarsData: [
                              LineChartBarData(
                                spots: sensorData.temperatureHistory.asMap().entries.map((entry) {
                                  return FlSpot(entry.key.toDouble(), entry.value);
                                }).toList(),
                                isCurved: true,
                                gradient: LinearGradient(
                                  colors: [
                                    colorScheme.primary,
                                    colorScheme.primary.withOpacity(0.3),
                                  ],
                                ),
                                barWidth: 3,
                                isStrokeCapRound: true,
                                dotData: const FlDotData(show: false),
                                belowBarData: BarAreaData(
                                  show: true,
                                  gradient: LinearGradient(
                                    colors: [
                                      colorScheme.primary.withOpacity(0.3),
                                      colorScheme.primary.withOpacity(0.1),
                                    ],
                                    begin: Alignment.topCenter,
                                    end: Alignment.bottomCenter,
                                  ),
                                ),
                              ),
                            ],
                            minY: 15,
                            maxY: 35,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 20)),

            // Quick Actions
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Quick Actions',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: QuickActionButton(
                            icon: Icons.water_drop,
                            label: 'Water Now',
                            color: Colors.blue,
                            onTap: () {
                              ref.read(automationProvider.notifier).toggleWatering(true);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Watering started')),
                              );
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: QuickActionButton(
                            icon: Icons.lightbulb,
                            label: 'Toggle Lights',
                            color: Colors.orange,
                            onTap: () {
                              ref.read(automationProvider.notifier).toggleLights();
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Lights toggled')),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: QuickActionButton(
                            icon: Icons.camera_alt,
                            label: 'Analyze Plant',
                            color: Colors.green,
                            onTap: () {
                              // Navigate to plant analysis
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: QuickActionButton(
                            icon: Icons.analytics,
                            label: 'View Analytics',
                            color: Colors.purple,
                            onTap: () {
                              // Navigate to analytics
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 20)),
          ],
        ),
      ),
    );
  }

  String _getTimeOfDay() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  }
}

class _QuickStatusItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  final int animationDelay;
  final AnimationController slideController;

  const _QuickStatusItem({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
    required this.animationDelay,
    required this.slideController,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: slideController,
      builder: (context, child) {
        final animationProgress = (slideController.value - (animationDelay / 600)).clamp(0.0, 1.0);

        return Transform.translate(
          offset: Offset(0, 20 * (1 - animationProgress)),
          child: Opacity(
            opacity: animationProgress,
            child: Column(
              children: [
                Icon(icon, color: color, size: 20),
                const SizedBox(height: 4),
                Text(
                  label,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
                ),
                Text(
                  value,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}