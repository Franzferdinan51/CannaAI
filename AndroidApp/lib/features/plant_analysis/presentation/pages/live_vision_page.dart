import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:camera/camera.dart';
import '../../../../core/models/enhanced_plant_analysis.dart';
import '../widgets/enhanced_camera_widget.dart';
import '../widgets/live_vision_overlay.dart';
import '../widgets/health_trend_chart.dart';

class LiveVisionPage extends ConsumerStatefulWidget {
  const LiveVisionPage({super.key});

  @override
  ConsumerState<LiveVisionPage> createState() => _LiveVisionPageState();
}

class _LiveVisionPageState extends ConsumerState<LiveVisionPage>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _slideController;
  late Animation<double> _pulseAnimation;
  late Animation<double> _slideAnimation;

  bool _isMonitoring = false;
  bool _isRecording = false;
  bool _showStatistics = true;
  bool _showAlerts = true;
  bool _showHealthBar = true;

  LiveVisionSettings _settings = const LiveVisionSettings();

  DateTime? _lastAnalysis;
  EnhancedAnalysisResult? _currentResult;
  List<HealthTrendDataPoint> _healthTrend = [];
  List<LiveVisionAlert> _alerts = [];

  StreamSubscription<LightingAnalysis>? _lightingSubscription;
  StreamSubscription<FocusAnalysis>? _focusSubscription;

  Timer? _monitoringTimer;
  Timer? _alertTimer;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );

    _slideController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _pulseAnimation = Tween<double>(
      begin: 0.8,
      end: 1.2,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));

    _slideAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeInOut,
    ));
  }

  @override
  void dispose() {
    _stopMonitoring();
    _pulseController.dispose();
    _slideController.dispose();
    _lightingSubscription?.cancel();
    _focusSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Camera preview
          Positioned.fill(
            child: EnhancedCameraWidget(
              onImageCaptured: _onImageCaptured,
              onLightingAnalysisChanged: _onLightingAnalysisChanged,
              onFocusAnalysisChanged: _onFocusAnalysisChanged,
              enableAnalysis: true,
            ),
          ),

          // Live vision overlays
          if (_isMonitoring) ...[
            // Health status bar
            if (_showHealthBar)
              Positioned(
                top: 100,
                left: 16,
                right: 16,
                child: AnimatedBuilder(
                  animation: _slideAnimation,
                  builder: (context, child) {
                    return Transform.translate(
                      offset: Offset(0, -30 * (1 - _slideAnimation.value)),
                      opacity: _slideAnimation.value,
                      child: _buildHealthStatusBar(),
                    );
                  },
                ),
              ),

            // Live vision overlay
            Positioned.fill(
              child: LiveVisionOverlay(
                analysisResult: _currentResult,
                settings: _settings,
                isVisible: _isMonitoring,
              ),
            ),

            // Statistics panel
            if (_showStatistics)
              Positioned(
                bottom: 100,
                left: 16,
                right: 16,
                child: AnimatedBuilder(
                  animation: _slideAnimation,
                  builder: (context, child) {
                    return Transform.translate(
                      offset: Offset(0, 30 * (1 - _slideAnimation.value)),
                      opacity: _slideAnimation.value,
                      child: _buildStatisticsPanel(),
                    );
                  },
                ),
              ),

            // Alerts panel
            if (_showAlerts && _alerts.isNotEmpty)
              Positioned(
                top: 180,
                right: 16,
                child: _buildAlertsPanel(),
              ),
          ],

          // Controls overlay
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: _buildControlsOverlay(),
          ),

          // Bottom controls
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: _buildBottomControls(),
          ),

          // Settings panel (when shown)
          if (!_isMonitoring)
            Positioned.fill(
              child: Container(
                color: Colors.black.withOpacity(0.8),
                child: _buildSettingsPanel(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHealthStatusBar() {
    if (_currentResult == null) {
      return const SizedBox.shrink();
    }

    final healthStatus = _currentResult!.healthStatus;
    final healthScore = (_currentResult!.metrics.getOverallHealthScore() ?? 0.0) * 100;
    final color = _getHealthColor(healthStatus);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.7),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              return Transform.scale(
                scale: healthStatus == HealthStatus.critical ? _pulseAnimation.value : 1.0,
                child: Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.2),
                    shape: BoxShape.circle,
                    border: Border.all(color: color, width: 2),
                  ),
                  child: Icon(
                    _getHealthIcon(healthStatus),
                    color: color,
                    size: 24,
                  ),
                ),
              );
            },
          ),

          const SizedBox(width: 16),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Plant Status: ${healthStatus.name}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Health Score: ${healthScore.toInt()}%',
                  style: TextStyle(
                    color: color,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (_lastAnalysis != null)
                  Text(
                    'Last: ${_formatDuration(DateTime.now().difference(_lastAnalysis!))}',
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 12,
                    ),
                  ),
              ],
            ),
          ),

          // Confidence indicator
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '${(_currentResult!.confidence * 100).toInt()}%',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatisticsPanel() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.7),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Health trend mini chart
          if (_healthTrend.isNotEmpty)
            Container(
              height: 80,
              margin: const EdgeInsets.only(bottom: 12),
              child: HealthTrendChart(
                data: _healthTrend.takeLast(20).toList(),
                height: 80,
                showLabels: false,
              ),
            ),

          // Quick stats
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildStatItem('Analyses', '${_healthTrend.length}', Colors.blue),
              _buildStatItem('Alerts', '${_alerts.length}', Colors.orange),
              _buildStatItem('Uptime', _formatUptime(), Colors.green),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            color: Colors.white70,
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _buildAlertsPanel() {
    return Container(
      width: 200,
      constraints: const BoxConstraints(maxHeight: 300),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.8),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.orange.withOpacity(0.3)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.orange.withOpacity(0.2),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            ),
            child: Row(
              children: [
                const Icon(Icons.notifications_active, color: Colors.orange, size: 20),
                const SizedBox(width: 8),
                const Text(
                  'Alerts',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                Text(
                  '${_alerts.length}',
                  style: const TextStyle(
                    color: Colors.orange,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),

          // Alert list
          Flexible(
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: _alerts.length,
              itemBuilder: (context, index) {
                final alert = _alerts[index];
                return Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(color: Colors.white.withOpacity(0.1)),
                    ),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        _getAlertIcon(alert.severity),
                        color: _getAlertColor(alert.severity),
                        size: 16,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              alert.message,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _formatDuration(DateTime.now().difference(alert.timestamp)),
                              style: const TextStyle(
                                color: Colors.white60,
                                fontSize: 10,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildControlsOverlay() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black.withOpacity(0.7),
            Colors.transparent,
          ],
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Back button
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.close, color: Colors.white, size: 28),
          ),

          // Title
          Text(
            'Live Vision',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),

          // Settings button
          IconButton(
            onPressed: _toggleSettings,
            icon: Icon(
              _isMonitoring ? Icons.settings : Icons.close,
              color: Colors.white,
              size: 28,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomControls() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.bottomCenter,
          end: Alignment.topCenter,
          colors: [
            Colors.black.withOpacity(0.8),
            Colors.transparent,
          ],
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          // Statistics toggle
          _buildControlButton(
            icon: Icons.analytics,
            label: 'Stats',
            isActive: _showStatistics,
            onPressed: _toggleStatistics,
          ),

          // Alerts toggle
          _buildControlButton(
            icon: Icons.notifications,
            label: 'Alerts',
            isActive: _showAlerts,
            onPressed: _toggleAlerts,
          ),

          // Health bar toggle
          _buildControlButton(
            icon: Icons.favorite,
            label: 'Health',
            isActive: _showHealthBar,
            onPressed: _toggleHealthBar,
          ),

          // Main control
          _buildMainControlButton(),
        ],
      ),
    );
  }

  Widget _buildControlButton({
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onPressed,
  }) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isActive ? Theme.of(context).primaryColor : Colors.white.withOpacity(0.2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: Colors.white,
              size: 24,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMainControlButton() {
    return GestureDetector(
      onTap: _toggleMonitoring,
      child: Container(
        width: 80,
        height: 80,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: _isMonitoring ? Colors.red : Colors.green,
          border: Border.all(color: Colors.white, width: 3),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _isMonitoring ? Icons.stop : Icons.play_arrow,
              color: Colors.white,
              size: 32,
            ),
            const SizedBox(height: 4),
            Text(
              _isMonitoring ? 'Stop' : 'Start',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingsPanel() {
    return Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Live Vision Settings',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 20),

          // Update frequency
          _buildSettingRow(
            'Update Frequency',
            _buildFrequencySelector(),
          ),

          // Alert sensitivity
          _buildSettingRow(
            'Alert Sensitivity',
            _buildSensitivitySelector(),
          ),

          // Analysis depth
          _buildSettingRow(
            'Analysis Depth',
            _buildDepthSelector(),
          ),

          // Detection zones
          _buildSettingRow(
            'Detection Zones',
            Switch(
              value: _settings.enableDetectionZones,
              onChanged: (value) {
                setState(() {
                  _settings = _settings.copyWith(enableDetectionZones: value);
                });
              },
            ),
          ),

          // Auto recording
          _buildSettingRow(
            'Auto Record Issues',
            Switch(
              value: _settings.autoRecordIssues,
              onChanged: (value) {
                setState(() {
                  _settings = _settings.copyWith(autoRecordIssues: value);
                });
              },
            ),
          ),

          const SizedBox(height: 20),

          // Close button
          ElevatedButton(
            onPressed: _toggleSettings,
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 48),
            ),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingRow(String label, Widget control) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          control,
        ],
      ),
    );
  }

  Widget _buildFrequencySelector() {
    return DropdownButton<UpdateFrequency>(
      value: _settings.updateFrequency,
      onChanged: (value) {
        if (value != null) {
          setState(() {
            _settings = _settings.copyWith(updateFrequency: value);
          });
          if (_isMonitoring) {
            _restartMonitoring();
          }
        }
      },
      items: UpdateFrequency.values.map((frequency) {
        return DropdownMenuItem(
          value: frequency,
          child: Text(frequency.label),
        );
      }).toList(),
    );
  }

  Widget _buildSensitivitySelector() {
    return DropdownButton<AlertSensitivity>(
      value: _settings.alertSensitivity,
      onChanged: (value) {
        if (value != null) {
          setState(() {
            _settings = _settings.copyWith(alertSensitivity: value);
          });
        }
      },
      items: AlertSensitivity.values.map((sensitivity) {
        return DropdownMenuItem(
          value: sensitivity,
          child: Text(sensitivity.label),
        );
      }).toList(),
    );
  }

  Widget _buildDepthSelector() {
    return DropdownButton<AnalysisDepth>(
      value: _settings.analysisDepth,
      onChanged: (value) {
        if (value != null) {
          setState(() {
            _settings = _settings.copyWith(analysisDepth: value);
          });
        }
      },
      items: AnalysisDepth.values.map((depth) {
        return DropdownMenuItem(
          value: depth,
          child: Text(depth.label),
        );
      }).toList(),
    );
  }

  // Event handlers
  void _onImageCaptured(String imagePath) {
    if (_isMonitoring) {
      _performLiveAnalysis(imagePath);
    }
  }

  void _onLightingAnalysisChanged(LightingAnalysis analysis) {
    if (_isMonitoring && _settings.alertSensitivity == AlertSensitivity.high) {
      _checkLightingAlerts(analysis);
    }
  }

  void _onFocusAnalysisChanged(FocusAnalysis analysis) {
    if (_isMonitoring && !analysis.isInFocus) {
      _addAlert(LiveVisionAlert(
        message: 'Camera focus issues detected',
        severity: AlertSeverity.warning,
        timestamp: DateTime.now(),
      ));
    }
  }

  void _toggleMonitoring() {
    setState(() {
      _isMonitoring = !_isMonitoring;
    });

    if (_isMonitoring) {
      _startMonitoring();
      _pulseController.repeat(reverse: true);
      _slideController.forward();
    } else {
      _stopMonitoring();
      _pulseController.stop();
      _slideController.reverse();
    }
  }

  void _startMonitoring() {
    final interval = _settings.updateFrequency.duration;
    _monitoringTimer = Timer.periodic(interval, (_) {
      // Trigger image capture for analysis
      // This would be handled by the camera widget automatically
    });

    // Alert timer to check for issues
    _alertTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      _checkSystemHealth();
    });

    _slideController.forward();
  }

  void _stopMonitoring() {
    _monitoringTimer?.cancel();
    _alertTimer?.cancel();
    _monitoringTimer = null;
    _alertTimer = null;
  }

  void _restartMonitoring() {
    _stopMonitoring();
    _startMonitoring();
  }

  void _performLiveAnalysis(String imagePath) {
    // Simulate live analysis
    final now = DateTime.now();
    final random = now.millisecond;

    // Generate mock analysis result
    final result = EnhancedAnalysisResult(
      overallHealth: ['healthy', 'stressed', 'critical'][random % 3],
      healthStatus: HealthStatus.values[random % 3],
      confidence: 0.75 + (random % 25) / 100.0,
      growthStage: GrowthStage.values[random % GrowthStage.values.length],
      analysisType: AnalysisType.liveVision,
      analysisTimestamp: now,
      detectedSymptoms: random % 4 == 0 ? [
        SymptomDetection(
          symptom: 'Leaf color change',
          category: 'color',
          severity: 0.3 + (random % 40) / 100.0,
          confidence: 0.7 + (random % 30) / 100.0,
        ),
      ] : [],
      purpleStrainAnalysis: PurpleStrainAnalysis(
        isPurpleStrain: random % 10 == 0,
        confidence: 0.8 + (random % 20) / 100.0,
      ),
      metrics: EnhancedPlantMetrics(
        leafColorScore: 0.6 + (random % 40) / 100.0,
        leafHealthScore: 0.6 + (random % 40) / 100.0,
        overallVigorScore: 0.6 + (random % 40) / 100.0,
      ),
      technicalDetails: {
        'analysis_type': 'real_time',
        'frame_rate': '30fps',
        'processing_time': '<1s',
        'detection_confidence': 0.85,
      },
    );

    setState(() {
      _currentResult = result;
      _lastAnalysis = now;

      // Add to health trend
      _healthTrend.add(HealthTrendDataPoint(
        timestamp: now,
        healthScore: result.metrics.getOverallHealthScore() ?? 0.0,
        confidence: result.confidence,
      ));

      // Keep only last 100 data points
      if (_healthTrend.length > 100) {
        _healthTrend.removeAt(0);
      }
    });

    // Check for alerts
    _checkAnalysisAlerts(result);
  }

  void _checkAnalysisAlerts(EnhancedAnalysisResult result) {
    if (result.healthStatus == HealthStatus.critical) {
      _addAlert(LiveVisionAlert(
        message: 'Critical plant health issues detected',
        severity: AlertSeverity.critical,
        timestamp: DateTime.now(),
      ));
    } else if (result.healthStatus == HealthStatus.stressed) {
      _addAlert(LiveVisionAlert(
        message: 'Plant health stress detected',
        severity: AlertSeverity.warning,
        timestamp: DateTime.now(),
      ));
    }

    if (result.totalIssuesDetected > 3) {
      _addAlert(LiveVisionAlert(
        message: 'Multiple issues detected (${result.totalIssuesDetected})',
        severity: AlertSeverity.info,
        timestamp: DateTime.now(),
      ));
    }
  }

  void _checkLightingAlerts(LightingAnalysis analysis) {
    if (analysis.isTooDark) {
      _addAlert(LiveVisionAlert(
        message: 'Lighting conditions too dark',
        severity: AlertSeverity.warning,
        timestamp: DateTime.now(),
      ));
    } else if (analysis.isTooBright) {
      _addAlert(LiveVisionAlert(
        message: 'Lighting conditions too bright',
        severity: AlertSeverity.warning,
        timestamp: DateTime.now(),
      ));
    }

    if (analysis.hasGlare) {
      _addAlert(LiveVisionAlert(
        message: 'Glare detected, adjust camera angle',
        severity: AlertSeverity.info,
        timestamp: DateTime.now(),
      ));
    }
  }

  void _checkSystemHealth() {
    if (_lastAnalysis != null) {
      final timeSinceLastAnalysis = DateTime.now().difference(_lastAnalysis!);
      if (timeSinceLastAnalysis.inMinutes > 5) {
        _addAlert(LiveVisionAlert(
          message: 'Analysis interval too long',
          severity: AlertSeverity.warning,
          timestamp: DateTime.now(),
        ));
      }
    }
  }

  void _addAlert(LiveVisionAlert alert) {
    setState(() {
      _alerts.add(alert);
      // Keep only last 20 alerts
      if (_alerts.length > 20) {
        _alerts.removeAt(0);
      }
    });
  }

  void _toggleSettings() {
    setState(() {
      _isMonitoring = false;
    });
    _stopMonitoring();
  }

  void _toggleStatistics() {
    setState(() {
      _showStatistics = !_showStatistics;
    });
  }

  void _toggleAlerts() {
    setState(() {
      _showAlerts = !_showAlerts;
    });
  }

  void _toggleHealthBar() {
    setState(() {
      _showHealthBar = !_showHealthBar;
    });
  }

  // Helper methods
  String _formatDuration(Duration duration) {
    if (duration.inMinutes > 0) {
      return '${duration.inMinutes}m ago';
    } else if (duration.inSeconds > 0) {
      return '${duration.inSeconds}s ago';
    } else {
      return 'Just now';
    }
  }

  String _formatUptime() {
    if (_monitoringTimer == null) return '0:00';
    // This would track actual uptime in a real implementation
    return '${_healthTrend.length ~/ 60}:${(_healthTrend.length % 60).toString().padLeft(2, '0')}';
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
        return Icons.favorite;
      case HealthStatus.stressed:
        return Icons.warning;
      case HealthStatus.critical:
        return Icons.error;
      case HealthStatus.unknown:
        return Icons.help;
    }
  }

  Color _getAlertColor(AlertSeverity severity) {
    switch (severity) {
      case AlertSeverity.info:
        return Colors.blue;
      case AlertSeverity.warning:
        return Colors.orange;
      case AlertSeverity.critical:
        return Colors.red;
    }
  }

  IconData _getAlertIcon(AlertSeverity severity) {
    switch (severity) {
      case AlertSeverity.info:
        return Icons.info;
      case AlertSeverity.warning:
        return Icons.warning;
      case AlertSeverity.critical:
        return Icons.error;
    }
  }
}

// Data models for Live Vision
class LiveVisionSettings {
  final UpdateFrequency updateFrequency;
  final AlertSensitivity alertSensitivity;
  final AnalysisDepth analysisDepth;
  final bool enableDetectionZones;
  final bool autoRecordIssues;

  const LiveVisionSettings({
    this.updateFrequency = UpdateFrequency.realTime,
    this.alertSensitivity = AlertSensitivity.medium,
    this.analysisDepth = AnalysisDepth.standard,
    this.enableDetectionZones = false,
    this.autoRecordIssues = true,
  });

  LiveVisionSettings copyWith({
    UpdateFrequency? updateFrequency,
    AlertSensitivity? alertSensitivity,
    AnalysisDepth? analysisDepth,
    bool? enableDetectionZones,
    bool? autoRecordIssues,
  }) {
    return LiveVisionSettings(
      updateFrequency: updateFrequency ?? this.updateFrequency,
      alertSensitivity: alertSensitivity ?? this.alertSensitivity,
      analysisDepth: analysisDepth ?? this.analysisDepth,
      enableDetectionZones: enableDetectionZones ?? this.enableDetectionZones,
      autoRecordIssues: autoRecordIssues ?? this.autoRecordIssues,
    );
  }
}

enum UpdateFrequency {
  realTime('Real-time'),
  every5s('Every 5 seconds'),
  every10s('Every 10 seconds'),
  every30s('Every 30 seconds');

  const UpdateFrequency(this.label);
  final String label;

  Duration get duration {
    switch (this) {
      case UpdateFrequency.realTime:
        return const Duration(milliseconds: 500);
      case UpdateFrequency.every5s:
        return const Duration(seconds: 5);
      case UpdateFrequency.every10s:
        return const Duration(seconds: 10);
      case UpdateFrequency.every30s:
        return const Duration(seconds: 30);
    }
  }
}

enum AlertSensitivity {
  low('Low'),
  medium('Medium'),
  high('High');

  const AlertSensitivity(this.label);
  final String label;
}

enum AnalysisDepth {
  basic('Basic'),
  standard('Standard'),
  detailed('Detailed');

  const AnalysisDepth(this.label);
  final String label;
}

enum AlertSeverity {
  info,
  warning,
  critical,
}

class LiveVisionAlert {
  final String message;
  final AlertSeverity severity;
  final DateTime timestamp;

  LiveVisionAlert({
    required this.message,
    required this.severity,
    required this.timestamp,
  });
}

class HealthTrendDataPoint {
  final DateTime timestamp;
  final double healthScore;
  final double confidence;

  HealthTrendDataPoint({
    required this.timestamp,
    required this.healthScore,
    required this.confidence,
  });
}

extension ListExtension<T> on List<T> {
  List<T> takeLast(int n) {
    if (length <= n) return this;
    return sublist(length - n);
  }
}