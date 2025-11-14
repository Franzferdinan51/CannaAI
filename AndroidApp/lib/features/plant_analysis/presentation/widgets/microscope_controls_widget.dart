import 'package:flutter/material.dart';
import 'dart:async';
import '../pages/trichome_analysis_page.dart';

class MicroscopeControlsWidget extends StatefulWidget {
  final MicroscopeSettings settings;
  final Function(MicroscopeSettings) onSettingsChanged;
  final VoidCallback onCapture;
  final VoidCallback onAutoCaptureToggle;
  final bool isAutoCapturing;

  const MicroscopeControlsWidget({
    super.key,
    required this.settings,
    required this.onSettingsChanged,
    required this.onCapture,
    required this.onAutoCaptureToggle,
    required this.isAutoCapturing,
  });

  @override
  State<MicroscopeControlsWidget> createState() => _MicroscopeControlsWidgetState();
}

class _MicroscopeControlsWidgetState extends State<MicroscopeControlsWidget> {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );

    _pulseAnimation = Tween<double>(
      begin: 1.0,
      end: 1.1,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(MicroscopeControlsWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isAutoCapturing && !oldWidget.isAutoCapturing) {
      _pulseController.repeat(reverse: true);
    } else if (!widget.isAutoCapturing && oldWidget.isAutoCapturing) {
      _pulseController.stop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Magnification controls
          _buildMagnificationControls(),

          const SizedBox(height: 16),

          // Quick settings row
          _buildQuickSettingsRow(),

          const SizedBox(height: 16),

          // Action buttons
          _buildActionButtons(),
        ],
      ),
    );
  }

  Widget _buildMagnificationControls() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              Icons.search,
              color: Theme.of(context).primaryColor,
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              'Magnification',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const Spacer(),
            Text(
              '${widget.settings.magnification.value}x',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: Theme.of(context).primaryColor,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Magnification slider
        Row(
          children: [
            Text(
              '${MagnificationLevel.x50.value}x',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 12),
            thumbColor: Theme.of(context).primaryColor,
            activeTrackColor: Theme.of(context).primaryColor,
            inactiveTrackColor: Colors.grey[300],
            overlayColor: Theme.of(context).primaryColor.withOpacity(0.2),
          ),
          child: Slider(
            value: widget.settings.magnification.value.toDouble(),
            min: MagnificationLevel.x50.value.toDouble(),
            max: MagnificationLevel.x800.value.toDouble(),
            divisions: 7,
            onChanged: (value) {
              final magnification = _getClosestMagnification(value.toInt());
              widget.onSettingsChanged(
                widget.settings.copyWith(magnification: magnification),
              );
            },
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            Text(
              '${MagnificationLevel.x800.value}x',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Colors.grey[600],
              ),
            ),
          ],
        ),

        // Preset magnification buttons
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _buildMagnificationPreset(MagnificationLevel.x100),
            _buildMagnificationPreset(MagnificationLevel.x200),
            _buildMagnificationPreset(MagnificationLevel.x400),
          ],
        ),
      ],
    );
  }

  Widget _buildMagnificationPreset(MagnificationLevel level) {
    final isSelected = widget.settings.magnification == level;

    return GestureDetector(
      onTap: () {
        widget.onSettingsChanged(
          widget.settings.copyWith(magnification: level),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? Theme.of(context).primaryColor : Colors.grey[200],
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          '${level.value}x',
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.black,
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildQuickSettingsRow() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildQuickSetting(
          icon: Icons.grid_on,
          label: 'Grid',
          isActive: widget.settings.showFocusGrid,
          onTap: () {
            widget.onSettingsChanged(
              widget.settings.copyWith(showFocusGrid: !widget.settings.showFocusGrid),
            );
          },
        ),
        _buildQuickSetting(
          icon: Icons.center_focus_strong,
          label: 'Focus',
          isActive: widget.settings.enableAutoFocus,
          onTap: () {
            widget.onSettingsChanged(
              widget.settings.copyWith(enableAutoFocus: !widget.settings.enableAutoFocus),
            );
          },
        ),
        _buildQuickSetting(
          icon: Icons.timer,
          label: 'Timer',
          isActive: widget.isAutoCapturing,
          onTap: widget.onAutoCaptureToggle,
        ),
        _buildQuickSetting(
          icon: Icons.photo_library,
          label: 'Gallery',
          isActive: false,
          onTap: _openGallery,
        ),
      ],
    );
  }

  Widget _buildQuickSetting({
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isActive ? Theme.of(context).primaryColor : Colors.grey[200],
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedBuilder(
              animation: widget.isAutoCapturing && label == 'Timer' ? _pulseAnimation : null,
              builder: (context, child) {
                return Transform.scale(
                  scale: widget.isAutoCapturing && label == 'Timer' ? _pulseAnimation.value : 1.0,
                  child: Icon(
                    icon,
                    color: isActive ? Colors.white : Colors.black,
                    size: 24,
                  ),
                );
              },
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: isActive ? Colors.white : Colors.black,
                fontSize: 10,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        // Auto capture interval selector
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey[300]!),
              borderRadius: BorderRadius.circular(12),
            ),
            child: DropdownButtonHide(
              underline: const SizedBox(),
              child: DropdownButton<Duration>(
                value: widget.settings.autoCaptureInterval,
                isExpanded: true,
                icon: const Icon(Icons.arrow_drop_down),
                onChanged: (value) {
                  if (value != null) {
                    widget.onSettingsChanged(
                      widget.settings.copyWith(autoCaptureInterval: value),
                    );
                  }
                },
                items: [
                  DropdownMenuItem(
                    value: const Duration(seconds: 5),
                    child: Text('5s interval', style: const TextStyle(fontSize: 12)),
                  ),
                  DropdownMenuItem(
                    value: const Duration(seconds: 10),
                    child: Text('10s interval', style: const TextStyle(fontSize: 12)),
                  ),
                  DropdownMenuItem(
                    value: const Duration(seconds: 30),
                    child: Text('30s interval', style: const TextStyle(fontSize: 12)),
                  ),
                  DropdownMenuItem(
                    value: const Duration(minutes: 1),
                    child: Text('1m interval', style: const TextStyle(fontSize: 12)),
                  ),
                ],
                selectedItemBuilder: (context) {
                  final interval = widget.settings.autoCaptureInterval;
                  String text;
                  if (interval.inMinutes > 0) {
                    text = '${interval.inMinutes}m interval';
                  } else {
                    text = '${interval.inSeconds}s interval';
                  }
                  return Text(text, style: const TextStyle(fontSize: 12));
                },
              ),
            ),
          ),
        ),

        const SizedBox(width: 16),

        // Capture button
        AnimatedBuilder(
          animation: _pulseAnimation,
          builder: (context, child) {
            return Transform.scale(
              scale: widget.isAutoCapturing ? _pulseAnimation.value : 1.0,
              child: ElevatedButton.icon(
                onPressed: widget.onCapture,
                icon: widget.isAutoCapturing
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Icon(Icons.camera_alt),
                label: Text(widget.isAutoCapturing ? 'Auto Capturing' : 'Capture'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  MagnificationLevel _getClosestMagnification(int value) {
    final levels = MagnificationLevel.values;
    MagnificationLevel closest = levels.first;
    int minDiff = (closest.value - value).abs();

    for (final level in levels) {
      final diff = (level.value - value).abs();
      if (diff < minDiff) {
        minDiff = diff;
        closest = level;
      }
    }

    return closest;
  }

  void _openGallery() {
    // This would typically be handled by the parent widget
    // For now, we'll just trigger a callback or use a notification
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Gallery opening would be handled by parent')),
    );
  }
}