import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { authenticator } from 'otplib';
import { prisma } from '../src/db.js';
import { errorOf, getApp, login, resetDatabase, TEST_OWNER_EMAIL, TEST_OWNER_PASSWORD } from './helpers.js';

const app = getApp();

beforeAll(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('account profile', () => {
  it('returns the signed-in user and active session count', async () => {
    const { agent } = await login();
    const response = await agent.get('/api/admin/account');
    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(TEST_OWNER_EMAIL);
    expect(response.body.data.activeSessions).toBeGreaterThanOrEqual(1);
  });

  it('updates the name and email address', async () => {
    const { agent, csrf } = await login();

    const rename = await agent
      .patch('/api/admin/account')
      .set('x-csrf-token', csrf)
      .send({ name: 'Hadhi Noor Mohamed H', email: 'renamed@test.local' });
    expect(rename.status).toBe(200);
    expect(rename.body.data.user.name).toBe('Hadhi Noor Mohamed H');
    expect(rename.body.data.user.email).toBe('renamed@test.local');

    // Restore the canonical email so later tests can sign in as before.
    const restore = await agent
      .patch('/api/admin/account')
      .set('x-csrf-token', csrf)
      .send({ name: 'Test Owner', email: TEST_OWNER_EMAIL });
    expect(restore.status).toBe(200);
  });

  it('rejects an email that is already taken', async () => {
    await prisma.adminUser.create({
      data: { email: 'taken@test.local', name: 'Other', role: 'EDITOR', passwordHash: 'x' },
    });
    const { agent, csrf } = await login();
    const response = await agent
      .patch('/api/admin/account')
      .set('x-csrf-token', csrf)
      .send({ name: 'Test Owner', email: 'taken@test.local' });
    expect(response.status).toBe(409);
    await prisma.adminUser.deleteMany({ where: { email: 'taken@test.local' } });
  });
});

describe('password change', () => {
  it('rejects an incorrect current password', async () => {
    const { agent, csrf } = await login();
    const response = await agent
      .post('/api/admin/account/change-password')
      .set('x-csrf-token', csrf)
      .send({ currentPassword: 'wrong-password', newPassword: 'NewStrongPass!2345' });
    expect(response.status).toBe(401);
  });

  it('changes the password, revokes every session and requires the new password', async () => {
    const { agent, csrf } = await login();
    const response = await agent
      .post('/api/admin/account/change-password')
      .set('x-csrf-token', csrf)
      .send({ currentPassword: TEST_OWNER_PASSWORD, newPassword: 'NewStrongPass!2345' });
    expect(response.status).toBe(200);

    // Current session is destroyed.
    const me = await agent.get('/api/admin/auth/me');
    expect(me.body.data.user).toBeNull();

    // Old password no longer works, the new one does.
    const oldLogin = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: TEST_OWNER_EMAIL, password: TEST_OWNER_PASSWORD });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: TEST_OWNER_EMAIL, password: 'NewStrongPass!2345' });
    expect(newLogin.status).toBe(200);

    // Restore the well-known password for the remaining suites.
    const { agent: restoreAgent, csrf: restoreCsrf } = await login({ password: 'NewStrongPass!2345' });
    const restore = await restoreAgent
      .post('/api/admin/account/change-password')
      .set('x-csrf-token', restoreCsrf)
      .send({ currentPassword: 'NewStrongPass!2345', newPassword: TEST_OWNER_PASSWORD });
    expect(restore.status).toBe(200);
  });
});

describe('session management', () => {
  it('revokes all sessions on request', async () => {
    const first = await login();
    const second = await login();

    const responses = [first, second];
    for (const context of responses) {
      const before = await context.agent.get('/api/admin/auth/me');
      expect(before.body.data.user).not.toBeNull();
    }

    const revoke = await first.agent.post('/api/admin/account/revoke-sessions').set('x-csrf-token', first.csrf);
    expect(revoke.status).toBe(204);

    for (const context of responses) {
      const after = await context.agent.get('/api/admin/auth/me');
      expect(after.body.data.user).toBeNull();
    }
  });
});

describe('two-factor authentication', () => {
  let secret: string;

  it('starts setup and returns a secret, otpauth URI and QR image', async () => {
    const { agent, csrf } = await login();
    const response = await agent.post('/api/admin/account/totp/setup').set('x-csrf-token', csrf);
    expect(response.status).toBe(200);
    secret = response.body.data.secret;
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(response.body.data.otpauth).toContain('otpauth://totp/');
    expect(response.body.data.qr).toContain('data:image/png;base64,');
  });

  it('rejects an invalid verification code', async () => {
    const { agent, csrf } = await login();
    const response = await agent
      .post('/api/admin/account/totp/enable')
      .set('x-csrf-token', csrf)
      .send({ code: '000000' });
    expect(response.status).toBe(400);
  });

  it('enables two-factor with a valid code', async () => {
    // Setup must run with the session that will enable it.
    const { agent, csrf } = await login();
    const setup = await agent.post('/api/admin/account/totp/setup').set('x-csrf-token', csrf);
    secret = setup.body.data.secret;

    const code = authenticator.generate(secret);
    const enable = await agent.post('/api/admin/account/totp/enable').set('x-csrf-token', csrf).send({ code });
    expect(enable.status).toBe(200);
    expect(enable.body.data.totpEnabled).toBe(true);
  });

  it('requires a code on subsequent logins', async () => {
    const noCode = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: TEST_OWNER_EMAIL, password: TEST_OWNER_PASSWORD });
    expect(noCode.status).toBe(400);
    expect((noCode.body.error.details as { mfaRequired?: boolean }).mfaRequired).toBe(true);

    const withCode = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: TEST_OWNER_EMAIL, password: TEST_OWNER_PASSWORD, code: authenticator.generate(secret) });
    expect(withCode.status).toBe(200);
  });

  it('disables two-factor when a valid code is supplied', async () => {
    const { agent, csrf } = await login({ code: authenticator.generate(secret) });
    const response = await agent
      .post('/api/admin/account/totp/disable')
      .set('x-csrf-token', csrf)
      .send({ code: authenticator.generate(secret) });
    expect(response.status).toBe(200);
    expect(response.body.data.totpEnabled).toBe(false);

    const plainLogin = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: TEST_OWNER_EMAIL, password: TEST_OWNER_PASSWORD });
    expect(plainLogin.status).toBe(200);
  });

  it('protects the account endpoints', async () => {
    const response = await request(app).get('/api/admin/account');
    expect(response.status).toBe(401);
    expect(errorOf(response).code).toBe('UNAUTHORIZED');
  });
});
