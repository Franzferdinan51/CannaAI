/**
 * Image processing for server environments
 * Uses sharp when available for real resize/compress
 * Falls back to pure JS for android-arm64
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

// Track if sharp is available
let sharpAvailable: boolean | null = null;

function isSharpAvailable(): boolean {
  if (sharpAvailable === null) {
    try {
      require('sharp');
      sharpAvailable = true;
    } catch {
      sharpAvailable = false;
    }
  }
  return sharpAvailable;
}

/**
 * Process image for vision model - resize + compress using sharp
 * Falls back to no-op if sharp unavailable
 */
export async function processImageForVisionModel(
  inputBuffer: Buffer,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'JPEG' | 'PNG' | 'WEBP';
  } = {}
): Promise<ProcessedImageResult> {
  const { quality = 80, format = 'JPEG', width = 1024, height = 1024 } = options;

  const originalSize = inputBuffer.length;

  // Use sharp if available (macOS/Linux)
  if (isSharpAvailable()) {
    try {
      const sharp = require('sharp');
      console.log('[image-simple] Using sharp. Input size:', originalSize);

      // First produce the processed JPEG buffer
      const processed = await sharp(inputBuffer)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality, mozjpeg: false })
        .toBuffer();

      // Verify JPEG starts with SOI+APP0 (JFIF), not SOI+DQT
      // MiniMax's decoder requires JFIF-compliant JPEGs
      const hasJFIF =
        processed.length >= 4 &&
        processed[0] === 0xFF &&
        processed[1] === 0xD8 &&
        processed[2] === 0xFF &&
        processed[3] === 0xE0;
      console.log('[image-simple] JPEG check: size=' + processed.length + ' starts=' + processed.slice(0, 8).toString('hex') + ' hasJFIF=' + hasJFIF);

      if (!hasJFIF) {
        console.warn('[image-simple] Non-JFIF JPEG detected. Converting to PNG then back to JPEG to ensure compatibility...');
        // Convert to PNG then back to JPEG to get clean JFIF structure
        const pngBuf = await sharp(inputBuffer)
          .resize(width, height, { fit: 'inside', withoutEnlargement: true })
          .png()
          .toBuffer();
        const cleanJpeg = await sharp(pngBuf)
          .jpeg({ quality, mozjpeg: false })
          .toBuffer();
        console.warn('[image-simple] PNG intermediate:', pngBuf.length, '-> clean JPEG:', cleanJpeg.length);
        console.warn('[image-simple] Clean JPEG starts:', cleanJpeg.slice(0, 8).toString('hex'));
        const finalBuf = cleanJpeg;
        return {
          data: finalBuf,
          metadata: { format: 'jpeg', width: finalBuf.length, height: 0, size: finalBuf.length },
          base64: `data:image/jpeg;base64,${finalBuf.toString('base64')}`,
          originalSize,
          compressedSize: finalBuf.length,
          compressionRatio: ((originalSize - finalBuf.length) / originalSize) * 100,
        };
      }

      return {
        data: processed,
        metadata: {
          format: 'jpeg',
          width: processed.length,
          height: 0,
          size: processed.length,
        },
        base64: `data:image/jpeg;base64,${processed.toString('base64')}`,
        originalSize,
        compressedSize: processed.length,
        compressionRatio: ((originalSize - processed.length) / originalSize) * 100,
      };
    } catch (err) {
      console.warn('[image-simple] Sharp processing failed, falling back:', err);
    }
  }

  // Fallback: return as-is (no resize)
  const base64 = inputBuffer.toString('base64');
  return {
    data: inputBuffer,
    metadata: { format: 'jpeg', width: 0, height: 0, size: inputBuffer.length },
    base64: `data:image/jpeg;base64,${base64}`,
    originalSize,
    compressedSize: originalSize,
    compressionRatio: 0,
  };
}

/**
 * Get image metadata using sharp
 */
export async function getImageMetadata(buffer: Buffer): Promise<{ width: number; height: number; format: string }> {
  if (isSharpAvailable()) {
    try {
      const sharp = require('sharp');
      const meta = await sharp(buffer).metadata();
      return {
        width: meta.width || 0,
        height: meta.height || 0,
        format: meta.format || 'unknown',
      };
    } catch {
      // Fall through to basic parsing
    }
  }

  // Basic header parsing fallback
  if (buffer[0] === 0x89 && buffer[1] === 0x50) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), format: 'png' };
  }
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    return { width: 0, height: 0, format: 'jpeg' };
  }
  return { width: 0, height: 0, format: 'unknown' };
}
