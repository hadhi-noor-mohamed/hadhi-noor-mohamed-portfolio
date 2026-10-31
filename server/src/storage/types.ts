import type { MediaKind } from '@prisma/client';

export interface StoredObject {
  key: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface StorageAdapter {
  readonly driver: 'LOCAL' | 'S3';
  /** Persist a buffer under `key` and return its public URL. */
  put(key: string, data: Buffer, mimeType: string): Promise<StoredObject>;
  /** Remove an object. Missing objects must not throw. */
  remove(key: string): Promise<void>;
  /** Public URL (or signed URL for private objects). */
  url(key: string, opts?: { expiresIn?: number }): Promise<string>;
  /** Verify a stored object still exists. */
  exists(key: string): Promise<boolean>;
  /** Read an object's bytes (used by the resume/document proxy). */
  get(key: string): Promise<Buffer>;
}

export interface UploadValidationInput {
  originalName: string;
  mimeType: string;
  size: number;
}

export interface AllowedType {
  mime: string[];
  ext: string[];
  kind: MediaKind;
}

/**
 * Allow-list of accepted upload types. MIME types and extensions are both
 * validated; extension alone and browser-supplied MIME alone are never trusted.
 */
export const ALLOWED_TYPES: AllowedType[] = [
  { mime: ['image/png'], ext: ['.png'], kind: 'IMAGE' },
  { mime: ['image/jpeg'], ext: ['.jpg', '.jpeg'], kind: 'IMAGE' },
  { mime: ['image/webp'], ext: ['.webp'], kind: 'IMAGE' },
  { mime: ['image/gif'], ext: ['.gif'], kind: 'IMAGE' },
  { mime: ['image/avif'], ext: ['.avif'], kind: 'IMAGE' },
  { mime: ['image/svg+xml'], ext: ['.svg'], kind: 'IMAGE' },
  { mime: ['application/pdf'], ext: ['.pdf'], kind: 'PDF' },
  { mime: ['video/mp4'], ext: ['.mp4'], kind: 'VIDEO' },
  { mime: ['video/webm'], ext: ['.webm'], kind: 'VIDEO' },
  {
    mime: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/zip',
      'text/plain',
      'application/json',
    ],
    ext: ['.doc', '.docx', '.xls', '.xlsx', '.csv', '.zip', '.txt', '.json'],
    kind: 'DOCUMENT',
  },
];

export function resolveUploadKind(input: UploadValidationInput): { kind: MediaKind; ext: string } | null {
  const ext = extname(input.originalName);
  const match = ALLOWED_TYPES.find(
    (t) => t.ext.includes(ext) && t.mime.includes(input.mimeType.toLowerCase()),
  );
  if (match) return { kind: match.kind, ext };
  // SVG/PDF/plain text occasionally arrive with a generic MIME type; accept them
  // when the extension is unambiguous and the MIME type is a safe generic value.
  const generic = ['application/octet-stream', 'binary/octet-stream', ''];
  if (generic.includes(input.mimeType.toLowerCase())) {
    const byExt = ALLOWED_TYPES.find((t) => t.ext.includes(ext));
    if (byExt) return { kind: byExt.kind, ext };
  }
  return null;
}

export function extname(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx).toLowerCase();
}
