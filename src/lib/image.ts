import sharp from 'sharp';

// Supported image formats
export const SUPPORTED_FORMATS = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  WEBP: 'image/webp',
  AVIF: 'image/avif',
  GIF: 'image/gif',
  TIFF: 'image/tiff'
} as const;

export type SupportedFormat = keyof typeof SUPPORTED_FORMATS;

// Image processing options
export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: SupportedFormat;
  fit?: sharp.Fit;
  position?: sharp.Position;
  background?: { r: number; g: number; b: number; alpha: number };
  progressive?: boolean;
  withoutEnlargement?: boolean;
  fastShrinkOnLoad?: boolean;
}

// Image metadata interface
export interface ImageMetadata {
  format: string;
  width: number;
  height: number;
  size: number;
  density?: number;
  hasAlpha?: boolean;
  channels?: number;
  orientation?: number;
  colorSpace?: string;
  isProgressive?: boolean;
}

// Processed image result interface
export interface ProcessedImageResult {
  data: Buffer;
  metadata: ImageMetadata;
  base64: string;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

// Error classes for better error handling
export class ImageProcessingError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

export class UnsupportedFormatError extends ImageProcessingError {
  constructor(format: string) {
    super(`Unsupported image format: ${format}`);
    this.name = 'UnsupportedFormatError';
  }
}

export class ImageSizeError extends ImageProcessingError {
  constructor(message: string) {
    super(message);
    this.name = 'ImageSizeError';
  }
}

/**
 * Validate if a file format is supported
 */
export function isFormatSupported(mimeType: string): boolean {
  return Object.values(SUPPORTED_FORMATS).includes(mimeType as any);
}

/**
 * Get image format from buffer
 */
export async function getImageFormat(buffer: Buffer): Promise<string> {
  try {
    const metadata = await sharp(buffer).metadata();
    return metadata.format || 'unknown';
  } catch (error) {
    throw new ImageProcessingError('Failed to detect image format', error as Error);
  }
}

/**
 * Get comprehensive image metadata
 */
export async function getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  try {
    const metadata = await sharp(buffer).metadata();

    return {
      format: metadata.format || 'unknown',
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: buffer.length,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      channels: metadata.channels,
      orientation: metadata.orientation,
      colorSpace: metadata.space,
      isProgressive: metadata.isProgressive
    };
  } catch (error) {
    throw new ImageProcessingError('Failed to extract image metadata', error as Error);
  }
}

/**
 * Convert buffer to base64 string with proper MIME type
 */
export function bufferToBase64(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Convert base64 data URL to buffer
 */
export function base64ToBuffer(base64DataUrl: string): { buffer: Buffer; mimeType: string } {
  try {
    const matches = base64DataUrl.match(/^data:(.+?);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new ImageProcessingError('Invalid base64 data URL format');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    return { buffer, mimeType };
  } catch (error) {
    throw new ImageProcessingError('Failed to parse base64 data URL', error as Error);
  }
}

/**
 * Validate base64 data URL format
 */
export function validateBase64DataUrl(base64DataUrl: string): boolean {
  try {
    const { mimeType } = base64ToBuffer(base64DataUrl);
    return isFormatSupported(mimeType);
  } catch {
    return false;
  }
}

/**
 * Resize and compress image for optimal performance
 */
export async function processImage(
  inputBuffer: Buffer,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImageResult> {
  const {
    width = 1024,
    height = 1024,
    quality = 85,
    format = 'JPEG',
    fit = 'inside',
    position = 'center',
    background = { r: 255, g: 255, b: 255, alpha: 1 },
    progressive = true,
    withoutEnlargement = true,
    fastShrinkOnLoad = true
  } = options;

  const originalSize = inputBuffer.length;

  try {
    // Create sharp instance with processing pipeline
    let pipeline = sharp(inputBuffer)
      .resize({
        width,
        height,
        fit,
        position,
        background,
        withoutEnlargement,
        fastShrinkOnLoad
      });

    // Apply format-specific optimizations
    switch (format) {
      case 'JPEG':
        pipeline = pipeline.jpeg({
          quality,
          progressive,
          mozjpeg: true,
          trellisQuantisation: true,
          overshootDeringing: true,
          optimiseScans: true
        });
        break;

      case 'PNG':
        pipeline = pipeline.png({
          quality,
          progressive,
          compressionLevel: 9,
          adaptiveFiltering: true,
          forceQuantization: true
        });
        break;

      case 'WEBP':
        pipeline = pipeline.webp({
          quality,
          effort: 6,
          smartSubsample: true,
          preset: 'photo'
        });
        break;

      case 'AVIF':
        pipeline = pipeline.avif({
          quality,
          effort: 6,
          chromaSubsampling: '4:2:0'
        });
        break;

      default:
        throw new UnsupportedFormatError(format);
    }

    // Process the image
    const processedBuffer = await pipeline.toBuffer();
    const metadata = await sharp(processedBuffer).metadata();

    const processedMetadata: ImageMetadata = {
      format: metadata.format || format.toLowerCase(),
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: processedBuffer.length,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      channels: metadata.channels,
      orientation: metadata.orientation,
      colorSpace: metadata.space,
      isProgressive: metadata.isProgressive
    };

    const mimeType = SUPPORTED_FORMATS[format];
    const base64 = bufferToBase64(processedBuffer, mimeType);
    const compressionRatio = ((originalSize - processedBuffer.length) / originalSize) * 100;

    return {
      data: processedBuffer,
      metadata: processedMetadata,
      base64,
      dataUrl: base64,
      originalSize,
      compressedSize: processedBuffer.length,
      compressionRatio
    };

  } catch (error) {
    if (error instanceof ImageProcessingError) {
      throw error;
    }
    throw new ImageProcessingError('Failed to process image', error as Error);
  }
}

/**
 * Process image specifically for vision models (LM Studio, OpenAI Vision, etc.)
 */
export async function processImageForVisionModel(
  inputBuffer: Buffer,
  options: Partial<ImageProcessingOptions> = {}
): Promise<ProcessedImageResult> {
  // Vision model optimal settings
  const visionOptions: ImageProcessingOptions = {
    width: 1024, // Most vision models work best with images under 1024px
    height: 1024,
    quality: 90, // Higher quality for better analysis
    format: 'JPEG', // Most compatible format
    fit: 'inside',
    withoutEnlargement: true,
    fastShrinkOnLoad: false, // Better quality for analysis
    progressive: false, // Some models have issues with progressive JPEGs
    ...options
  };

  return processImage(inputBuffer, visionOptions);
}

/**
 * Process image for web display (thumbnails, previews)
 */
export async function processImageForWeb(
  inputBuffer: Buffer,
  options: Partial<ImageProcessingOptions> = {}
): Promise<ProcessedImageResult> {
  // Web optimal settings
  const webOptions: ImageProcessingOptions = {
    width: 800,
    height: 600,
    quality: 75,
    format: 'WEBP', // Modern format for web
    fit: 'inside',
    progressive: true,
    fastShrinkOnLoad: true,
    ...options
  };

  return processImage(inputBuffer, webOptions);
}

/**
 * Generate multiple sizes of an image (responsive images)
 */
export async function generateResponsiveImages(
  inputBuffer: Buffer,
  sizes: Array<{ width: number; height: number; name: string }>,
  baseOptions: Partial<ImageProcessingOptions> = {}
): Promise<Array<{ name: string; result: ProcessedImageResult }>> {
  const results = [];

  for (const size of sizes) {
    try {
      const result = await processImage(inputBuffer, {
        ...baseOptions,
        width: size.width,
        height: size.height
      });

      results.push({
        name: size.name,
        result
      });
    } catch (error) {
      console.warn(`Failed to generate image size ${size.name}:`, error);
      // Continue with other sizes even if one fails
    }
  }

  return results;
}

/**
 * Auto-orient image based on EXIF data
 */
export async function autoOrientImage(inputBuffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(inputBuffer).rotate().toBuffer();
  } catch (error) {
    throw new ImageProcessingError('Failed to auto-orient image', error as Error);
  }
}

/**
 * Remove alpha channel (convert to RGB)
 */
export async function removeAlphaChannel(
  inputBuffer: Buffer,
  background: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 }
): Promise<Buffer> {
  try {
    return await sharp(inputBuffer)
      .flatten({ background })
      .toBuffer();
  } catch (error) {
    throw new ImageProcessingError('Failed to remove alpha channel', error as Error);
  }
}

/**
 * Convert image to different format
 */
export async function convertImageFormat(
  inputBuffer: Buffer,
  targetFormat: SupportedFormat,
  options: Partial<ImageProcessingOptions> = {}
): Promise<ProcessedImageResult> {
  return processImage(inputBuffer, {
    ...options,
    format: targetFormat
  });
}

/**
 * Get image statistics for analysis
 */
export function getImageStatistics(processedResult: ProcessedImageResult) {
  const { metadata, originalSize, compressedSize, compressionRatio } = processedResult;

  return {
    dimensions: {
      width: metadata.width,
      height: metadata.height,
      aspectRatio: metadata.width / metadata.height
    },
    file: {
      originalSize: formatBytes(originalSize),
      compressedSize: formatBytes(compressedSize),
      compressionRatio: compressionRatio.toFixed(1),
      spaceSaved: formatBytes(originalSize - compressedSize)
    },
    format: {
      original: metadata.format.toUpperCase(),
      hasTransparency: metadata.hasAlpha,
      colorSpace: metadata.colorSpace,
      channels: metadata.channels
    }
  };
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate image file size
 */
export function validateImageSize(buffer: Buffer, maxSizeInMB: number = 10): void {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

  if (buffer.length > maxSizeInBytes) {
    throw new ImageSizeError(
      `Image size (${formatBytes(buffer.length)}) exceeds maximum allowed size (${maxSizeInMB}MB)`
    );
  }
}

/**
 * Check if image has valid dimensions
 */
export function validateImageDimensions(buffer: Buffer, minWidth: number = 1, minHeight: number = 1): void {
  try {
    const metadata = sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new ImageProcessingError('Unable to determine image dimensions');
    }

    if (metadata.width < minWidth || metadata.height < minHeight) {
      throw new ImageSizeError(
        `Image dimensions (${metadata.width}x${metadata.height}) are too small. Minimum: ${minWidth}x${minHeight}`
      );
    }
  } catch (error) {
    if (error instanceof ImageProcessingError) {
      throw error;
    }
    throw new ImageProcessingError('Failed to validate image dimensions', error as Error);
  }
}

/**
 * Main function to handle image upload and processing
 */
export async function handleImageUpload(
  imageFile: Buffer | string,
  options: Partial<ImageProcessingOptions> = {},
  maxSizeInMB: number = 10
): Promise<ProcessedImageResult> {
  try {
    let inputBuffer: Buffer;
    let mimeType: string;

    // Handle different input types
    if (typeof imageFile === 'string') {
      // Assume base64 data URL
      const { buffer, mimeType: detectedMimeType } = base64ToBuffer(imageFile);
      inputBuffer = buffer;
      mimeType = detectedMimeType;
    } else {
      // Assume buffer
      inputBuffer = imageFile;
      mimeType = await getImageFormat(inputBuffer);
    }

    // Validate format
    if (!isFormatSupported(mimeType)) {
      throw new UnsupportedFormatError(mimeType);
    }

    // Validate size
    validateImageSize(inputBuffer, maxSizeInMB);

    // Validate dimensions
    validateImageDimensions(inputBuffer);

    // Auto-orient image based on EXIF
    const orientedBuffer = await autoOrientImage(inputBuffer);

    // Process the image
    return await processImage(orientedBuffer, options);

  } catch (error) {
    if (error instanceof ImageProcessingError) {
      throw error;
    }
    throw new ImageProcessingError('Failed to handle image upload', error as Error);
  }
}