export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
export const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_SIZE;
export const MAX_IMAGE_BYTES = MAX_ATTACHMENT_SIZE;

const ALLOWED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/rtf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export function validateAttachment(file: Pick<File, 'name' | 'size' | 'type'>, kind: 'image' | 'file') {
  const maxBytes = kind === 'image' ? MAX_IMAGE_BYTES : MAX_ATTACHMENT_BYTES;
  if (file.size > maxBytes) {
    return { valid: false, error: `File size must be less than ${maxBytes / 1024 / 1024}MB` };
  }
  const validType = kind === 'image'
    ? file.type.startsWith('image/')
    : ALLOWED_DOCUMENT_TYPES.has(file.type);
  if (!validType) return { valid: false, error: 'This file type is not supported' };
  return { valid: true as const };
}

export function getAttachmentValidationError(file: Pick<File, 'size' | 'type'>): string | undefined {
  if (file.size > MAX_ATTACHMENT_SIZE) return 'Files must be 10 MB or smaller.';
  if (!ALLOWED_DOCUMENT_TYPES.has(file.type) && !file.type.startsWith('image/')) {
    return 'This file type is not supported.';
  }
  return undefined;
}

export function createFileAttachment(file: Pick<File, 'name' | 'size' | 'type'>, data: string) {
  return {
    id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name: file.name,
    type: file.type,
    size: file.size,
    url: data,
    data,
    uploadedAt: new Date(),
    analysis: { isImage: file.type.startsWith('image/'), analyzed: false },
  };
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read attachment'));
    reader.readAsDataURL(file);
  });
}
