import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { dataOf, errorOf, login, resetDatabase, type TestAgent } from './helpers.js';

let agent: TestAgent;
let csrf: string;

beforeAll(async () => {
  await resetDatabase();
  ({ agent, csrf } = await login());
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('projects (admin CRUD lifecycle)', () => {
  let projectId: string;
  let slug: string;

  it('creates a project as a draft', async () => {
    const response = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', csrf)
      .send({ title: 'Portfolio Website', shortDescription: 'A dynamic portfolio.', category: 'Web' });

    expect(response.status).toBe(201);
    const project = dataOf<{ id: string; slug: string; state: string }>(response);
    expect(project.state).toBe('DRAFT');
    expect(project.slug).toBe('portfolio-website');
    projectId = project.id;
    slug = project.slug;
  });

  it('reads the project back by id', async () => {
    const response = await agent.get(`/api/admin/projects/${projectId}`);
    expect(response.status).toBe(200);
    expect(dataOf<{ title: string }>(response).title).toBe('Portfolio Website');
  });

  it('appears in the paginated admin list', async () => {
    const response = await agent.get('/api/admin/projects');
    expect(response.status).toBe(200);
    expect(response.body.meta).toMatchObject({ page: 1, total: 1 });
    expect(response.body.data).toHaveLength(1);
  });

  it('updates the project', async () => {
    const response = await agent
      .put(`/api/admin/projects/${projectId}`)
      .set('x-csrf-token', csrf)
      .send({ shortDescription: 'Updated description.' });
    expect(response.status).toBe(200);
    expect(dataOf<{ shortDescription: string }>(response).shortDescription).toBe('Updated description.');
  });

  it('publishes the project', async () => {
    const response = await agent
      .post(`/api/admin/projects/${projectId}/publish`)
      .set('x-csrf-token', csrf)
      .send({ state: 'PUBLISHED' });
    expect(response.status).toBe(200);
    expect(dataOf<{ state: string }>(response).state).toBe('PUBLISHED');
    expect(slug).toBe('portfolio-website');
  });

  it('soft-deletes (archives) then lists it in the trash', async () => {
    const archive = await agent.delete(`/api/admin/projects/${projectId}`).set('x-csrf-token', csrf);
    expect(archive.status).toBe(200);
    expect(archive.body.data.deletedAt).not.toBeNull();

    const active = await agent.get('/api/admin/projects');
    expect(active.body.data).toHaveLength(0);

    const trash = await agent.get('/api/admin/projects').query({ trash: 'true' });
    expect(trash.body.data).toHaveLength(1);
  });

  it('restores the project from the trash', async () => {
    const response = await agent.post(`/api/admin/projects/${projectId}/restore`).set('x-csrf-token', csrf);
    expect(response.status).toBe(200);
    expect(response.body.data.deletedAt).toBeNull();

    const active = await agent.get('/api/admin/projects');
    expect(active.body.data).toHaveLength(1);
  });

  it('permanently deletes the project', async () => {
    const response = await agent.delete(`/api/admin/projects/${projectId}/permanent`).set('x-csrf-token', csrf);
    expect(response.status).toBe(204);
    const remaining = await prisma.project.count();
    expect(remaining).toBe(0);
  });

  it('validates required fields', async () => {
    const response = await agent.post('/api/admin/projects').set('x-csrf-token', csrf).send({});
    expect(response.status).toBe(400);
    expect(errorOf(response).code).toBe('BAD_REQUEST');
  });
});

describe('skills (admin CRUD)', () => {
  let categoryId: string;
  let skillId: string;

  it('creates a category', async () => {
    const response = await agent
      .post('/api/admin/skill-categories')
      .set('x-csrf-token', csrf)
      .send({ name: 'Data & Analytics' });
    expect(response.status).toBe(201);
    categoryId = dataOf<{ id: string }>(response).id;
  });

  it('creates a skill', async () => {
    const response = await agent
      .post('/api/admin/skills')
      .set('x-csrf-token', csrf)
      .send({ name: 'Power BI', categoryId, proficiencyLabel: 'Working knowledge' });
    expect(response.status).toBe(201);
    skillId = dataOf<{ id: string }>(response).id;
  });

  it('updates and lists the skill', async () => {
    const update = await agent
      .put(`/api/admin/skills/${skillId}`)
      .set('x-csrf-token', csrf)
      .send({ featured: true });
    expect(update.status).toBe(200);
    expect(update.body.data.featured).toBe(true);

    const list = await agent.get('/api/admin/skills').query({ categoryId });
    expect(list.body.data).toHaveLength(1);
  });

  it('prevents deleting a category that still has skills', async () => {
    const response = await agent.delete(`/api/admin/skill-categories/${categoryId}`).set('x-csrf-token', csrf);
    expect(response.status).toBe(409);
  });

  it('deletes the skill', async () => {
    const response = await agent.delete(`/api/admin/skills/${skillId}`).set('x-csrf-token', csrf);
    expect(response.status).toBe(204);
    expect(await prisma.skill.count()).toBe(0);
  });
});

describe('profile (singleton)', () => {
  it('creates the profile on first save', async () => {
    const response = await agent
      .put('/api/admin/profile')
      .set('x-csrf-token', csrf)
      .send({ fullName: 'Hadhi Noor', headline: 'Developer', intro: 'Hello', aboutHtml: '<p>About</p>' });
    expect(response.status).toBe(201);
    expect(dataOf<{ profile: { fullName: string } }>(response).profile.fullName).toBe('Hadhi Noor');
  });

  it('updates the existing profile instead of creating a second row', async () => {
    const response = await agent
      .put('/api/admin/profile')
      .set('x-csrf-token', csrf)
      .send({ fullName: 'Hadhi Noor Mohamed H', headline: 'Developer', intro: 'Hello', aboutHtml: '<p>About</p>' });
    expect(response.status).toBe(200);
    expect(await prisma.profile.count()).toBe(1);
    expect(dataOf<{ profile: { fullName: string } }>(response).profile.fullName).toBe('Hadhi Noor Mohamed H');
  });

  it('reads the profile back', async () => {
    const response = await agent.get('/api/admin/profile');
    expect(response.status).toBe(200);
    expect(response.body.data.profile.fullName).toBe('Hadhi Noor Mohamed H');
  });
});

describe('theme studio', () => {
  it('has no theme initially', async () => {
    const response = await agent.get('/api/admin/theme');
    expect(response.status).toBe(404);
  });

  it('saves a draft without publishing', async () => {
    const response = await agent
      .post('/api/admin/theme/draft')
      .set('x-csrf-token', csrf)
      .send({ presetKey: 'midnight', config: { primary: '#6366f1', cardStyle: 'bordered' } });
    expect(response.status).toBe(200);
    expect(response.body.data.draft.primary).toBe('#6366f1');
  });

  it('publishes the draft configuration', async () => {
    const response = await agent.post('/api/admin/theme/publish').set('x-csrf-token', csrf).send({});
    expect(response.status).toBe(200);
    const theme = dataOf<{ config: { primary: string }; draft: unknown }>(response);
    expect(theme.config.primary).toBe('#6366f1');
    expect(theme.draft).toBeFalsy();
  });

  it('rejects an invalid colour', async () => {
    const response = await agent
      .post('/api/admin/theme/draft')
      .set('x-csrf-token', csrf)
      .send({ config: { primary: 'not-a-colour' } });
    expect(response.status).toBe(400);
    expect(errorOf(response).code).toBe('BAD_REQUEST');
  });

  it('resets to the default preset', async () => {
    const response = await agent.post('/api/admin/theme/reset').set('x-csrf-token', csrf);
    expect(response.status).toBe(200);
    expect(response.body.data.presetKey).toBe('aurora');
  });
});

describe('page builder sections', () => {
  let sectionId: string;

  it('starts with no sections', async () => {
    const response = await agent.get('/api/admin/sections');
    expect(response.body.data).toHaveLength(0);
  });

  it('creates a known section', async () => {
    const response = await agent
      .post('/api/admin/sections')
      .set('x-csrf-token', csrf)
      .send({ key: 'hero', label: 'Hero', title: 'Welcome' });
    expect(response.status).toBe(201);
    sectionId = dataOf<{ id: string }>(response).id;
  });

  it('rejects an unknown section key', async () => {
    const response = await agent
      .post('/api/admin/sections')
      .set('x-csrf-token', csrf)
      .send({ key: 'not-a-section', label: 'Nope' });
    expect(response.status).toBe(400);
  });

  it('saves a draft that stays unpublished', async () => {
    const save = await agent
      .post('/api/admin/sections/save-draft')
      .set('x-csrf-token', csrf)
      .send({ items: [{ id: sectionId, draftConfig: { title: 'Draft title', enabled: false } }] });
    expect(save.status).toBe(200);

    const list = await agent.get('/api/admin/sections');
    const hero = list.body.data[0];
    expect(hero.title).toBe('Welcome');
    expect(hero.enabled).toBe(true);
    expect(hero.draftConfig.title).toBe('Draft title');
  });

  it('publishes the draft into the live fields', async () => {
    const publish = await agent.post('/api/admin/sections/publish').set('x-csrf-token', csrf);
    expect(publish.status).toBe(200);

    const list = await agent.get('/api/admin/sections');
    expect(list.body.data[0].title).toBe('Draft title');
    expect(list.body.data[0].enabled).toBe(false);
  });

  it('reorders sections', async () => {
    const response = await agent
      .post('/api/admin/sections/reorder')
      .set('x-csrf-token', csrf)
      .send({ ids: [sectionId] });
    expect(response.status).toBe(200);
    expect(response.body.data.reordered).toBe(1);
  });
});
