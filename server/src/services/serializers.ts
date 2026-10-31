import type { MediaAsset } from '@prisma/client';
import { prisma } from '../db.js';
import { mediaUrl } from './media.js';

export interface MediaDTO {
  id: string;
  url: string;
  kind: MediaAsset['kind'];
  mimeType: string;
  alt: string;
  width: number | null;
  height: number | null;
  size: number;
  displayLabel: string;
  originalName: string;
}

export async function toMediaDTO(asset: MediaAsset | null | undefined): Promise<MediaDTO | null> {
  if (!asset) return null;
  return {
    id: asset.id,
    url: await mediaUrl(asset),
    kind: asset.kind,
    mimeType: asset.mimeType,
    alt: asset.alt,
    width: asset.width,
    height: asset.height,
    size: asset.size,
    displayLabel: asset.displayLabel,
    originalName: asset.originalName,
  };
}

/** Admin view of an asset — adds internal metadata (tags, public flag) to the DTO. */
export interface AdminMediaDTO extends MediaDTO {
  tags: string[];
  isPublic: boolean;
}

export async function toAdminMediaDTO(asset: MediaAsset | null | undefined): Promise<AdminMediaDTO | null> {
  const dto = await toMediaDTO(asset);
  if (!dto || !asset) return null;
  return { ...dto, tags: asset.tags, isPublic: asset.isPublic };
}

/** Build a lookup of mediaId → DTO for a list of assets in one pass. */
export async function mediaDtoMap(assets: MediaAsset[]): Promise<Map<string, MediaDTO>> {
  const entries = await Promise.all(
    assets.map(async (asset) => [asset.id, await toMediaDTO(asset)] as const),
  );
  const map = new Map<string, MediaDTO>();
  for (const [id, dto] of entries) {
    if (dto) map.set(id, dto);
  }
  return map;
}

/** Collect all media assets referenced by an arbitrary graph of ids. */
export async function loadMediaByIds(ids: Array<string | null | undefined>): Promise<Map<string, MediaDTO>> {
  const clean = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (!clean.length) return new Map();
  const assets = await prisma.mediaAsset.findMany({ where: { id: { in: clean } } });
  return mediaDtoMap(assets);
}
