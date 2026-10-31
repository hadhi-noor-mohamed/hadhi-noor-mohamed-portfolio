import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { crudRouter, mountReorder } from './crud.js';

export const adminTimelineRouter = Router();

const dateish = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v) => {
    if (v === null || v === undefined || v === '') return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  });

const timelineSchema = z.object({
  type: z.enum(['EDUCATION', 'INTERNSHIP', 'WORK', 'TRAINING', 'WORKSHOP', 'VOLUNTEER', 'CERTIFICATION']),
  organization: z.string().min(1).max(200),
  role: z.string().max(200).default(''),
  field: z.string().max(200).default(''),
  specialization: z.string().max(200).default(''),
  location: z.string().max(200).default(''),
  startDate: dateish,
  endDate: dateish,
  current: z.boolean().default(false),
  grade: z.string().max(120).default(''),
  hours: z.string().max(120).default(''),
  description: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  logoMediaId: z.string().cuid().nullable().optional(),
  documentMediaId: z.string().cuid().nullable().optional(),
  url: z.string().max(500).default(''),
  sortOrder: z.number().int().default(0),
  visible: z.boolean().default(true),
});

adminTimelineRouter.use(
  '/timeline',
  crudRouter({
    model: prisma.timelineEntry,
    resource: 'timeline entry',
    searchFields: ['organization', 'role', 'field', 'specialization'],
    sortable: ['sortOrder', 'startDate', 'createdAt', 'organization'],
    defaultSort: { field: 'sortOrder', dir: 'asc' },
    createSchema: timelineSchema,
    include: { logo: true, document: true },
    listWhere: (req) => {
      const q = req.query as Record<string, string | undefined>;
      return q.type ? { type: q.type } : {};
    },
    transform: (data) => ({
      ...data,
      description: Array.isArray(data.description) ? data.description.filter(Boolean) : [],
      technologies: Array.isArray(data.technologies) ? data.technologies.filter(Boolean) : [],
    }),
  }),
);

mountReorder(adminTimelineRouter, '/timeline', prisma.timelineEntry, 'timeline');

// ---------------------------------------------------------------------------
// Certifications & achievements
// ---------------------------------------------------------------------------

const certificationSchema = z.object({
  title: z.string().min(1).max(220),
  issuer: z.string().max(200).default(''),
  issueDate: dateish,
  description: z.string().max(2000).default(''),
  credentialUrl: z.string().max(500).default(''),
  imageMediaId: z.string().cuid().nullable().optional(),
  pdfMediaId: z.string().cuid().nullable().optional(),
  skillTags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  visible: z.boolean().default(true),
});

const achievementSchema = z.object({
  title: z.string().min(1).max(220),
  organization: z.string().max(200).default(''),
  date: dateish,
  description: z.string().max(2000).default(''),
  imageMediaId: z.string().cuid().nullable().optional(),
  pdfMediaId: z.string().cuid().nullable().optional(),
  verificationUrl: z.string().max(500).default(''),
  projectId: z.string().cuid().nullable().optional(),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  visible: z.boolean().default(true),
});

export const adminShowcaseRouter = Router();

adminShowcaseRouter.use(
  '/certifications',
  crudRouter({
    model: prisma.certification,
    resource: 'certification',
    searchFields: ['title', 'issuer'],
    sortable: ['sortOrder', 'issueDate', 'createdAt', 'title'],
    defaultSort: { field: 'sortOrder', dir: 'asc' },
    createSchema: certificationSchema,
    include: { image: true, pdf: true },
  }),
);

adminShowcaseRouter.use(
  '/achievements',
  crudRouter({
    model: prisma.achievement,
    resource: 'achievement',
    searchFields: ['title', 'organization'],
    sortable: ['sortOrder', 'date', 'createdAt', 'title'],
    defaultSort: { field: 'sortOrder', dir: 'asc' },
    createSchema: achievementSchema,
    include: { image: true, pdf: true },
  }),
);

mountReorder(adminShowcaseRouter, '/certifications', prisma.certification, 'certification');
mountReorder(adminShowcaseRouter, '/achievements', prisma.achievement, 'achievement');
