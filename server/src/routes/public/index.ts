import { Router } from 'express';
import { publicProfileRouter } from './profile.js';
import { publicSkillsRouter } from './skills.js';
import { publicProjectsRouter } from './projects.js';
import { publicTimelineRouter, publicShowcaseRouter } from './timeline.js';
import { publicJourneyRouter } from './journey.js';
import { publicBlogRouter } from './blog.js';
import { publicSiteRouter } from './site.js';
import { publicContactRouter } from './contact.js';
import { publicResumeRouter } from './resume.js';
import { publicSearchRouter } from './search.js';
import { publicSeoRouter } from './seo.js';

export const publicRouter = Router();

publicRouter.use(publicProfileRouter);
publicRouter.use(publicSkillsRouter);
publicRouter.use(publicProjectsRouter);
publicRouter.use(publicTimelineRouter);
publicRouter.use(publicShowcaseRouter);
publicRouter.use(publicJourneyRouter);
publicRouter.use(publicBlogRouter);
publicRouter.use(publicSiteRouter);
publicRouter.use(publicContactRouter);
publicRouter.use(publicResumeRouter);
publicRouter.use(publicSearchRouter);
publicRouter.use(publicSeoRouter);
