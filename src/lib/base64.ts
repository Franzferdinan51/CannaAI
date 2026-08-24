/**
 * Minimal base64 utilities for server-side use
 * NO sharp, NO heic-convert - safe for android-arm64 server environments
 */

export class ImageProcessingError extends Error {
  constructor(message: string, public override cause?: Error) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

/**
 * Parse base64 data URL to buffer and mime type
 */
export function base64ToBuffer(base64DataUrl: string): { buffer: Buffer; mimeType: string } {
  try {
    // Do not use a regex over the complete data URI: large camera images can
    // exceed the JavaScript regex engine's stack/argument limits.
    if (typeof base64DataUrl !== 'string' || !base64DataUrl.startsWith('data:')) {
      throw new ImageProcessingError('Invalid base64 data URL format');
    }

    const separator = ';base64,';
    const separatorIndex = base64DataUrl.indexOf(separator);
    if (separatorIndex <= 'data:'.length) {
      throw new ImageProcessingError('Invalid base64 data URL format');
    }

    const mimeType = base64DataUrl.slice('data:'.length, separatorIndex);
    const base64Data = base64DataUrl.slice(separatorIndex + separator.length);
    if (!mimeType || !base64Data) {
      throw new ImageProcessingError('Invalid base64 data URL format');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) {
      throw new ImageProcessingError('Decoded image data is empty');
    }

    return { buffer, mimeType };
  } catch (error) {
    if (error instanceof ImageProcessingError) {
      throw error;
    }
    throw new ImageProcessingError('Failed to parse base64 data URL', error as Error);
  }
}
