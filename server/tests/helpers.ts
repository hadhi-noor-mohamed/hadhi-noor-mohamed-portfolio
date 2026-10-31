import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { hashPassword } from '../src/services/auth.js';

/** Concrete supertest agent type (avoids the divergent `SuperAgentTest` alias). */
export type TestAgent = ReturnType<typeof request.agent>;

export const TEST_OWNER_EMAIL = 'owner@test.local';
export const TEST_OWNER_PASSWORD = 'TestOwnerPass!2345';

export const SESSION_COOKIE = 'hpf_session';
export const CSRF_COOKIE = 'hpf_csrf';

let app: Express | null = null;

/** The Express app under test (a single instance per worker). */
export function getApp(): Express {
  if (!app) app = createApp();
  return app;
}

/**
 * Remove every row from every table. Ordering matters because of foreign keys;
 * dependent tables are cleared before the tables they reference.
 */
export async function clearDatabase(): Promise<void> {
  await prisma.projectImage.deleteMany();
  await prisma.projectDocument.deleteMany();
  await prisma.resumeVersion.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.blogTag.deleteMany();
  await prisma.journeyEntry.deleteMany();
  await prisma.certification.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.timelineEntry.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.skillCategory.deleteMany();
  await prisma.project.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.socialLink.deleteMany();
  await prisma.navigationItem.deleteMany();
  await prisma.pageSection.deleteMany();
  await prisma.themeConfiguration.deleteMany();
  await prisma.siteSettings.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.adminUser.deleteMany();
}

/** Clear the database and create the test owner account. */
export async function resetDatabase(): Promise<void> {
  await clearDatabase();
  await prisma.adminUser.create({
    data: {
      email: TEST_OWNER_EMAIL,
      name: 'Test Owner',
      role: 'OWNER',
      passwordHash: await hashPassword(TEST_OWNER_PASSWORD),
    },
  });
}

export interface AuthedContext {
  agent: TestAgent;
  csrf: string;
}

/** Sign in as the test owner and return an agent plus its CSRF token. */
export async function login(
  options: { email?: string; password?: string; code?: string } = {},
): Promise<AuthedContext> {
  const agent = request.agent(getApp());
  const response = await agent.post('/api/admin/auth/login').send({
    email: options.email ?? TEST_OWNER_EMAIL,
    password: options.password ?? TEST_OWNER_PASSWORD,
    ...(options.code ? { code: options.code } : {}),
  });
  if (response.status !== 200) {
    throw new Error(`Login failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return { agent, csrf: readSetCookie(response, CSRF_COOKIE) };
}

/** Read a cookie value from a response's Set-Cookie headers. */
export function readSetCookie(response: request.Response, name: string): string {
  const cookies = (response.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
  for (const cookie of cookies) {
    const [pair] = cookie.split(';');
    const index = pair.indexOf('=');
    if (index > -1 && pair.slice(0, index) === name) {
      return decodeURIComponent(pair.slice(index + 1));
    }
  }
  throw new Error(`Expected a "${name}" cookie in the response`);
}

/** Assert the response uses the standard `{ ok: true, data }` envelope. */
export function dataOf<T = unknown>(response: request.Response): T {
  if (!response.body || response.body.ok !== true) {
    throw new Error(`Expected a success envelope, received: ${JSON.stringify(response.body)}`);
  }
  return response.body.data as T;
}

/** Assert the response uses the standard `{ ok: false, error }` envelope. */
export function errorOf(response: request.Response): { code: string; message: string; details?: unknown } {
  if (!response.body || response.body.ok !== false) {
    throw new Error(`Expected an error envelope, received: ${JSON.stringify(response.body)}`);
  }
  return response.body.error;
}
