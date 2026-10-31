import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/db.js';
import { errorOf, getApp, login, resetDatabase, type TestAgent } from './helpers.js';

const app = getApp();
let agent: TestAgent;

beforeAll(async () => {
  await resetDatabase();
  ({ agent } = await login());

  await prisma.profile.create({
    data: { fullName: 'Hadhi Noor', headline: 'Developer', intro: 'Intro', aboutHtml: '<p>About</p>' },
  });
  await prisma.project.createMany({
    data: [
      { title: 'Published Project', slug: 'published-project', category: 'Web', state: 'PUBLISHED' },
      { title: 'Draft Project', slug: 'draft-project', category: 'Web', state: 'DRAFT' },
      { title: 'Deleted Project', slug: 'deleted-project', category: 'Web', state: 'PUBLISHED', deletedAt: new Date() },
    ],
  });
  await prisma.skill.createMany({
    data: [
      { name: 'Published Skill', slug: 'published-skill', published: true },
      { name: 'Hidden Skill', slug: 'hidden-skill', published: false },
    ],
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('public content visibility', () => {
  it('lists only published, non-deleted projects', async () => {
    const response = await request(app).get('/api/public/projects');
    expect(response.status).toBe(200);
    const titles = (response.body.data as Array<{ title: string }>).map((p) => p.title);
    expect(titles).toContain('Published Project');
    expect(titles).not.toContain('Draft Project');
    expect(titles).not.toContain('Deleted Project');
  });

  it('serves a published project by slug', async () => {
    const response = await request(app).get('/api/public/projects/published-project');
    expect(response.status).toBe(200);
    expect(response.body.data.title).toBe('Published Project');
  });

  it('returns 404 for a draft project slug', async () => {
    const response = await request(app).get('/api/public/projects/draft-project');
    expect(response.status).toBe(404);
    expect(errorOf(response).code).toBe('NOT_FOUND');
  });

  it('returns 404 for a soft-deleted project slug', async () => {
    const response = await request(app).get('/api/public/projects/deleted-project');
    expect(response.status).toBe(404);
  });

  it('lists only published skills', async () => {
    const response = await request(app).get('/api/public/skills');
    expect(response.status).toBe(200);
    const names = (response.body.data as Array<{ name: string }>).map((s) => s.name);
    expect(names).toContain('Published Skill');
    expect(names).not.toContain('Hidden Skill');
  });

  it('exposes the profile through the bootstrap endpoint', async () => {
    const response = await request(app).get('/api/public/bootstrap');
    expect(response.status).toBe(200);
    expect(response.body.data.profile.fullName).toBe('Hadhi Noor');
  });

  it('never exposes the admin surface publicly', async () => {
    const response = await request(app).get('/api/public/admin/projects');
    expect(response.status).toBe(404);
  });
});

describe('contact form', () => {
  it('rejects a submission without consent', async () => {
    const response = await request(app).post('/api/public/contact').send({
      name: 'Recruiter',
      email: 'recruiter@example.com',
      category: 'JOB_OPPORTUNITY',
      message: 'Hello there',
      consent: false,
    });
    expect(response.status).toBe(400);
    expect(errorOf(response).code).toBe('BAD_REQUEST');
  });

  it('rejects an invalid email', async () => {
    const response = await request(app).post('/api/public/contact').send({
      name: 'Recruiter',
      email: 'not-an-email',
      category: 'JOB_OPPORTUNITY',
      message: 'Hello there',
      consent: true,
    });
    expect(response.status).toBe(400);
  });

  it('stores a valid submission and surfaces it in the admin inbox', async () => {
    const response = await request(app).post('/api/public/contact').send({
      name: 'Recruiter',
      email: 'recruiter@example.com',
      subject: 'Opportunity',
      category: 'JOB_OPPORTUNITY',
      message: '<script>alert(1)</script>Hello there',
      consent: true,
    });
    expect(response.status).toBe(201);

    const stored = await prisma.contactMessage.findFirst();
    expect(stored?.message).not.toContain('<script>');

    const inbox = await agent.get('/api/admin/messages');
    expect(inbox.status).toBe(200);
    expect(inbox.body.data).toHaveLength(1);
    expect(inbox.body.data[0].name).toBe('Recruiter');
  });

  it('requires authentication for the admin inbox', async () => {
    const response = await request(app).get('/api/admin/messages');
    expect(response.status).toBe(401);
  });
});
