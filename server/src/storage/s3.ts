import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../env.js';
import type { StorageAdapter, StoredObject } from './types.js';

/**
 * S3 compatible storage driver.
 *
 * Works with AWS S3, Cloudflare R2, Backblaze B2, DigitalOcean Spaces, MinIO
 * and any other S3 API compatible service. Only `S3_*` environment variables
 * are required — no other code changes.
 */
export class S3StorageAdapter implements StorageAdapter {
  readonly driver = 'S3' as const;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = env.s3.bucket;
    this.client = new S3Client({
      region: env.s3.region || 'auto',
      ...(env.s3.endpoint ? { endpoint: env.s3.endpoint } : {}),
      forcePathStyle: env.s3.forcePathStyle,
      credentials: {
        accessKeyId: env.s3.accessKeyId,
        secretAccessKey: env.s3.secretAccessKey,
      },
    });
  }

  async put(key: string, data: Buffer, mimeType: string): Promise<StoredObject> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: mimeType,
        // Objects are immutable (keys are content-addressed) so caching is safe.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return { key, url: await this.url(key), size: data.byteLength, mimeType };
  }

  async remove(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async url(key: string, opts?: { expiresIn?: number }): Promise<string> {
    if (env.s3.publicBaseUrl) {
      return `${env.s3.publicBaseUrl.replace(/\/$/, '')}/${key}`;
    }
    // No public CDN configured → hand out an expiring signed URL.
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: opts?.expiresIn ?? env.s3.signedUrlTtl },
    );
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!result.Body) throw new Error(`Object ${key} has no body`);
    const bytes = await result.Body.transformToByteArray();
    return Buffer.from(bytes);
  }
}
