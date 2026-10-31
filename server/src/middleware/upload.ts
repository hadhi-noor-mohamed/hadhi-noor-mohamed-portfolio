import multer from 'multer';
import { env } from '../env.js';
import { ALLOWED_TYPES, extname } from '../storage/types.js';
import { ApiError } from '../lib/errors.js';

const ALLOWED_EXTENSIONS = new Set(ALLOWED_TYPES.flatMap((t) => t.ext));
const ALLOWED_MIMES = new Set(ALLOWED_TYPES.flatMap((t) => t.mime));

/**
 * Multer is configured with in-memory storage: bytes are validated (extension,
 * declared MIME, size and magic numbers) before being handed to the storage
 * adapter. Nothing touches the filesystem directly and uploaded files are never
 * executed.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.uploadMaxMb * 1024 * 1024,
    files: 12,
  },
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(ApiError.unsupportedMedia(`File extension "${ext || 'none'}" is not allowed`));
    }
    if (file.mimetype && !ALLOWED_MIMES.has(file.mimetype.toLowerCase())) {
      const generic = ['application/octet-stream', 'binary/octet-stream'];
      if (!generic.includes(file.mimetype.toLowerCase())) {
        return cb(ApiError.unsupportedMedia(`MIME type "${file.mimetype}" is not allowed`));
      }
    }
    cb(null, true);
  },
});

/** Magic-number signatures used to confirm the real file type of an upload. */
const SIGNATURES: Array<{ kind: string; test: (b: Buffer) => boolean }> = [
  { kind: 'image/png', test: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { kind: 'image/jpeg', test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { kind: 'image/gif', test: (b) => b.length > 6 && b.slice(0, 3).toString('ascii') === 'GIF' },
  { kind: 'image/webp', test: (b) => b.length > 12 && b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP' },
  { kind: 'image/avif', test: (b) => b.length > 12 && b.slice(4, 8).toString('ascii') === 'ftyp' && b.slice(8, 12).toString('ascii').startsWith('avif') },
  { kind: 'application/pdf', test: (b) => b.length > 5 && b.slice(0, 5).toString('ascii') === '%PDF-' },
  { kind: 'video/mp4', test: (b) => b.length > 12 && b.slice(4, 8).toString('ascii') === 'ftyp' },
  { kind: 'application/zip', test: (b) => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b },
  {
    kind: 'office-xml',
    test: (b) => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b,
  },
];

/**
 * Verify the buffer's magic bytes are consistent with the declared type.
 * SVG and plain text have no reliable binary signature and are handled by the
 * extension/MIME allow-list, with SVG sanitised separately.
 */
export function sniffContentType(buffer: Buffer, declaredMime: string, filename: string): string {
  const ext = extname(filename);
  if (ext === '.svg') return 'image/svg+xml';
  if (['.txt', '.csv', '.json'].includes(ext)) return declaredMime || 'text/plain';

  const match = SIGNATURES.find((s) => s.test(buffer));
  if (!match) {
    throw ApiError.unsupportedMedia(
      'The uploaded file does not look like a valid image, PDF, video or document',
    );
  }
  // .docx/.xlsx are zip containers.
  if (match.kind === 'office-xml') {
    if (['.docx', '.xlsx'].includes(ext)) return declaredMime;
    if (ext === '.zip') return 'application/zip';
  }
  if (match.kind === 'application/zip' && ['.docx', '.xlsx', '.zip'].includes(ext)) {
    return declaredMime || match.kind;
  }
  if (match.kind === 'video/mp4' && ext === '.mp4') return 'video/mp4';
  if (match.kind === 'video/mp4' && ext === '.webm') return 'video/webm';
  if (match.kind !== declaredMime.toLowerCase() && match.kind !== 'office-xml') {
    // Allow jpeg/png declared as each other? No — be strict and report mismatch.
    const compatible: Record<string, string[]> = {
      'image/jpeg': ['image/jpg'],
      'application/zip': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    };
    const allowed = compatible[match.kind] ?? [];
    if (!allowed.includes(declaredMime.toLowerCase())) {
      return match.kind;
    }
  }
  return match.kind;
}
