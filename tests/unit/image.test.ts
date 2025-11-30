/**
 * Unit Tests for Image Processing Library
 */

import {
  isFormatSupported,
  SUPPORTED_FORMATS,
  convertHeicToJpeg,
  isHeicFormat,
  getImageFormat,
  getImageMetadata,
  bufferToBase64,
  base64ToBuffer,
  validateBase64DataUrl,
  processImage,
  processImageForVisionModel,
  processImageForWeb,
  generateResponsiveImages,
  autoOrientImage,
  removeAlphaChannel,
  convertImageFormat,
  getImageStatistics,
  validateImageSize,
  validateImageDimensions,
  handleImageUpload,
  ImageProcessingError,
  HeicConversionError,
  UnsupportedFormatError,
  ImageSizeError
} from '@/lib/image';
import { createSampleImage, createValidImageDataUrl } from '@/tests/utils/test-utils';

describe('Image Processing Library', () => {
  describe('Format Support', () => {
    test('should correctly identify supported formats', () => {
      expect(isFormatSupported('image/jpeg')).toBe(true);
      expect(isFormatSupported('image/png')).toBe(true);
      expect(isFormatSupported('image/webp')).toBe(true);
      expect(isFormatSupported('image/avif')).toBe(true);
      expect(isFormatSupported('image/gif')).toBe(true);
      expect(isFormatSupported('image/tiff')).toBe(true);
      expect(isFormatSupported('image/heic')).toBe(true);
      expect(isFormatSupported('image/heif')).toBe(true);
    });

    test('should reject unsupported formats', () => {
      expect(isFormatSupported('image/svg')).toBe(false);
      expect(isFormatSupported('application/pdf')).toBe(false);
      expect(isFormatSupported('text/plain')).toBe(false);
      expect(isFormatSupported('application/json')).toBe(false);
    });

    test('should have correct supported formats', () => {
      expect(SUPPORTED_FORMATS).toEqual({
        JPEG: 'image/jpeg',
        PNG: 'image/png',
        WEBP: 'image/webp',
        AVIF: 'image/avif',
        GIF: 'image/gif',
        TIFF: 'image/tiff',
        HEIC: 'image/heic',
        HEIF: 'image/heif'
      });
    });
  });

  describe('HEIC Detection and Conversion', () => {
    test('should correctly detect HEIC format', () => {
      const heicBuffer = Buffer.from('ftypheic');
      expect(isHeicFormat(heicBuffer)).toBe(true);
    });

    test('should correctly detect HEIF format', () => {
      const heifBuffer = Buffer.from('ftypheif');
      expect(isHeicFormat(heifBuffer)).toBe(true);
    });

    test('should not detect non-HEIC formats', () => {
      const jpegBuffer = Buffer.from('\xFF\xD8\xFF');
      expect(isHeicFormat(jpegBuffer)).toBe(false);

      const pngBuffer = Buffer.from('\x89PNG');
      expect(isHeicFormat(pngBuffer)).toBe(false);
    });

    test('should convert HEIC to JPEG', async () => {
      const mockConvert = jest.fn().mockResolvedValue(Buffer.from('converted-jpeg-data'));
      const heicConvert = require('heic-convert');
      heicConvert.convert = mockConvert;

      const result = await convertHeicToJpeg(createSampleImage.heic, 90);

      expect(mockConvert).toHaveBeenCalledWith({
        buffer: createSampleImage.heic,
        format: 'JPEG',
        quality: 90
      });
      expect(result).toBe('converted-jpeg-data');
    });

    test('should throw HeicConversionError when conversion fails', async () => {
      const heicConvert = require('heic-convert');
      heicConvert.convert = jest.fn().mockRejectedValue(new Error('Conversion failed'));

      await expect(
        convertHeicToJpeg(createSampleImage.heic)
      ).rejects.toThrow(HeicConversionError);
    });
  });

  describe('Image Format Detection', () => {
    test('should detect image format correctly', async () => {
      const mockMetadata = {
        format: 'jpeg',
        width: 100,
        height: 100
      };

      const sharp = require('sharp');
      sharp.mockImplementation(() => ({
        metadata: jest.fn().mockResolvedValue(mockMetadata)
      }));

      const format = await getImageFormat(createSampleImage.tiny);

      expect(format).toBe('jpeg');
    });

    test('should detect HEIC format using header check', async () => {
      const format = await getImageFormat(createSampleImage.heic);

      expect(format).toBe('heic');
    });

    test('should throw ImageProcessingError when format detection fails', async () => {
      const sharp = require('sharp');
      sharp.mockImplementation(() => {
        throw new Error('Detection failed');
      });

      await expect(
        getImageFormat(createSampleImage.tiny)
      ).rejects.toThrow(ImageProcessingError);
    });
  });

  describe('Image Metadata', () => {
    test('should extract image metadata correctly', async () => {
      const mockMetadata = {
        format: 'jpeg',
        width: 100,
        height: 100,
        density: 72,
        hasAlpha: false,
        channels: 3,
        orientation: 1,
        space: 'srgb',
        isProgressive: false
      };

      const sharp = require('sharp');
      sharp.mockImplementation(() => ({
        metadata: jest.fn().mockResolvedValue(mockMetadata)
      }));

      const metadata = await getImageMetadata(createSampleImage.tiny);

      expect(metadata).toEqual({
        format: 'jpeg',
        width: 100,
        height: 100,
        size: expect.any(Number),
        density: 72,
        hasAlpha: false,
        channels: 3,
        orientation: 1,
        colorSpace: 'srgb',
        isProgressive: false
      });
    });

    test('should handle missing metadata gracefully', async () => {
      const mockMetadata = {
        format: null,
        width: null,
        height: null
      };

      const sharp = require('sharp');
      sharp.mockImplementation(() => ({
        metadata: jest.fn().mockResolvedValue(mockMetadata)
      }));

      const metadata = await getImageMetadata(createSampleImage.tiny);

      expect(metadata.width).toBe(0);
      expect(metadata.height).toBe(0);
      expect(metadata.format).toBe('unknown');
    });
  });

  describe('Base64 Conversion', () => {
    test('should convert buffer to base64 correctly', () => {
      const buffer = Buffer.from('test data');
      const result = bufferToBase64(buffer, 'image/jpeg');

      expect(result).toBe('data:image/jpeg;base64,dGVzdCBkYXRh');
    });

    test('should convert base64 data URL to buffer', () => {
      const dataUrl = 'data:image/jpeg;base64,dGVzdCBkYXRh';
      const { buffer, mimeType } = base64ToBuffer(dataUrl);

      expect(buffer.toString()).toBe('test data');
      expect(mimeType).toBe('image/jpeg');
    });

    test('should throw error for invalid base64 data URL format', () => {
      expect(() => base64ToBuffer('invalid-data')).toThrow(ImageProcessingError);
    });

    test('should validate base64 data URL correctly', () => {
      const validDataUrl = createValidImageDataUrl('jpeg');
      expect(validateBase64DataUrl(validDataUrl)).toBe(true);
    });

    test('should reject invalid base64 data URL', () => {
      const invalidDataUrl = 'invalid-data-url';
      expect(validateBase64DataUrl(invalidDataUrl)).toBe(false);
    });
  });

  describe('Image Processing', () => {
    test('should process image with default options', async () => {
      const mockProcessedBuffer = Buffer.from('processed-image');
      const mockMetadata = {
        format: 'jpeg',
        width: 1024,
        height: 1024,
        density: 72,
        hasAlpha: false,
        channels: 3,
        orientation: 1,
        space: 'srgb'
      };

      const sharp = require('sharp');
      const instance = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockProcessedBuffer),
        metadata: jest.fn().mockResolvedValue(mockMetadata)
      };
      sharp.mockReturnValue(instance);

      const result = await processImage(createSampleImage.tiny);

      expect(instance.resize).toHaveBeenCalled();
      expect(instance.jpeg).toHaveBeenCalled();
      expect(result.data).toBe(mockProcessedBuffer);
      expect(result.base64).toContain('data:image/jpeg;base64,');
      expect(result.compressionRatio).toBeGreaterThan(0);
    });

    test('should process image for vision model with optimal settings', async () => {
      const sharp = require('sharp');
      const instance = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed')),
        metadata: jest.fn().mockResolvedValue({
          format: 'jpeg',
          width: 1024,
          height: 1024
        })
      };
      sharp.mockReturnValue(instance);

      const result = await processImageForVisionModel(createSampleImage.tiny);

      expect(result.metadata.format).toBe('jpeg');
      expect(result.metadata.width).toBe(1024);
      expect(result.metadata.height).toBe(1024);
      expect(result.base64).toContain('data:image/jpeg;base64,');
    });

    test('should process image for web with webp format', async () => {
      const sharp = require('sharp');
      const instance = {
        resize: jest.fn().mockReturnThis(),
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed')),
        metadata: jest.fn().mockResolvedValue({
          format: 'webp',
          width: 800,
          height: 600
        })
      };
      sharp.mockReturnValue(instance);

      const result = await processImageForWeb(createSampleImage.tiny);

      expect(result.metadata.format).toBe('webp');
      expect(instance.webp).toHaveBeenCalled();
    });

    test('should generate responsive images', async () => {
      const sharp = require('sharp');
      const instance = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed')),
        metadata: jest.fn().mockResolvedValue({
          format: 'jpeg',
          width: 800,
          height: 600
        })
      };
      sharp.mockReturnValue(instance);

      const sizes = [
        { width: 400, height: 300, name: 'thumbnail' },
        { width: 800, height: 600, name: 'medium' },
        { width: 1600, height: 1200, name: 'large' }
      ];

      const results = await generateResponsiveImages(createSampleImage.tiny, sizes);

      expect(results).toHaveLength(3);
      expect(results[0].name).toBe('thumbnail');
      expect(results[1].name).toBe('medium');
      expect(results[2].name).toBe('large');
    });

    test('should handle individual image generation failures gracefully', async () => {
      const sharp = require('sharp');
      const mockToBuffer = jest.fn()
        .mockResolvedValueOnce(Buffer.from('processed'))
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(Buffer.from('processed'));

      sharp.mockReturnValue({
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: mockToBuffer,
        metadata: jest.fn().mockResolvedValue({
          format: 'jpeg',
          width: 800,
          height: 600
        })
      });

      const sizes = [
        { width: 400, height: 300, name: 'thumb1' },
        { width: 800, height: 600, name: 'thumb2' },
        { width: 1600, height: 1200, name: 'thumb3' }
      ];

      const results = await generateResponsiveImages(createSampleImage.tiny, sizes);

      expect(results).toHaveLength(2);
    });
  });

  describe('Image Transformations', () => {
    test('should auto-orient image', async () => {
      const sharp = require('sharp');
      const instance = {
        rotate: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('oriented'))
      };
      sharp.mockReturnValue(instance);

      const result = await autoOrientImage(createSampleImage.tiny);

      expect(instance.rotate).toHaveBeenCalled();
      expect(result).toBe('oriented');
    });

    test('should remove alpha channel', async () => {
      const sharp = require('sharp');
      const instance = {
        flatten: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('flattened'))
      };
      sharp.mockReturnValue(instance);

      const result = await removeAlphaChannel(createSampleImage.tiny);

      expect(instance.flatten).toHaveBeenCalledWith({
        background: { r: 255, g: 255, b: 255 }
      });
      expect(result).toBe('flattened');
    });

    test('should convert image format', async () => {
      const sharp = require('sharp');
      const instance = {
        resize: jest.fn().mockReturnThis(),
        png: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('converted')),
        metadata: jest.fn().mockResolvedValue({
          format: 'png',
          width: 1024,
          height: 1024
        })
      };
      sharp.mockReturnValue(instance);

      const result = await convertImageFormat(createSampleImage.tiny, 'PNG');

      expect(result.metadata.format).toBe('png');
    });

    test('should throw UnsupportedFormatError for unsupported format', async () => {
      await expect(
        convertImageFormat(createSampleImage.tiny, 'TIFF' as any)
      ).rejects.toThrow(UnsupportedFormatError);
    });
  });

  describe('Image Statistics', () => {
    test('should calculate image statistics correctly', () => {
      const processedResult = {
        metadata: {
          width: 1000,
          height: 1000,
          format: 'jpeg',
          hasAlpha: false,
          colorSpace: 'srgb',
          channels: 3
        },
        originalSize: 500000,
        compressedSize: 200000,
        compressionRatio: 60
      };

      const stats = getImageStatistics(processedResult);

      expect(stats.dimensions).toEqual({
        width: 1000,
        height: 1000,
        aspectRatio: 1
      });

      expect(stats.file.compressionRatio).toBe('60.0');
      expect(stats.format.original).toBe('JPEG');
      expect(stats.format.hasTransparency).toBe(false);
    });
  });

  describe('Image Validation', () => {
    test('should validate image size correctly', () => {
      const smallBuffer = Buffer.alloc(1024); // 1KB
      expect(() => validateImageSize(smallBuffer, 1)).not.toThrow();

      const largeBuffer = Buffer.alloc(2 * 1024 * 1024); // 2MB
      expect(() => validateImageSize(largeBuffer, 1)).toThrow(ImageSizeError);
    });

    test('should validate image dimensions', async () => {
      const mockMetadata = {
        width: 100,
        height: 100
      };

      const sharp = require('sharp');
      sharp.mockImplementation(() => ({
        metadata: jest.fn().mockResolvedValue(mockMetadata)
      }));

      await expect(
        validateImageDimensions(createSampleImage.tiny)
      ).resolves.not.toThrow();
    });

    test('should reject images with too small dimensions', async () => {
      const mockMetadata = {
        width: 0,
        height: 0
      };

      const sharp = require('sharp');
      sharp.mockImplementation(() => ({
        metadata: jest.fn().mockResolvedValue(mockMetadata)
      }));

      await expect(
        validateImageDimensions(createSampleImage.tiny)
      ).rejects.toThrow(ImageSizeError);
    });

    test('should handle metadata errors', async () => {
      const sharp = require('sharp');
      sharp.mockImplementation(() => {
        throw new Error('Failed to read metadata');
      });

      await expect(
        validateImageDimensions(createSampleImage.tiny)
      ).rejects.toThrow(ImageProcessingError);
    });
  });

  describe('Image Upload Handler', () => {
    test('should handle base64 image upload', async () => {
      const dataUrl = createValidImageDataUrl('jpeg');
      const mockMetadata = {
        format: 'jpeg',
        width: 100,
        height: 100
      };

      const sharp = require('sharp');
      sharp.mockReturnValue({
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed')),
        metadata: jest.fn().mockResolvedValue(mockMetadata)
      });

      const result = await handleImageUpload(dataUrl);

      expect(result.data).toBeDefined();
      expect(result.base64).toContain('data:image/jpeg;base64,');
    });

    test('should handle HEIC image upload with conversion', async () => {
      const heicConvert = require('heic-convert');
      heicConvert.convert = jest.fn().mockResolvedValue(Buffer.from('converted'));

      const mockMetadata = {
        format: 'jpeg',
        width: 100,
        height: 100
      };

      const sharp = require('sharp');
      const instance = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed')),
        metadata: jest.fn().mockResolvedValue(mockMetadata)
      };
      sharp.mockReturnValue(instance);

      const result = await handleImageUpload(createSampleImage.heic);

      expect(heicConvert.convert).toHaveBeenCalled();
      expect(result.metadata.format).toBe('jpeg');
    });

    test('should reject unsupported formats', async () => {
      await expect(
        handleImageUpload(Buffer.from('invalid'), { format: 'SVG' as any } as any)
      ).rejects.toThrow(UnsupportedFormatError);
    });

    test('should validate size during upload', async () => {
      const largeImage = createValidImageDataUrl('jpeg');

      await expect(
        handleImageUpload(largeImage, {}, 0.001) // 1KB limit
      ).rejects.toThrow(ImageSizeError);
    });

    test('should throw ImageProcessingError for general upload failures', async () => {
      const sharp = require('sharp');
      sharp.mockImplementation(() => {
        throw new Error('Upload failed');
      });

      await expect(
        handleImageUpload(createSampleImage.tiny)
      ).rejects.toThrow(ImageProcessingError);
    });
  });
});
