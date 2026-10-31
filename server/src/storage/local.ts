import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../env.js';
import type { StorageAdapter, StoredObject } from './types.js';
import { ApiError } from '../lib/errors.js';

/**
 * Local filesystem storage driver.
 *
 * Suitable for development and single-instance deployments with a persistent
 * volume mounted at `LOCAL_STORAGE_DIR`. In production prefer an S3 compatible
 * driver because container filesystems are usually ephemeral.
 */
export class LocalStorageAdapter implements StorageAdapter {
  readonly driver = 'LOCAL' as const;
  private readonly root: string;

  constructor() {
    this.root = path.resolve(process.cwd(), env.localStorageDir);
  }

  private resolveKey(key: string): string {
    const normalized = path.normalize(key).replace(/^([/\\])+/, '');
    const full = path.resolve(this.root, normalized);
    // Prevent path traversal outside the storage root.
    if (!full.startsWith(this.root)) {
      throw ApiError.badRequest('Invalid storage key');
    }
    return full;
  }

  async put(key: string, data: Buffer, _mimeType: string): Promise<StoredObject> {
    const full = this.resolveKey(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    return {
      key,
      url: await this.url(key),
      size: data.byteLength,
      mimeType: _mimeType,
    };
  }

  async remove(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolveKey(key));
    } catch {
      // Missing file is not an error for deletion.
    }
  }

  async url(key: string): Promise<string> {
    const base = env.localStoragePublicUrl.replace(/\/$/, '');
    return `${base}/uploads/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.resolveKey(key));
  }
}
