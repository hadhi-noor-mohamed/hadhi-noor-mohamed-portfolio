import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { env } from '../../env.js';
import { asyncHandler, validate } from '../../lib/validate.js';
import { created, ok } from '../../lib/api.js';
import { hashIp } from '../../lib/crypto.js';
import { contactLimiter } from '../../middleware/rateLimit.js';
import { stripHtml } from '../../lib/sanitize.js';

export const publicContactRouter = Router();

const contactSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email().max(320),
  subject: z.string().max(200).optional().default(''),
  category: z.enum(['JOB_OPPORTUNITY', 'PROJECT_COLLABORATION', 'TECHNICAL_DISCUSSION', 'FEEDBACK', 'OTHER']),
  message: z.string().min(1).max(5000),
  consent: z.boolean().refine((v) => v === true, { message: 'Consent is required' }),
});

publicContactRouter.post(
  '/contact',
  contactLimiter(env.contactRateLimitPerHour),
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    const body = req.body;
    const message = await prisma.contactMessage.create({
      data: {
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        subject: body.subject.trim(),
        category: body.category,
        message: stripHtml(body.message), // store plain text
        consent: body.consent,
        ipHash: hashIp(req.ip),
        userAgent: (req.get('user-agent') ?? '').slice(0, 300),
      },
    });
    return created(res, {
      id: message.id,
      status: message.status,
      createdAt: message.createdAt,
    });
  }),
);

const analyticsSchema = z.object({
  type: z.enum([
    'PAGE_VIEW',
    'PROJECT_VIEW',
    'BLOG_VIEW',
    'RESUME_DOWNLOAD',
    'CONTACT_SUBMIT',
    'EXTERNAL_LINK_CLICK',
    'PROJECT_LINK_CLICK',
  ]),
  path: z.string().max(2048).optional().default(''),
  projectId: z.string().cuid().optional(),
  blogPostId: z.string().cuid().optional(),
  referrer: z.string().max(2048).optional().default(''),
  label: z.string().max(200).optional().default(''),
});

import { analyticsLimiter } from '../../middleware/rateLimit.js';
import { visitorHash } from '../../lib/crypto.js';

publicContactRouter.post(
  '/analytics',
  analyticsLimiter,
  validate(analyticsSchema),
  asyncHandler(async (req, res) => {
    if (!env.analyticsEnabled) return ok(res, { stored: false });
    await prisma.analyticsEvent.create({
      data: {
        type: req.body.type,
        path: req.body.path.trim(),
        projectId: req.body.projectId,
        blogPostId: req.body.blogPostId,
        referrer: req.body.referrer.trim(),
        label: req.body.label.trim(),
        visitorHash: visitorHash(req.ip, req.get('user-agent')),
      },
    });
    return ok(res, { stored: true });
  }),
);
