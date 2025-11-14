import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:photo_view/photo_view.dart';
import 'package:photo_view/photo_view_gallery.dart';
import '../../../../core/models/enhanced_plant_analysis.dart';
import '../widgets/microscope_controls_widget.dart';
import '../widgets/trichome_analysis_results_widget.dart';
import '../widgets/trichome_maturity_chart.dart';

class TrichomeAnalysisPage extends ConsumerStatefulWidget {
  const TrichomeAnalysisPage({super.key});

  @override
  ConsumerState<TrichomeAnalysisPage> createState() => _TrichomeAnalysisPageState();
}

class _TrichomeAnalysisPageState extends ConsumerState<TrichomeAnalysisPage>
    with TickerProviderStateMixin {
  late TabController _tabController;
  late AnimationController _captureAnimationController;
  late AnimationController _analysisAnimationController;

  final ImagePicker _imagePicker = ImagePicker();
  List<String> _capturedImages = [];
  int _currentImageIndex = 0;

  MicroscopeSettings _microscopeSettings = const MicroscopeSettings();
  TrichomeAnalysisSettings _analysisSettings = const TrichomeAnalysisSettings();

  bool _isAnalyzing = false;
  bool _isCapturing = false;
  TrichomeAnalysisResult? _currentAnalysis;
  List<TrichomeDataPoint> _trichomeHistory = [];

  Timer? _autoCaptureTimer;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _captureAnimationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _analysisAnimationController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    _captureAnimationController.dispose();
    _analysisAnimationController.dispose();
    _stopAutoCapture();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            _buildHeader(),
            _buildTabBar(),
          ];
        },
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildCaptureTab(),
            _buildAnalysisTab(),
            _buildHistoryTab(),
          ],
        ),
      ),
      floatingActionButton: _buildFloatingActionButton(),
    );
  }

  Widget _buildHeader() {
    return SliverAppBar(
      expandedHeight: 120,
      floating: false,
      pinned: true,
      backgroundColor: Theme.of(context).primaryColor,
      flexibleSpace: FlexibleSpaceBar(
        title: const Text(
          'Trichome Analysis',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        background: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Theme.of(context).primaryColor,
                Theme.of(context).primaryColor.withOpacity(0.8),
              ],
            ),
          ),
        ),
      ),
      actions: [
        IconButton(
          onPressed: _showSettings,
          icon: const Icon(Icons.settings, color: Colors.white),
          tooltip: 'Settings',
        ),
        if (_capturedImages.isNotEmpty)
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: Colors.white),
            onSelected: _handleMenuAction,
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'clear',
                child: Row(
                  children: [
                    Icon(Icons.clear_all, color: Colors.black),
                    SizedBox(width: 12),
                    Text('Clear All'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'export',
                child: Row(
                  children: [
                    Icon(Icons.share, color: Colors.black),
                    SizedBox(width: 12),
                    Text('Export Results'),
                  ],
                ),
              ),
            ],
          ),
      ],
    );
  }

  Widget _buildTabBar() {
    return SliverToBoxAdapter(
      child: Container(
        color: Theme.of(context).primaryColor,
        child: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Capture'),
            Tab(text: 'Analysis'),
            Tab(text: 'History'),
          ],
        ),
      ),
    );
  }

  Widget _buildCaptureTab() {
    return Column(
      children: [
        // Image preview area
        Expanded(
          flex: 3,
          child: _buildImagePreview(),
        ),

        // Microscope controls
        Expanded(
          flex: 1,
          child: MicroscopeControlsWidget(
            settings: _microscopeSettings,
            onSettingsChanged: (settings) {
              setState(() {
                _microscopeSettings = settings;
              });
            },
            onCapture: _captureImage,
            onAutoCaptureToggle: _toggleAutoCapture,
            isAutoCapturing: _autoCaptureTimer?.isActive ?? false,
          ),
        ),
      ],
    );
  }

  Widget _buildImagePreview() {
    if (_capturedImages.isEmpty) {
      return Container(
        margin: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey[300]!, style: BorderStyle.solid, width: 2),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.photo_camera_outlined,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'No images captured',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Capture trichome images to begin analysis',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[500],
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _captureFromGallery,
              icon: const Icon(Icons.photo_library),
              label: const Text('Choose from Gallery'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          children: [
            // Main image viewer
            Positioned.fill(
              child: PhotoViewGallery.builder(
                scrollPhysics: const BouncingScrollPhysics(),
                pageController: PageController(initialPage: _currentImageIndex),
                itemCount: _capturedImages.length,
                builder: (context, index) {
                  return PhotoViewGalleryPageOptions(
                    imageProvider: FileImage(File(_capturedImages[index])),
                    minScale: PhotoViewComputedScale.contained * 0.8,
                    maxScale: PhotoViewComputedScale.covered * 8.0, // Higher zoom for trichomes
                    initialScale: PhotoViewComputedScale.contained,
                    heroAttributes: PhotoViewHeroAttributes(tag: 'trichome_$index'),
                  );
                },
                onPageChanged: (index) {
                  setState(() {
                    _currentImageIndex = index;
                  });
                },
                backgroundDecoration: const BoxDecoration(
                  color: Colors.black,
                ),
              ),
            ),

            // Magnification indicator
            Positioned(
              top: 16,
              left: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.7),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.search, color: Colors.white, size: 16),
                    const SizedBox(width: 4),
                    Text(
                      '${_microscopeSettings.magnification}x',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Image counter
            Positioned(
              top: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.7),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${_currentImageIndex + 1} / ${_capturedImages.length}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),

            // Focus grid overlay (when enabled)
            if (_microscopeSettings.showFocusGrid)
              Positioned.fill(
                child: CustomPaint(
                  painter: FocusGridPainter(),
                ),
              ),

            // Analysis status overlay
            if (_currentAnalysis != null)
              Positioned(
                bottom: 16,
                left: 16,
                right: 16,
                child: _buildAnalysisOverlay(),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildAnalysisOverlay() {
    if (_currentAnalysis == null) return const SizedBox.shrink();

    final analysis = _currentAnalysis!;
    final harvestReadiness = analysis.harvestReadinessScore;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.8),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: _getHarvestReadinessColor(harvestReadiness),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                analysis.trichomeStage.toUpperCase(),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              Text(
                '${(harvestReadiness * 100).toInt()}%',
                style: TextStyle(
                  color: _getHarvestReadinessColor(harvestReadiness),
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildQuickStat('Clear', '${analysis.clarityPercentage.toInt()}%', Colors.blue),
              _buildQuickStat('Cloudy', '${analysis.cloudinessPercentage.toInt()}%', Colors.grey),
              _buildQuickStat('Amber', '${analysis.amberPercentage.toInt()}%', Colors.orange),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickStat(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            color: Colors.white70,
            fontSize: 10,
          ),
        ),
      ],
    );
  }

  Widget _buildAnalysisTab() {
    if (_currentAnalysis == null && _capturedImages.isEmpty) {
      return _buildEmptyAnalysisState();
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Analyze button if no current analysis
          if (_currentAnalysis == null && _capturedImages.isNotEmpty)
            Center(
              child: ElevatedButton.icon(
                onPressed: _isAnalyzing ? null : _analyzeTrichomes,
                icon: _isAnalyzing
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.white)),
                      )
                    : const Icon(Icons.analytics),
                label: Text(_isAnalyzing ? 'Analyzing...' : 'Analyze Trichomes'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  minimumSize: const Size(200, 48),
                ),
              ),
            ),

          if (_currentAnalysis != null) ...[
            // Results widget
            TrichomeAnalysisResultsWidget(
              analysis: _currentAnalysis!,
              onExport: _exportAnalysis,
              onSaveToHistory: _saveToHistory,
            ),

            const SizedBox(height: 24),

            // Trichome maturity chart
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Maturity Distribution',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      height: 200,
                      child: TrichomeMaturityChart(
                        analysis: _currentAnalysis!,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildEmptyAnalysisState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.grey[100],
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.bubble_chart,
                size: 64,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No Analysis Yet',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: Colors.grey[800],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Capture trichome images and run analysis to see detailed results',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHistoryTab() {
    if (_trichomeHistory.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.history,
                size: 64,
                color: Colors.grey[400],
              ),
              const SizedBox(height: 16),
              Text(
                'No History Yet',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Your trichome analysis history will appear here',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _trichomeHistory.length,
      itemBuilder: (context, index) {
        final dataPoint = _trichomeHistory[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      DateFormat('MMM dd, yyyy • HH:mm').format(dataPoint.timestamp),
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _getHarvestReadinessColor(dataPoint.harvestReadinessScore).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        dataPoint.trichomeStage.toUpperCase(),
                        style: TextStyle(
                          color: _getHarvestReadinessColor(dataPoint.harvestReadinessScore),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildHistoryStat('Readiness', '${(dataPoint.harvestReadinessScore * 100).toInt()}%'),
                    _buildHistoryStat('Density', '${dataPoint.trichomeDensity.toInt()}'),
                    _buildHistoryStat('Mag', '${dataPoint.magnification}x'),
                  ],
                ),
                const SizedBox(height: 12),
                // Mini chart
                SizedBox(
                  height: 60,
                  child: TrichomeMaturityChart(
                    analysis: dataPoint,
                    showLabels: false,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHistoryStat(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildFloatingActionButton() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Analyze button
        if (_capturedImages.isNotEmpty && _tabController.index == 0)
          FloatingActionButton.extended(
            onPressed: _isAnalyzing ? null : _analyzeTrichomes,
            icon: _isAnalyzing
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.white)),
                  )
                : const Icon(Icons.analytics),
            label: Text(_isAnalyzing ? 'Analyzing...' : 'Analyze'),
            backgroundColor: Colors.green,
          ),

        const SizedBox(height: 16),

        // Capture button
        FloatingActionButton(
          onPressed: _captureImage,
          backgroundColor: Theme.of(context).primaryColor,
          child: AnimatedBuilder(
            animation: _captureAnimationController,
            builder: (context, child) {
              return Transform.scale(
                scale: _isCapturing ? 0.8 : 1.0,
                child: Icon(
                  _isCapturing ? Icons.check : Icons.camera_alt,
                  color: Colors.white,
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // Action methods
  Future<void> _captureImage() async {
    setState(() {
      _isCapturing = true;
    });

    _captureAnimationController.forward().then((_) {
      _captureAnimationController.reverse();
    });

    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 95,
        maxWidth: 2048,
        maxHeight: 2048,
      );

      if (image != null) {
        setState(() {
          _capturedImages.add(image.path);
          _currentImageIndex = _capturedImages.length - 1;
        });

        HapticFeedback.lightImpact();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to capture image: $e')),
      );
    } finally {
      setState(() {
        _isCapturing = false;
      });
    }
  }

  Future<void> _captureFromGallery() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 95,
        maxWidth: 2048,
        maxHeight: 2048,
      );

      if (image != null) {
        setState(() {
          _capturedImages.add(image.path);
          _currentImageIndex = _capturedImages.length - 1;
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to select image: $e')),
      );
    }
  }

  void _toggleAutoCapture() {
    if (_autoCaptureTimer?.isActive == true) {
      _stopAutoCapture();
    } else {
      _startAutoCapture();
    }
  }

  void _startAutoCapture() {
    final interval = _microscopeSettings.autoCaptureInterval;
    _autoCaptureTimer = Timer.periodic(interval, (_) {
      _captureImage();
    });
  }

  void _stopAutoCapture() {
    _autoCaptureTimer?.cancel();
    _autoCaptureTimer = null;
  }

  Future<void> _analyzeTrichomes() async {
    if (_capturedImages.isEmpty) return;

    setState(() {
      _isAnalyzing = true;
    });

    _analysisAnimationController.forward();

    try {
      // Simulate analysis delay
      await Future.delayed(const Duration(seconds: 3));

      // Generate mock analysis result
      final result = _generateMockAnalysisResult();

      setState(() {
        _currentAnalysis = result;
        _isAnalyzing = false;
      });

      _analysisAnimationController.reverse();

      // Auto-switch to analysis tab
      _tabController.animateTo(1);

    } catch (e) {
      setState(() {
        _isAnalyzing = false;
      });
      _analysisAnimationController.reverse();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Analysis failed: $e')),
      );
    }
  }

  TrichomeAnalysisResult _generateMockAnalysisResult() {
    final now = DateTime.now();
    final random = now.millisecondsSinceEpoch;

    // Generate realistic trichome distribution
    final totalTrichomes = 500 + (random % 1500);
    final clearPercentage = 10.0 + (random % 40);
    final cloudyPercentage = 40.0 + (random % 40);
    final amberPercentage = 100.0 - clearPercentage - cloudyPercentage;

    String stage;
    double harvestReadiness;

    if (amberPercentage < 10) {
      stage = 'clear';
      harvestReadiness = 0.2;
    } else if (amberPercentage < 30) {
      stage = 'cloudy';
      harvestReadiness = 0.5 + (amberPercentage / 100);
    } else if (amberPercentage < 70) {
      stage = 'mixed';
      harvestReadiness = 0.8 + (amberPercentage / 200);
    } else {
      stage = 'amber';
      harvestReadiness = 0.95 + (amberPercentage / 2000);
    }

    return TrichomeAnalysisResult(
      timestamp: now,
      trichomeStage: stage,
      clarityPercentage: clearPercentage,
      cloudinessPercentage: cloudyPercentage,
      amberPercentage: amberPercentage,
      harvestReadinessScore: harvestReadiness.clamp(0.0, 1.0),
      trichomeDensity: totalTrichomes / 10.0, // per mm²
      magnification: _microscopeSettings.magnification,
      confidence: 0.85 + (random % 15) / 100.0,
      imageUrl: _capturedImages.isNotEmpty ? _capturedImages[_currentImageIndex] : null,
      maturityIndicators: [
        if (clearPercentage > 20) 'Significant clear trichomes present',
        if (cloudyPercentage > 50) 'Mostly cloudy trichomes',
        if (amberPercentage > 30) 'Amber development detected',
        '${totalTrichomes} trichomes analyzed',
      ],
      harvestRecommendations: [
        if (harvestReadiness < 0.3) 'Too early for harvest - wait for more cloudiness',
        if (harvestReadiness >= 0.3 && harvestReadiness < 0.7) 'Monitor closely for amber development',
        if (harvestReadiness >= 0.7 && harvestReadiness < 0.9) 'Consider harvesting soon',
        if (harvestReadiness >= 0.9) 'Optimal harvest time - harvest now',
      ],
      technicalDetails: {
        'analysis_duration': '${2 + random % 3}s',
        'sample_size': totalTrichomes,
        'image_resolution': '2048x2048',
        'magnification_used': '${_microscopeSettings.magnification}x',
        'analysis_date': now.toIso8601String(),
      },
    );
  }

  void _saveToHistory() {
    if (_currentAnalysis == null) return;

    final dataPoint = TrichomeDataPoint(
      timestamp: _currentAnalysis!.timestamp,
      trichomeStage: _currentAnalysis!.trichomeStage,
      clarityPercentage: _currentAnalysis!.clarityPercentage,
      cloudinessPercentage: _currentAnalysis!.cloudinessPercentage,
      amberPercentage: _currentAnalysis!.amberPercentage,
      harvestReadinessScore: _currentAnalysis!.harvestReadinessScore,
      trichomeDensity: _currentAnalysis!.trichomeDensity,
      magnification: _currentAnalysis!.magnification,
      confidence: _currentAnalysis!.confidence,
      imageUrl: _currentAnalysis!.imageUrl,
    );

    setState(() {
      _trichomeHistory.add(dataPoint);
      // Keep only last 50 entries
      if (_trichomeHistory.length > 50) {
        _trichomeHistory.removeAt(0);
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Analysis saved to history')),
    );
  }

  void _exportAnalysis() {
    if (_currentAnalysis == null) return;

    // In a real implementation, this would export the analysis
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Export functionality would be implemented here')),
    );
  }

  void _showSettings() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Trichome Analysis Settings'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Microscope settings
              Text(
                'Microscope Settings',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              DropdownButton<MagnificationLevel>(
                value: _microscopeSettings.magnification,
                isExpanded: true,
                onChanged: (value) {
                  if (value != null) {
                    setState(() {
                      _microscopeSettings = _microscopeSettings.copyWith(magnification: value);
                    });
                  }
                },
                items: MagnificationLevel.values.map((level) {
                  return DropdownMenuItem(
                    value: level,
                    child: Text('${level.value}x'),
                  );
                }).toList(),
              ),

              const SizedBox(height: 16),

              // Analysis settings
              Text(
                'Analysis Settings',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              SwitchListTile(
                title: const Text('High Sensitivity Mode'),
                subtitle: const Text('More detailed but slower analysis'),
                value: _analysisSettings.highSensitivity,
                onChanged: (value) {
                  setState(() {
                    _analysisSettings = _analysisSettings.copyWith(highSensitivity: value);
                  });
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _handleMenuAction(String action) {
    switch (action) {
      case 'clear':
        _clearAllImages();
        break;
      case 'export':
        _exportAllResults();
        break;
    }
  }

  void _clearAllImages() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear All Images'),
        content: const Text('Are you sure you want to clear all captured images?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              setState(() {
                _capturedImages.clear();
                _currentImageIndex = 0;
                _currentAnalysis = null;
              });
              Navigator.of(context).pop();
            },
            child: const Text('Clear', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _exportAllResults() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Export all results functionality would be implemented here')),
    );
  }

  Color _getHarvestReadinessColor(double score) {
    if (score < 0.3) return Colors.blue;    // Early
    if (score < 0.7) return Colors.orange; // Mid
    return Colors.green;                     // Ready
  }
}

// Data models for Trichome Analysis
class MicroscopeSettings {
  final MagnificationLevel magnification;
  final Duration autoCaptureInterval;
  final bool showFocusGrid;
  final bool enableAutoFocus;

  const MicroscopeSettings({
    this.magnification = MagnificationLevel.x100,
    this.autoCaptureInterval = const Duration(seconds: 10),
    this.showFocusGrid = true,
    this.enableAutoFocus = true,
  });

  MicroscopeSettings copyWith({
    MagnificationLevel? magnification,
    Duration? autoCaptureInterval,
    bool? showFocusGrid,
    bool? enableAutoFocus,
  }) {
    return MicroscopeSettings(
      magnification: magnification ?? this.magnification,
      autoCaptureInterval: autoCaptureInterval ?? this.autoCaptureInterval,
      showFocusGrid: showFocusGrid ?? this.showFocusGrid,
      enableAutoFocus: enableAutoFocus ?? this.enableAutoFocus,
    );
  }
}

enum MagnificationLevel {
  x50(50),
  x100(100),
  x200(200),
  x400(400),
  x800(800);

  const MagnificationLevel(this.value);
  final int value;
}

class TrichomeAnalysisSettings {
  final bool highSensitivity;
  final bool includeDensity;
  final bool includeSize;

  const TrichomeAnalysisSettings({
    this.highSensitivity = false,
    this.includeDensity = true,
    this.includeSize = false,
  });

  TrichomeAnalysisSettings copyWith({
    bool? highSensitivity,
    bool? includeDensity,
    bool? includeSize,
  }) {
    return TrichomeAnalysisSettings(
      highSensitivity: highSensitivity ?? this.highSensitivity,
      includeDensity: includeDensity ?? this.includeDensity,
      includeSize: includeSize ?? this.includeSize,
    );
  }
}

class TrichomeAnalysisResult {
  final DateTime timestamp;
  final String trichomeStage;
  final double clarityPercentage;
  final double cloudinessPercentage;
  final double amberPercentage;
  final double harvestReadinessScore;
  final double trichomeDensity;
  final MagnificationLevel magnification;
  final double confidence;
  final String? imageUrl;
  final List<String> maturityIndicators;
  final List<String> harvestRecommendations;
  final Map<String, dynamic> technicalDetails;

  TrichomeAnalysisResult({
    required this.timestamp,
    required this.trichomeStage,
    required this.clarityPercentage,
    required this.cloudinessPercentage,
    required this.amberPercentage,
    required this.harvestReadinessScore,
    required this.trichomeDensity,
    required this.magnification,
    required this.confidence,
    this.imageUrl,
    this.maturityIndicators = const [],
    this.harvestRecommendations = const [],
    this.technicalDetails = const {},
  });
}

class TrichomeDataPoint {
  final DateTime timestamp;
  final String trichomeStage;
  final double clarityPercentage;
  final double cloudinessPercentage;
  final double amberPercentage;
  final double harvestReadinessScore;
  final double trichomeDensity;
  final MagnificationLevel magnification;
  final double confidence;
  final String? imageUrl;

  TrichomeDataPoint({
    required this.timestamp,
    required this.trichomeStage,
    required this.clarityPercentage,
    required this.cloudinessPercentage,
    required this.amberPercentage,
    required this.harvestReadinessScore,
    required this.trichomeDensity,
    required this.magnification,
    required this.confidence,
    this.imageUrl,
  });
}

class FocusGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.3)
      ..strokeWidth = 1;

    const gridSize = 3;

    // Draw grid lines
    for (int i = 1; i < gridSize; i++) {
      final x = (size.width / gridSize) * i;
      final y = (size.height / gridSize) * i;

      // Vertical line
      canvas.drawLine(
        Offset(x, 0),
        Offset(x, size.height),
        paint,
      );

      // Horizontal line
      canvas.drawLine(
        Offset(0, y),
        Offset(size.width, y),
        paint,
      );
    }

    // Draw center crosshair
    final centerX = size.width / 2;
    final centerY = size.height / 2;
    final crossSize = 20.0;

    final crossPaint = Paint()
      ..color = Colors.green.withOpacity(0.5)
      ..strokeWidth = 2;

    // Horizontal line
    canvas.drawLine(
      Offset(centerX - crossSize, centerY),
      Offset(centerX + crossSize, centerY),
      crossPaint,
    );

    // Vertical line
    canvas.drawLine(
      Offset(centerX, centerY - crossSize),
      Offset(centerX, centerY + crossSize),
      crossPaint,
    );

    // Draw center circle
    canvas.drawCircle(
      Offset(centerX, centerY),
      30,
      Paint()
        ..color = Colors.green.withOpacity(0.2)
        ..style = PaintingStyle.fill,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}