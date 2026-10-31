import { env, assertS3Configured } from '../env.js';
import { LocalStorageAdapter } from './local.js';
import { S3StorageAdapter } from './s3.js';
import type { StorageAdapter } from './types.js';

let adapter: StorageAdapter | null = null;

/** Lazily construct the configured storage adapter (single instance). */
export function storage(): StorageAdapter {
  if (adapter) return adapter;
  if (env.storageDriver === 's3') {
    assertS3Configured();
    adapter = new S3StorageAdapter();
  } else {
    adapter = new LocalStorageAdapter();
  }
  return adapter;
}

/** Reset the cached adapter (used by tests). */
export function resetStorage(): void {
  adapter = null;
}

export type { StorageAdapter, StoredObject } from './types.js';
export {
  ALLOWED_TYPES,
  extname,
  resolveUploadKind,
  type AllowedType,
  type UploadValidationInput,
} from './types.js';
