import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;

class ImageProcessingService {
  static const int _maxImageWidth = 1024;
  static const int _maxImageHeight = 1024;
  static const int _thumbnailSize = 200;

  /// Compress and optimize image for analysis
  Future<ProcessedImage> compressImage(
    File originalImage, {
    int? maxWidth,
    int? maxHeight,
    int? quality,
    bool createThumbnail = true,
  }) async {
    try {
      maxWidth ??= _maxImageWidth;
      maxHeight ??= _maxImageHeight;
      final finalQuality = quality ?? 85;

      // Read original image
      final originalBytes = await originalImage.readAsBytes();
      ui.Image originalUiImage = await _decodeImage(originalBytes);

      if (originalUiImage == null) {
        throw Exception('Failed to decode image');
      }

      // Calculate target dimensions maintaining aspect ratio
      final originalSize = originalUiImage.size;
      double targetWidth = maxWidth.toDouble();
      double targetHeight = maxHeight.toDouble();

      if (originalSize.width <= targetWidth && originalSize.height <= targetHeight) {
        targetWidth = originalSize.width.toDouble();
        targetHeight = originalSize.height.toDouble();
      } else {
        final aspectRatio = originalSize.width / originalSize.height;
        if (targetWidth / targetHeight > aspectRatio) {
          targetWidth = targetHeight * aspectRatio;
        } else {
          targetHeight = targetWidth / aspectRatio;
        }
      }

      // Create compressed image
      ui.Image compressedUiImage = await _resizeImage(originalUiImage, targetWidth.toInt(), targetHeight.toInt());
      final compressedBytes = await _encodeImageToJpeg(compressedUiImage, finalQuality);

      String compressedPath;
      String? thumbnailPath;

      // Save compressed image
      final directory = await getApplicationDocumentsDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      compressedPath = path.join(
        directory.path,
        'compressed_images',
        'image_$timestamp.jpg',
      );

      // Ensure directory exists
      final compressedDir = Directory(path.dirname(compressedPath));
      if (!await compressedDir.exists()) {
        await compressedDir.create(recursive: true);
      }

      final compressedFile = File(compressedPath);
      await compressedFile.writeAsBytes(compressedBytes);

      // Create thumbnail if requested
      if (createThumbnail) {
        final thumbnailSize = _thumbnailSize.toDouble();
        ui.Image thumbnailImage = await _resizeImage(
          originalUiImage,
          thumbnailSize.toInt(),
          thumbnailSize.toInt(),
        );
        final thumbnailBytes = await _encodeImageToJpeg(thumbnailImage, 75);

        thumbnailPath = path.join(
          directory.path,
          'thumbnails',
          'thumb_$timestamp.jpg',
        );

        final thumbnailDir = Directory(path.dirname(thumbnailPath));
        if (!await thumbnailDir.exists()) {
          await thumbnailDir.create(recursive: true);
        }

        final thumbnailFile = File(thumbnailPath);
        await thumbnailFile.writeAsBytes(thumbnailBytes);
      }

      return ProcessedImage(
        originalPath: originalImage.path,
        compressedPath: compressedPath,
        thumbnailPath: thumbnailPath,
        originalSize: originalSize,
        compressedSize: Size(targetWidth.toInt(), targetHeight.toInt()),
        originalFileSize: originalBytes.length,
        compressedFileSize: compressedBytes.length,
        thumbnailFileSize: thumbnailBytes?.length ?? 0,
      );
    } catch (e) {
      throw ImageProcessingException('Failed to process image: $e');
    }
  }

  /// Enhance image for better analysis (contrast, sharpness)
  Future<EnhancedImage> enhanceImageForAnalysis(
    File imageFile, {
    bool increaseContrast = true,
    bool increaseSharpness = true,
  }) async {
    try {
      final bytes = await imageFile.readAsBytes();
      ui.Image originalImage = await _decodeImage(bytes);

      if (originalImage == null) {
        throw Exception('Failed to decode image for enhancement');
      }

      // Convert to Image package for processing
      final imageBytes = await image.toByteData(format: ui.ImageByteFormat.png);
      final originalBuffer = imageBytes.buffer.asUint8List();
      final image = img.Image.fromBytes(originalBuffer);

      // Apply enhancements
      if (increaseContrast) {
        image = img.adjustColor(image, contrast: 1.2, brightness: 0.1);
      }

      if (increaseSharpness) {
        image = img.convolution(image, kernel: _getSharpenKernel());
      }

      // Convert back to UI image
      final enhancedBytes = await image.toJpeg(quality: 95);
      final enhancedUiImage = await _decodeImage(enhancedBytes);

      if (enhancedUiImage == null) {
        throw Exception('Failed to encode enhanced image');
      }

      // Save enhanced image
      final directory = await getApplicationDocumentsDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final enhancedPath = path.join(
        directory.path,
        'enhanced_images',
        'enhanced_$timestamp.jpg',
      );

      final enhancedDir = Directory(path.dirname(enhancedPath));
      if (!await enhancedDir.exists()) {
        await enhancedDir.create(recursive: true);
      }

      final enhancedFile = File(enhancedPath);
      await enhancedFile.writeAsBytes(enhancedBytes);

      return EnhancedImage(
        enhancedPath: enhancedPath,
        originalSize: originalImage.size,
        enhancedSize: enhancedUiImage.size,
        fileSize: enhancedBytes.length,
      );
    } catch (e) {
      throw ImageProcessingException('Failed to enhance image: $e');
    }
  }

  /// Validate image quality for analysis
  Future<ImageQualityReport> validateImageQuality(File imageFile) async {
    try {
      final bytes = await imageFile.readAsBytes();
      final ui.Image uiImage = await _decodeImage(bytes);

      if (uiImage == null) {
        return ImageQualityReport(
          isValid: false,
          issues: ['Failed to decode image'],
          brightness: 0,
          contrast: 0,
          sharpness: 0,
          resolution: Size(0, 0),
          recommendation: 'Please provide a valid image file',
        );
      }

      final image = img.Image.fromBytes(uiImage.toByteData(format: ui.ImageByteFormat.png).buffer.asUint8List());

      // Analyze image quality metrics
      final brightness = _calculateBrightness(image);
      final contrast = _calculateContrast(image);
      final sharpness = _estimateSharpness(image);
      final resolution = uiImage.size;

      final issues = <String>[];
      final recommendations = <String>[];

      // Check brightness
      if (brightness < 0.2) {
        issues.add('Image is too dark');
        recommendations.add('Increase lighting or use a longer exposure');
      } else if (brightness > 0.8) {
        issues.add('Image is too bright');
        recommendations.add('Reduce lighting or use a shorter exposure');
      }

      // Check contrast
      if (contrast < 0.15) {
        issues.add('Low contrast may affect analysis');
        recommendations.add('Improve lighting conditions or use image enhancement');
      }

      // Check resolution
      if (resolution.width < 800 || resolution.height < 600) {
        issues.add('Low resolution may affect accuracy');
        recommendations.add('Use higher resolution images (minimum 800x600)');
      }

      // Check sharpness
      if (sharpness < 0.3) {
        issues.add('Image appears blurry');
        recommendations.add('Ensure camera is focused and stable');
      }

      return ImageQualityReport(
        isValid: issues.isEmpty,
        issues: issues,
        brightness: brightness,
        contrast: contrast,
        sharpness: sharpness,
        resolution: resolution,
        recommendation: recommendations.isNotEmpty
            ? recommendations.first
            : 'Image quality is good for analysis',
      );
    } catch (e) {
      return ImageQualityReport(
        isValid: false,
        issues: ['Failed to analyze image quality'],
        brightness: 0,
        contrast: 0,
        sharpness: 0,
        resolution: Size(0, 0),
        recommendation: 'Please provide a valid image file',
      );
    }
  }

  /// Batch process multiple images
  Future<List<BatchProcessResult>> batchProcessImages(
    List<File> imageFiles, {
    int? maxConcurrent = 3,
    ProgressCallback? onProgress,
  }) async {
    final results = <BatchProcessResult>[];
    final maxConcurrentProcessing = maxConcurrent ?? 3;
    int processed = 0;

    for (int i = 0; i < imageFiles.length; i += maxConcurrentProcessing) {
      final batchEnd = math.min(i + maxConcurrentProcessing, imageFiles.length);
      final batch = imageFiles.sublist(i, batchEnd);

      // Process batch concurrently
      final futures = batch.map((file) => _processImageWithQualityCheck(file));
      final batchResults = await Future.wait(futures);

      results.addAll(batchResults);
      processed += batchResults.length;

      onProgress?.call(processed, imageFiles.length);

      // Small delay between batches
      if (i + maxConcurrentProcessing < imageFiles.length) {
        await Future.delayed(const Duration(milliseconds: 100));
      }
    }

    return results;
  }

  Future<BatchProcessResult> _processImageWithQualityCheck(File imageFile) async {
    try {
      // Validate quality first
      final qualityReport = await validateImageQuality(imageFile);

      if (!qualityReport.isValid) {
        return BatchProcessResult(
          imageFile: imageFile,
          success: false,
          error: qualityReport.issues.join(', '),
          qualityReport: qualityReport,
        );
      }

      // Process image
      final processedImage = await compressImage(imageFile, createThumbnail: true);

      return BatchProcessResult(
        imageFile: imageFile,
        success: true,
        processedImage: processedImage,
        qualityReport: qualityReport,
      );
    } catch (e) {
      return BatchProcessResult(
        imageFile: imageFile,
        success: false,
        error: e.toString(),
        qualityReport: null,
      );
    }
  }

  // Private helper methods

  Future<ui.Image?> _decodeImage(Uint8List bytes) async {
    final codec = await ui.instantiateImageCodec(bytes);
    return codec?.decode();
  }

  ui.Image _resizeImage(ui.Image originalImage, int targetWidth, int targetHeight) async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);

    canvas.drawImageRect(
      originalImage,
      Rect.fromLTWH(0, 0, targetWidth.toDouble(), targetHeight.toDouble()),
    );

    final picture = recorder.endRecording();
    return await picture.toImage(targetWidth, targetHeight);
  }

  Future<Uint8List> _encodeImageToJpeg(ui.Image image, int quality) async {
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    return byteData.buffer.asUint8List();
  }

  double _calculateBrightness(img.Image image) {
    int totalBrightness = 0;
    int pixelCount = 0;

    for (int y = 0; y < image.height; y++) {
      for (int x = 0; x < image.width; x++) {
        final pixel = image.getPixel(x, y);
        final brightness = (pixel.r + pixel.g + pixel.b) / (3 * 255);
        totalBrightness += brightness;
        pixelCount++;
      }
    }

    return totalBrightness / pixelCount;
  }

  double _calculateContrast(img.Image image) {
    // Simple contrast calculation using standard deviation
    List<int> brightnesses = [];
    double mean = 0;

    for (int y = 0; y < image.height; y++) {
      for (int x = 0; x < image.width; x++) {
        final pixel = image.getPixel(x, y);
        final brightness = (pixel.r + pixel.g + pixel.b) / (3 * 255);
        brightnesses.add(brightness.round());
        mean += brightness;
      }
    }

    mean /= brightnesses.length;

    double variance = 0;
    for (final brightness in brightnesses) {
      variance += math.pow(brightness - mean, 2);
    }
    variance /= brightnesses.length;

    return math.sqrt(variance);
  }

  double _estimateSharpness(img.Image image) {
    // Simple sharpness estimation using edge detection
    double edgeStrength = 0;
    int edgeCount = 0;

    for (int y = 1; y < image.height - 1; y++) {
      for (int x = 1; x < image.width - 1; x++) {
        final center = image.getPixel(x, y);
        final left = image.getPixel(x - 1, y);
        final right = image.getPixel(x + 1, y);
        final top = image.getPixel(x, y - 1);
        final bottom = image.getPixel(x, y + 1);

        // Calculate edge strength in X and Y directions
        final xEdge = ((right.r - left.r).abs() + (right.g - left.g).abs() + (right.b - left.b).abs()) / 3;
        final yEdge = ((bottom.r - top.r).abs() + (bottom.g - top.g).abs() + (bottom.b - top.b).abs()) / 3;

        edgeStrength += math.max(xEdge, yEdge);
        edgeCount++;
      }
    }

    return edgeCount > 0 ? edgeStrength / edgeCount : 0;
  }

  img.Image _getSharpenKernel() {
    // 3x3 sharpening kernel
    return img.Image.fromBytes([
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0,
    ], width: 3, height: 3);
  }

  Future<void> _saveImageToCache(Uint8List bytes, String filename) async {
    try {
      final directory = await getTemporaryDirectory();
      final file = File(path.join(directory.path, filename));
      await file.writeAsBytes(bytes);
    } catch (e) {
      // Log error but don't throw
      print('Warning: Failed to cache image: $e');
    }
  }
}

class ProcessedImage {
  final String originalPath;
  final String compressedPath;
  final String? thumbnailPath;
  final Size originalSize;
  final Size compressedSize;
  final int originalFileSize;
  final int compressedFileSize;
  final int thumbnailFileSize;

  ProcessedImage({
    required this.originalPath,
    required this.compressedPath,
    this.thumbnailPath,
    required this.originalSize,
    required this.compressedSize,
    required this.originalFileSize,
    required this.compressedFileSize,
    this.thumbnailFileSize = 0,
  });

  int get compressionRatio =>
      originalFileSize > 0 ? ((originalFileSize - compressedFileSize) / originalFileSize * 100).round() : 0;
}

class EnhancedImage {
  final String enhancedPath;
  final Size originalSize;
  final Size enhancedSize;
  final int fileSize;

  EnhancedImage({
    required this.enhancedPath,
    required this.originalSize,
    required this.enhancedSize,
    required this.fileSize,
  });
}

class ImageQualityReport {
  final bool isValid;
  final List<String> issues;
  final double brightness;
  final double contrast;
  final double sharpness;
  final Size resolution;
  final String recommendation;

  ImageQualityReport({
    required this.isValid,
    required this.issues,
    required this.brightness,
    required this.contrast,
    required this.sharpness,
    required this.resolution,
    required this.recommendation,
  });
}

class BatchProcessResult {
  final File imageFile;
  final bool success;
  final String? error;
  final ProcessedImage? processedImage;
  final ImageQualityReport? qualityReport;

  BatchProcessResult({
    required this.imageFile,
    required this.success,
    this.error,
    this.processedImage,
    this.qualityReport,
  });
}

class ImageProcessingException implements Exception {
  final String message;
  final dynamic originalError;

  ImageProcessingException(this.message, [this.originalError]);

  @override
  String toString() => message;
}

typedef ProgressCallback = Function(int processed, int total);