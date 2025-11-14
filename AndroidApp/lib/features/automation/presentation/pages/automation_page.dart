import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/automation_provider.dart';
import '../../../core/providers/sensor_provider.dart';

class AutomationPage extends ConsumerStatefulWidget {
  const AutomationPage({super.key});

  @override
  ConsumerState<AutomationPage> createState() => _AutomationPageState();
}

class _AutomationPageState extends ConsumerState<AutomationPage> with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _sliderController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat();

    _sliderController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    Future.delayed(const Duration(milliseconds: 100), () {
      _sliderController.forward();
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _sliderController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final automationState = ref.watch(automationProvider);
    final sensorData = ref.watch(sensorDataProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      body: SafeArea(
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // Header
            SliverToBoxAdapter(
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Colors.blue.withOpacity(0.1),
                      Colors.orange.withOpacity(0.05),
                    ],
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.blue,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Icon(
                            Icons.auto_awesome,
                            color: Colors.white,
                            size: 28,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Automation Controls',
                                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: colorScheme.primary,
                                ),
                              ),
                              Text(
                                'Smart cultivation management',
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: Colors.grey[600],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 20)),

            // Automation Status Cards
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 16,
                  crossAxisSpacing: 16,
                  childAspectRatio: 1.4,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final automationCards = [
                      {
                        'title': 'Watering System',
                        'icon': Icons.water_drop,
                        'enabled': automationState.wateringEnabled,
                        'active': automationState.isWatering,
                        'color': Colors.blue,
                        'value': '${sensorData.getLatestValue(SensorType.soilMoisture)?.toStringAsFixed(0) ?? 0}%',
                      },
                      {
                        'title': 'Lighting System',
                        'icon': Icons.lightbulb,
                        'enabled': automationState.lightingEnabled,
                        'active': automationState.lightsOn,
                        'color': Colors.orange,
                        'value': automationState.lightsOn ? 'ON' : 'OFF',
                      },
                      {
                        'title': 'Climate Control',
                        'icon': Icons.thermostat,
                        'enabled': automationState.climateControlEnabled,
                        'active': true,
                        'color': Colors.green,
                        'value': '${sensorData.getLatestValue(SensorType.temperature)?.toStringAsFixed(1) ?? 0}°C',
                      },
                      {
                        'title': 'Nutrient Pump',
                        'icon': Icons.science,
                        'enabled': automationState.nutrientPumpEnabled,
                        'active': automationState.nutrientPumpEnabled,
                        'color': Colors.purple,
                        'value': automationState.nutrientPumpEnabled ? 'Active' : 'Inactive',
                      },
                    ];

                    if (index >= automationCards.length) return null;

                    final card = automationCards[index];

                    return AnimatedBuilder(
                      animation: _sliderController,
                      builder: (context, child) {
                        final delay = index * 100;
                        final animationProgress = (_sliderController.value - (delay / 800)).clamp(0.0, 1.0);

                        return Transform.translate(
                          offset: Offset(0, 30 * (1 - animationProgress)),
                          child: Opacity(
                            opacity: animationProgress,
                            child: _AutomationCard(
                              title: card['title'] as String,
                              icon: card['icon'] as IconData,
                              enabled: card['enabled'] as bool,
                              active: card['active'] as bool,
                              color: card['color'] as Color,
                              value: card['value'] as String,
                              onTap: () => _toggleAutomation(index, ref),
                            ),
                          ),
                        );
                      },
                    );
                  },
                  childCount: 4,
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 20)),

            // Watering Controls
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _WateringControls(
                  automationState: automationState,
                  sensorData: sensorData,
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 16)),

            // Lighting Schedule
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _LightingSchedule(
                  automationState: automationState,
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 16)),

            // Climate Settings
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _ClimateSettings(
                  automationState: automationState,
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 20)),
          ],
        ),
      ),
    );
  }

  void _toggleAutomation(int index, WidgetRef ref) {
    final notifier = ref.read(automationProvider.notifier);
    switch (index) {
      case 0:
        notifier.toggleWatering(null);
        break;
      case 1:
        notifier.toggleLighting(null);
        break;
      case 2:
        notifier.toggleClimateControl(null);
        break;
      case 3:
        notifier.setNutrientPump(!ref.read(automationProvider).nutrientPumpEnabled);
        break;
    }
  }
}

class _AutomationCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final bool enabled;
  final bool active;
  final Color color;
  final String value;
  final VoidCallback onTap;

  const _AutomationCard({
    required this.title,
    required this.icon,
    required this.enabled,
    required this.active,
    required this.color,
    required this.value,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: enabled ? color.withOpacity(0.3) : Colors.grey.withOpacity(0.2),
              width: enabled ? 2 : 1,
            ),
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: enabled ? color.withOpacity(0.1) : Colors.grey.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      icon,
                      color: enabled ? color : Colors.grey,
                      size: 20,
                    ),
                  ),
                  Switch(
                    value: enabled,
                    onChanged: (_) => onTap(),
                    activeColor: color,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: active ? color : Colors.grey,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    value,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w500,
                      color: enabled ? colorScheme.onSurface : Colors.grey,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _WateringControls extends ConsumerWidget {
  final AutomationState automationState;
  final dynamic sensorData;

  const _WateringControls({
    required this.automationState,
    required this.sensorData,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(20),
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
            'Watering Controls',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),

          // Water Threshold Slider
          Text(
            'Soil Moisture Threshold: ${automationState.waterThreshold.toStringAsFixed(0)}%',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: Colors.blue,
              inactiveTrackColor: Colors.grey.withOpacity(0.3),
              thumbColor: Colors.blue,
              overlayColor: Colors.blue.withOpacity(0.2),
            ),
            child: Slider(
              value: automationState.waterThreshold,
              min: 20.0,
              max: 80.0,
              divisions: 12,
              onChanged: (value) {
                ref.read(automationProvider.notifier).updateWaterThreshold(value);
              },
            ),
          ),

          const SizedBox(height: 16),

          // Manual Water Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: automationState.isWatering
                  ? null
                  : () {
                      ref.read(automationProvider.notifier).startWateringCycle();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Watering cycle started')),
                      );
                    },
              icon: Icon(
                automationState.isWatering ? Icons.hourglass_empty : Icons.water_drop,
              ),
              label: Text(automationState.isWatering ? 'Watering...' : 'Start Watering Now'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),

          if (automationState.lastWateringTime != null) ...[
            const SizedBox(height: 12),
            Text(
              'Last watering: ${_formatTime(automationState.lastWateringTime!)}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Colors.grey[600],
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}

class _LightingSchedule extends ConsumerWidget {
  final AutomationState automationState;

  const _LightingSchedule({
    required this.automationState,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(20),
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
            'Lighting Schedule',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),

          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'On Time',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.withOpacity(0.3)),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(automationState.lightsOnTime),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Off Time',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.withOpacity(0.3)),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(automationState.lightsOffTime),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Toggle Lights Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                ref.read(automationProvider.notifier).toggleLights();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(automationState.lightsOn ? 'Lights turned off' : 'Lights turned on')),
                );
              },
              icon: Icon(automationState.lightsOn ? Icons.lightbulb : Icons.lightbulb_outline),
              label: Text(automationState.lightsOn ? 'Turn Lights Off' : 'Turn Lights On'),
              style: ElevatedButton.styleFrom(
                backgroundColor: automationState.lightsOn ? Colors.grey : Colors.orange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ClimateSettings extends ConsumerWidget {
  final AutomationState automationState;

  const _ClimateSettings({
    required this.automationState,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(20),
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
            'Climate Settings',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),

          // Temperature Range
          Text(
            'Temperature Range: ${automationState.temperatureMin.toStringAsFixed(0)}°C - ${automationState.temperatureMax.toStringAsFixed(0)}°C',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          RangeSlider(
            values: RangeValues(automationState.temperatureMin, automationState.temperatureMax),
            min: 15.0,
            max: 35.0,
            divisions: 20,
            activeColor: Colors.green,
            inactiveColor: Colors.grey.withOpacity(0.3),
            onChanged: (values) {
              ref.read(automationProvider.notifier).updateTemperatureRange(values.start, values.end);
            },
          ),

          const SizedBox(height: 16),

          // Humidity Range
          Text(
            'Humidity Range: ${automationState.humidityMin.toStringAsFixed(0)}% - ${automationState.humidityMax.toStringAsFixed(0)}%',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          RangeSlider(
            values: RangeValues(automationState.humidityMin, automationState.humidityMax),
            min: 30.0,
            max: 80.0,
            divisions: 10,
            activeColor: Colors.blue,
            inactiveColor: Colors.grey.withOpacity(0.3),
            onChanged: (values) {
              ref.read(automationProvider.notifier).updateHumidityRange(values.start, values.end);
            },
          ),

          const SizedBox(height: 16),

          // Fan Speed Control
          Row(
            children: [
              Icon(Icons.air, color: Colors.green),
              const SizedBox(width: 8),
              Text(
                'Fan Speed: ${automationState.fanSpeed}',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: Colors.green,
              inactiveTrackColor: Colors.grey.withOpacity(0.3),
              thumbColor: Colors.green,
              overlayColor: Colors.green.withOpacity(0.2),
            ),
            child: Slider(
              value: automationState.fanSpeed.toDouble(),
              min: 0.0,
              max: 5.0,
              divisions: 5,
              onChanged: (value) {
                ref.read(automationProvider.notifier).setFanSpeed(value.round());
              },
            ),
          ),
        ],
      ),
    );
  }
}