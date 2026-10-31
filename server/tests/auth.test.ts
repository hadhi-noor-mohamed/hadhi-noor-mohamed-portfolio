import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/db.js';
import {
  CSRF_COOKIE,
  SESSION_COOKIE,
  TEST_OWNER_EMAIL,
  TEST_OWNER_PASSWORD,
  errorOf,
  getApp,
  login,
  readSetCookie,
  resetDatabase,
} from './helpers.js';

const app = getApp();

beforeAll(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('health', () => {
  it('reports a healthy service', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.status).toBe('healthy');
    expect(response.body.data.environment).toBe('test');
  });
});

describe('authentication', () => {
  it('rejects an unauthenticated admin request with 401', async () => {
    const response = await request(app).get('/api/admin/projects');
    expect(response.status).toBe(401);
    expect(errorOf(response).code).toBe('UNAUTHORIZED');
  });

  it('rejects an unauthenticated state-changing request before CSRF is even considered', async () => {
    const response = await request(app).post('/api/admin/skills').send({ name: 'Sneaky' });
    expect(response.status).toBe(401);
  });

  it('rejects an invalid password', async () => {
    const response = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: TEST_OWNER_EMAIL, password: 'definitely-wrong' });
    expect(response.status).toBe(401);
    expect(errorOf(response).code).toBe('UNAUTHORIZED');
  });

  it('issues an HttpOnly session cookie and a readable CSRF cookie on success', async () => {
    const response = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: TEST_OWNER_EMAIL, password: TEST_OWNER_PASSWORD });

    expect(response.status).toBe(200);
    const cookies = (response.headers['set-cookie'] as unknown as string[]) ?? [];
    const sessionCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
    const csrfCookie = cookies.find((c) => c.startsWith(`${CSRF_COOKIE}=`));

    expect(sessionCookie).toContain('HttpOnly');
    expect(csrfCookie).toBeDefined();
    expect(csrfCookie).not.toContain('HttpOnly');
  });

  it('returns the current user from /auth/me once signed in', async () => {
    const { agent } = await login();
    const response = await agent.get('/api/admin/auth/me');
    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(TEST_OWNER_EMAIL);
    expect(response.body.data.user.role).toBe('OWNER');
  });

  it('blocks authenticated state-changing requests without a CSRF token', async () => {
    const { agent } = await login();
    const response = await agent.post('/api/admin/skills').send({ name: 'No CSRF' });
    expect(response.status).toBe(403);
    expect(errorOf(response).code).toBe('FORBIDDEN');
  });

  it('blocks a CSRF token that does not match the session', async () => {
    const { agent } = await login();
    const response = await agent
      .post('/api/admin/skills')
      .set('x-csrf-token', 'not-the-right-token')
      .send({ name: 'Bad CSRF' });
    expect(response.status).toBe(403);
  });

  it('accepts a valid CSRF token and creates the record', async () => {
    const { agent, csrf } = await login();
    const response = await agent
      .post('/api/admin/skills')
      .set('x-csrf-token', csrf)
      .send({ name: 'CSRF Verified Skill' });
    expect(response.status).toBe(201);
    expect(response.body.data.name).toBe('CSRF Verified Skill');
  });

  it('signs out and invalidates the session', async () => {
    const { agent, csrf } = await login();
    const logout = await agent.post('/api/admin/auth/logout').set('x-csrf-token', csrf);
    expect(logout.status).toBe(204);

    const me = await agent.get('/api/admin/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user).toBeNull();
  });

  it('does not leak the session token in the JSON body', async () => {
    const response = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: TEST_OWNER_EMAIL, password: TEST_OWNER_PASSWORD });
    const raw = readSetCookie(response, SESSION_COOKIE);
    expect(JSON.stringify(response.body)).not.toContain(raw);
  });
});
