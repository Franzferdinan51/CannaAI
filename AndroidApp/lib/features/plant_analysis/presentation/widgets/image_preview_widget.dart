import 'dart:io';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:photo_view/photo_view.dart';
import 'package:photo_view/photo_view_gallery.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;

enum AnalysisType { quick, detailed, trichome, liveVision }

class ImagePreviewWidget extends StatefulWidget {
  final String imagePath;
  final List<String>? additionalImages;
  final String? title;
  final List<Widget>? overlayWidgets;
  final bool enableAnalysis;
  final AnalysisType? initialAnalysisType;
  final Function(AnalysisType)? onAnalysisRequested;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;

  const ImagePreviewWidget({
    super.key,
    required this.imagePath,
    this.additionalImages,
    this.title,
    this.overlayWidgets,
    this.enableAnalysis = true,
    this.initialAnalysisType,
    this.onAnalysisRequested,
    this.onEdit,
    this.onDelete,
  });

  @override
  State<ImagePreviewWidget> createState() => _ImagePreviewWidgetState();
}

class _ImagePreviewWidgetState extends State<ImagePreviewWidget>
    with TickerProviderStateMixin {
  late PageController _pageController;
  late TransformationController _transformationController;
  int _currentIndex = 0;
  bool _isFullscreen = false;
  bool _showAnalysisOverlay = false;
  AnalysisType? _selectedAnalysisType;

  late AnimationController _overlayController;
  late Animation<double> _overlayAnimation;

  List<String> get _allImages {
    final images = [widget.imagePath];
    if (widget.additionalImages != null) {
      images.addAll(widget.additionalImages!);
    }
    return images;
  }

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _transformationController = TransformationController();
    _selectedAnalysisType = widget.initialAnalysisType;

    _overlayController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _overlayAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _overlayController,
      curve: Curves.easeInOut,
    ));

    // Set initial index if additional images exist
    if (widget.additionalImages != null && widget.additionalImages!.isNotEmpty) {
      _currentIndex = 0;
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    _transformationController.dispose();
    _overlayController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Main image viewer
          Positioned.fill(
            child: _buildImageViewer(),
          ),

          // Top controls
          if (!_isFullscreen)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: _buildTopControls(),
            ),

          // Bottom controls
          if (!_isFullscreen)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: _buildBottomControls(),
            ),

          // Analysis overlay
          if (_showAnalysisOverlay && widget.enableAnalysis)
            Positioned.fill(
              child: _buildAnalysisOverlay(),
            ),

          // Page indicator
          if (_allImages.length > 1 && !_isFullscreen)
            Positioned(
              top: 100,
              left: 0,
              right: 0,
              child: _buildPageIndicator(),
            ),
        ],
      ),
    );
  }

  Widget _buildImageViewer() {
    if (_allImages.length == 1) {
      return _buildSingleImage();
    } else {
      return _buildGalleryView();
    }
  }

  Widget _buildSingleImage() {
    return PhotoView(
      imageProvider: FileImage(File(_allImages[_currentIndex])),
      minScale: PhotoViewComputedScale.contained * 0.8,
      maxScale: PhotoViewComputedScale.covered * 4.0,
      initialScale: PhotoViewComputedScale.contained,
      heroAttributes: PhotoViewHeroAttributes(tag: _allImages[_currentIndex]),
      backgroundDecoration: const BoxDecoration(
        color: Colors.black,
      ),
      loadingBuilder: (context, event) => Center(
        child: CircularProgressIndicator(
          value: event == null ? null : event.cumulativeBytesLoaded / (event.expectedTotalBytes ?? 1),
        ),
      ),
      errorBuilder: (context, error, stackTrace) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error, color: Colors.white, size: 64),
            const SizedBox(height: 16),
            Text(
              'Failed to load image',
              style: const TextStyle(color: Colors.white),
            ),
            if (error != null)
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  error.toString(),
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              ),
          ],
        ),
      ),
      onTapUp: (context, details, controllerValue) {
        setState(() {
          _isFullscreen = !_isFullscreen;
        });
      },
    );
  }

  Widget _buildGalleryView() {
    return PhotoViewGallery.builder(
      scrollPhysics: const BouncingScrollPhysics(),
      pageController: _pageController,
      itemCount: _allImages.length,
      builder: (context, index) {
        return PhotoViewGalleryPageOptions(
          imageProvider: FileImage(File(_allImages[index])),
          initialScale: PhotoViewComputedScale.contained,
          minScale: PhotoViewComputedScale.contained * 0.8,
          maxScale: PhotoViewComputedScale.covered * 4.0,
          heroAttributes: PhotoViewHeroAttributes(tag: _allImages[index]),
        );
      },
      onPageChanged: (index) {
        setState(() {
          _currentIndex = index;
        });
      },
      backgroundDecoration: const BoxDecoration(
        color: Colors.black,
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
          // Back button
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.close, color: Colors.white, size: 28),
          ),

          // Title
          if (widget.title != null)
            Expanded(
              child: Text(
                widget.title!,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
                overflow: TextOverflow.ellipsis,
              ),
            ),

          // More options
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: Colors.white),
            color: Colors.grey[900],
            onSelected: _handleMenuAction,
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'share',
                child: Row(
                  children: [
                    Icon(Icons.share, color: Colors.white),
                    SizedBox(width: 12),
                    Text('Share', style: TextStyle(color: Colors.white)),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'info',
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.white),
                    SizedBox(width: 12),
                    Text('Image Info', style: TextStyle(color: Colors.white)),
                  ],
                ),
              ),
              if (widget.onEdit != null)
                const PopupMenuItem(
                  value: 'edit',
                  child: Row(
                    children: [
                      Icon(Icons.edit, color: Colors.white),
                      SizedBox(width: 12),
                      Text('Edit', style: TextStyle(color: Colors.white)),
                    ],
                  ),
                ),
              if (widget.onDelete != null)
                const PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      Icon(Icons.delete, color: Colors.red),
                      SizedBox(width: 12),
                      Text('Delete', style: TextStyle(color: Colors.red)),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBottomControls() {
    return Container(
      padding: const EdgeInsets.all(16),
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
          // Analysis options
          if (widget.enableAnalysis) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildAnalysisButton(
                  'Quick\nAnalysis',
                  Icons.speed,
                  AnalysisType.quick,
                ),
                _buildAnalysisButton(
                  'Detailed\nAnalysis',
                  Icons.analytics,
                  AnalysisType.detailed,
                ),
                _buildAnalysisButton(
                  'Trichome\nAnalysis',
                  Icons.bubble_chart,
                  AnalysisType.trichome,
                ),
                _buildAnalysisButton(
                  'Live\nVision',
                  Icons.visibility,
                  AnalysisType.liveVision,
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],

          // Quick actions
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildActionButton(
                'Zoom',
                _isFullscreen ? Icons.zoom_out_map : Icons.zoom_in,
                () => setState(() => _isFullscreen = !_isFullscreen),
              ),
              _buildActionButton(
                'Rotate',
                Icons.rotate_90_degrees_ccw,
                _rotateImage,
              ),
              _buildActionButton(
                'Enhance',
                Icons.auto_fix_high,
                _enhanceImage,
              ),
              _buildActionButton(
                'Compare',
                Icons.compare,
                _showComparison,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPageIndicator() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: _allImages.asMap().entries.map((entry) {
          final index = entry.key;
          return Container(
            width: 8,
            height: 8,
            margin: const EdgeInsets.symmetric(horizontal: 4),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: index == _currentIndex ? Colors.white : Colors.white.withOpacity(0.4),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildAnalysisButton(String label, IconData icon, AnalysisType type) {
    final isSelected = _selectedAnalysisType == type;

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedAnalysisType = type;
          _showAnalysisOverlay = true;
          _overlayController.forward();
        });

        widget.onAnalysisRequested?.call(type);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? Theme.of(context).primaryColor : Colors.white.withOpacity(0.2),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? Theme.of(context).primaryColor : Colors.white.withOpacity(0.5),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isSelected ? Colors.white : Colors.white,
              size: 24,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : Colors.white,
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton(String label, IconData icon, VoidCallback onPressed) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.2),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAnalysisOverlay() {
    return AnimatedBuilder(
      animation: _overlayAnimation,
      builder: (context, child) {
        return Opacity(
          opacity: _overlayAnimation.value,
          child: Container(
            margin: const EdgeInsets.all(20),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.grey[900],
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Text(
                      'Analysis Options',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: () {
                        _overlayController.reverse().then((_) {
                          setState(() {
                            _showAnalysisOverlay = false;
                          });
                        });
                      },
                      icon: const Icon(Icons.close, color: Colors.white),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Analysis type description
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _getAnalysisDescription(_selectedAnalysisType),
                    style: const TextStyle(color: Colors.white70),
                    textAlign: TextAlign.center,
                  ),
                ),

                const SizedBox(height: 20),

                // Analysis settings
                ..._buildAnalysisSettings(_selectedAnalysisType),

                const SizedBox(height: 20),

                // Action buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    TextButton(
                      onPressed: () {
                        _overlayController.reverse().then((_) {
                          setState(() {
                            _showAnalysisOverlay = false;
                          });
                        });
                      },
                      child: const Text('Cancel'),
                    ),
                    ElevatedButton(
                      onPressed: () {
                        _overlayController.reverse().then((_) {
                          setState(() {
                            _showAnalysisOverlay = false;
                          });
                        });
                        _startAnalysis();
                      },
                      child: const Text('Start Analysis'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  List<Widget> _buildAnalysisSettings(AnalysisType? type) {
    switch (type) {
      case AnalysisType.trichome:
        return [
          _buildSettingOption('Magnification', ['100x', '200x', '400x']),
          _buildSettingOption('Focus Area', ['Buds', 'Sugar Leaves', 'Fan Leaves']),
        ];
      case AnalysisType.detailed:
        return [
          _buildSettingOption('Analysis Depth', ['Standard', 'Deep', 'Expert']),
          _buildSettingOption('Focus Areas', ['All', 'Leaves Only', 'Flowers Only']),
        ];
      case AnalysisType.liveVision:
        return [
          _buildSettingOption('Update Frequency', ['Real-time', 'Every 5s', 'Every 10s']),
          _buildSettingOption('Alert Sensitivity', ['Low', 'Medium', 'High']),
        ];
      default:
        return [];
    }
  }

  Widget _buildSettingOption(String label, List<String> options) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: options.map((option) {
                final isSelected = true; // Mock selection
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () {
                      // Handle selection
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: isSelected ? Theme.of(context).primaryColor : Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Text(
                        option,
                        style: TextStyle(
                          color: isSelected ? Colors.white : Colors.white70,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  String _getAnalysisDescription(AnalysisType? type) {
    switch (type) {
      case AnalysisType.quick:
        return 'Fast health assessment with basic symptom detection and overall plant scoring.';
      case AnalysisType.detailed:
        return 'Comprehensive analysis including nutrient deficiencies, pests, diseases, and detailed recommendations.';
      case AnalysisType.trichome:
        return 'Microscopic analysis of trichome maturity for optimal harvest timing assessment.';
      case AnalysisType.liveVision:
        return 'Real-time monitoring with continuous health tracking and change detection.';
      default:
        return 'Select an analysis type to begin.';
    }
  }

  void _handleMenuAction(String action) {
    switch (action) {
      case 'share':
        _shareImage();
        break;
      case 'info':
        _showImageInfo();
        break;
      case 'edit':
        widget.onEdit?.call();
        break;
      case 'delete':
        _confirmDelete();
        break;
    }
  }

  Future<void> _shareImage() async {
    try {
      final box = context.findRenderObject() as RenderBox?;
      await Share.shareXFiles(
        [XFile(_allImages[_currentIndex])],
        sharePositionOrigin: box!.localToGlobal(Offset.zero) & box.size,
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to share image: $e')),
      );
    }
  }

  void _showImageInfo() {
    final file = File(_allImages[_currentIndex]);
    final stat = file.statSync();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Image Information'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Path: ${file.path}'),
            Text('Size: ${(stat.size / 1024 / 1024).toStringAsFixed(2)} MB'),
            Text('Modified: ${stat.modified}'),
            Text('Type: ${path.extension(file.path)}'),
          ],
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

  void _confirmDelete() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Image'),
        content: const Text('Are you sure you want to delete this image?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              widget.onDelete?.call();
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _rotateImage() {
    // Image rotation logic would go here
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Image rotation not implemented yet')),
    );
  }

  void _enhanceImage() {
    // Image enhancement logic would go here
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Image enhancement not implemented yet')),
    );
  }

  void _showComparison() {
    // Comparison logic would go here
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Comparison view not implemented yet')),
    );
  }

  void _startAnalysis() {
    // Navigate to analysis screen or start analysis
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Starting ${_selectedAnalysisType?.toString()} analysis...')),
    );
  }
}