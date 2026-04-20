/**
 * Sharp-free image processing for server environments (android-arm64, etc.)
 * Provides only what's needed for vision model analysis
 * Uses pure JavaScript where possible, falls back gracefully
 */

import { ImageProcessingError } from './base64';

export { ImageProcessingError };

export interface ProcessedImageResult {
  data: Buffer;
  metadata: {
    format: string;
    width: number;
    height: number;
    size: number;
  };
  base64: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Simple base64 wrapper for images that are already in the right format
 * For JPEG/PNG that don't need processing
 */
export function processImageForVisionModel(
  inputBuffer: Buffer,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'JPEG' | 'PNG' | 'WEBP';
  } = {}
): ProcessedImageResult {
  const { quality = 90, format = 'JPEG' } = options;

  // If it's already JPEG/PNG and small enough, return as-is
  // Otherwise just wrap it
  const base64 = inputBuffer.toString('base64');
  const mimeType = format.toLowerCase() === 'png' ? 'image/png' : 'image/jpeg';
  const dataUrl = `data:${mimeType};base64,${base64}`;

  return {
    data: inputBuffer,
    metadata: {
      format: format.toLowerCase(),
      width: 0,
      height: 0,
      size: inputBuffer.length
    },
    base64: dataUrl,
    originalSize: inputBuffer.length,
    compressedSize: inputBuffer.length,
    compressionRatio: 0
  };
}

/**
 * Get image metadata without sharp - limited but works on all platforms
 */
export async function getImageMetadata(buffer: Buffer): Promise<{ width: number; height: number; format: string }> {
  // Basic PNG header parsing
  if (buffer[0] === 0x89 && buffer[1] === 0x50) { // PNG
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height, format: 'png' };
  }
  // Basic JPEG header parsing
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    // JPEG - we'd need to parse EXIF to get dimensions
    // For now return a placeholder
    return { width: 0, height: 0, format: 'jpeg' };
  }
  return { width: 0, height: 0, format: 'unknown' };
}
