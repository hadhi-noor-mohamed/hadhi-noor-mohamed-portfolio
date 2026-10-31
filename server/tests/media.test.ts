import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { dataOf, errorOf, login, resetDatabase, type TestAgent } from './helpers.js';

let agent: TestAgent;
let csrf: string;

/** A minimal buffer whose PNG magic bytes and IHDR dimensions are valid. */
function tinyPng(): Buffer {
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from([0x00, 0x00, 0x00, 0x0d]),
    Buffer.from('IHDR', 'ascii'),
    Buffer.from([0x00, 0x00, 0x00, 0x02]), // width = 2
    Buffer.from([0x00, 0x00, 0x00, 0x03]), // height = 3
    Buffer.from([0x08, 0x06, 0x00, 0x00, 0x00]),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
  ]);
}

beforeAll(async () => {
  await resetDatabase();
  ({ agent, csrf } = await login());
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('media library', () => {
  let mediaId: string;

  it('uploads a valid image and returns internal metadata to admins', async () => {
    const response = await agent
      .post('/api/admin/media')
      .set('x-csrf-token', csrf)
      .field('displayLabel', 'Profile photo')
      .field('tags', 'profile,hero')
      .attach('files', tinyPng(), { filename: 'photo.png', contentType: 'image/png' });

    expect(response.status).toBe(201);
    const [asset] = dataOf<Array<{ id: string; width: number; height: number; tags: string[]; isPublic: boolean; url: string }>>(response);
    expect(asset.width).toBe(2);
    expect(asset.height).toBe(3);
    expect(asset.tags).toEqual(['profile', 'hero']);
    expect(asset.isPublic).toBe(true);
    expect(asset.url).toContain('/uploads/');
    mediaId = asset.id;
  });

  it('rejects a file whose bytes do not match its declared type', async () => {
    const response = await agent
      .post('/api/admin/media')
      .set('x-csrf-token', csrf)
      .attach('files', Buffer.from('this is definitely not a png'), { filename: 'fake.png', contentType: 'image/png' });
    expect(response.status).toBe(415);
    expect(errorOf(response).code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects a disallowed extension', async () => {
    const response = await agent
      .post('/api/admin/media')
      .set('x-csrf-token', csrf)
      .attach('files', Buffer.from('MZ'), { filename: 'malware.exe', contentType: 'application/octet-stream' });
    expect(response.status).toBe(415);
    expect(errorOf(response).code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('updates tags and the public flag', async () => {
    const response = await agent
      .patch(`/api/admin/media/${mediaId}`)
      .set('x-csrf-token', csrf)
      .send({ alt: 'Portrait of Hadhi', tags: ['profile'], isPublic: false });
    expect(response.status).toBe(200);
    expect(response.body.data.alt).toBe('Portrait of Hadhi');
    expect(response.body.data.tags).toEqual(['profile']);
    expect(response.body.data.isPublic).toBe(false);
  });

  it('lists distinct tags', async () => {
    const response = await agent.get('/api/admin/media/tags');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(['profile']);
  });

  it('lists media with pagination metadata', async () => {
    const response = await agent.get('/api/admin/media');
    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBeGreaterThanOrEqual(1);
    expect(response.body.data[0]).toHaveProperty('tags');
    expect(response.body.data[0]).toHaveProperty('isPublic');
  });

  it('refuses to expose a private asset on a published project', async () => {
    // Put the private asset on a published project via the admin API...
    const project = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', csrf)
      .send({ title: 'Media Cover Project', coverMediaId: mediaId, state: 'PUBLISHED' });
    expect(project.status).toBe(201);

    // ...the admin view reports the usage...
    const usage = await agent.get(`/api/admin/media/${mediaId}/usage`);
    expect(usage.body.data.usages).toContain('project.cover');

    // ...but the public DTO must not leak internal fields.
    const response = await agent.get('/api/public/projects/media-cover-project');
    expect(response.status).toBe(200);
    const cover = dataOf<{ cover: Record<string, unknown> | null }>(response).cover;
    expect(cover).not.toBeNull();
    expect(cover).not.toHaveProperty('tags');
    expect(cover).not.toHaveProperty('isPublic');
    expect(cover).not.toHaveProperty('storageKey');
  });

  it('blocks deleting media that is still in use', async () => {
    const response = await agent.delete(`/api/admin/media/${mediaId}`).set('x-csrf-token', csrf);
    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('CONFLICT');
    expect((errorOf(response).details as { usages: string[] }).usages).toContain('project.cover');
  });

  it('allows a forced delete of in-use media', async () => {
    const response = await agent.delete(`/api/admin/media/${mediaId}`).query({ force: 'true' }).set('x-csrf-token', csrf);
    expect(response.status).toBe(204);
    expect(await prisma.mediaAsset.count({ where: { id: mediaId } })).toBe(0);
  });
});
