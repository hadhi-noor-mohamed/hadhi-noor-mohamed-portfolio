import path from 'node:path';
import type { MediaAsset, MediaKind, Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { ApiError } from '../lib/errors.js';
import { randomToken } from '../lib/crypto.js';
import { sha256 } from '../lib/crypto.js';
import { storage } from '../storage/index.js';
import { resolveUploadKind } from '../storage/types.js';
import { sniffContentType } from '../middleware/upload.js';

/**
 * Reject SVG payloads that contain active content. Uploaded SVG is served from
 * the same origin, so it is treated as untrusted markup.
 */
const SVG_DANGEROUS = [/<script/i, /<foreignObject/i, /javascript:/i, /\son\w+\s*=/i, /<!ENTITY/i, /<iframe/i, /<use[^>]+xlink:href=["']?http/i];

export function assertSafeSvg(buffer: Buffer): void {
  const text = buffer.toString('utf8');
  for (const pattern of SVG_DANGEROUS) {
    if (pattern.test(text)) {
      throw ApiError.badRequest('This SVG contains active content and was rejected for security reasons');
    }
  }
}

/** Best-effort intrinsic dimension reader for common image formats. */
export function readImageSize(buffer: Buffer, mimeType: string): { width?: number; height?: number } {
  try {
    if (mimeType === 'image/png' && buffer.length > 24) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (mimeType === 'image/gif' && buffer.length > 10) {
      return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
    }
    if (mimeType === 'image/jpeg') {
      let offset = 2;
      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = buffer[offset + 1];
        const length = buffer.readUInt16BE(offset + 2);
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
        }
        offset += 2 + length;
      }
    }
    if (mimeType === 'image/webp' && buffer.length > 30) {
      if (buffer.slice(12, 16).toString('ascii') === 'VP8X') {
        const w = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
        const h = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
        return { width: w, height: h };
      }
    }
  } catch {
    /* dimension detection is best-effort only */
  }
  return {};
}

function buildStorageKey(kind: MediaKind, ext: string): string {
  const now = new Date();
  const folder = kind === 'IMAGE' ? 'images' : kind === 'PDF' ? 'documents' : kind === 'VIDEO' ? 'videos' : 'files';
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${folder}/${yyyy}/${mm}/${Date.now()}-${randomToken(8)}${ext}`;
}

export interface StoreMediaInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  uploadedById?: string;
  displayLabel?: string;
  alt?: string;
  tags?: string[];
  isPublic?: boolean;
}

/** Validate, store and register an uploaded file. */
export async function storeMedia(input: StoreMediaInput): Promise<MediaAsset> {
  const safeName = path.basename(input.originalName).slice(0, 200);
  const resolved = resolveUploadKind({
    originalName: safeName,
    mimeType: input.mimeType,
    size: input.buffer.byteLength,
  });
  if (!resolved) {
    throw ApiError.unsupportedMedia(`Unsupported file type: ${input.mimeType || 'unknown'}`);
  }

  const actualMime = sniffContentType(input.buffer, input.mimeType, safeName);
  if (actualMime === 'image/svg+xml') {
    assertSafeSvg(input.buffer);
  }

  const key = buildStorageKey(resolved.kind, resolved.ext);
  const adapter = storage();
  await adapter.put(key, input.buffer, actualMime);

  const dims = resolved.kind === 'IMAGE' ? readImageSize(input.buffer, actualMime) : {};

  return prisma.mediaAsset.create({
    data: {
      storageKey: key,
      storageDriver: adapter.driver,
      kind: resolved.kind,
      originalName: safeName,
      displayLabel: input.displayLabel?.trim() || safeName,
      mimeType: actualMime,
      size: input.buffer.byteLength,
      width: dims.width,
      height: dims.height,
      alt: input.alt ?? '',
      tags: input.tags ?? [],
      isPublic: input.isPublic ?? true,
      checksum: sha256(input.buffer.toString('binary')).slice(0, 32),
      uploadedById: input.uploadedById,
    },
  });
}

export async function mediaUrl(asset: Pick<MediaAsset, 'storageKey' | 'isPublic'>): Promise<string> {
  return storage().url(asset.storageKey, asset.isPublic ? undefined : { expiresIn: 600 });
}

export interface MediaWithUsage extends MediaAsset {
  url: string;
  usages: string[];
}

/** Enumerate every place a media asset is referenced, to protect deletions. */
export async function findMediaUsages(mediaId: string): Promise<string[]> {
  const usages: string[] = [];
  const checks: Array<[string, Promise<number>]> = [
    ['profile.profileImage', prisma.profile.count({ where: { profileImageId: mediaId } })],
    ['profile.heroImage', prisma.profile.count({ where: { heroImageId: mediaId } })],
    ['project.cover', prisma.project.count({ where: { coverMediaId: mediaId } })],
    ['project.report', prisma.project.count({ where: { reportMediaId: mediaId } })],
    ['project.images', prisma.projectImage.count({ where: { mediaId } })],
    ['project.documents', prisma.projectDocument.count({ where: { mediaId } })],
    ['skill.logo', prisma.skill.count({ where: { logoMediaId: mediaId } })],
    ['timeline.logo', prisma.timelineEntry.count({ where: { logoMediaId: mediaId } })],
    ['timeline.document', prisma.timelineEntry.count({ where: { documentMediaId: mediaId } })],
    ['certification.image', prisma.certification.count({ where: { imageMediaId: mediaId } })],
    ['certification.pdf', prisma.certification.count({ where: { pdfMediaId: mediaId } })],
    ['achievement.image', prisma.achievement.count({ where: { imageMediaId: mediaId } })],
    ['achievement.pdf', prisma.achievement.count({ where: { pdfMediaId: mediaId } })],
    ['journey.cover', prisma.journeyEntry.count({ where: { coverMediaId: mediaId } })],
    ['journey.video', prisma.journeyEntry.count({ where: { videoMediaId: mediaId } })],
    ['blog.cover', prisma.blogPost.count({ where: { coverMediaId: mediaId } })],
    ['resume.version', prisma.resumeVersion.count({ where: { mediaId } })],
  ];
  const results = await Promise.all(checks.map(async ([label, p]) => [label, await p] as const));
  for (const [label, count] of results) {
    if (count > 0) usages.push(label);
  }
  return usages;
}

export async function serializeMedia(asset: MediaAsset): Promise<MediaWithUsage> {
  return {
    ...asset,
    url: await mediaUrl(asset),
    usages: [],
  };
}

export const mediaInclude: Prisma.MediaAssetSelect = {
  id: true,
  storageKey: true,
  storageDriver: true,
  kind: true,
  originalName: true,
  displayLabel: true,
  mimeType: true,
  size: true,
  width: true,
  height: true,
  alt: true,
  tags: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
};
