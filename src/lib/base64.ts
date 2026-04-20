/**
 * Minimal base64 utilities for server-side use
 * NO sharp, NO heic-convert - safe for android-arm64 server environments
 */

export class ImageProcessingError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

/**
 * Parse base64 data URL to buffer and mime type
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
