import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:camera/camera.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;
import 'package:permission_handler/permission_handler.dart';

class CameraControls {
  final double zoom;
  final double exposureOffset;
  final FlashMode flashMode;
  final FocusMode focusMode;
  final ResolutionPreset resolution;
  final bool isGridVisible;
  final bool isHistogramVisible;

  CameraControls({
    this.zoom = 1.0,
    this.exposureOffset = 0.0,
    this.flashMode = FlashMode.auto,
    this.focusMode = FocusMode.auto,
    this.resolution = ResolutionPreset.high,
    this.isGridVisible = false,
    this.isHistogramVisible = false,
  });

  CameraControls copyWith({
    double? zoom,
    double? exposureOffset,
    FlashMode? flashMode,
    FocusMode? focusMode,
    ResolutionPreset? resolution,
    bool? isGridVisible,
    bool? isHistogramVisible,
  }) {
    return CameraControls(
      zoom: zoom ?? this.zoom,
      exposureOffset: exposureOffset ?? this.exposureOffset,
      flashMode: flashMode ?? this.flashMode,
      focusMode: focusMode ?? this.focusMode,
      resolution: resolution ?? this.resolution,
      isGridVisible: isGridVisible ?? this.isGridVisible,
      isHistogramVisible: isHistogramVisible ?? this.isHistogramVisible,
    );
  }
}

class LightingAnalysis {
  final double brightness;
  final double contrast;
  final double saturation;
  final bool hasGlare;
  final bool isTooDark;
  final bool isTooBright;
  final String recommendation;

  LightingAnalysis({
    required this.brightness,
    required this.contrast,
    required this.saturation,
    required this.hasGlare,
    required this.isTooDark,
    required this.isTooBright,
    required this.recommendation,
  });
}

class FocusAnalysis {
  final bool isInFocus;
  final double focusScore;
  final String recommendation;

  FocusAnalysis({
    required this.isInFocus,
    required this.focusScore,
    required this.recommendation,
  });
}

typedef OnImageCaptured = void Function(String imagePath);
typedef OnLightingAnalysisChanged = void Function(LightingAnalysis analysis);
typedef OnFocusAnalysisChanged = void Function(FocusAnalysis analysis);
typedef OnCameraControlsChanged = void Function(CameraControls controls);

class EnhancedCameraWidget extends StatefulWidget {
  final OnImageCaptured onImageCaptured;
  final OnLightingAnalysisChanged? onLightingAnalysisChanged;
  final OnFocusAnalysisChanged? onFocusAnalysisChanged;
  final OnCameraControlsChanged? onCameraControlsChanged;
  final bool enableAnalysis;
  final String? initialCameraDescription;
  final List<String>? supportedFormats;

  const EnhancedCameraWidget({
    super.key,
    required this.onImageCaptured,
    this.onLightingAnalysisChanged,
    this.onFocusAnalysisChanged,
    this.onCameraControlsChanged,
    this.enableAnalysis = true,
    this.initialCameraDescription,
    this.supportedFormats,
  });

  @override
  State<EnhancedCameraWidget> createState() => _EnhancedCameraWidgetState();
}

class _EnhancedCameraWidgetState extends State<EnhancedCameraWidget>
    with WidgetsBindingObserver, TickerProviderStateMixin {
  CameraController? _cameraController;
  List<CameraDescription> _cameras = [];
  int _currentCameraIndex = 0;
  bool _isCameraInitialized = false;
  bool _isTakingPicture = false;

  late CameraControls _cameraControls;
  Timer? _analysisTimer;
  LightingAnalysis? _currentLightingAnalysis;
  FocusAnalysis? _currentFocusAnalysis;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _cameraControls = CameraControls();

    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );

    _pulseAnimation = Tween<double>(
      begin: 0.8,
      end: 1.2,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));

    _initializeCamera();

    if (widget.enableAnalysis) {
      _startAnalysis();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _analysisTimer?.cancel();
    _cameraController?.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final CameraController? cameraController = _cameraController;
    if (cameraController == null || !cameraController.value.isInitialized) {
      return;
    }

    if (state == AppLifecycleState.inactive) {
      cameraController.dispose();
    } else if (state == AppLifecycleState.resumed) {
      _initializeCamera();
    }
  }

  Future<void> _initializeCamera() async {
    try {
      _cameras = await availableCameras();

      if (_cameras.isEmpty) {
        throw Exception('No cameras available');
      }

      // Try to find back camera first
      _currentCameraIndex = _cameras.indexWhere(
        (camera) => camera.lensDirection == CameraLensDirection.back,
      );

      if (_currentCameraIndex == -1) {
        _currentCameraIndex = 0;
      }

      await _setupCamera(_currentCameraIndex);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to initialize camera: $e')),
        );
      }
    }
  }

  Future<void> _setupCamera(int cameraIndex) async {
    if (_cameraController != null) {
      await _cameraController!.dispose();
    }

    final camera = _cameras[cameraIndex];

    _cameraController = CameraController(
      camera,
      _cameraControls.resolution,
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.jpeg,
    );

    try {
      await _cameraController!.initialize();

      if (mounted) {
        setState(() {
          _isCameraInitialized = true;
        });

        // Apply initial controls
        await _applyCameraControls();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to setup camera: $e')),
        );
      }
    }
  }

  Future<void> _applyCameraControls() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized) {
      return;
    }

    try {
      await _cameraController!.setZoomLevel(_cameraControls.zoom.clamp(
        _cameraController!.value.minZoomLevel,
        _cameraController!.value.maxZoomLevel,
      ));

      await _cameraController!.setExposureOffset(_cameraControls.exposureOffset.clamp(
        _cameraController!.value.minExposureOffset,
        _cameraController!.value.maxExposureOffset,
      ));

      await _cameraController!.setFlashMode(_cameraControls.flashMode);
      await _cameraController!.setFocusMode(_cameraControls.focusMode);
    } catch (e) {
      print('Failed to apply camera controls: $e');
    }
  }

  void _startAnalysis() {
    _analysisTimer = Timer.periodic(const Duration(milliseconds: 500), (_) {
      if (_cameraController != null &&
          _cameraController!.value.isInitialized &&
          !_isTakingPicture) {
        _analyzeCurrentFrame();
      }
    });
  }

  Future<void> _analyzeCurrentFrame() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized) {
      return;
    }

    try {
      final image = await _cameraController!.takePicture();
      final file = File(image.path);

      // Perform lighting analysis
      final lightingAnalysis = await _analyzeLighting(file);
      final focusAnalysis = await _analyzeFocus(file);

      if (mounted) {
        setState(() {
          _currentLightingAnalysis = lightingAnalysis;
          _currentFocusAnalysis = focusAnalysis;
        });

        widget.onLightingAnalysisChanged?.call(lightingAnalysis);
        widget.onFocusAnalysisChanged?.call(focusAnalysis);
      }

      // Clean up temporary file
      await file.delete();
    } catch (e) {
      print('Analysis failed: $e');
    }
  }

  Future<LightingAnalysis> _analyzeLighting(File imageFile) async {
    // Mock lighting analysis - in a real implementation, you would
    // use image processing libraries to analyze brightness, contrast, etc.
    final mockBrightness = 0.5 + (DateTime.now().millisecond % 50) / 100.0;
    final mockContrast = 0.4 + (DateTime.now().millisecond % 40) / 100.0;
    final mockSaturation = 0.6 + (DateTime.now().millisecond % 30) / 100.0;

    String recommendation = 'Good lighting conditions';
    bool hasGlare = false;
    bool isTooDark = mockBrightness < 0.3;
    bool isTooBright = mockBrightness > 0.8;

    if (isTooDark) {
      recommendation = 'Move to better lighting or increase exposure';
    } else if (isTooBright) {
      recommendation = 'Reduce exposure or move away from direct light';
      hasGlare = true;
    } else if (mockContrast < 0.3) {
      recommendation = 'Improve contrast for better analysis';
    }

    return LightingAnalysis(
      brightness: mockBrightness,
      contrast: mockContrast,
      saturation: mockSaturation,
      hasGlare: hasGlare,
      isTooDark: isTooDark,
      isTooBright: isTooBright,
      recommendation: recommendation,
    );
  }

  Future<FocusAnalysis> _analyzeFocus(File imageFile) async {
    // Mock focus analysis
    final mockFocusScore = 0.6 + (DateTime.now().millisecond % 40) / 100.0;
    final isInFocus = mockFocusScore > 0.7;

    String recommendation = 'Good focus';
    if (!isInFocus) {
      recommendation = 'Tap to focus or move camera closer/further';
    }

    return FocusAnalysis(
      isInFocus: isInFocus,
      focusScore: mockFocusScore,
      recommendation: recommendation,
    );
  }

  Future<void> _captureImage() async {
    if (_cameraController == null ||
        !_cameraController!.value.isInitialized ||
        _isTakingPicture) {
      return;
    }

    setState(() {
      _isTakingPicture = true;
    });

    try {
      final XFile picture = await _cameraController!.takePicture();

      // Save image to app directory
      final Directory appDir = await getApplicationDocumentsDirectory();
      final String fileName = 'plant_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final String savedImagePath = path.join(appDir.path, fileName);

      await File(picture.path).copy(savedImagePath);

      widget.onImageCaptured(savedImagePath);

      // Provide haptic feedback
      HapticFeedback.lightImpact();

    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to capture image: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isTakingPicture = false;
        });
      }
    }
  }

  Future<void> _switchCamera() async {
    if (_cameras.length < 2) return;

    _currentCameraIndex = (_currentCameraIndex + 1) % _cameras.length;
    await _setupCamera(_currentCameraIndex);
  }

  void _updateCameraControls(CameraControls newControls) {
    setState(() {
      _cameraControls = newControls;
    });

    _applyCameraControls();
    widget.onCameraControlsChanged?.call(newControls);
  }

  @override
  Widget build(BuildContext context) {
    if (!_isCameraInitialized) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Initializing camera...'),
          ],
        ),
      );
    }

    return Stack(
      children: [
        // Camera preview
        Positioned.fill(
          child: CameraPreview(_cameraController!),
        ),

        // Grid overlay
        if (_cameraControls.isGridVisible)
          Positioned.fill(
            child: CustomPaint(
              painter: GridPainter(),
            ),
          ),

        // Analysis overlays
        if (widget.enableAnalysis && (_currentLightingAnalysis != null || _currentFocusAnalysis != null))
          Positioned.fill(
            child: _buildAnalysisOverlay(),
          ),

        // Camera controls
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: _buildControls(),
        ),

        // Top controls
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: _buildTopControls(),
        ),
      ],
    );
  }

  Widget _buildAnalysisOverlay() {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(
          color: _getAnalysisBorderColor(),
          width: 3,
        ),
      ),
      child: Column(
        children: [
          // Lighting indicator
          if (_currentLightingAnalysis != null)
            Expanded(
              child: Container(
                alignment: Alignment.topCenter,
                padding: const EdgeInsets.all(16),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _getLightingColor().withOpacity(0.9),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _getLightingIcon(),
                        color: Colors.white,
                        size: 16,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _currentLightingAnalysis!.recommendation,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // Focus indicator
          if (_currentFocusAnalysis != null)
            Expanded(
              child: Container(
                alignment: Alignment.center,
                child: AnimatedBuilder(
                  animation: _pulseController,
                  builder: (context, child) {
                    return Transform.scale(
                      scale: _currentFocusAnalysis!.isInFocus ? 1.0 : _pulseAnimation.value,
                      child: Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: _getFocusColor(),
                            width: 3,
                          ),
                        ),
                        child: Icon(
                          Icons.center_focus_strong,
                          color: _getFocusColor(),
                          size: 32,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),

          const Spacer(),
        ],
      ),
    );
  }

  Widget _buildControls() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.bottomCenter,
          end: Alignment.topCenter,
          colors: [
            Colors.black.withOpacity(0.7),
            Colors.transparent,
          ],
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Capture controls
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              // Gallery button
              IconButton(
                onPressed: _pickFromGallery,
                icon: const Icon(Icons.photo_library),
                iconSize: 32,
                color: Colors.white,
              ),

              // Capture button
              GestureDetector(
                onTap: _captureImage,
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.white,
                      width: 3,
                    ),
                    color: Colors.transparent,
                  ),
                  child: Container(
                    margin: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _isTakingPicture ? Colors.grey : Colors.white,
                    ),
                    child: _isTakingPicture
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.black),
                            ),
                          )
                        : null,
                  ),
                ),
              ),

              // Switch camera button
              if (_cameras.length > 1)
                IconButton(
                  onPressed: _switchCamera,
                  icon: const Icon(Icons.flip_camera_ios),
                  iconSize: 32,
                  color: Colors.white,
                )
              else
                const SizedBox(width: 64),
            ],
          ),

          const SizedBox(height: 16),

          // Quick settings
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildQuickSetting(
                icon: _getFlashIcon(),
                onTap: _toggleFlash,
              ),
              const SizedBox(width: 16),
              _buildQuickSetting(
                icon: Icons.grid_on,
                onTap: _toggleGrid,
                isActive: _cameraControls.isGridVisible,
              ),
              const SizedBox(width: 16),
              _buildQuickSetting(
                icon: Icons.zoom_in,
                onTap: _showZoomControls,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTopControls() {
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
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.close),
            iconSize: 28,
            color: Colors.white,
          ),

          // Settings button
          IconButton(
            onPressed: _showAdvancedSettings,
            icon: const Icon(Icons.settings),
            iconSize: 28,
            color: Colors.white,
          ),
        ],
      ),
    );
  }

  Widget _buildQuickSetting({
    required IconData icon,
    required VoidCallback onTap,
    bool isActive = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isActive ? Colors.white : Colors.white.withOpacity(0.2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(
          icon,
          color: isActive ? Colors.black : Colors.white,
          size: 24,
        ),
      ),
    );
  }

  Color _getAnalysisBorderColor() {
    if (_currentLightingAnalysis?.isTooDark == true ||
        _currentLightingAnalysis?.isTooBright == true) {
      return Colors.orange;
    }

    if (_currentFocusAnalysis?.isInFocus == false) {
      return Colors.red;
    }

    return Colors.green;
  }

  Color _getLightingColor() {
    final analysis = _currentLightingAnalysis;
    if (analysis == null) return Colors.grey;

    if (analysis.isTooDark || analysis.isTooBright) {
      return Colors.orange;
    }

    return Colors.green;
  }

  IconData _getLightingIcon() {
    final analysis = _currentLightingAnalysis;
    if (analysis == null) return Icons.light_mode;

    if (analysis.isTooDark) return Icons.brightness_low;
    if (analysis.isTooBright) return Icons.brightness_high;
    return Icons.wb_sunny;
  }

  Color _getFocusColor() {
    final analysis = _currentFocusAnalysis;
    if (analysis?.isInFocus == true) return Colors.green;
    return Colors.red;
  }

  IconData _getFlashIcon() {
    switch (_cameraControls.flashMode) {
      case FlashMode.auto:
        return Icons.flash_auto;
      case FlashMode.always:
        return Icons.flash_on;
      case FlashMode.off:
        return Icons.flash_off;
      default:
        return Icons.flash_auto;
    }
  }

  Future<void> _pickFromGallery() async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
        maxWidth: 1024,
        maxHeight: 1024,
      );

      if (image != null) {
        widget.onImageCaptured(image.path);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to pick image: $e')),
        );
      }
    }
  }

  void _toggleFlash() {
    FlashMode newFlashMode;
    switch (_cameraControls.flashMode) {
      case FlashMode.auto:
        newFlashMode = FlashMode.off;
        break;
      case FlashMode.off:
        newFlashMode = FlashMode.always;
        break;
      case FlashMode.always:
        newFlashMode = FlashMode.auto;
        break;
      default:
        newFlashMode = FlashMode.auto;
    }

    _updateCameraControls(_cameraControls.copyWith(flashMode: newFlashMode));
  }

  void _toggleGrid() {
    _updateCameraControls(_cameraControls.copyWith(
      isGridVisible: !_cameraControls.isGridVisible,
    ));
  }

  void _showZoomControls() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => ZoomControlSheet(
        currentZoom: _cameraControls.zoom,
        minZoom: _cameraController?.value.minZoomLevel ?? 1.0,
        maxZoom: _cameraController?.value.maxZoomLevel ?? 5.0,
        onZoomChanged: (zoom) {
          _updateCameraControls(_cameraControls.copyWith(zoom: zoom));
        },
      ),
    );
  }

  void _showAdvancedSettings() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => AdvancedCameraSettingsSheet(
        controls: _cameraControls,
        onControlsChanged: _updateCameraControls,
      ),
    );
  }
}

class GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.3)
      ..strokeWidth = 1;

    // Draw grid lines
    const gridSize = 3;

    // Vertical lines
    for (int i = 1; i < gridSize; i++) {
      final x = (size.width / gridSize) * i;
      canvas.drawLine(
        Offset(x, 0),
        Offset(x, size.height),
        paint,
      );
    }

    // Horizontal lines
    for (int i = 1; i < gridSize; i++) {
      final y = (size.height / gridSize) * i;
      canvas.drawLine(
        Offset(0, y),
        Offset(size.width, y),
        paint,
      );
    }

    // Draw center cross
    final centerX = size.width / 2;
    final centerY = size.height / 2;
    final crossSize = 20.0;

    paint.strokeWidth = 2;

    // Horizontal cross line
    canvas.drawLine(
      Offset(centerX - crossSize, centerY),
      Offset(centerX + crossSize, centerY),
      paint,
    );

    // Vertical cross line
    canvas.drawLine(
      Offset(centerX, centerY - crossSize),
      Offset(centerX, centerY + crossSize),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class ZoomControlSheet extends StatefulWidget {
  final double currentZoom;
  final double minZoom;
  final double maxZoom;
  final Function(double) onZoomChanged;

  const ZoomControlSheet({
    super.key,
    required this.currentZoom,
    required this.minZoom,
    required this.maxZoom,
    required this.onZoomChanged,
  });

  @override
  State<ZoomControlSheet> createState() => _ZoomControlSheetState();
}

class _ZoomControlSheetState extends State<ZoomControlSheet> {
  late double _currentZoom;

  @override
  void initState() {
    super.initState();
    _currentZoom = widget.currentZoom;
  }

  @override
  Widget build(BuildContext context) {
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
            'Zoom Control',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 20),

          Slider(
            value: _currentZoom,
            min: widget.minZoom,
            max: widget.maxZoom,
            divisions: ((widget.maxZoom - widget.minZoom) / 0.1).round(),
            onChanged: (value) {
              setState(() {
                _currentZoom = value;
              });
              widget.onZoomChanged(value);
            },
          ),

          Text(
            '${(_currentZoom * 10).round() / 10}x',
            style: Theme.of(context).textTheme.titleMedium,
          ),

          const SizedBox(height: 20),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              TextButton(
                onPressed: () {
                  widget.onZoomChanged(1.0);
                  Navigator.of(context).pop();
                },
                child: const Text('Reset'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Done'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class AdvancedCameraSettingsSheet extends StatefulWidget {
  final CameraControls controls;
  final Function(CameraControls) onControlsChanged;

  const AdvancedCameraSettingsSheet({
    super.key,
    required this.controls,
    required this.onControlsChanged,
  });

  @override
  State<AdvancedCameraSettingsSheet> createState() => _AdvancedCameraSettingsSheetState();
}

class _AdvancedCameraSettingsSheetState extends State<AdvancedCameraSettingsSheet> {
  late CameraControls _controls;

  @override
  void initState() {
    super.initState();
    _controls = widget.controls;
  }

  @override
  Widget build(BuildContext context) {
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
            'Camera Settings',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 20),

          // Flash Mode
          _buildSettingRow(
            'Flash Mode',
            DropdownButton<FlashMode>(
              value: _controls.flashMode,
              items: const [
                DropdownMenuItem(value: FlashMode.auto, child: Text('Auto')),
                DropdownMenuItem(value: FlashMode.on, child: Text('On')),
                DropdownMenuItem(value: FlashMode.off, child: Text('Off')),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() {
                    _controls = _controls.copyWith(flashMode: value);
                  });
                  widget.onControlsChanged(_controls);
                }
              },
            ),
          ),

          // Focus Mode
          _buildSettingRow(
            'Focus Mode',
            DropdownButton<FocusMode>(
              value: _controls.focusMode,
              items: const [
                DropdownMenuItem(value: FocusMode.auto, child: Text('Auto')),
                DropdownMenuItem(value: FocusMode.locked, child: Text('Locked')),
                DropdownMenuItem(value: FocusMode.manual, child: Text('Manual')),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() {
                    _controls = _controls.copyWith(focusMode: value);
                  });
                  widget.onControlsChanged(_controls);
                }
              },
            ),
          ),

          // Resolution
          _buildSettingRow(
            'Resolution',
            DropdownButton<ResolutionPreset>(
              value: _controls.resolution,
              items: const [
                DropdownMenuItem(value: ResolutionPreset.low, child: Text('Low')),
                DropdownMenuItem(value: ResolutionPreset.medium, child: Text('Medium')),
                DropdownMenuItem(value: ResolutionPreset.high, child: Text('High')),
                DropdownMenuItem(value: ResolutionPreset.max, child: Text('Maximum')),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() {
                    _controls = _controls.copyWith(resolution: value);
                  });
                  widget.onControlsChanged(_controls);
                }
              },
            ),
          ),

          const SizedBox(height: 20),

          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Done'),
              ),
            ],
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
}